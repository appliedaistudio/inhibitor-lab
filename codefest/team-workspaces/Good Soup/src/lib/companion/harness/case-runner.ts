import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { HarnessVariant, HarnessVariantId } from "./baseline";
import type { BenchmarkId } from "./benchmarks";
import type { MaterializedBenchmarkCase } from "./materialized";

export type BenchmarkExecutionFidelity = "native" | "proxy";
export const MATERIALIZED_CASE_RESULT_VERSION = 1;

export interface MaterializedBenchmarkExecution {
  case_id: string;
  answer: string;
  latency_ms: number;
  details?: Record<string, unknown>;
}

export interface MaterializedBenchmarkJudgment {
  score: number;
  passed: boolean;
  fidelity: BenchmarkExecutionFidelity;
  rationale?: string;
  metrics?: Record<string, number>;
}

export interface MaterializedBenchmarkCaseResult {
  artifact_version: number;
  benchmark_id: BenchmarkId;
  variant_id: HarnessVariantId;
  case_id: string;
  score: number;
  passed: boolean;
  fidelity: BenchmarkExecutionFidelity;
  answer: string;
  latency_ms: number;
  rationale?: string;
  metrics: Record<string, number>;
}

export interface MaterializedBenchmarkFailureExample {
  case_id: string;
  score: number;
  answer_excerpt: string;
}

export interface MaterializedBenchmarkRunSummary {
  benchmark_id: BenchmarkId;
  variant_id: HarnessVariantId;
  score: number;
  pass_rate: number;
  case_count: number;
  latency_ms: number;
  fidelity: BenchmarkExecutionFidelity;
  failure_examples: MaterializedBenchmarkFailureExample[];
}

export interface MaterializedBenchmarkSuiteResult {
  benchmark_id: BenchmarkId;
  generated_at: string;
  runs: MaterializedBenchmarkRunSummary[];
  case_results: MaterializedBenchmarkCaseResult[];
}

export interface RunMaterializedBenchmarkSuiteOptions {
  benchmarkId: BenchmarkId;
  cases: MaterializedBenchmarkCase[];
  variants: HarnessVariant[];
  artifactsRoot: string;
  caseConcurrency?: number;
  variantConcurrency?: number;
  resumeFromArtifacts?: boolean;
  executeCase: (input: {
    variant: HarnessVariant;
    benchmarkCase: MaterializedBenchmarkCase;
  }) => Promise<MaterializedBenchmarkExecution>;
  judgeCase: (input: {
    variant: HarnessVariant;
    benchmarkCase: MaterializedBenchmarkCase;
    execution: MaterializedBenchmarkExecution;
  }) => Promise<MaterializedBenchmarkJudgment>;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const limit = Math.max(1, concurrency);
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function roundMetric(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function summarizeFailureExamples(
  caseResults: MaterializedBenchmarkCaseResult[]
): MaterializedBenchmarkFailureExample[] {
  return caseResults
    .filter((item) => item.score < 1)
    .sort((left, right) => left.score - right.score)
    .slice(0, 5)
    .map((item) => ({
      case_id: item.case_id,
      score: item.score,
      answer_excerpt: item.answer.slice(0, 200)
    }));
}

async function loadExistingVariantResults(
  artifactPath: string
): Promise<MaterializedBenchmarkCaseResult[]> {
  try {
    const raw = await readFile(artifactPath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as MaterializedBenchmarkCaseResult)
      .filter((item) => item.artifact_version === MATERIALIZED_CASE_RESULT_VERSION);
  } catch {
    return [];
  }
}

export async function runMaterializedBenchmarkSuite(
  options: RunMaterializedBenchmarkSuiteOptions
): Promise<MaterializedBenchmarkSuiteResult> {
  const caseConcurrency = options.caseConcurrency ?? 4;
  const variantConcurrency = options.variantConcurrency ?? 1;
  const resumeFromArtifacts = options.resumeFromArtifacts ?? true;
  const caseResults = (
    await mapWithConcurrency(options.variants, variantConcurrency, async (variant) => {
        const variantDir = path.join(options.artifactsRoot, options.benchmarkId);
        const artifactPath = path.join(variantDir, `${variant.id}.jsonl`);
        const existingResults = resumeFromArtifacts
          ? await loadExistingVariantResults(artifactPath)
          : [];
        const existingByCaseId = new Map(existingResults.map((item) => [item.case_id, item]));
        const pendingCases = options.cases.filter((benchmarkCase) => !existingByCaseId.has(benchmarkCase.case_id));

        const newResults = await mapWithConcurrency(pendingCases, caseConcurrency, async (benchmarkCase) => {
          try {
            const execution = await options.executeCase({
              variant,
              benchmarkCase
            });
            const judgment = await options.judgeCase({
              variant,
              benchmarkCase,
              execution
            });

            return {
              artifact_version: MATERIALIZED_CASE_RESULT_VERSION,
              benchmark_id: options.benchmarkId,
              variant_id: variant.id,
              case_id: benchmarkCase.case_id,
              score: roundMetric(judgment.score),
              passed: judgment.passed,
              fidelity: judgment.fidelity,
              answer: execution.answer,
              latency_ms: execution.latency_ms,
              rationale: judgment.rationale,
              metrics: judgment.metrics ?? {}
            } satisfies MaterializedBenchmarkCaseResult;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            return {
              artifact_version: MATERIALIZED_CASE_RESULT_VERSION,
              benchmark_id: options.benchmarkId,
              variant_id: variant.id,
              case_id: benchmarkCase.case_id,
              score: 0,
              passed: false,
              fidelity: "proxy",
              answer: `[execution_error] ${message}`,
              latency_ms: 0,
              rationale: `Benchmark execution failed: ${message}`,
              metrics: {
                execution_error: 1
              }
            } satisfies MaterializedBenchmarkCaseResult;
          }
        });
        const results = options.cases
          .map((benchmarkCase) => existingByCaseId.get(benchmarkCase.case_id) ?? newResults.find((item) => item.case_id === benchmarkCase.case_id))
          .filter((item): item is MaterializedBenchmarkCaseResult => Boolean(item));

        await mkdir(variantDir, { recursive: true });
        await writeFile(
          artifactPath,
          results.map((item) => JSON.stringify(item)).join("\n") + "\n",
          "utf8"
        );

        return results;
      })
  ).flat();

  const runs = options.variants.map((variant) => {
    const variantResults = caseResults.filter((item) => item.variant_id === variant.id);
    const score =
      variantResults.length === 0
        ? 0
        : roundMetric(
            variantResults.reduce((sum, item) => sum + item.score, 0) / variantResults.length
          );
    const passRate =
      variantResults.length === 0
        ? 0
        : roundMetric(
            variantResults.filter((item) => item.passed).length / variantResults.length
          );
    const latencyMs =
      variantResults.length === 0
        ? 0
        : roundMetric(
            variantResults.reduce((sum, item) => sum + item.latency_ms, 0) / variantResults.length
          );
    const fidelity = variantResults[0]?.fidelity ?? "proxy";

    return {
      benchmark_id: options.benchmarkId,
      variant_id: variant.id,
      score,
      pass_rate: passRate,
      case_count: variantResults.length,
      latency_ms: latencyMs,
      fidelity,
      failure_examples: summarizeFailureExamples(variantResults)
    } satisfies MaterializedBenchmarkRunSummary;
  });

  return {
    benchmark_id: options.benchmarkId,
    generated_at: new Date().toISOString(),
    runs,
    case_results: caseResults
  };
}
