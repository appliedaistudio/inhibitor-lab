# Rubric Mapping — NotSoFast Landlord

How each feature maps to the Inhibitor challenge's 100-point rubric.

---

## 30 pts — Technical execution quality
*Reliability, correctness, implementation maturity*

| Feature | Evidence |
|---|---|
| FastAPI backend | Typed routes, async throughout, OpenAPI docs auto-generated |
| Next.js 14 PWA | Installable on iOS + Android, full-screen mode, service worker cached |
| Inhibitor integration | Every agent draft evaluated before user sees it, correction loop on flag |
| Twilio SMS | Full round-trip — inbound webhook → agent → TwiML reply |
| Drone integration | djitellopy flight pattern with emergency fallback + graceful sim mode |
| Vision pipeline | GPT-4o Vision per-frame analysis with structured JSON output |
| Logging | JSONL append-only audit log, replayable, Glass Box-compatible |

## 25 pts — Innovation / practical usefulness

**Novel angles no other team will have:**
1. Multi-surface agent (web + PWA + SMS) — meets the user where they are
2. Physical evidence capture via drone — hardware integration in a hackathon
3. Inhibitor on *vision* outputs, not just text (novel modality for the guardrail)
4. Domain: legal advice is the canonical "AI can't be trusted here" use case — and we're making it trustworthy

**Practical usefulness:** This could deploy to Community Legal Services / Philly Tenant Union on Monday. Both organizations exist. The law data is public. The infrastructure is free-tier.

## 20 pts — Evidence and reproducibility

**What we log:**
- Every chat request → `backend/logs/agent_events.jsonl`
- Every Inhibitor verdict → `backend/logs/inhibitor_events.jsonl`
- Every drone scan → `backend/logs/evidence/<scan-id>-*.json`
- Every vision frame → `backend/logs/evidence/<scan-id>-*.jpg`

**Reproducibility checklist:**
- [ ] `backend/requirements.txt` pinned
- [ ] `frontend/package.json` locked
- [ ] `.env.example` covers every required key
- [ ] README has full setup instructions
- [ ] Seed RAG chunks work without Chroma ingestion
- [ ] Drone pipeline has simulated-mode fallback

## 15 pts — Inhibitor-specific insight

**This is where we dominate.** Most teams will *use* Inhibitor. We *analyze* it.

Quantitative analysis to include in final submission:
- Total drafts evaluated (target: ≥100)
- % flagged / allowed
- Flag frequency by category (bias, safety, transparency, ethical_risk)
- Top 5 "best catches" — where Inhibitor prevented real harm
- Top 3 "questionable flags" — where Inhibitor may have been overcautious
- Vision-modality analysis: Inhibitor on image-derived claims is novel

**Track B appendix findings (bonus):**
- Strongest successful attack (prompt injection, role confusion, jurisdiction trick)
- Strongest FAILED attack and why defenses held
- Recommendations: what Inhibitor got right, what we'd tune

## 10 pts — Clarity and demo

- 3-min pitch script → `docs/pitch.md`
- Pre-recorded backup demo video (filmed Saturday night)
- Live demo uses three surfaces: web, PWA install, SMS, drone — any can fail, others carry
- Closer line: *"This isn't a chatbot pretending to be a lawyer. It's the tool that tells landlords: not so fast."*

---

## Also competing for

### Glass Box (Audit Dashboard) — $1,000
The same JSONL intervention log powers a dashboard route at `/glass-box` that visualizes:
- Intervention frequency over time
- Category breakdown
- Side-by-side draft vs corrected text
- Per-session traces

**⚠️ Open question for staff:** Does Glass Box require their shared dataset, or is our own Inhibitor log acceptable? Ask Saturday AM.

### Culture and Community Innovation Award — $500
NotSoFast Landlord literally helps the most vulnerable Philadelphians know their rights. Award description matches almost verbatim.
