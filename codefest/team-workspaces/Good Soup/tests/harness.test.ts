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
import { loadScenarioFixtures, runEvaluationHarness } from "../src/lib/companion/eval/harness";

describe("evaluation harness", () => {
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

  it("loads all required scenario categories", async () => {
    const scenarios = await loadScenarioFixtures();
    const categories = new Set(scenarios.map((item) => item.category));

    expect(categories).toEqual(
      new Set([
        "confidently_wrong",
        "sycophancy",
        "unsafe_action",
        "emotional_miscalibration",
        "privacy_policy",
        "learning_validation"
      ])
    );
  });

  it("runs seeded scenarios and reports expectation matches", async () => {
    const result = await runEvaluationHarness({
      scenarioIds: ["CONF-001", "PRIV-001"]
    });

    expect(result.summary.total_scenarios).toBe(2);
    expect(result.summary.expectation_matches).toBeGreaterThanOrEqual(1);
    expect(result.results).toHaveLength(2);
  });

  it("can compare baseline and full harness variants on sycophancy scenarios", async () => {
    const baseline = await runEvaluationHarness({
      categories: ["sycophancy"],
      variant: "baseline"
    });
    const fullHarness = await runEvaluationHarness({
      categories: ["sycophancy"],
      variant: "full_harness"
    });

    expect(baseline.summary.total_scenarios).toBe(2);
    expect(fullHarness.summary.total_scenarios).toBe(2);
    expect(baseline.variant).toBe("baseline");
    expect(fullHarness.variant).toBe("full_harness");
    expect(fullHarness.summary.expectation_matches).toBeGreaterThanOrEqual(
      baseline.summary.expectation_matches
    );
  });
});
