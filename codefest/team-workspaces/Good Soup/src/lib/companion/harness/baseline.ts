export type HarnessVariantId = "baseline" | "no_harness" | "full_harness";

export interface HarnessVariant {
  id: HarnessVariantId;
  label: string;
  description: string;
  uses_inhibitor: boolean;
  uses_verifiers: boolean;
  uses_revision_loop: boolean;
}

const DEFAULT_AGENT_VARIANTS: HarnessVariant[] = [
  {
    id: "baseline",
    label: "Baseline Agent",
    description: "Direct user-to-model path with no custom harnessing.",
    uses_inhibitor: false,
    uses_verifiers: false,
    uses_revision_loop: false
  },
  {
    id: "no_harness",
    label: "Primary Agent Only",
    description: "Uses a single-pass primary agent with benchmark evidence, without inhibitor, verifier, or revision scaffolding.",
    uses_inhibitor: false,
    uses_verifiers: false,
    uses_revision_loop: false
  },
  {
    id: "full_harness",
    label: "Improving Harness",
    description: "Uses the full inhibitor, verifier, and hidden revision loop pipeline.",
    uses_inhibitor: true,
    uses_verifiers: true,
    uses_revision_loop: true
  }
];

export function createDefaultAgentVariants(): HarnessVariant[] {
  return DEFAULT_AGENT_VARIANTS.map((variant) => ({ ...variant }));
}
