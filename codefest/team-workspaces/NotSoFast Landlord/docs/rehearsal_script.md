# Rehearsal Script — NotSoFast Landlord

**Total time:** 3:00 pitch + 2:00 Q&A
**Team of 4:**

| Role | Person | What you do |
|---|---|---|
| **Pitcher 1** | _______ | Opens the pitch, delivers the hook, narrates the demo, handles the closer |
| **Pitcher 2** | _______ | Handles Q&A, jumps in with stats/numbers, backup narrator if P1 loses thread |
| **Demo 1** | _______ | Drives Laptop 1 (main app). Clicks on cue. Never talks unless something breaks. |
| **Demo 2** | _______ | Drives Laptop 2 (Glass Box) + Laptop 3 (traces terminal). Switches on cue. |

**Fill in names now. Practice with these exact roles every run.**

---

## Pre-rehearsal checklist (do this ONCE before your first run-through)

- [ ] All 3 laptops open, services running (`./scripts/demo_setup.sh app|glassbox|traces`)
- [ ] Demo 1 has the app at `/` (splash page, ready to click through)
- [ ] Demo 2 has Glass Box at `/glass-box` on one laptop, `localhost:8765/traces` on the other
- [ ] Pitcher 1 has this script printed or on a phone
- [ ] Pitcher 2 has the Q&A section (bottom of this doc) on a phone
- [ ] Backup demo video queued in a browser tab on Demo 1's laptop
- [ ] Timer app ready (use a phone stopwatch)

---

## THE SCRIPT

### [0:00–0:15] THE HOOK — Pitcher 1

> Stand. No laptop yet. Eye contact with judges.

**Say this:**

> "Philadelphia has one of the highest eviction rates in the United States. Most illegal evictions succeed because tenants don't know their rights — and when they try to find help at 11pm, they get generic internet advice or a chatbot that makes up laws."

*Beat. One second pause.*

> "We built NotSoFast Landlord. It's the friend who happens to know tenant law."

**Demo 1:** While Pitcher 1 talks, click past the splash screen so the Landing page is visible when judges look over.

---

### [0:15–0:25] TRANSITION TO DEMO — Pitcher 1

> "Let me show you what it does."

**Demo 1:** Click **"Analyze Your Case"** on the Landing page. You should now be on the Upload page.

> Point at the projected screen.

---

### [0:25–1:05] CORE DEMO — Pitcher 1 narrates, Demo 1 drives

**Demo 1 actions (listen for cues):**

| Pitcher 1 says... | Demo 1 does... |
|---|---|
| "A tenant gets a letter from their landlord..." | Select case type card: **Illegal Eviction** |
| "They take a photo or paste the text..." | Click **"Load Demo"** to load the sample letter |
| "One click..." | Click **"Analyze"** |
| *(wait — loading steps animate on screen)* | Do nothing. Let the 5-step animation play. |

**Pitcher 1 narrates DURING the loading animation:**

> "You're watching five AI agents work in sequence. Intake reads the letter. Retrieval pulls the exact PA statutes. Drafting writes the response. A Critic agent checks the work. And a Finalizer polishes it."

> "But between Drafting and Critic — watch —"

*(Results page should load around now. If not, keep talking.)*

> "Every single draft passes through Applied AI Studio's Inhibitor. That's the safety layer between the AI and a scared tenant."

**Demo 1:** Results are on screen. Stay on the first tab (Claims).

**Pitcher 1:**

> "Here's what the tenant sees. Plain-language claims with statute citations. Not 'you might have rights' — specific sections of the PA Landlord-Tenant Act."

---

### [1:05–1:35] RESULTS WALKTHROUGH — Pitcher 1 narrates, Demo 1 clicks tabs

| Pitcher 1 says... | Demo 1 clicks... |
|---|---|
| "Concrete next steps, prioritized..." | **Actions** tab |
| "A timeline so they know what happens when..." | **Timeline** tab |
| "And full transparency — every Inhibitor intervention logged..." | **Inhibitor Log** tab |
| "And a ready-to-send response letter..." | **Response Letter** tab |

> Spend ~7 seconds per tab. Don't rush but don't linger.

**Pitcher 1 on the Inhibitor Log tab (this is your money moment):**

> "This is key. The agent's first draft told the tenant to 'ignore the landlord's letter.' Inhibitor caught that as potentially escalatory, flagged the missing citation, and forced a rewrite. That's not a chatbot. That's a guardrail."

---

### [1:35–2:15] GLASS BOX — Pitcher 1 narrates, Demo 2 drives

> "Now let's look under the hood."

**Demo 2:** Switch the projected screen to the Glass Box laptop (`/glass-box`).

| Pitcher 1 says... | Demo 2 does... |
|---|---|
| "This is our audit dashboard..." | Show **Pipeline Overview** — make sure it's visible |
| "Every event from Applied AI's shared dataset..." | Switch to **Event Stream** view |
| "Set A has 17,000 events. Set B has 2,600." | Scroll slowly through events |
| "And here are our own logs..." | Switch to **NotSoFast Logs** view |

**Pitcher 1:**

> "We didn't just use Inhibitor — we built tools to analyze it. This dashboard parses Applied AI's shared sample logs and visualizes the entire pipeline. Judges, you can replay any intervention."

---

### [2:15–2:35] LIVE TRACES — Pitcher 1 narrates, Demo 2 switches

> "And here's the live pipeline."

**Demo 2:** Switch projected screen to the traces laptop (`localhost:8765/traces`).

**Pitcher 1:**

