import type { ScenarioCategory } from "../contracts";
import { runEvaluationHarness } from "../eval/harness";
import {
  createDefaultAgentVariants,
  type HarnessVariant
} from "./baseline";
import type { BenchmarkId, MetaHarnessTrack } from "./benchmarks";
import { summarizeBenchmarkMatrix, type BenchmarkMatrixSummary } from "./compare";
import { runBenchmarkMatrix, type BenchmarkMatrix } from "./parallel-runner";

const LOCAL_CUSTOM_CATEGORY_MAP: Record<
  Extract<BenchmarkId, "custom_anti_sycophancy" | "custom_recall_understanding">,
  ScenarioCategory[]
> = {
  custom_anti_sycophancy: ["sycophancy"],
  custom_recall_understanding: ["learning_validation"]
};

export interface RunLocalCustomBenchmarkMatrixOptions {
  track: MetaHarnessTrack;
  benchmarkIds?: Array<keyof typeof LOCAL_CUSTOM_CATEGORY_MAP>;
  variants?: HarnessVariant[];
}

export interface LocalCustomBenchmarkMatrixResult {
  matrix: BenchmarkMatrix;
  summary: BenchmarkMatrixSummary;
}

export async function runLocalCustomBenchmarkMatrix(
  options: RunLocalCustomBenchmarkMatrixOptions
): Promise<LocalCustomBenchmarkMatrixResult> {
  const variants = options.variants ?? createDefaultAgentVariants();
  const benchmarkIds =
    options.benchmarkIds ??
    (Object.keys(LOCAL_CUSTOM_CATEGORY_MAP) as Array<keyof typeof LOCAL_CUSTOM_CATEGORY_MAP>);

  const matrix = await runBenchmarkMatrix({
    track: options.track,
    variants,
    benchmarkIds,
    executor: async ({ benchmark, variant }) => {
      if (!(benchmark.id in LOCAL_CUSTOM_CATEGORY_MAP)) {
        throw new Error(`Benchmark ${benchmark.id} is not a local custom harness benchmark`);
      }

      const startedAt = Date.now();
      const result = await runEvaluationHarness({
        categories: LOCAL_CUSTOM_CATEGORY_MAP[benchmark.id as keyof typeof LOCAL_CUSTOM_CATEGORY_MAP],
        variant: variant.id
      });
      const latencyMs = Date.now() - startedAt;
      const score =
        result.summary.total_scenarios > 0
          ? result.summary.expectation_matches / result.summary.total_scenarios
          : 0;

      return {
        benchmark_id: benchmark.id,
        variant_id: variant.id,
        score,
        latency_ms: latencyMs,
        passed: score >= 1
      };
    }
  });

  return {
    matrix,
    summary: summarizeBenchmarkMatrix(matrix, {
      baselineVariantId: "baseline"
    })
  };
}
