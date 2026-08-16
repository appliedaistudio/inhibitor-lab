# Beyond Prompt Screening: Broader Uses for Inhibitor

## Overview

Inhibitor is often used to check user input. It can also check what an application is
about to say, store, or do. The `/check` endpoint and DILL rules can provide a policy
signal before an application calls a tool, writes data, or sends a response.

Inhibitor should inform these decisions, not make them alone. The application must still
verify identity, grant access, carry out actions, and recover from failures.

This paper covers eight broader uses: focused policies, action checks, smaller data
writes, response checks, audit records, multi-step attack detection, human review, and
language testing.

## 1. Use a focused policy for each boundary

A search result, calendar request, payment, and database write have different risks. Use
a focused set of rules for each boundary instead of one large set for everything.

Today, DILL rules are tied to an API key. A trial deployment can use separate serving
keys for inputs, retrieved or web content, tool calls, database access, and final
responses. Keep shared rules consistent across these sets, then add rules for each tool.
Do not put rule-generation credentials in runtime services.

This approach adds key-management work because `/check` does not yet accept a
`policy_profile` for each request. A versioned policy-set ID would make this easier in the
future.

## 2. Check actions before they happen

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
and rollback. Inhibitor cannot prove identity or undo an action.

## 3. Keep database writes small

Store only the data needed for the current task. When possible, describe proposed fields
by category instead of sending their raw values to Inhibitor. Compare those categories
with an allow-list owned by the application.

Inhibitor can flag data that does not fit the stated purpose. For example, a tour-booking
flow should not store unrelated health or family details.

The database still needs schemas, field-level access controls, encryption, retention
rules, and deletion processes. DILL adds a policy check; it is not a database security
boundary.

## 4. Check responses before sending them

Check the exact proposed response before it reaches a user. This can catch another
person's data, credentials, internal limits, or confidential business logic.

Send only the trusted context needed for the check, such as verification status, consent,
purpose, and allowed data categories. Map stable rule IDs to fixed application actions:
redact content, use a safe template, ask for verification, refuse, or send the case to a
person.

Prepared fallback responses are faster and more predictable than repeatedly generating a
new answer. Do not send raw personal data to Inhibitor when a category or placeholder is
enough.

## 5. Build a useful audit trail

Record what was checked, which policy applied, and what the application did next. Subject
to privacy and retention rules, a useful record may include:

- request, conversation, and tool IDs;
- timestamps and API version;
- policy and rule versions;
- redacted input and output, or hashes that prove integrity;
- observation and prediction keys;
- failed rule IDs and reasons;
- dependency and selector status;
- the application's final action and any human override; and
- latency, errors, and timeouts.

The `/logs` endpoint can support this record, but it is not a complete compliance system.
It does not contain every field above, and rule failures do not have a built-in severity
field. Decide who can access records, how long to keep them, where they live, how to delete
them, and how to detect changes before storing real conversations or personal data.

## 6. Look for attacks spread across several steps

Some attacks look harmless one message at a time. Keep a limited window of recent,
security-related events and clear application state, such as repeated requests for
restricted data or attempts to switch identity. Check that window during the interaction,
then run a full asynchronous review afterward when needed.

Tests should include sequences in which each step looks safe but the full sequence is not.
Compare checks of one step, a recent window, a summary, and the full interaction.

Inhibitor does not currently keep application sessions or provide an incremental session
cursor. The application must send the window it wants checked. A summary can hide an
attack, so test summaries rather than assuming they are safe.

## 7. Send uncertain cases to a person

A hard refusal is not always the safest or clearest response. Keep an application-owned
table that maps stable rule IDs to risk levels and next steps. High-risk or uncertain
cases can pause the action and ask a person to review it.

Give the reviewer a short, redacted reason and only the context they need. Test what
happens when no reviewer is available, the queue is long, the connection drops, or the
user declines help. Provide a safe fallback for each case.

The `/check` endpoint only returns a policy result. It does not transfer a call, open a
review ticket, or carry out `on_fail` text as an action. The host application owns those
steps and their failure handling.

## 8. Test every supported language

Language support includes more than translating rules. Test each target language with the
real input system, such as speech recognition, OCR, or chat. Cover:

- normal tasks;
- direct and indirect prompt injection;
- capture and disclosure of personal data;
- names, numbers, addresses, and dates;
- dialects and transliteration;
- missing punctuation and recognition errors; and
- switching languages within one interaction.

Keep policy IDs stable across languages, but review the wording and examples for each
language. Track false blocks and missed problems by language and input system. The project
does not publish quality guarantees for each language, so do not assume a translation
keeps the same meaning or performance.

## Shared design rules

Apply these rules to every use:

1. The application supplies trusted context. Untrusted content cannot mark itself safe.
2. An Inhibitor result informs a decision; it does not grant access.
3. Stable rule IDs, not free-form explanations, trigger application actions.
4. Missing data, selector failures, timeouts, and malformed responses are real outcomes,
   not silent passes.
5. Replace sensitive values with categories or placeholders when possible.
6. Keep tools with side effects behind fixed access checks and allow-lists.
7. Test each policy with examples that should pass and examples that should fail.
8. Run new checks in shadow mode before they can block real work.

## What to test

Use small, reusable test suites for:

- policy separation between tools;
- action limits and identity checks;
- allowed database fields for each purpose;
- response disclosure and redaction;
- audit-record completeness;
- attacks spread across several steps;
- human-review and fallback paths; and
- each language and input system.

Set expected results before each test, use synthetic data, and report both false blocks
and missed problems. Record whether each decision came from an Inhibitor observation, a
DILL rule, an application control, or a person.

## Where to start

Start with checks closest to actions that are hard to reverse:

1. tool access and action integrity;
2. response disclosure;
3. small, purpose-based database writes;
4. audit records;
5. human review;
6. separate policies for each tool;
7. multi-step analysis; and
8. language coverage based on actual users.

This is a starting point, not a universal order. Change it to match your data flows, legal
duties, users, and cost of failure.

## Conclusion

Inhibitor can be a policy layer around decisions, data movement, responses, and proposed
actions—not only a screen for user input. The application must remain responsible for
identity, access, enforcement, side effects, and recovery. With that split clear, the same
Inhibitor tools can support safer actions, better privacy, useful audit trails, multi-step
defense, human review, and language testing.
