import type { BenchmarkDefinition, BenchmarkId, MetaHarnessTrack } from "./benchmarks";
import { getBenchmarkRegistryForTrack } from "./benchmarks";
import type { HarnessVariant, HarnessVariantId } from "./baseline";

export interface BenchmarkMatrixRun {
  benchmark_id: BenchmarkId;
  track: MetaHarnessTrack;
  variant_id: HarnessVariantId;
  is_holdout: boolean;
  source_kind: BenchmarkDefinition["source_kind"];
  score: number;
  latency_ms: number;
  passed: boolean;
}

export interface BenchmarkMatrix {
  track: MetaHarnessTrack;
  variants: HarnessVariant[];
  runs: BenchmarkMatrixRun[];
}

export interface BenchmarkExecutorInput {
  track: MetaHarnessTrack;
  benchmark: BenchmarkDefinition;
  variant: HarnessVariant;
  is_holdout: boolean;
}

export interface BenchmarkExecutorOutput {
  benchmark_id: BenchmarkId;
  variant_id: HarnessVariantId;
  score: number;
  latency_ms: number;
  passed: boolean;
}

export interface RunBenchmarkMatrixOptions {
  track: MetaHarnessTrack;
  variants: HarnessVariant[];
  benchmarkIds?: BenchmarkId[];
  executor: (input: BenchmarkExecutorInput) => Promise<BenchmarkExecutorOutput>;
}

export async function runBenchmarkMatrix(
  options: RunBenchmarkMatrixOptions
): Promise<BenchmarkMatrix> {
  const registry = getBenchmarkRegistryForTrack(options.track);
  const suites = [...registry.optimization_suites, ...registry.holdout_suites].filter((suite) =>
    options.benchmarkIds ? options.benchmarkIds.includes(suite.id) : true
  );

  const runs = await Promise.all(
    suites.flatMap((benchmark) =>
      options.variants.map(async (variant) => {
        const isHoldout = benchmark.use_for_holdout;
        const output = await options.executor({
          track: options.track,
          benchmark,
          variant,
          is_holdout: isHoldout
        });

        return {
          benchmark_id: output.benchmark_id,
          track: options.track,
          variant_id: output.variant_id,
          is_holdout: isHoldout,
          source_kind: benchmark.source_kind,
          score: output.score,
          latency_ms: output.latency_ms,
          passed: output.passed
        } satisfies BenchmarkMatrixRun;
      })
    )
  );

  return {
    track: options.track,
    variants: options.variants.map((variant) => ({ ...variant })),
    runs: runs.sort((left, right) => {
      if (left.benchmark_id === right.benchmark_id) {
        return left.variant_id.localeCompare(right.variant_id);
      }

      return left.benchmark_id.localeCompare(right.benchmark_id);
    })
  };
}
