# Beyond Agent Inhibition: Additional Uses for Inhibitor

## Overview

Inhibitor's basic use is inhibiting an agent when its behavior breaks a policy. The same
`/check` endpoint and DILL rules can also provide a policy signal before an application
acts, writes data, or sends a case to a person.

These additional uses extend agent inhibition; they do not replace application controls.
The application must still verify identity, grant access, carry out actions, and recover
from failures.

This paper covers four additional uses: checking actions, limiting data writes, building
audit trails that expose multi-step attacks, and supporting human review.

## 1. Check actions before they happen

Before calling a tool, create a small, standard description of the proposed action. It
may include:

- who requested the action and their relationship to its subject;
- whether their identity was verified;
- the action, target, and requested amount;
- where authorization came from; and
- an idempotency key, which prevents accidental repeats.

DILL rules can flag actions that break clear limits. For example, a real-estate voice
agent could require verification before changing another person's tour and reject a bulk
booking from an ordinary lead flow.

The tool must still check identity, access, limits, current state, duplicates, conflicts,
and rollback. Inhibitor can inhibit the agent before a proposed action, but it cannot
prove identity or undo an action.

## 2. Keep database writes small

Store only the data needed for the current task. When possible, describe proposed fields
by category instead of sending their raw values to Inhibitor. Compare those categories
with an allow-list owned by the application.

Inhibitor can inhibit an agent when proposed data does not fit the stated purpose. For
example, a tour-booking flow should not store unrelated health or family details.

The database still needs schemas, field-level access controls, encryption, retention
rules, and deletion processes. DILL adds a policy check; it is not a database security
boundary.

## 3. Build an audit trail that exposes multi-step attacks

Record what Inhibitor checked, which policy applied, and what the application did next.
Subject to privacy and retention rules, a useful record may include:

- request, conversation, and tool IDs;
- timestamps and API version;
- policy and rule versions;
- redacted input and output, or hashes that prove integrity;
- observation and prediction keys;
- failed rule IDs and reasons;
- dependency and selector status;
- the application's final action and any human override; and
- latency, errors, and timeouts.

Some attacks look harmless one message at a time. Use the audit trail to keep a limited
window of recent security-related events and clear application state, such as repeated
requests for restricted data or attempts to switch identity. Check that window during
the interaction, then run a full asynchronous review afterward when needed.

The `/logs` endpoint can support this record, but it is not a complete compliance or
session system. It does not contain every field above, keep application sessions, or
provide an incremental session cursor. The application must store and send the window it
wants checked. A summary can hide an attack, so validate summaries before relying on
them.

Rule failures also do not have a built-in severity field. Decide who can access records,
how long to keep them, where they live, how to delete them, and how to detect changes
before storing real conversations or personal data.

## 4. Send uncertain cases to a person

Inhibiting an agent does not always have to end in a hard refusal. Keep an
application-owned table that maps stable rule IDs to risk levels and next steps.
High-risk or uncertain cases can pause the action and ask a person to review it.

Give the reviewer a short, redacted reason and only the context they need. Plan for what
happens when no reviewer is available, the queue is long, the connection drops, or the
user declines help. Provide a safe fallback for each case.

The `/check` endpoint only returns a policy result. It does not transfer a call, open a
review ticket, or carry out `on_fail` text as an action. The host application owns those
steps and their failure handling.

## Shared design rules

Apply these rules when extending agent inhibition:

1. The application supplies trusted context. Untrusted content cannot mark itself safe.
2. An Inhibitor result informs a decision; it does not grant access.
3. Stable rule IDs, not free-form explanations, trigger application actions.
4. Missing data, selector failures, timeouts, and malformed responses are real outcomes,
   not silent passes.
5. Replace sensitive values with categories or placeholders when possible.
6. Keep tools with side effects behind fixed access checks and allow-lists.
7. Validate each policy with examples that should pass and examples that should fail.
8. Run new checks in shadow mode before they can block real work.

## Conclusion

Beyond its basic role of inhibiting an agent, Inhibitor can check proposed actions, limit
data collection, support audit trails and multi-step attack detection, and route uncertain
cases to human review. The application remains responsible for identity, access,
enforcement, side effects, records, and recovery.
