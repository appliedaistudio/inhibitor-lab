# Policy-to-Rule Examples

## Purpose of this folder
This folder contains example policy input documents, an example generated rule document, and a high-level overview of how policy text is transformed into enforceable rules. The materials here illustrate the end-to-end workflow without relying on notebooks or implementation code.

## Input policy documents
The files in `input_documents/` are sample policy or requirements documents. They represent the kinds of customer policies from which enforceable rules are extracted, and they serve as the foundation for producing inhibition logic.

## Output rule document
The file in `output_rule_document/` is an example rule document used by the inhibitor. It contains:
- A human-readable rule description
- A list of inputs ("bindings") that the inhibitor must extract from a request
- Executable logic ("lambdas") that decide whether to inhibit a request

At runtime, the inhibitor loads these rule documents and evaluates the logic against incoming requests. If a rule evaluates to false, the inhibitor triggers a block with the associated message.

## Knowledge-to-Rule workflow (high level)
1. **Document ingestion & normalization** – Input policy text is cleaned and split into manageable chunks.
2. **Constraint extraction** – An LLM identifies enforceable requirements from the text.
3. **Binding design** – A second LLM determines which structured inputs (IDs, amounts, dates, etc.) must be extracted from customer requests to evaluate each constraint.
4. **Rule logic authoring** – A third LLM translates each constraint into boolean rule logic using only a restricted safe subset of operations.
5. **Gated validation steps** – Invalid constraints are dropped, invalid bindings are dropped, and invalid logic expressions are dropped so only valid rules are carried forward.
6. **Semantic review using an internal AI validator** – An internal AI semantic checker assesses whether the rule mirrors the original policy, whether the bindings match the text, and whether the logic implements the intended behavior. This step improves accuracy beyond mechanical tests because interpreting policy language requires nuanced understanding.
7. **Final rule document assembly** – The surviving rules are assembled into a metadata structure the inhibitor can consume.

These steps collectively ensure that policy language is transformed into reliable, executable rules the inhibitor can enforce.
