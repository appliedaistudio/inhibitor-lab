import { describe, expect, it } from "vitest";

import {
  createDefaultMetaHarnessPlan,
  scoreMetaHarnessCandidate,
} from "../src/lib/companion/harness/meta-harness";
import {
  getBenchmarkRegistryForTrack,
  isBenchmarkHeldOut,
} from "../src/lib/companion/harness/benchmarks";

describe("benchmark registry", () => {
  it("keeps HarmBench out of optimization suites for research", () => {
    const registry = getBenchmarkRegistryForTrack("research");

    expect(registry.optimization_suites.map((suite) => suite.id)).not.toContain("HarmBench");
    expect(registry.holdout_suites.map((suite) => suite.id)).toContain("HarmBench");
    expect(isBenchmarkHeldOut("HarmBench")).toBe(true);
  });

  it("includes anti-sycophancy as a cross-cutting objective for every product track", () => {
    expect(createDefaultMetaHarnessPlan("research").optimization_objectives).toContain("anti_sycophancy");
    expect(createDefaultMetaHarnessPlan("socratic").optimization_objectives).toContain("anti_sycophancy");
    expect(createDefaultMetaHarnessPlan("retention_learning").optimization_objectives).toContain("anti_sycophancy");
  });
});

describe("scoreMetaHarnessCandidate", () => {
  it("scores optimization suites separately from holdout suites", () => {
    const plan = createDefaultMetaHarnessPlan("research");
    const result = scoreMetaHarnessCandidate(plan, [
      { benchmark_id: "SciFact", score: 0.8 },
      { benchmark_id: "TruthfulQA", score: 0.6 },
      { benchmark_id: "HarmBench", score: 0.95 },
    ]);

    expect(result.optimization_score).toBeCloseTo(0.7, 5);
    expect(result.holdout_score).toBeCloseTo(0.95, 5);
    expect(result.optimization_count).toBe(2);
    expect(result.holdout_count).toBe(1);
  });
});
