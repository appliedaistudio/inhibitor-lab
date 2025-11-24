# Policy-to-Rule Examples

These examples showcase the new policy-to-rule generation capability for the Inhibitor service. New adopters can see how narrative policy language becomes deterministic DILL rules that the runtime enforces. If you are following the [Inhibitor Application Sprint](../inhibitor-application-sprint.md), this folder sits in the early "define the inhibitions" stage—offering tangible artifacts that bridge policy writing and enforcement.

This folder shows how inhibitor-ready rules are produced from customer policies and what a generated rule set looks like in practice. It is written for technical users who want to understand the lifecycle of policy text → DILL rules → runtime inhibition without needing to inspect internal notebooks.

## What lives here

- `input_documents/` — sample customer policies (HR, data governance, API usage, vendor risk, etc.).
- `output_rule_document/` — a single JSON envelope (`examplecorp_general_inhibitor_api_keys.json`) containing the rules derived from the inputs, already packaged in the DILL RuleDocument format the inhibitor consumes.

You can read the inputs to see the original intent and compare them with the emitted rules to understand how the pipeline interprets real-world language.

## Quick tour of an input → output pairing

A policy clause from `input_documents/hr_policy_background_checks.txt`:

```
- Background checks must be completed before a start date is assigned.
- Offer letters may not be sent if the candidate is missing legal name or date of birth (YYYY-MM-DD).
```

The corresponding generated rule in `output_rule_document/examplecorp_general_inhibitor_api_keys.json`:

```json
{
  "rule_id": "background-checks-must-be-completed-befo-54992755",
  "description": "Background checks must be completed before a start date is assigned.",
  "bindings": [
    {"name": "background_check_date", "pattern": "(?P<background_check_date>\\d{4}-\\d{2}-\\d{2})", "type": "date"},
    {"name": "start_date", "pattern": "(?P<start_date>\\d{4}-\\d{2}-\\d{2})", "type": "date"}
  ],
  "lambdas": [
    {
      "lambda": "lambda(background_check_date, start_date). !background_check_date || !start_date || background_check_date <= start_date",
      "on_fail": "Background check must be completed before a start date is assigned."
    }
  ]
}
```

The description echoes the policy text, bindings show what data the inhibitor extracts, and the lambda expresses the enforcement logic.

## How rule generation works (conceptual)

1. **Collect & normalize policy sources** — ingest customer documents (TXT, Markdown, PDF, DOCX) and normalize text so downstream processing is deterministic.
2. **Find enforceable constraints** — detect statements that are testable (thresholds, formats, conditional requirements) and drop descriptive or aspirational language.
3. **Design bindings** — identify the minimum structured inputs needed to check each constraint and propose named regex captures plus semantic types (`string`, `number`, `date`, `id`).
4. **Author lambdas** — translate each constraint into one or more boolean expressions that mirror the original intent, including clear `on_fail` messages.
5. **Validate aggressively** — reject malformed bindings or lambdas, ensure capture groups match parameter order, and keep only schema-compliant rules.
6. **Package for distribution** — assemble validated rules into a DILL envelope under the organization/domain so they can be shipped as metadata (e.g., alongside API keys).

These steps rely on LLM-assisted interpretation for extraction and authoring, plus deterministic validation to ensure only safe, executable logic is emitted. Implementation details are internal; the artifacts here show the expected outcomes.

## How the inhibitor uses these rules

1. **Semantic extraction guided by bindings** — for each rule, the inhibitor presents the input payload and each binding regex to an LLM extractor. The extractor returns best-fit values (not just literal regex matches), producing a map of variable names to strings.
2. **Validation and preparation** — the runtime confirms that bindings were returned in the right order and that the rule document is structurally valid. Missing bindings are noted but do not automatically fail the rule.
3. **Deterministic evaluation** — lambdas run in a sandboxed, side-effect-free JavaScript environment. Each lambda returns `true` to pass or `false` to trigger inhibition with its `on_fail` message. Evaluation short-circuits on the first failure.
4. **Result handling** — if all lambdas pass, the request proceeds. If any lambda fails, the inhibitor responds with the associated message so callers know exactly which policy guardrail was violated.

This model is fast (no vector search), auditable (rules are explicit JSON), and portable across domains because the rule schema is domain-agnostic.

## Working with the examples

- Browse `input_documents/` to see the natural-language policies that drive rule creation, including API usage guidance (rate limits, payload rules), security requirements (PII handling), and trust & safety guardrails (blocklists, moderation thresholds).
- Open `output_rule_document/examplecorp_general_inhibitor_api_keys.json` to inspect every generated rule. Each entry includes `bindings`, `lambdas`, and a `description`, ready to embed in metadata such as `INHIBITOR_API_KEYS`.
- Compare inputs to outputs to understand how thresholds, identifiers, and conditional enforcement are encoded. For instance, API-key presence in the input set maps to a simple binding (`api_key`) and a lambda that blocks when it is empty.

## Expectations for your own documents

- Provide policy text that states concrete requirements (formats, limits, dependencies, required identifiers). Clear statements become precise bindings and lambdas.
- Ambiguous or narrative content is filtered out rather than turned into fragile logic.
- The resulting DILL envelope is self-contained: it carries rule IDs, human-readable descriptions, extraction hints, and executable checks. Drop it next to an API key or client config, and the inhibitor will enforce it deterministically at runtime.

Use the examples in this folder as a blueprint for how your policies will be translated into enforceable inhibition rules.
