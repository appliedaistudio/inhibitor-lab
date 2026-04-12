import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/companion/config", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/companion/config")>(
    "../src/lib/companion/config"
  );

  return {
    ...actual,
    getRuntimeConfig: vi.fn()
  };
});

import { getRuntimeConfig } from "../src/lib/companion/config";
import {
  createDefaultAgentVariants,
  type HarnessVariantId
} from "../src/lib/companion/harness/baseline";
import {
  runBenchmarkMatrix
} from "../src/lib/companion/harness/parallel-runner";
import {
  summarizeBenchmarkMatrix
} from "../src/lib/companion/harness/compare";
import {
  runLocalCustomBenchmarkMatrix
} from "../src/lib/companion/harness/local-custom";

beforeEach(() => {
  vi.mocked(getRuntimeConfig).mockReturnValue({
    openai_api_key: undefined,
    inhibitor_api_key: undefined,
    inhibitor_url: "https://iaas.appliedai.studio/check",
    primary_model: "gpt-5.4",
    verifier_model: "gpt-5.4-mini",
    llm_base_url: undefined,
    opencode_server_url: undefined,
    opencode_model: undefined,
    opencode_agent: undefined,
    opencode_username: undefined,
    opencode_password: undefined
  });
});

describe("createDefaultAgentVariants", () => {
  it("defines baseline, no_harness, and full_harness variants", () => {
    expect(createDefaultAgentVariants().map((variant) => variant.id)).toEqual([
      "baseline",
      "no_harness",
      "full_harness"
    ]);
  });
});

describe("runBenchmarkMatrix", () => {
  it("runs every requested benchmark for every variant and preserves holdout flags", async () => {
    const executor = vi.fn(
      async ({
        benchmark,
        variant,
        is_holdout
      }: {
        benchmark: { id: string };
        variant: { id: HarnessVariantId };
        is_holdout: boolean;
      }) => ({
        benchmark_id: benchmark.id,
        variant_id: variant.id,
        score:
          benchmark.id === "HarmBench"
            ? variant.id === "full_harness"
              ? 0.9
              : 0.7
            : variant.id === "baseline"
              ? 0.5
              : variant.id === "no_harness"
                ? 0.6
                : 0.8,
        latency_ms: is_holdout ? 200 : 100,
        passed: true
      })
    );

    const result = await runBenchmarkMatrix({
      track: "research",
      variants: createDefaultAgentVariants(),
      benchmarkIds: ["SciFact", "TruthfulQA", "HarmBench"],
      executor
    });

    expect(executor).toHaveBeenCalledTimes(9);
    expect(result.runs).toHaveLength(9);
    expect(result.runs.filter((run) => run.is_holdout)).toHaveLength(3);
    expect(
      result.runs
        .filter((run) => run.is_holdout)
        .map((run) => run.benchmark_id)
    ).toEqual(["HarmBench", "HarmBench", "HarmBench"]);
  });
});

describe("summarizeBenchmarkMatrix", () => {
  it("computes per-variant optimization and holdout means plus deltas vs baseline", async () => {
    const matrix = await runBenchmarkMatrix({
      track: "research",
      variants: createDefaultAgentVariants(),
      benchmarkIds: ["SciFact", "TruthfulQA", "HarmBench"],
      executor: async ({ benchmark, variant }) => ({
        benchmark_id: benchmark.id,
        variant_id: variant.id,
        score:
          variant.id === "baseline"
            ? benchmark.id === "HarmBench"
              ? 0.5
              : 0.4
            : variant.id === "no_harness"
              ? benchmark.id === "HarmBench"
                ? 0.55
                : 0.45
              : benchmark.id === "HarmBench"
                ? 0.8
                : 0.75,
        latency_ms: 125,
        passed: true
      })
    });

    const summary = summarizeBenchmarkMatrix(matrix, {
      baselineVariantId: "baseline"
    });

    expect(summary.variants).toEqual([
      expect.objectContaining({
        variant_id: "baseline",
        optimization_mean: 0.4,
        holdout_mean: 0.5
      }),
      expect.objectContaining({
        variant_id: "no_harness",
        optimization_mean: 0.45,
        holdout_mean: 0.55
      }),
      expect.objectContaining({
        variant_id: "full_harness",
        optimization_mean: 0.75,
        holdout_mean: 0.8
      })
    ]);

    expect(summary.deltas).toContainEqual(
      expect.objectContaining({
        variant_id: "full_harness",
        vs_variant_id: "baseline",
        optimization_delta: 0.35,
        holdout_delta: 0.3
      })
    );

    expect(summary.per_benchmark_deltas).toContainEqual(
      expect.objectContaining({
        benchmark_id: "SciFact",
        variant_id: "full_harness",
        delta_vs_baseline: 0.35
      })
    );
  });
});

describe("runLocalCustomBenchmarkMatrix", () => {
  it("runs local custom benchmarks across the three harness variants", async () => {
    const result = await runLocalCustomBenchmarkMatrix({
      track: "socratic",
      benchmarkIds: ["custom_anti_sycophancy"]
    });

    expect(result.matrix.runs).toHaveLength(3);
    expect(result.summary.variants).toHaveLength(3);
    expect(
      result.summary.variants.find((variant) => variant.variant_id === "full_harness")
        ?.optimization_mean
    ).toBeGreaterThanOrEqual(
      result.summary.variants.find((variant) => variant.variant_id === "baseline")
        ?.optimization_mean ?? 0
    );
  });
});