> "Every analysis that runs through our app produces a trace. You can see each agent's reasoning, the Inhibitor check, and the final output. Full transparency, full reproducibility."

*(If traces are empty because no analysis has run, Demo 1 should have already triggered one during the core demo. If it's still empty, say: "When we ran that analysis a minute ago, here's the trace it produced.")*

---

### [2:35–2:50] THE NUMBERS — Pitcher 2

> Pitcher 2 steps in for the first time. This signals to judges: the whole team knows the project.

**Pitcher 2:**

> "Quick numbers. We benchmarked 30 cases — average judge score 4.78 out of 5, with 92.8% citation coverage. We red-teamed with 22 adversarial attacks — our strongest finding hit 0.99 confidence. And we have 78 logged Inhibitor interventions in our evidence directory."

---

### [2:50–3:00] THE CLOSER — Pitcher 1

> Step forward. Slow down. Lower your voice slightly.

> "This isn't a chatbot pretending to be a lawyer. It's the tool that tells landlords: **not so fast.**"

*Hold eye contact for 2 seconds. Done.*

---

## Q&A PREP — Pitcher 2 leads, Pitcher 1 supports

Pitcher 2 takes first crack at every question. Pitcher 1 only adds if P2 misses something. **Never talk over each other.**

| Question | Answer |
|---|---|
| **"What if the agent is wrong?"** | "That's exactly what Inhibitor is for. Every draft is evaluated before the tenant sees it. Every intervention is logged. And we always end with the Community Legal Services phone number — we're the bridge to real legal help, not a replacement." |
| **"How is this different from just prompting GPT carefully?"** | "Careful prompting catches maybe 60% of issues. Inhibitor's systematic evaluation across bias, safety, transparency, and ethical risk catches the rest — including failure modes we didn't anticipate. And we get structured verdicts we can analyze and improve." |
| **"Could a landlord use this against tenants?"** | "We specifically red-teamed that. Prompt injection attacks where users claimed to be landlords looking for eviction loopholes — Inhibitor's bias detection catches role confusion. It's in our red team report." |
| **"What's your RAG approach?"** | "Hybrid retrieval. Dense vectors via ChromaDB with OpenAI embeddings, plus BM25 keyword search, fused with Reciprocal Rank Fusion. 10-chunk corpus from the PA Landlord-Tenant Act and Philadelphia Code. We get 92.8% citation coverage across our benchmark." |
| **"Why this tech stack?"** | "FastAPI for async agent orchestration, Vite + React for the frontend because we needed Framer Motion for the demo experience, ChromaDB because it runs local with zero config. Everything runs on one laptop with no cloud dependencies except the LLM and Inhibitor APIs." |
| **"What's next?"** | "We're reaching out to Community Legal Services and Philly Tenant Union. The legal corpus is public, the pipeline is open source. This could be deployed for real users within a month." |

**If you don't know the answer:** "Great question — let me check our docs and get back to you." Don't guess. Don't ramble.

---

## RECOVERY PLAYS — Demo 1 & Demo 2 memorize these

| What breaks | Who acts | What to do |
|---|---|---|
| App shows an error or spinner won't stop | Demo 1 | Quietly switch to backup video tab. Pitcher 1 says: "Here's a recording from our testing session." |
| Glass Box won't load | Demo 2 | Show `/traces` instead. Pitcher 1 says: "Let me show the raw pipeline traces." |
| Traces endpoint is empty | Demo 2 | Show `/health` endpoint. Pitcher 1 says: "The pipeline is healthy — traces populate on each analysis run." |
| Backend is completely down | Demo 1 | Play backup video. Pitcher 1 doesn't acknowledge it — just keeps narrating. |
| Projector/display dies | Everyone | Pitcher 1 keeps talking from memory. Pitcher 2 holds up phone showing the app. Demo team troubleshoots. |
| You lose your place | Pitcher 1 | Jump to the closer: "This isn't a chatbot pretending to be a lawyer..." |

**Golden rule: Never say "sorry" or "it's not working." Always redirect: "Let me show you another way."**

---

## REHEARSAL PROTOCOL

**Run this at least 3 times before you go on stage.**

### Run 1 — Full walkthrough with script
- Timer running
- Read directly from the script, word for word
- Demo team practices clicks on cue
- **Target: get through it without freezing. Time doesn't matter yet.**

### Run 2 — Timed run, eyes up
- Pitcher 1 paraphrases (don't read word-for-word)
- Pitcher 2 handles one mock Q&A question
- Demo team should be clicking without looking at script
- **Target: under 3:30. Note what felt slow.**

### Run 3 — Chaos run
- Have someone randomly say "THE APP JUST CRASHED" at a random point
- Practice the recovery play
- Run a Q&A with 3 tough questions
- **Target: under 3:00. Smooth recovery from the "crash."**

### After each run
- What felt good? Keep it.
- What felt rushed or clunky? Cut it or simplify.
- Did the Demo team click at the right time? Adjust cues if needed.

---

## TIMING CHEAT SHEET

| Segment | Start | Duration |
|---|---|---|
| Hook | 0:00 | 15s |
| Transition | 0:15 | 10s |
| Core demo + loading | 0:25 | 40s |
| Results walkthrough | 1:05 | 30s |
| Glass Box | 1:35 | 40s |
| Live traces | 2:15 | 20s |
| Numbers (Pitcher 2) | 2:35 | 15s |
| Closer | 2:50 | 10s |

**If you're at 2:30 and haven't done the closer yet — skip to it. The closer is more important than any middle section.**
