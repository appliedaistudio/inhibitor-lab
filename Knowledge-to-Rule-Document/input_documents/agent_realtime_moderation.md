# Real-Time Moderation Agent – Enforcement Policy (v2.0)

**Scope:** Streaming chat and voice inputs evaluated in <250ms per message.

## Message Content Rules
- Messages containing hate slurs must be blocked immediately.
- Sexual content directed at or involving minors must be blocked.
- Personally identifiable information (PII) disclosures (email, full address, SSN) must be masked or blocked.
- Any URL must be checked against the blocklist; block if matched.
- If the message is in a language we do not support, fallback to default block decision.

## Operational Limits
- Per-channel error rate must remain below 1% over the last 100 messages.
- If latency exceeds 250ms p95 for the last 50 messages, reduce model complexity tier for new messages.
- If block decisions exceed 30% in a rolling window of 200 messages, alert on-call.

## Evidence & Logging
- Keep the decision rationale (rule ID) and any matched patterns with timestamps.
- Do not log raw message content when PII masking is triggered; store masked version only.

*Example (not a rule): Educational discussions about moderation are allowed.*
