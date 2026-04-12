# 3-Minute Pitch Script — NotSoFast Landlord

**Time budget:** 3:00 (pitch) + 2:00 (Q&A)
**On-stage minimum:** 2 teammates
**Props:** laptop, phone, Tello drone, cardboard rowhome prop, backup demo video

---

## 0:00–0:20 — The hook
*(stand, eye contact, no slides yet)*

> "Philadelphia has one of the highest eviction rates in the United States. Most illegal evictions succeed because tenants don't know their rights — and when they try to find out at 11pm, they get generic internet advice or a chatbot that makes up laws.
>
> We built NotSoFast Landlord. It's the friend who happens to know tenant law."

## 0:20–1:00 — The core demo (web app)
*(laptop projected on main screen)*

- Teammate opens the web app
- Types: *"My landlord said I have 3 days to leave or he's changing the locks. Is that legal?"*
- Agent responds with cited answer from PA Landlord-Tenant Act
- **Point out the badge: "🛡️ Inhibitor intervened"**

> "Watch this. The agent's first draft said 'ignore your landlord.' Inhibitor — Applied AI Studio's guardrail service — caught that as potentially escalatory, flagged the missing citation, and forced a rewrite. That's the safety layer between the AI and a scared person."

## 1:00–1:30 — The phone surfaces
*(second teammate pulls out their phone)*

> "But the tenant who needs this most is probably the one who can't afford a smartphone. So we also have…"

- **PWA install** — show web URL, "Add to Home Screen," app icon appears on phone
- Tap icon → full-screen app launches
- *"That's our installable phone app — same codebase, no app store review."*

> "And for tenants with any phone…"

- **Live SMS demo** — text the Twilio Philly number
- Phone visibly buzzes with the agent's reply

> "SMS works on every phone in America. That's the point."

## 1:30–2:20 — The drone moment
*(move toward the prop)*

> "But here's the thing. Tenants lose housing cases because they can't prove conditions. 'My ceiling is leaking' vs landlord says 'it isn't' → tenant loses. Our app has a Building Health Scan."

- Tap "Building Health Scan" in the app
- **Tello takes off, flies pattern over cardboard rowhome prop, lands**
- Vision findings appear on screen
- **Point out: "Inhibitor corrected this one"**

> "The vision model wanted to say 'this is a code violation.' Inhibitor said 'no — you can only claim "visible damage warranting inspection."' That's the difference between a chatbot that gets someone evicted and one that helps them win in court."

## 2:20–2:50 — The numbers
*(Glass Box dashboard view)*

> "Across our testing, Inhibitor intervened on X% of raw agent outputs. Most interventions clustered in three categories: missing citations, predictive claims, and lawyer impersonation. Here's the full audit trail — every intervention, every corrected response, logged and replayable."

## 2:50–3:00 — The closer
*(step forward, slow down)*

> "This isn't a chatbot pretending to be a lawyer. It's the tool that tells landlords: not so fast."

---

## Q&A prep — likely questions

**Q: What if the agent is wrong?**
A: Inhibitor's job is exactly that. Every intervention is logged — we can show you the exact categories of error it catches. And we always end with the CLS phone number. We're the bridge to real legal help, not a replacement.

**Q: How is this different from just prompting GPT carefully?**
A: Careful prompting catches ~60% of issues. Inhibitor's systematic evaluation across bias, safety, transparency, and ethical risk catches the other 40% — including ones we didn't anticipate. More importantly, we get structured verdicts we can analyze and improve on.

**Q: Could a landlord use this to avoid tenants' rights?**
A: That's a great red-team question. We specifically tested prompt injection attacks where users claimed to be landlords looking for ways to evict — Inhibitor's bias detection catches role confusion. See Track B findings in our submission.

**Q: Why a drone?**
A: Because evidence wins housing cases and tenants don't have documentation. A Tello is $100 and has a Python SDK. The drone isn't a gimmick — it's the missing half of the tenant's defense.

**Q: What's next?**
A: We're reaching out to Community Legal Services and Philly Tenant Union on Monday. The data pipeline and legal corpus are public. This could be deployed for real users by end of next month.
