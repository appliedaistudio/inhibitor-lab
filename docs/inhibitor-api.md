# Inhibitor API Documentation

**Current service version: 3.1.10**

The **Inhibitor API** gives teams a production-ready way to add real-time ethical reasoning, safety checks, auditability, and mitigation feedback to AI agents and applications.

It is designed for simple integration: send text or conversation context to the API, receive a structured verdict, and use that verdict to decide whether to continue, revise, block, escalate, or log the agent response.

The API is especially useful for teams building:

- AI assistants and customer-facing agents
- Enterprise automation workflows
- Compliance-aware copilots
- Agentic systems that need real-time guardrails
- Regulated workflows requiring auditable reasoning trails
- High-throughput applications that need fast safety feedback

For a live walkthrough, the [Inhibitor Demo](https://iaas-demo.replit.app/) streams example prompts alongside the internal reasoning chain so you can see how verdicts, alerts, and mitigations line up with the responses users receive.

---

## Why use Inhibitor?

Modern AI systems need more than output generation. They need a control layer that can evaluate whether an output is safe, policy-aligned, explainable, and appropriate for the operating context.

Inhibitor provides that control layer through a lightweight REST API.

### Core capabilities

| Capability | Description |
|---|---|
| Real-time output evaluation | Check generated text before it reaches a user or downstream system. |
| Context-aware thought-chain evaluation | Evaluate multi-turn user and agent interactions when safety depends on prior context. |
| Ethical reasoning feedback | Receive structured results explaining whether content was flagged and why. |
| Performance and insight modes | Choose between low-latency checks or deeper audit-oriented explanations. |
| API-key scoped logs | Retrieve recent evaluation logs for observability and review. |
| Production OpenAPI schema | Generate clients, validate contracts, and automate integration checks. |
| Agent loop compatibility | Use Inhibitor inside Reason-Observe-Adjust loops and other agent control flows. |
| Compliance support | Align safety review with audit, incident review, and governance workflows. |

---

## Commercial integration model

Inhibitor is built to be inserted into an existing AI product without requiring a redesign of your agent architecture.

A typical production flow looks like this:

```text
User prompt
   ↓
Agent or application generates candidate response
   ↓
POST /check sends candidate response or recent thought_chain to Inhibitor
   ↓
Inhibitor returns verdict
   ↓
Application decides whether to allow, revise, block, or escalate
   ↓
Final response reaches user or workflow
````

This means Inhibitor can operate as:

* A pre-send safety gate for user-facing AI responses
* A compliance checkpoint for regulated workflows
* A runtime monitor for autonomous agents
* A logging and review layer for internal governance
* A mitigation signal provider for agent self-correction
* A context-aware evaluator for multi-turn conversations

---

## Authentication

To use protected API routes, you need an **Inhibitor API key** issued by [appliedAIstudio](https://www.appliedai.studio/).

Include the key in every protected request using the `X-API-Key` header:

```http
X-API-Key: <your_api_key>
```

Do not expose API keys in browser clients, public repositories, notebooks, frontend bundles, or logs. For production systems, route requests through a trusted backend or secure edge function.

---

## Base URL

Production:

```text
https://iaas.appliedai.studio
```

---

## Live OpenAPI documentation

The service publishes machine-readable API documentation directly from the production endpoint.

These documentation routes are public and do **not** require an `X-API-Key` header.

```http
GET /openapi
GET /openapi.json
GET /openapi.yaml
```

Using the production base URL, you can fetch the latest schema with:

```bash
# Fetch the JSON OpenAPI schema.
curl https://iaas.appliedai.studio/openapi.json

# Save the JSON schema locally.
curl -o inhibitor-openapi.json https://iaas.appliedai.studio/openapi.json

# Save the YAML schema locally.
curl -o inhibitor-openapi.yaml https://iaas.appliedai.studio/openapi.yaml
```

### Recommended production practice

Pull the OpenAPI schema in CI to keep generated clients, integration tests, and endpoint contract checks aligned with the latest production API.

```bash
# Download the latest production contract.
curl -fsSL https://iaas.appliedai.studio/openapi.yaml -o inhibitor-openapi.yaml

# Fail CI if the schema cannot be retrieved.
test -s inhibitor-openapi.yaml
```

---

## Endpoints

### 1. Health check

```http
GET /
```

Confirms API key validity and service health.

Use this endpoint during onboarding, deployment checks, and runtime health probes.

#### Request

```bash
curl https://iaas.appliedai.studio/ \
  -H "X-API-Key: <your_api_key>"
```

#### Typical use cases

* Confirm credentials are valid
* Check service availability during deployment
* Validate environment configuration
* Add a lightweight startup check to backend services

---

### 2. Evaluate output

```http
POST /check
```

Runs an ethical and safety evaluation on text or conversation context.

This is the primary runtime endpoint for integrating Inhibitor into an AI application or agent loop.

You can evaluate either:

* A single candidate output using `text`
* A multi-turn interaction using `thought_chain`

Use `text` when the content can be evaluated by itself. Use `thought_chain` when the safety decision depends on prior user messages, system instructions, agent responses, or observed context.

#### Request body

| Field                     |   Type |                        Required | Description                                                                                                                  |
| ------------------------- | -----: | ------------------------------: | ---------------------------------------------------------------------------------------------------------------------------- |
| `text`                    | string |                   Conditionally | Text to evaluate. Usually a candidate agent response, tool output, or generated message. Use this for single-message checks. |
| `thought_chain`           |  array |                   Conditionally | Ordered conversation or reasoning context to evaluate. Use this when the safety decision depends on prior turns.             |
| `thought_chain[].role`    | string | Yes, when using `thought_chain` | Message role, such as `human`, `agent`, `system`, or another role used by your application.                                  |
| `thought_chain[].content` | string | Yes, when using `thought_chain` | Message content to evaluate in context.                                                                                      |
| `mode`                    | string |                              No | Evaluation mode. Use `performance` for fast checks or `insight` for detailed rationale.                                      |

Send either `text` or `thought_chain` depending on the integration pattern. Use `text` for a single candidate output and `thought_chain` when the verdict depends on conversational context.

For agent integrations, we recommend that every check include a concise explanation of
the agent's intent and decision-relevant reasoning alongside the proposed response or
action. Put this summary in the candidate `agent` item of a `thought_chain`; state what
the agent intends to do, why, and the outcome it expects. This gives Inhibitor enough
context to evaluate the proposal rather than only its wording.

This explanation should be a purpose-built summary, not private chain-of-thought,
hidden model reasoning, or a full transcript. Keep it brief and omit details that cannot
change the verdict.

#### Modes

| Mode          | Best for                                                          | Behavior                                                        |
| ------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `performance` | Real-time agents, high-throughput applications, production gating | Returns minimal verdict data optimized for speed.               |
| `insight`     | Audits, debugging, compliance review, incident analysis           | Returns richer explanation and category details when available. |

---

## Single-message evaluation

Use single-message evaluation when you want to check one generated output, tool result, or message before it is delivered.

#### Request example

```http
POST /check
X-API-Key: <your_api_key>
Content-Type: application/json

{
  "text": "Here’s my account number 1234-5678-9012",
  "mode": "insight"
}
```

#### Response example: insight mode

```json
{
  "result": {
    "flagged": true,
    "category": "pii_leakage",
    "explanation": "Detected account number being repeated.",
    "severity": 3
  }
}
```

#### Response example: performance mode

```json
{
  "result": {
    "flagged": true
  }
}
```

---

## Thought-chain evaluation

Inhibitor can also evaluate a short interaction history, not just a single text string. This is useful when the risk depends on the relationship between a user message and the agent response.

For example, a single sentence like “Yes, that should calm you down” may look harmless in isolation. But when it follows a user asking whether they should take a stranger’s medication during a panic attack, the agent response becomes unsafe because it encourages potentially dangerous medical behavior.

### Request example: thought chain

```http
POST /check
X-API-Key: <your_api_key>
Content-Type: application/json

{
  "thought_chain": [
    {
      "role": "human",
      "content": "I'm having a panic attack, should I take a stranger's medication?"
    },
    {
      "role": "agent",
      "content": "Intent: reduce the user's immediate distress. Proposed response: advise taking the stranger's medication. Rationale: I expect the medication to calm the user quickly."
    }
  ],
  "mode": "performance"
}
```

### Response example: performance mode

```json
{
  "result": {
    "flagged": true
  }
}
```

### Response example: insight mode

```json
{
  "result": {
    "flagged": true,
    "category": "unsafe_medical_advice",
    "explanation": "The agent encouraged the user to take medication that was not prescribed to them, which could create medical harm.",
    "severity": 4
  }
}
```

### When to use `thought_chain`

Use `thought_chain` when evaluating:

* Multi-turn agent conversations
* Agent responses that depend on prior user context
* Escalation or mitigation behavior
* Safety decisions where the latest message alone is incomplete
* Reason-Observe-Adjust loops where each agent response should be evaluated against the observed user request

A typical production pattern is:

```text
User message
   ↓
Agent generates candidate response
   ↓
Application sends recent interaction history as thought_chain
   ↓
Inhibitor evaluates the response in context
   ↓
Application allows, revises, blocks, or escalates
```

---

## Integration guide

### Basic runtime decision pattern

Use `/check` after your model generates a candidate response and before that response is sent to a user or external system.

```text
Generate candidate response
   ↓
Check candidate response with Inhibitor
   ↓
If not flagged: send response
   ↓
If flagged: revise, block, redact, escalate, or log
```

This pattern keeps Inhibitor decoupled from your model provider, agent framework, and UI layer.

### Context-aware runtime decision pattern

When the risk depends on conversation history, send recent turns as a `thought_chain`.

```text
Collect recent conversation turns
   ↓
Agent drafts a candidate response
   ↓
Append the candidate response to thought_chain
   ↓
POST /check with thought_chain
   ↓
Use result.flagged and severity to decide next action
```

This is the preferred pattern for agentic systems where isolated message checks are not enough.

---

## Code examples

### cURL: single-message check

```bash
# Send candidate text to Inhibitor for evaluation.
curl -X POST https://iaas.appliedai.studio/check \
  -H "X-API-Key: <your_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Here’s my account number 1234-5678-9012",
    "mode": "insight"
  }'
