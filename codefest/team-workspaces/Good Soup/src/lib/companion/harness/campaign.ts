import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  createDefaultAgentVariants,
  type HarnessVariantId
} from "./baseline";
import type { BenchmarkCacheEntry, BenchmarkCacheManifest } from "./benchmark-cache";
import { getDefaultBenchmarkCacheRoot } from "./benchmark-cache";
import type { BenchmarkId } from "./benchmarks";
import { getAllBenchmarkDefinitions, getBenchmarkDefinition } from "./benchmarks";
import { runLocalCustomBenchmarkMatrix } from "./local-custom";
import { runMaterializedBenchmark } from "./materialized-benchmark";
import {
  getDefaultMaterializedBenchmarkRoot,
  loadMaterializedBenchmarkCases,
  loadMaterializedBenchmarkManifest,
  type MaterializedBenchmarkManifest
} from "./materialized";

type LocalCustomBenchmarkId =
  Extract<BenchmarkId, "custom_anti_sycophancy" | "custom_recall_understanding">;

export type BenchmarkCampaignRunStatus =
  | "scored"
  | "auth_required"
  | "not_implemented"
  | "missing_cache"
  | "error";

export interface BenchmarkCampaignRun {
  benchmark_id: BenchmarkId;
  variant_id: HarnessVariantId;
  is_holdout: boolean;
  source_kind: ReturnType<typeof getBenchmarkDefinition>["source_kind"];
  status: BenchmarkCampaignRunStatus;
  score?: number;
  latency_ms?: number;
  case_count?: number;
  pass_rate?: number;
  fidelity?: "native" | "proxy";
  message?: string;
}

export interface BenchmarkCampaignSummary {
  total_runs: number;
  by_status: Record<BenchmarkCampaignRunStatus, number>;
  by_variant: Record<HarnessVariantId, Record<BenchmarkCampaignRunStatus, number>>;
}

export interface BenchmarkCampaignDelta {
  variant_id: HarnessVariantId;
  vs_variant_id: HarnessVariantId;
  scored_mean_delta: number;
}

export interface BenchmarkCampaignGraphPoint {
  variant_id: HarnessVariantId;
  series: "scored_mean";
  value: number;
}

export interface BenchmarkCampaignResult {
  generated_at: string;
  runs: BenchmarkCampaignRun[];
  summary: BenchmarkCampaignSummary;
  deltas: BenchmarkCampaignDelta[];
  graph_points: BenchmarkCampaignGraphPoint[];
}

export interface RunBenchmarkCampaignOptions {
  benchmarkIds?: BenchmarkId[];
  cacheRoot?: string;
  materializedRoot?: string;
  artifactsRoot?: string;
  benchmarkConcurrency?: number;
  caseConcurrency?: number;
  variantConcurrency?: number;
  maxCasesPerBenchmark?: number;
  shardCount?: number;
  shardIndex?: number;
  resumeFromArtifacts?: boolean;
  runMaterializedBenchmark?: (input: {
    benchmarkId: BenchmarkId;
    maxCases?: number;
    shardCount?: number;
    shardIndex?: number;
  }) => Promise<BenchmarkCampaignRun[]>;
}

async function loadBenchmarkCacheManifest(cacheRoot: string): Promise<BenchmarkCacheManifest> {
  const manifestPath = path.join(cacheRoot, "manifest.json");
  const content = await readFile(manifestPath, "utf8");
  return JSON.parse(content) as BenchmarkCacheManifest;
}

