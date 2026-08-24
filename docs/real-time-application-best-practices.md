# Using the Inhibitor in Real-Time Applications

## Overview

Real-time apps must make safe choices without making people wait. Use the Inhibitor when
each check has a clear job, a small input, and a firm time limit. Treat it as a safety
signal, not a replacement for authentication, authorization, or app code.

This guide uses a voice agent as its main example. Delays, unsafe tool calls, and data
leaks are easy to notice on a live call. The same advice applies to live chat, streaming
systems, interactive assistants, and other time-sensitive apps.

## 1. Check clear trust boundaries

Add a check when data or control moves from a less trusted part of the system to a more
trusted part. Do not put the whole workflow through one large, general check. Small checks
keep the source clear, use the right rules, and make failures easier to handle.

For a voice agent, check these main boundaries:

1. **User input:** Check the final speech-to-text transcript before the agent uses it.
2. **Outside content:** Check search results, web pages, and retrieval chunks before they
   enter the model context.
3. **Tool actions:** Check calendar, database, email, and other proposed actions before
   they run. The app must also authorize them.
4. **User output:** Check sensitive or privileged replies before text-to-speech sends them.

If one search result is unsafe, remove that result instead of dropping the whole turn. If
a calendar change fails, stop the change without stopping normal conversation.

## 2. Send only the context the check needs

A live check should usually include:

- the current input or proposed action;
- trusted facts needed for the choice; and
- a small amount of recent security context.

Do not resend the full conversation on every turn. Large requests take longer and make
delay harder to predict. Keep recent turns only when they matter. Store security state
separately. Test summaries so they do not hide earlier warning signs. Run full-session
reviews outside the live path.

For example, reading an appointment may require the caller's verified status, the reason
for the request, and the appointment owner. It does not require every word in the call.

Speech recognition adds doubt. Keep the raw transcript in a protected audit record when
policy allows. For a high-risk command, check important alternate transcripts or unclear
parts. During cleanup, keep words such as “not,” names, numbers, and permission terms.

## 3. Keep live checks fast and predictable

Use `performance` mode for checks that block a live reply. It skips the extra work needed
for detailed explanations.

Use `insight` mode with `diagnostic: true` for rule development, incident review, offline
tests, and sampled audits. These details help people review a choice, but they should not
slow every user.

Performance mode may still use a model. Observation selection is model-assisted, and a
DILL binding that cannot resolve directly may use model extraction. Every live client
therefore needs a timeout and a plan for an uncertain result.

Rule execution can also become expensive. Keep each policy document small and focused so
it produces only a small set of rules for one deployment and one clear purpose. Do not
load a broad policy library into every check. More rules require more work, raise cost,
and make response time less predictable. Split policies by boundary, tool, or risk, then
deploy only the rules that check needs. Measure the final generated rule count and runtime
cost before release.

Keep real-time DILL rules short and specific. Prefer structured inputs and bindings that
resolve directly. Handle missing security-critical values in rule logic; a missing value
is not automatically a violation. Use separate rule sets for input, retrieval, each tool
type, and output. Keep rule-writing credentials out of the live app.

## 4. Let app code make and enforce choices

The Inhibitor returns findings, rule IDs, and reasons. It does not authenticate a user,
authorize a tool, hide a field, undo a change, or transfer a call. The app must do that
work with normal, testable code.

Keep a versioned table that maps reviewed rule IDs and result states to fixed actions.
Never let free-form model text approve a tool call. The app must still own:

- identity checks and consent records;
- tool and field permissions;
- input and schema validation;
- rate, quota, and conflict checks;
- allow-lists and data limits;
- idempotency, rollback, and retry rules; and
- handoff or escalation logic.

For example, an Inhibitor finding may stop a voice agent from sharing another person's
appointment. Database permissions must still block that record if the check is down or
wrong.

## 5. Set timeouts and safe fallback actions

Choose a timeout based on the user experience, not a service's worst possible time. For
voice, the timeout limits an awkward silence. Before launch, choose an app action for each
result:

- **Allowed:** Continue after all other required checks pass.
- **Inhibited:** Use the fixed action mapped to the finding.
- **Indeterminate:** Handle a timeout or bad response without guessing.
- **Degraded:** Follow policy when observation selection fails.
- **Unavailable:** Follow policy when the service or a dependency fails.