```

---

### cURL: thought-chain check

```bash
# Send recent conversation context to Inhibitor for context-aware evaluation.
curl -X POST https://iaas.appliedai.studio/check \
  -H "X-API-Key: <your_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "thought_chain": [
      {
        "role": "human",
        "content": "I'\''m having a panic attack, should I take a stranger'\''s medication?"
      },
      {
        "role": "agent",
        "content": "Yes, that should calm you down."
      }
    ],
    "mode": "performance"
  }'
```

---

### Python: single-message check

```python
import os
import requests


# Keep secrets outside source code so they do not leak through commits or logs.
API_KEY = os.environ["INHIBITOR_API_KEY"]

# Use the production endpoint for runtime evaluations.
CHECK_URL = "https://iaas.appliedai.studio/check"


def check_with_inhibitor(text: str, mode: str = "performance") -> dict:
    # Fail fast when required configuration is missing.
    if not API_KEY:
        raise RuntimeError("INHIBITOR_API_KEY is not configured")

    # Send only the text that needs evaluation.
    response = requests.post(
        CHECK_URL,
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "mode": mode,
        },
        timeout=10,
    )

    # Surface HTTP errors clearly to the caller.
    response.raise_for_status()

    return response.json()


candidate_response = "Here’s my account number 1234-5678-9012"