async function loadMaterializedBenchmarkManifestSafe(
  rootDir: string
): Promise<MaterializedBenchmarkManifest | null> {
  try {
    return await loadMaterializedBenchmarkManifest(rootDir);
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const limit = Math.max(1, concurrency);
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function sortRuns(runs: BenchmarkCampaignRun[]): BenchmarkCampaignRun[] {
  return [...runs].sort((left, right) => {
    if (left.benchmark_id === right.benchmark_id) {
      return left.variant_id.localeCompare(right.variant_id);
    }

    return left.benchmark_id.localeCompare(right.benchmark_id);
  });
}

function roundMetric(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function makeRunSummary(runs: BenchmarkCampaignRun[]): BenchmarkCampaignSummary {
  const emptyStatusCounts = {
    scored: 0,
    auth_required: 0,
    not_implemented: 0,
    missing_cache: 0,
    error: 0
  } satisfies Record<BenchmarkCampaignRunStatus, number>;

  const byVariant = Object.fromEntries(
    createDefaultAgentVariants().map((variant) => [variant.id, { ...emptyStatusCounts }])
  ) as Record<HarnessVariantId, Record<BenchmarkCampaignRunStatus, number>>;

  const byStatus = { ...emptyStatusCounts };

  for (const run of runs) {
    byStatus[run.status] += 1;
    byVariant[run.variant_id][run.status] += 1;
  }

  return {
    total_runs: runs.length,
    by_status: byStatus,
    by_variant: byVariant
  };
}

function makeGraphPoints(runs: BenchmarkCampaignRun[]): BenchmarkCampaignGraphPoint[] {
  return createDefaultAgentVariants().map((variant) => {
    const scoredRuns = runs.filter(
      (run) => run.variant_id === variant.id && run.status === "scored" && typeof run.score === "number"
    );
    const value =
      scoredRuns.length === 0
        ? 0
        : roundMetric(scoredRuns.reduce((sum, run) => sum + (run.score ?? 0), 0) / scoredRuns.length);

    return {
      variant_id: variant.id,
      series: "scored_mean",
      value
    };
  });
}

function computeScoredMean(runs: BenchmarkCampaignRun[], variantId: HarnessVariantId): number {
  const scoredRuns = runs.filter(
    (run) => run.variant_id === variantId && run.status === "scored" && typeof run.score === "number"
  );

  if (scoredRuns.length === 0) {
    return 0;
  }

  return roundMetric(scoredRuns.reduce((sum, run) => sum + (run.score ?? 0), 0) / scoredRuns.length);
}

function makeDeltas(runs: BenchmarkCampaignRun[]): BenchmarkCampaignDelta[] {
  const baselineMean = computeScoredMean(runs, "baseline");

  return createDefaultAgentVariants()
    .filter((variant) => variant.id !== "baseline")
    .map((variant) => ({
      variant_id: variant.id,
      vs_variant_id: "baseline",
      scored_mean_delta: roundMetric(computeScoredMean(runs, variant.id) - baselineMean)
    }));
}

function expandStaticRuns(
  benchmarkId: BenchmarkId,
  status: Exclude<BenchmarkCampaignRunStatus, "scored">,
  message?: string
): BenchmarkCampaignRun[] {
  const definition = getBenchmarkDefinition(benchmarkId);
  return createDefaultAgentVariants().map((variant) => ({
    benchmark_id: benchmarkId,
    variant_id: variant.id,
    is_holdout: definition.use_for_holdout,
    source_kind: definition.source_kind,
    status,
    message
  }));
}

function getEntryForBenchmark(
  manifest: BenchmarkCacheManifest,
  benchmarkId: BenchmarkId
): BenchmarkCacheEntry | undefined {
  return manifest.entries.find((entry) => entry.benchmark_id === benchmarkId);
}

async function runSingleBenchmark(
  benchmarkId: BenchmarkId,
  manifest: BenchmarkCacheManifest,
  materializedManifest: MaterializedBenchmarkManifest | null,
  options: RunBenchmarkCampaignOptions
): Promise<BenchmarkCampaignRun[]> {
  const definition = getBenchmarkDefinition(benchmarkId);
  const entry = getEntryForBenchmark(manifest, benchmarkId);

  if (!entry) {
    return expandStaticRuns(benchmarkId, "missing_cache", "Benchmark is not present in the cache manifest.");
  }

  if (entry.status === "auth_required") {
    return expandStaticRuns(benchmarkId, "auth_required", entry.message);
  }

  if (entry.status !== "cached") {
    return expandStaticRuns(benchmarkId, "error", entry.message ?? "Benchmark cache entry is not usable.");
  }

  if (definition.source_kind === "local_custom") {
    const track = definition.tracks[0];
    const result = await runLocalCustomBenchmarkMatrix({
      track,
      benchmarkIds: [benchmarkId as LocalCustomBenchmarkId]
    });

    return result.matrix.runs.map((run) => ({
      benchmark_id: run.benchmark_id,
      variant_id: run.variant_id,
      is_holdout: run.is_holdout,
      source_kind: run.source_kind,
      status: "scored",
      score: run.score,
      latency_ms: run.latency_ms
    }));
  }

  const hasMaterializedCases = materializedManifest?.benchmarks.some(
    (item) => item.benchmark_id === benchmarkId && item.case_count > 0
  );

  if (hasMaterializedCases && options.runMaterializedBenchmark) {
    const runs = await options.runMaterializedBenchmark({
      benchmarkId,
      maxCases: options.maxCasesPerBenchmark,
      shardCount: options.shardCount,
      shardIndex: options.shardIndex
    });

    return runs.map((run) => ({
      ...run,
      benchmark_id: benchmarkId,
      is_holdout: definition.use_for_holdout,
      source_kind: definition.source_kind
    }));
  }

  if (hasMaterializedCases) {
    await loadMaterializedBenchmarkCases(benchmarkId, {
      rootDir: options.materializedRoot
    });

    const runs = await runMaterializedBenchmark({
      benchmarkId,
      materializedRoot: options.materializedRoot,
      artifactsRoot: options.artifactsRoot,
      caseConcurrency: options.caseConcurrency,
      variantConcurrency: options.variantConcurrency,
      maxCases: options.maxCasesPerBenchmark,
      shardCount: options.shardCount,
      shardIndex: options.shardIndex,
      resumeFromArtifacts: options.resumeFromArtifacts
    });

    return runs.map((run) => ({
      ...run,
      is_holdout: definition.use_for_holdout,
      source_kind: definition.source_kind
    }));
  }

  return expandStaticRuns(
    benchmarkId,
    "not_implemented",
    "Cache is available, but a benchmark-specific scorer/adapter is not implemented yet."
  );
}

export function buildBenchmarkCampaignResult(
  runs: BenchmarkCampaignRun[],
  generatedAt = new Date().toISOString()
): BenchmarkCampaignResult {
  const sortedRuns = sortRuns(runs);

  return {
    generated_at: generatedAt,
    runs: sortedRuns,
    summary: makeRunSummary(sortedRuns),
    deltas: makeDeltas(sortedRuns),
    graph_points: makeGraphPoints(sortedRuns)
  };
}

export function mergeBenchmarkCampaignResults(
  results: BenchmarkCampaignResult[],
  generatedAt = new Date().toISOString()
): BenchmarkCampaignResult {
  return buildBenchmarkCampaignResult(
    results.flatMap((result) => result.runs),
    generatedAt
  );
}

export async function runBenchmarkCampaign(
  options: RunBenchmarkCampaignOptions = {}
): Promise<BenchmarkCampaignResult> {
  const cacheRoot = options.cacheRoot ?? getDefaultBenchmarkCacheRoot();
  const manifest = await loadBenchmarkCacheManifest(cacheRoot);
  const materializedRoot = options.materializedRoot ?? getDefaultMaterializedBenchmarkRoot();
  const materializedManifest = await loadMaterializedBenchmarkManifestSafe(materializedRoot);
  const benchmarkIds =
    options.benchmarkIds ?? getAllBenchmarkDefinitions().map((definition) => definition.id);

  const runs = (await mapWithConcurrency(
    benchmarkIds,
    options.benchmarkConcurrency ?? 2,
    async (benchmarkId) =>
      runSingleBenchmark(benchmarkId, manifest, materializedManifest, {
        ...options,
        materializedRoot
      })
  )).flat();

  return buildBenchmarkCampaignResult(runs);
}
