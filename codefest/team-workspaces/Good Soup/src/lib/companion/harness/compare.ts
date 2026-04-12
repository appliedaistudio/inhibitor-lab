import type { BenchmarkMatrix, BenchmarkMatrixRun } from "./parallel-runner";
import type { HarnessVariantId } from "./baseline";

export interface VariantBenchmarkSummary {
  variant_id: HarnessVariantId;
  optimization_mean: number;
  holdout_mean: number;
  optimization_count: number;
  holdout_count: number;
}

export interface VariantDeltaSummary {
  variant_id: HarnessVariantId;
  vs_variant_id: HarnessVariantId;
  optimization_delta: number;
  holdout_delta: number;
}

export interface BenchmarkDeltaRow {
  benchmark_id: string;
  variant_id: HarnessVariantId;
  delta_vs_baseline: number;
  is_holdout: boolean;
}

export interface GraphPoint {
  variant_id: HarnessVariantId;
  series: "optimization" | "holdout";
  value: number;
}

export interface BenchmarkMatrixSummary {
  track: BenchmarkMatrix["track"];
  variants: VariantBenchmarkSummary[];
  deltas: VariantDeltaSummary[];
  per_benchmark_deltas: BenchmarkDeltaRow[];
  graph_points: GraphPoint[];
}

export interface SummarizeBenchmarkMatrixOptions {
  baselineVariantId: HarnessVariantId;
}

function roundMetric(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return roundMetric(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function summarizeVariantRuns(runs: BenchmarkMatrixRun[], variantId: HarnessVariantId): VariantBenchmarkSummary {
  const relevantRuns = runs.filter((run) => run.variant_id === variantId);
  const optimizationRuns = relevantRuns.filter((run) => !run.is_holdout);
  const holdoutRuns = relevantRuns.filter((run) => run.is_holdout);

  return {
    variant_id: variantId,
    optimization_mean: average(optimizationRuns.map((run) => run.score)),
    holdout_mean: average(holdoutRuns.map((run) => run.score)),
    optimization_count: optimizationRuns.length,
    holdout_count: holdoutRuns.length
  };
}

export function summarizeBenchmarkMatrix(
  matrix: BenchmarkMatrix,
  options: SummarizeBenchmarkMatrixOptions
): BenchmarkMatrixSummary {
  const baselineSummary = summarizeVariantRuns(matrix.runs, options.baselineVariantId);
  const baselineRuns = new Map(
    matrix.runs
      .filter((run) => run.variant_id === options.baselineVariantId)
      .map((run) => [run.benchmark_id, run])
  );

  const variants = matrix.variants.map((variant) => summarizeVariantRuns(matrix.runs, variant.id));
  const deltas = variants
    .filter((summary) => summary.variant_id !== options.baselineVariantId)
    .map((summary) => ({
      variant_id: summary.variant_id,
      vs_variant_id: options.baselineVariantId,
      optimization_delta: roundMetric(summary.optimization_mean - baselineSummary.optimization_mean),
      holdout_delta: roundMetric(summary.holdout_mean - baselineSummary.holdout_mean)
    }));

  const perBenchmarkDeltas = matrix.runs
    .filter((run) => run.variant_id !== options.baselineVariantId)
    .map((run) => {
      const baseline = baselineRuns.get(run.benchmark_id);
      const delta = baseline ? roundMetric(run.score - baseline.score) : roundMetric(run.score);

      return {
        benchmark_id: run.benchmark_id,
        variant_id: run.variant_id,
        delta_vs_baseline: delta,
        is_holdout: run.is_holdout
      } satisfies BenchmarkDeltaRow;
    });

  const graphPoints = variants.flatMap((summary) => [
    {
      variant_id: summary.variant_id,
      series: "optimization",
      value: summary.optimization_mean
    } satisfies GraphPoint,
    {
      variant_id: summary.variant_id,
      series: "holdout",
      value: summary.holdout_mean
    } satisfies GraphPoint
  ]);

  return {
    track: matrix.track,
    variants,
    deltas,
    per_benchmark_deltas: perBenchmarkDeltas,
    graph_points: graphPoints
  };
}