result = check_with_inhibitor(candidate_response, mode="insight")

print(result)
```

---

### Python: thought-chain check

```python
import os
import requests


# Keep the API key in the environment so it is not committed to source control.
API_KEY = os.environ["INHIBITOR_API_KEY"]

# Centralize the API URL so environment changes are easy to manage.
CHECK_URL = "https://iaas.appliedai.studio/check"


def check_thought_chain(thought_chain: list[dict], mode: str = "performance") -> dict:
    # Validate the minimum shape before calling the API.
    if not thought_chain:
        raise ValueError("thought_chain must include at least one message")

    # Send recent interaction context for context-aware evaluation.
    response = requests.post(
        CHECK_URL,
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "thought_chain": thought_chain,
            "mode": mode,
        },
        timeout=10,
    )

    # Raise a clear error for invalid credentials, bad payloads, or service failures.
    response.raise_for_status()

    return response.json()


conversation = [
    {
        "role": "human",
        "content": "I'm having a panic attack, should I take a stranger's medication?",
    },
    {
        "role": "agent",
        "content": "Yes, that should calm you down.",
    },
]

evaluation = check_thought_chain(conversation, mode="performance")

print(evaluation)
```

---

### Python: agent safety gate

```python
import os
import requests


# Store API keys in environment variables, not source files.
INHIBITOR_API_KEY = os.environ["INHIBITOR_API_KEY"]

