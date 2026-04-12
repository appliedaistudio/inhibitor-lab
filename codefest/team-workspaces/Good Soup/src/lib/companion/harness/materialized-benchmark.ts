import path from "node:path";

import { createDefaultAgentVariants, type HarnessVariant } from "./baseline";
import {
  executeMaterializedBenchmarkCase,
  type MaterializedExecutorDependencies
} from "./materialized-executor";
import { judgeMaterializedBenchmarkCase } from "./materialized-judge";
import { loadMaterializedBenchmarkCases } from "./materialized";
import { runMaterializedBenchmarkSuite, type MaterializedBenchmarkJudgment } from "./case-runner";
import type { BenchmarkId } from "./benchmarks";
import type { MaterializedBenchmarkCase } from "./materialized";

export interface RunMaterializedBenchmarkOptions extends MaterializedExecutorDependencies {
  benchmarkId: BenchmarkId;
  materializedRoot?: string;
  artifactsRoot?: string;
  caseConcurrency?: number;
  variantConcurrency?: number;
  maxCases?: number;
  shardCount?: number;
  shardIndex?: number;
  resumeFromArtifacts?: boolean;
  variants?: HarnessVariant[];
  executeCase?: (input: {
    variant: HarnessVariant;
    benchmarkCase: MaterializedBenchmarkCase;
  }) => Promise<{
    case_id: string;
    answer: string;
    latency_ms: number;
    details?: Record<string, unknown>;
  }>;
  judgeCase?: (input: {
    variant: HarnessVariant;
    benchmarkCase: MaterializedBenchmarkCase;
    execution: {
      case_id: string;
      answer: string;
      latency_ms: number;
      details?: Record<string, unknown>;
    };
  }) => Promise<MaterializedBenchmarkJudgment>;
}

export interface MaterializedBenchmarkCampaignRun {
  benchmark_id: BenchmarkId;
  variant_id: HarnessVariant["id"];
  status: "scored";
  score: number;
  latency_ms: number;
  case_count: number;
  pass_rate: number;
  fidelity: "native" | "proxy";
  failure_examples: Array<{
    case_id: string;
    score: number;
    answer_excerpt: string;
  }>;
}

export async function runMaterializedBenchmark(
  options: RunMaterializedBenchmarkOptions
): Promise<MaterializedBenchmarkCampaignRun[]> {
  const variants = options.variants ?? createDefaultAgentVariants();
  const cases = await loadMaterializedBenchmarkCases(options.benchmarkId, {
    rootDir: options.materializedRoot
  });
  const shardedCases =
    typeof options.shardCount === "number" &&
    typeof options.shardIndex === "number" &&
    options.shardCount > 1
      ? cases.filter((_, index) => index % options.shardCount! === options.shardIndex)
      : cases;
  const scopedCases =
    typeof options.maxCases === "number" && options.maxCases >= 0
      ? shardedCases.slice(0, options.maxCases)
      : shardedCases;
  const artifactsRoot =
    options.artifactsRoot ??
    path.join(process.cwd(), "data", "benchmarks", "results", "cases");

  const suite = await runMaterializedBenchmarkSuite({
    benchmarkId: options.benchmarkId,
    cases: scopedCases,
    variants,
    artifactsRoot,
    caseConcurrency: options.caseConcurrency,
    variantConcurrency: options.variantConcurrency,
    resumeFromArtifacts: options.resumeFromArtifacts,
    executeCase: async ({ variant, benchmarkCase }) => {
      if (options.executeCase) {
        return options.executeCase({ variant, benchmarkCase });
      }

      return executeMaterializedBenchmarkCase(
        {
          variantId: variant.id,
          benchmarkCase
        },
        options
      );
    },
    judgeCase: async ({ variant, benchmarkCase, execution }) => {
      if (options.judgeCase) {
        return options.judgeCase({ variant, benchmarkCase, execution });
      }

      return judgeMaterializedBenchmarkCase({
        benchmarkCase,
        variantId: variant.id,
        execution
      });
    }
  });

  return suite.runs.map((run) => ({
    benchmark_id: run.benchmark_id,
    variant_id: run.variant_id,
    status: "scored",
    score: run.score,
    latency_ms: run.latency_ms,
    case_count: run.case_count,
    pass_rate: run.pass_rate,
    fidelity: run.fidelity,
    failure_examples: run.failure_examples
  }));
}
