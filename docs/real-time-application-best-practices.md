# Using the Inhibitor in Real-Time Applications

## Overview

Real-time applications must make safe decisions without making people wait. The Inhibitor
can help when each check has a clear purpose, a small input, and a firm time limit. It is a
safety signal, not a replacement for authentication, authorization, or application code.

This paper explains the main principles for adding the Inhibitor to a real-time system. A
voice agent is the running example because delays, unsafe tool calls, and data leaks are
easy to notice during a live call. The same practices apply to live chat, interactive
assistants, streaming systems, and other time-sensitive applications.

## 1. Check at clear trust boundaries

Add a check where data or control crosses from a less trusted part of the system to a more
trusted one. Do not send the whole workflow through one large, general check. Smaller
checks preserve the source of each item, use the right rules, and make failures easier to
handle.

For a voice agent, the main boundaries are:

1. **User input:** Check the final speech-to-text transcript before the agent uses it.
2. **Outside content:** Check search results, web pages, and retrieval chunks before adding
   them to the model's context.
3. **Tool actions:** Check proposed calendar, database, email, and other actions before
   they run. The application must also authorize them.
4. **User output:** Check a sensitive or privileged reply before sending it to
   text-to-speech.

If one search result is unsafe, the application can remove that result instead of losing
the whole turn. If a proposed calendar change fails, the application can stop the change
without stopping ordinary conversation.

### Write rules for the deployment-specific gap

Custom policy documents should focus on requirements that are specific to the deployment,
organization, domain, workflow, or tool. The Inhibitor already evaluates broad semantic and
ethical risks, so repeating general safety principles can create overlapping findings,
contradictory rules, and extra work during review.

Write concrete, testable requirements that the Inhibitor could not otherwise know. For
example:

| Include in the custom policy | Usually leave to general evaluation |
| --- | --- |
| Only a verified patient may reschedule this appointment. | Protect privacy. |
| Transfers over $5,000 require a second approval. | Do not cause financial harm. |
| Never disclose the internal risk score to a caller. | Be transparent and fair. |

Repeat a general principle only when the deployment needs a stricter definition, a special
interpretation, or an explicit finding for audit purposes. Keep authentication,
authorization, schemas, permissions, and side-effect controls in application code.

## 2. Send only the context needed for the decision

A live check should usually contain:

- the current input or proposed action;
- trusted facts needed to judge it; and
- a small amount of recent, security-related context.

Do not resend the full conversation on every turn. A growing request takes more time and
makes latency less predictable. Keep recent turns when they matter, and store security
state separately. Test summaries carefully so they do not erase warning signs from earlier
turns. Run deeper, full-session reviews outside the live path.

In the voice example, a request to read an appointment may need the caller's verified
status, the purpose of the request, and whose appointment it is. It does not need every
word spoken since the call began.

Speech recognition adds uncertainty. Keep the raw transcript in a protected audit record
when policy allows it. For a high-risk command, check important alternate transcripts or
low-confidence parts. Do not remove words such as “not,” names, numbers, or phrases about
permission during text cleanup.

## 3. Keep live checks fast and predictable

Use `performance` mode for checks that block a live response. It avoids the extra work
needed to produce detailed, human-readable explanations.

Use `insight` mode with `diagnostic: true` for rule development, incident review, offline
testing, and sampled audits. These details are useful to people studying a decision, but
they do not need to delay every user.

Performance mode can still depend on model work. Observation selection is model-assisted,
and a DILL binding that cannot be resolved directly may use model extraction. Every live
client therefore needs a timeout and a plan for an uncertain result.

Keep real-time DILL rule sets short and specific to the boundary. Prefer structured inputs
and bindings that resolve directly. Handle missing security-critical values in rule logic;
a missing value is not automatically a rule violation. Keep separate rule profiles for
input, retrieval, each tool type, and output. Keep rule-writing credentials out of the
live application.

## 4. Let application code make and enforce decisions

The Inhibitor returns findings, rule IDs, and reasons. It does not authenticate a user,
authorize a tool, hide a field, undo a change, or transfer a call. The host application
must do that work with normal, testable code.

Maintain a versioned table that maps reviewed rule IDs and result states to fixed actions.
Never let free-form model text approve a tool call. The application must continue to own:

- identity checks and consent records;
- tool and field-level permissions;
- input and schema validation;
- rate, quota, and conflict checks;
- allow-lists and data minimization;
- idempotency, rollback, and retry rules; and
- handoff or escalation logic.

For example, a voice agent may use an Inhibitor finding to stop a request to reveal another
person's appointment. Database permissions must still prevent the agent from reading that
record, even if the check is unavailable or wrong.

## 5. Set timeouts and safe fallback actions