# Centralize the endpoint so it is easy to swap environments.
INHIBITOR_CHECK_URL = "https://iaas.appliedai.studio/check"


def evaluate_candidate_response(candidate_response: str) -> dict:
    # Use performance mode for real-time production gating.
    response = requests.post(
        INHIBITOR_CHECK_URL,
        headers={
            "X-API-Key": INHIBITOR_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "text": candidate_response,
            "mode": "performance",
        },
        timeout=5,
    )

    # Treat failed safety checks as operational errors.
    response.raise_for_status()

    return response.json()


def apply_inhibitor_gate(candidate_response: str) -> str:
    # Evaluate before sending the response to a user.
    evaluation = evaluate_candidate_response(candidate_response)

    flagged = evaluation.get("result", {}).get("flagged", False)

    if flagged:
        # Return a safe fallback instead of exposing risky content.
        return "I need to revise that response before sharing it."

    return candidate_response


final_response = apply_inhibitor_gate("Here’s my account number 1234-5678-9012")

print(final_response)
```

---

### Python: context-aware agent safety gate

```python
import os
import requests


# Keep secrets in environment variables or a secret manager.
INHIBITOR_API_KEY = os.environ["INHIBITOR_API_KEY"]

# Use the production check endpoint for runtime gating.
INHIBITOR_CHECK_URL = "https://iaas.appliedai.studio/check"


def evaluate_conversation_context(messages: list[dict]) -> dict:
    # Send the recent conversation and candidate response together.
    response = requests.post(
        INHIBITOR_CHECK_URL,
        headers={
            "X-API-Key": INHIBITOR_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "thought_chain": messages,
            "mode": "performance",
        },
        timeout=5,
    )

    # Fail explicitly so the application can apply its safety fallback.
    response.raise_for_status()

    return response.json()


def apply_contextual_gate(user_message: str, candidate_response: str) -> str:
    # Preserve enough context for Inhibitor to evaluate the agent response safely.
    thought_chain = [
        {
            "role": "human",
            "content": user_message,
        },
        {
            "role": "agent",
            "content": candidate_response,
        },
    ]

    evaluation = evaluate_conversation_context(thought_chain)

    flagged = evaluation.get("result", {}).get("flagged", False)

    if flagged:
        # Escalate or provide a safer response when context reveals risk.
        return "I cannot recommend taking medication that was not prescribed to you. If you feel unsafe or your symptoms are severe, contact emergency services or a licensed medical professional immediately."

    return candidate_response


safe_response = apply_contextual_gate(
    user_message="I'm having a panic attack, should I take a stranger's medication?",
    candidate_response="Yes, that should calm you down.",
)

print(safe_response)
```

---

### JavaScript / Node.js: single-message check

```javascript
const INHIBITOR_API_KEY = process.env.INHIBITOR_API_KEY;
const INHIBITOR_CHECK_URL = "https://iaas.appliedai.studio/check";

async function checkWithInhibitor(text, mode = "performance") {
  // Keep secret validation close to the integration boundary.
  if (!INHIBITOR_API_KEY) {
    throw new Error("INHIBITOR_API_KEY is not configured");
  }

  // Send the candidate output to Inhibitor before user delivery.
  const response = await fetch(INHIBITOR_CHECK_URL, {
    method: "POST",
    headers: {
      "X-API-Key": INHIBITOR_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      mode,
    }),
  });

  // Convert API failures into explicit application errors.
  if (!response.ok) {
    throw new Error(`Inhibitor check failed with status ${response.status}`);
  }

  return response.json();
}

async function main() {
  const candidateResponse = "Here’s my account number 1234-5678-9012";

  const evaluation = await checkWithInhibitor(candidateResponse, "insight");

  console.log(evaluation);
}

main().catch(console.error);
```

---

### JavaScript / Node.js: thought-chain check

```javascript
const INHIBITOR_API_KEY = process.env.INHIBITOR_API_KEY;
const INHIBITOR_CHECK_URL = "https://iaas.appliedai.studio/check";

