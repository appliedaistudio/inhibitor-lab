import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { EvidenceRecord, RunCompanionRequest } from "../contracts";
import type { BenchmarkId, MetaHarnessTrack } from "./benchmarks";

export type MaterializedJudgeFamily =
  | "truthfulness_qa"
  | "tutoring"
  | "grounding"
  | "safety_refusal"
  | "safety_balance"
  | "privacy_redaction";

export interface MaterializedBenchmarkCase {
  benchmark_id: BenchmarkId;
  case_id: string;
  judge_family: MaterializedJudgeFamily;
  mode: RunCompanionRequest["mode"];
  track: MetaHarnessTrack;
  user_message: string;
  evidence: EvidenceRecord[];
  reference: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface MaterializedBenchmarkManifestEntry {
  benchmark_id: BenchmarkId;
  output_path: string;
  case_count: number;
}

export interface MaterializedBenchmarkManifest {
  generated_at: string;
  benchmarks: MaterializedBenchmarkManifestEntry[];
}

export function getDefaultMaterializedBenchmarkRoot(): string {
  return path.join(process.cwd(), "data", "benchmarks", "materialized");
}

export async function loadMaterializedBenchmarkManifest(
  rootDir = getDefaultMaterializedBenchmarkRoot()
): Promise<MaterializedBenchmarkManifest> {
  const manifestPath = path.join(rootDir, "manifest.json");
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw) as MaterializedBenchmarkManifest;
}

export async function loadMaterializedBenchmarkCases(
  benchmarkId: BenchmarkId,
  options: {
    rootDir?: string;
  } = {}
): Promise<MaterializedBenchmarkCase[]> {
  const rootDir = options.rootDir ?? getDefaultMaterializedBenchmarkRoot();
  const manifest = await loadMaterializedBenchmarkManifest(rootDir);
  const entry = manifest.benchmarks.find((item) => item.benchmark_id === benchmarkId);

  if (!entry) {
    return [];
  }

  const filePath = await resolveMaterializedOutputPath(rootDir, entry.output_path);
  const raw = await readFile(filePath, "utf8");

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as MaterializedBenchmarkCase);
}

async function resolveMaterializedOutputPath(rootDir: string, outputPath: string): Promise<string> {
  const candidates = [
    path.isAbsolute(outputPath) ? outputPath : path.join(rootDir, outputPath),
    path.isAbsolute(outputPath) ? outputPath : path.join(process.cwd(), outputPath)
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return candidates[0];
}