Choose a timeout from the user experience you want, not from a service's theoretical worst
case. For voice, the timeout caps an awkward silence. Decide what the application will do
for every result before launch:

- **Allowed:** Continue after all other required checks pass.
- **Inhibited:** Use the fixed action mapped to the finding.
- **Indeterminate:** Handle a timeout or malformed response without guessing.
- **Degraded:** Apply policy when observation selection fails.
- **Unavailable:** Apply policy when the service or one of its dependencies fails.

Do not treat `observation_selection.status == "failed"` as “safe.” For a high-risk action,
fail closed: do not run the action, give a short safe reply, or hand off to a person. A
lower-risk conversation may continue under a written degraded-mode policy. Never perform a
side effect when the application cannot confirm authorization.

## 6. Avoid open-ended retry and correction loops

Do one required check at each boundary. Do not keep generating, checking, and regenerating
while the user waits. An open-ended loop creates unpredictable delay and can still fail to
produce a safe answer.

When a voice reply is inhibited, choose one fixed response:

- play a short, pre-approved message;
- ask one focused question;
- remove or mask a field with application code; or
- hand off a high-risk or unresolved request to a person.

Longer reflection and repeated correction can run later in an offline review or in a
channel where response time is less important.

## 7. Run independent work in parallel, but stop at gates

Reuse network connections and run independent checks at the same time. A voice agent can,
for example, check several unrelated retrieval chunks in parallel. Cancel work that is no
longer needed after a hard failure.

Do not race past a required gate. A database disclosure, calendar update, message, or spoken
reply must wait for every required Inhibitor check and the application's authorization.

Keep the application, Inhibitor service, model provider, and data stores close together
when the supported deployment allows it. Test the real production network path. Fast local
tests do not prove that the deployed system will be fast.

## 8. Limit sensitive data

Sending personal data to a safety service is still data processing. Use a category,
placeholder, or hash when the check does not need the exact value. Keep secrets out of
prompts and logs. Set rules for retention, deletion, data location, and operator access
before processing real user data.

For the final voice output check, send only the proposed words and the few trusted facts
needed to decide whether the agent may disclose them.

## 9. Measure speed and safety together

Test the exact design before turning on enforcement. Track p50, p95, and p99 latency rather
than only the average. Include:

- cold and warm requests;
- `performance` and `insight` modes;
- fixed-size and growing context;
- no rules, direct bindings, and model fallback bindings;
- ordinary, unsafe, multilingual, and mixed-language inputs;
- successful responses, selection failures, timeouts, and dependency errors; and
- the production hosting and network setup.

Measure missed detections and false blocks at the same time. Skipping a required tool or
output check may make a chart look faster, but it does not improve the system.

## 10. Roll out in small steps

1. **Test offline.** Use synthetic data and approved, redacted examples.
2. **Run in shadow mode.** Record what the checks would do without changing the live
   response, then compare results with human review.
3. **Enforce a small set of rules.** Start with stable, high-confidence rules and tested
   fallbacks.
4. **Expand carefully.** Add enforcement only when delay, false blocks, misses, and outage
   behavior meet agreed targets.
5. **Keep checking.** Rerun regression and drift tests after changes to prompts, models,
   rules, speech recognition, tools, or supported languages.

## Voice agent reference flow

```text
Caller speaks
  -> speech-to-text
  -> performance-mode input check
  -> agent orchestrator
      -> parallel checks of independent search and retrieval items
      -> application authorization and check of each proposed tool action
  -> proposed reply
  -> output disclosure check
  -> text-to-speech
  -> caller hears reply

Outside the live path:
  -> sampled insight and diagnostic checks
  -> full-call and multi-turn review
  -> compliance evidence and quality review
```

## Launch checklist

- [ ] Every untrusted boundary has an owner and a specific check.
- [ ] Live checks use bounded context and `performance` mode.
- [ ] Real-time rules usually resolve without model-based binding fallback.
- [ ] No open-ended correction loop runs in the live path.
- [ ] Timeouts, selection failures, dependency failures, and handoff failures are tested.
- [ ] Tool actions wait for deterministic application authorization.
- [ ] Sensitive output is checked before it reaches the user.
- [ ] Personal data is limited in requests, logs, and audit records.
- [ ] p50, p95, and p99 latency meet the real-time budget.
- [ ] Safety targets hold for ordinary and adversarial inputs.
- [ ] Shadow-mode results support turning on enforcement.

## Conclusion

The Inhibitor works best in a real-time application when checks are small, focused, and
time-limited. The goal is not to add the most checks or send the most context. The goal is
to check the right thing at each trust boundary, keep authorization in application code,
use a safe fallback when a result is uncertain, and measure both safety and user-visible
delay.