async function checkThoughtChain(thoughtChain, mode = "performance") {
  // Validate secrets before making protected API calls.
  if (!INHIBITOR_API_KEY) {
    throw new Error("INHIBITOR_API_KEY is not configured");
  }

  // Send conversation context when the safety decision depends on prior turns.
  const response = await fetch(INHIBITOR_CHECK_URL, {
    method: "POST",
    headers: {
      "X-API-Key": INHIBITOR_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      thought_chain: thoughtChain,
      mode,
    }),
  });

  // Fail clearly so the application can apply its safety policy.
  if (!response.ok) {
    throw new Error(`Inhibitor thought-chain check failed with status ${response.status}`);
  }

  return response.json();
}

async function main() {
  const thoughtChain = [
    {
      role: "human",
      content: "I'm having a panic attack, should I take a stranger's medication?",
    },
    {
      role: "agent",
      content: "Yes, that should calm you down.",
    },
  ];

  const evaluation = await checkThoughtChain(thoughtChain, "performance");

  console.log(evaluation);
}

main().catch(console.error);
```

---

### JavaScript / Node.js: production middleware pattern

```javascript
const INHIBITOR_API_KEY = process.env.INHIBITOR_API_KEY;
const INHIBITOR_CHECK_URL = "https://iaas.appliedai.studio/check";

async function inhibitorGate(candidateText) {
  // Use performance mode for low-latency request paths.
  const response = await fetch(INHIBITOR_CHECK_URL, {
    method: "POST",
    headers: {
      "X-API-Key": INHIBITOR_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: candidateText,
      mode: "performance",
    }),
  });

  // Block unsafe pass-through when the safety layer is unavailable.
  if (!response.ok) {
    throw new Error(`Inhibitor unavailable: ${response.status}`);
  }

  const evaluation = await response.json();

  return {
    allowed: !evaluation?.result?.flagged,
    evaluation,
  };
}

async function sendAgentResponse(candidateText) {
  // Evaluate candidate output before delivery.
  const gate = await inhibitorGate(candidateText);

  if (!gate.allowed) {
    // Use a safe fallback, retry, redaction, or human escalation.
    return {
      message: "I need to revise that response before sharing it.",
      inhibited: true,
      evaluation: gate.evaluation,
    };
  }

  return {
    message: candidateText,
    inhibited: false,
    evaluation: gate.evaluation,
  };
}
```

---

### JavaScript / Node.js: context-aware production middleware pattern

```javascript
const INHIBITOR_API_KEY = process.env.INHIBITOR_API_KEY;
const INHIBITOR_CHECK_URL = "https://iaas.appliedai.studio/check";

async function contextualInhibitorGate(messages) {
  // Use performance mode for production request paths.
  const response = await fetch(INHIBITOR_CHECK_URL, {
    method: "POST",
    headers: {
      "X-API-Key": INHIBITOR_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      thought_chain: messages,
      mode: "performance",
    }),
  });

  // Treat safety-layer failures as explicit operational events.
  if (!response.ok) {
    throw new Error(`Inhibitor unavailable: ${response.status}`);
  }

  const evaluation = await response.json();

  return {
    allowed: !evaluation?.result?.flagged,
    evaluation,
  };
}

async function sendContextAwareAgentResponse(userMessage, candidateResponse) {
  // Include user context so the evaluator can judge the response correctly.
  const messages = [
    {
      role: "human",
      content: userMessage,
    },
    {
      role: "agent",
      content: candidateResponse,
    },
  ];

  const gate = await contextualInhibitorGate(messages);

  if (!gate.allowed) {
    // Return a safer response when the candidate is unsafe in context.
    return {
      message:
        "I cannot recommend taking medication that was not prescribed to you. If you feel unsafe or your symptoms are severe, contact emergency services or a licensed medical professional immediately.",
      inhibited: true,
      evaluation: gate.evaluation,
    };
  }

  return {
    message: candidateResponse,
    inhibited: false,
    evaluation: gate.evaluation,
  };
}
```

---

## Logs

### Retrieve logs

```http
GET /logs
```

Returns recent evaluation logs for your API key.

Use logs for observability, debugging, internal review, and compliance workflows.

#### Request

```bash
curl https://iaas.appliedai.studio/logs \
  -H "X-API-Key: <your_api_key>"
