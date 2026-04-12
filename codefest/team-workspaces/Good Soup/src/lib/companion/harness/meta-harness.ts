import {
  getBenchmarkRegistryForTrack,
  type MetaHarnessTrack,
} from "./benchmarks";

export interface MetaHarnessPlan {
  track: MetaHarnessTrack;
  optimization_objectives: string[];
  optimization_benchmarks: string[];
  holdout_benchmarks: string[];
}

export interface BenchmarkScore {
  benchmark_id: string;
  score: number;
}

export interface MetaHarnessScorecard {
  optimization_score: number;
  holdout_score: number;
  optimization_count: number;
  holdout_count: number;
}

const BASE_OBJECTIVES = [
  "grounding",
  "safety",
  "anti_sycophancy",
];

function clampScore(score: number): number {
  return Math.min(1, Math.max(0, score));
}

export function createDefaultMetaHarnessPlan(track: MetaHarnessTrack): MetaHarnessPlan {
  const registry = getBenchmarkRegistryForTrack(track);

  const modeSpecificObjectives =
    track === "research"
      ? ["citation_honesty", "novelty_restraint"]
      : track === "socratic"
        ? ["misconception_detection", "pedagogical_honesty"]
        : track === "retention_learning"
          ? ["recall_retention", "understanding_transfer"]
          : ["policy_resistance"];

  return {
    track,
    optimization_objectives: [...BASE_OBJECTIVES, ...modeSpecificObjectives],
    optimization_benchmarks: registry.optimization_suites.map((suite) => suite.id),
    holdout_benchmarks: registry.holdout_suites.map((suite) => suite.id),
  };
}

function average(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function scoreMetaHarnessCandidate(
  plan: MetaHarnessPlan,
  benchmarkScores: BenchmarkScore[]
): MetaHarnessScorecard {
  const optimizationScores = benchmarkScores
    .filter((item) => plan.optimization_benchmarks.includes(item.benchmark_id))
    .map((item) => clampScore(item.score));
  const holdoutScores = benchmarkScores
    .filter((item) => plan.holdout_benchmarks.includes(item.benchmark_id))
    .map((item) => clampScore(item.score));

  return {
    optimization_score: average(optimizationScores),
    holdout_score: average(holdoutScores),
    optimization_count: optimizationScores.length,
    holdout_count: holdoutScores.length,
  };
}