Do not treat `observation_selection.status == "failed"` as safe. For a high-risk action,
fail closed: stop the action, give a short safe reply, or hand off to a person. Lower-risk
chat may continue under a written degraded-mode policy. Never cause a side effect when the
app cannot confirm authorization.

## 6. Avoid open-ended retry and correction loops

Run one required check at each boundary. Do not keep generating, checking, and generating
again while the user waits. An open loop causes unpredictable delay and may never produce
a safe answer.

When a voice reply is inhibited, use one fixed response:

- play a short, approved message;
- ask one focused question;
- remove or mask a field with app code; or
- hand off a high-risk or unresolved request to a person.

Longer review and repeated correction can run offline or in a channel with a looser time
limit.

## 7. Run independent work in parallel, but stop at gates

Reuse network connections and run independent checks at the same time. For example, a
voice agent can check unrelated retrieval chunks in parallel. Cancel work that is no
longer needed after a hard failure.

Do not pass a required gate early. A database disclosure, calendar update, message, or
spoken reply must wait for every required Inhibitor check and app authorization.

Keep the app, Inhibitor service, model provider, and data stores close when the deployment
allows it. Test the real production network path. Fast local tests do not prove the live
system will be fast.

## 8. Limit sensitive data

Sending personal data to a safety service is still data processing. Use a category,
placeholder, or hash when the exact value is not needed. Keep secrets out of prompts and
logs. Set retention, deletion, data location, and operator access rules before using real
user data.

For a final voice-output check, send only the proposed words and the few trusted facts
needed to decide whether the agent may share them.

## 9. Measure speed and safety together

Test the exact design before enforcing it. Track p50, p95, and p99 delay, not just the
average. Include:

- cold and warm requests;
- `performance` and `insight` modes;
- fixed and growing context sizes;
- small rule sets, direct bindings, and model fallback bindings;
- normal, unsafe, multilingual, and mixed-language inputs;
- success, selection failure, timeout, and dependency error cases; and
- the production hosting and network setup.

Record the generated rule count and cost for each deployed policy set. Test cost and delay
again whenever a policy change adds rules.

Measure missed findings and false blocks at the same time. Skipping a required tool or
output check may improve a speed chart, but it does not improve the system.

## 10. Roll out in small steps

1. **Test offline.** Use synthetic data and approved, redacted examples.
2. **Use shadow mode.** Record what checks would do without changing live replies. Compare
   the results with human review.
3. **Enforce a small rule set.** Start with stable, high-confidence rules and tested
   fallbacks.
4. **Expand with care.** Add enforcement only when delay, cost, false blocks, misses, and
   outage behavior meet your targets.
5. **Keep testing.** Rerun regression and drift tests after changes to prompts, models,
   policies, generated rules, speech recognition, tools, or supported languages.

## Voice agent reference flow

```text
Caller speaks
  -> speech-to-text
  -> performance-mode input check
  -> agent orchestrator
      -> parallel checks of independent search and retrieval items
      -> app authorization and check of each proposed tool action
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
- [ ] Each policy document is small, focused, and limited to one deployment purpose.
- [ ] Each deployment has a small, reviewed rule set with a measured cost.
- [ ] Live checks use limited context and `performance` mode.
- [ ] Real-time rules usually resolve without model-based binding fallback.
- [ ] No open-ended correction loop runs in the live path.
- [ ] Timeouts, selection failures, dependency failures, and handoff failures are tested.
- [ ] Tool actions wait for fixed app authorization.
- [ ] Sensitive output is checked before it reaches the user.
- [ ] Requests, logs, and audit records limit personal data.
- [ ] p50, p95, and p99 delay measurements meet the real-time budget.
- [ ] Safety targets hold for normal and adversarial inputs.
- [ ] Shadow-mode results support turning on enforcement.

## Conclusion

The Inhibitor works best in a real-time app when checks, policies, and rule sets are small,
focused, and time-limited. Check the right item at each trust boundary. Keep authorization
in app code. Use a safe fallback for uncertain results. Measure safety, cost, and delay
together.