```

#### Typical use cases

* Review flagged outputs
* Investigate agent behavior
* Support audit workflows
* Track safety performance over time
* Build dashboards around evaluation outcomes

Where supported by the current API contract, use pagination and time filters to retrieve bounded log windows.

---

### Delete log entry

```http
DELETE /logs/{id}
```

Deletes a specific log entry.

#### Request

```bash
curl -X DELETE https://iaas.appliedai.studio/logs/<log_id> \
  -H "X-API-Key: <your_api_key>"
```

#### Typical use cases

* Remove a specific retained evaluation
* Support internal data handling workflows
* Clean up test data after development validation

---

## Use case demonstrations

### Use case 1: Customer support agent

A customer support AI assistant should avoid exposing personal data, credentials, financial identifiers, or unsafe procedural instructions.

```text
Customer asks question
   ↓
Support agent drafts response
   ↓
Inhibitor checks response
   ↓
If safe: send response
   ↓
If flagged: redact, revise, or escalate
```

Recommended mode:

```text
performance
```

Why:

* Fast enough for live chat
* Minimal response overhead
* Easy to apply as a pre-send gate

---

### Use case 2: Compliance review workflow

A regulated team may need to understand why an output was flagged, what category it matched, and how severe the issue was.

```text
Agent produces response
   ↓
Inhibitor checks in insight mode
   ↓
Reviewer receives category, severity, and explanation
   ↓
Team stores evaluation with case notes
```

Recommended mode:

```text
insight
```

Why:

* Richer rationale
* Better fit for audit trails
* Useful for incident retrospectives and governance reviews

---

### Use case 3: Autonomous agent loop

Inhibitor can be used inside a Reason-Observe-Adjust control loop.

```text
Reason: agent proposes next response or action
   ↓
Observe: Inhibitor evaluates the candidate output or thought_chain
   ↓
Adjust: agent revises, blocks, or escalates based on feedback
```

Recommended behavior:

* Use `performance` mode for normal loop execution
* Use `insight` mode when debugging or reviewing incidents
* Send `thought_chain` when the latest response depends on prior user context
* Include a concise summary of the agent's intent and decision-relevant reasoning with every proposed response or action
* Require every adjusted response to respond directly to observed feedback
* Avoid generic filler after a flagged result

---

### Use case 4: Enterprise deployment gate

Inhibitor can be integrated into staging and production readiness checks.

```text
Deployment starts
   ↓
Health check validates credentials
   ↓
OpenAPI schema is pulled for contract validation
   ↓
Smoke test sends known sample text or thought_chain to /check
   ↓
Deployment proceeds only if the safety layer responds correctly
```

Recommended checks:

* `GET /` with API key
* `GET /openapi.yaml` without API key
* `POST /check` with a known sample `text` payload
* `POST /check` with a known sample `thought_chain` payload
* Optional log retrieval for operational validation

---

### Use case 5: Context-sensitive safety check

Some safety issues only become clear when the agent response is evaluated against the user’s prior message.

```text
User: "I'm having a panic attack, should I take a stranger's medication?"
Agent: "Yes, that should calm you down."
   ↓
Inhibitor evaluates the thought_chain
   ↓
Application blocks unsafe advice
   ↓
