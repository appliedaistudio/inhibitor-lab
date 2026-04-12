import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  EvaluationHarnessResult,
  EvaluationScenario,
  EvaluationScenarioResult,
  EvaluationScenarioResult as ScenarioResult,
  HarnessEvaluationVariant,
  PrimaryAgentResult,
  ScenarioCategory,
  VerifierName
} from "../contracts";
import { runCompanionPipeline } from "../pipeline";
import { createMemorySessionStore } from "../session-store";

export async function loadScenarioFixtures(): Promise<EvaluationScenario[]> {
  const filePath = path.join(process.cwd(), "data", "scenarios", "eval-scenarios.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as EvaluationScenario[];
}

function verifierMatches(
  expected: Partial<Record<VerifierName, "pass" | "warn" | "fail">> | undefined,
  actual: { verifier_name: VerifierName; verdict: "pass" | "warn" | "fail" }[]
): Partial<Record<VerifierName, boolean>> {
  if (!expected) {
    return {};
  }

  const actualMap = new Map(actual.map((item) => [item.verifier_name, item.verdict]));
  return Object.fromEntries(
    Object.entries(expected).map(([verifierName, verdict]) => [verifierName, actualMap.get(verifierName as VerifierName) === verdict])
  ) as Partial<Record<VerifierName, boolean>>;
}

function mockPrimaryAgentResult(scenario: EvaluationScenario): PrimaryAgentResult {
  return {
    draft: scenario.mock_draft,
    runtime: {
      backend: "eval-harness",
      agent: "scenario-mock",
      session_id: `eval-${scenario.id}`,
      degraded: false
    }
  };
}

async function runScenario(scenario: EvaluationScenario): Promise<ScenarioResult> {
  return runScenarioForVariant(scenario, "full_harness");
}

function createVariantDependencies(
  scenario: EvaluationScenario,
  variant: HarnessEvaluationVariant
): Parameters<typeof runCompanionPipeline>[1] {
  const baseDependencies = {
    retrieveLocalEvidence:
      variant === "baseline"
        ? async () => []
        : async () => scenario.evidence.filter((item) => item.source_type === "local_corpus"),
    retrieveOpenAlexEvidence:
      variant === "baseline"
        ? async () => []
        : async () => scenario.evidence.filter((item) => item.source_type === "openalex"),
    primaryAgent: async () => mockPrimaryAgentResult(scenario),
    auditWriter: async () => undefined,
    sessionStore: createMemorySessionStore()
  };

  if (variant === "baseline") {
    return {
      ...baseDependencies,
      inhibitor: async () => ({
        blocked: false,
        reasons: [],
        raw: { mocked: true, variant }
      }),
      runVerifiers: async () => []
    };
  }

  if (variant === "no_harness") {
    return {
      ...baseDependencies,
      inhibitor: async () => ({
        blocked: Boolean(scenario.blocked_by_inhibitor),
        reasons: scenario.blocked_by_inhibitor ? ["scenario_blocked"] : [],
        raw: { mocked: true, variant }
      }),
      runVerifiers: async () => []
    };
  }

  return {
    ...baseDependencies,
    inhibitor: async () => ({
      blocked: Boolean(scenario.blocked_by_inhibitor),
      reasons: scenario.blocked_by_inhibitor ? ["scenario_blocked"] : [],
      raw: { mocked: true, variant }
    })
  };
}

async function runScenarioForVariant(
  scenario: EvaluationScenario,
  variant: HarnessEvaluationVariant
): Promise<ScenarioResult> {
  const result = await runCompanionPipeline(
    {
      session_id: `eval-${scenario.id}`,
      mode: scenario.mode,
      user_message: scenario.user_message
    },
    createVariantDependencies(scenario, variant)
  );

  const actualDecision = result.decision.decision;
  const matchesDecision = actualDecision === scenario.expected.decision;
  const matchesByVerifier = verifierMatches(scenario.expected.verifier_verdicts, result.judgments);
  const allVerifierMatches = Object.values(matchesByVerifier).every(Boolean);
  const matched = matchesDecision && allVerifierMatches;

  return {
    scenario_id: scenario.id,
    category: scenario.category,
    expected_decision: scenario.expected.decision,
    actual_decision: actualDecision,
    matched,
    verifier_matches: matchesByVerifier
  };
}

export async function runEvaluationHarness(options?: {
  scenarioIds?: string[];
  categories?: ScenarioCategory[];
  variant?: HarnessEvaluationVariant;
}): Promise<EvaluationHarnessResult> {
  const scenarios = await loadScenarioFixtures();
  const variant = options?.variant ?? "full_harness";
  const selected = scenarios.filter((scenario) => {
    if (options?.scenarioIds && !options.scenarioIds.includes(scenario.id)) {
      return false;
    }

    if (options?.categories && !options.categories.includes(scenario.category)) {
      return false;
    }

    return true;
  });
  const results: EvaluationScenarioResult[] = await Promise.all(
    selected.map((scenario) => runScenarioForVariant(scenario, variant))
  );

  return {
    variant,
    summary: {
      total_scenarios: results.length,
      expectation_matches: results.filter((item) => item.matched).length
    },
    results
  };
}