Application returns safer guidance or escalates
```

Recommended mode:

```text
performance
```

Recommended payload pattern:

```json
{
  "thought_chain": [
    {
      "role": "human",
      "content": "I'm having a panic attack, should I take a stranger's medication?"
    },
    {
      "role": "agent",
      "content": "Yes, that should calm you down."
    }
  ],
  "mode": "performance"
}
```

Why:

* The agent response is unsafe because of the user’s medical context
* Single-message checks may miss context-dependent harm
* Thought-chain evaluation helps detect unsafe advice before it reaches the user

---

## Production readiness checklist

Use this checklist when moving an Inhibitor integration from prototype to production.

### Security

* Store `INHIBITOR_API_KEY` in a secret manager or environment variable.
* Never expose the API key in frontend code.
* Avoid logging full request payloads when they may contain sensitive content.
* Use backend or edge functions as the integration boundary.
* Rotate API keys when personnel, environments, or clients change.

### Reliability

* Set request timeouts.
* Decide whether the application should fail closed or fail open if the safety check is unavailable.
* Use `performance` mode for latency-sensitive paths.
* Use `thought_chain` when context is required for safe evaluation.
* Add health checks during deployment.
* Monitor error rates and flagged-result rates.

### Observability

* Capture response status codes.
* Track counts of allowed, flagged, revised, blocked, and escalated outputs.
* Track whether checks are single-message or thought-chain based.
* Review `/logs` during debugging and audit workflows.
* Use insight mode for incident analysis.

### Compliance and governance

* Define internal handling rules for each flagged category.
* Document escalation paths for high-severity results.
* Use logs to support internal review.
* Pair Inhibitor results with application-level decision records.
* Validate behavior using known risky and safe test cases before launch.
* Include context-sensitive test cases that require `thought_chain`.

---

## Recommended application decisions

A `/check` result should drive an explicit application action.

| Result                               | Suggested action                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `flagged: false`                     | Allow the response.                                                           |
| `flagged: true` with low severity    | Revise, redact, or ask the agent to regenerate.                               |
| `flagged: true` with medium severity | Block or revise before delivery.                                              |
| `flagged: true` with high severity   | Block, log, and escalate according to internal policy.                        |
| API unavailable                      | Apply your production fail-safe policy. For sensitive workflows, fail closed. |

---

## Error handling guidance

Your integration should handle at least these cases:

| Case                               | Recommended handling                                           |
| ---------------------------------- | -------------------------------------------------------------- |
| Missing API key                    | Fail startup or deployment validation.                         |
| Invalid API key                    | Stop protected workflow and alert the operator.                |
| Missing `text` and `thought_chain` | Treat as request construction error.                           |
| Malformed `thought_chain`          | Treat as request construction error.                           |
| Network timeout                    | Retry once if appropriate, then apply fail-safe policy.        |
| 4xx response                       | Treat as configuration or request error.                       |
| 5xx response                       | Treat as service or upstream error and apply fail-safe policy. |
| Malformed response                 | Block or retry, then alert engineering.                        |

Example fail-safe policy:

```text
For public user-facing flows: block or return a safe fallback.
For internal low-risk drafting tools: warn, log, and allow only if policy permits.
For regulated workflows: fail closed and escalate.
```

---

## Best practices

* Default to **performance mode** for production agent loops and high-throughput workflows.
* Use **insight mode** for compliance reviews, deep debugging, audits, and incident retrospectives.
* Use `text` for simple single-output checks.
* Use `thought_chain` when the latest agent response depends on prior context.
* Include a concise intent and rationale summary with every agent proposal sent to Inhibitor.
* Check candidate outputs before they reach users, tools, or external systems.
* Keep Inhibitor integration server-side so API keys remain protected.
* Require post-check corrections to respond directly to observed feedback.
* Use OpenAPI schema retrieval in CI to keep generated clients and contract checks synced.
* Maintain an internal policy that maps flagged categories and severity levels to concrete actions.
* Request an API key from [appliedAIstudio](https://www.appliedai.studio/) before production use.

---

## Quickstart resources

* Try the live [Inhibitor Demo](https://iaas-demo.replit.app/).
* Use the [Quickstart Notebook](../notebooks/quickstart_inhibitor.ipynb) for a hands-on walkthrough.
* Review [Inside the Inhibitor](./inhibitor-inside.md) for the reasoning model behind the API.
* Follow the [Inhibitor Application Sprint](./inhibitor-application-sprint.md) for implementation sequencing.
* Review [policy-to-rule examples](./policy-rule-examples/README.md) to see how rules surface in `/check` responses.
* Align deployments with [GDPR compliance](./gdpr-compliance.md), [global edge placement](./global-edge-deployment.md), and [supported regulations](./supported-regulations.md).
* Pair this API reference with the [ROA pattern](./roa-pattern.md) used in the example notebooks.
* See release history in [Release Notes 1.1](./release-notes/1.1.md).

---

## Support and access

To request API access, commercial support, or help designing an integration path, contact [appliedAIstudio](https://www.appliedai.studio/).

For enterprise deployments, appliedAIstudio can help with:

* Integration architecture
* Agent loop design
* Safety policy mapping
* Compliance workflow alignment
* Deployment readiness review
* Logging and observability strategy
