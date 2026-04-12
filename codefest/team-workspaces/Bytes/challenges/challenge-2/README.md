# ReadMeJerryReadMe

## PoliSwipe — Track A: Innovation

**Live App:** [https://poliswiper.lovable.app](https://poliswiper.lovable.app)

---

## 🗳️ Problem Statement & User/Workflow Context

**The Problem:** Voters — especially first-time and local-election voters — lack accessible, trustworthy, and engaging tools to research politicians. Existing resources (Ballotpedia, government websites, news) are dense, scattered, and overwhelming. Misinformation and biased framing further erode trust, and there is no mechanism to verify whether the political content a user consumes is ethical, legally sound, or factually accurate.

**The User:** A Philadelphia-area voter preparing for upcoming elections (Primary 2025, General 2025) who wants to quickly understand their local, state, and national candidates — and have confidence that the information presented is verified and unbiased.

**The Workflow:**
1. User opens PoliSwipe, optionally creates an account or continues as guest
2. Selects their state (Pennsylvania) and policy interests (Healthcare, Climate, Economy, etc.)
3. Swipes through politician cards — Tinder-style — to Support, Oppose, or mark Neutral
4. Each card shows quantitative legislative data: specific bill numbers, vote counts, funding amounts
5. User clicks "Verify Content" to trigger a real-time Inhibitor API check on the politician's data
6. Inhibitor evaluates the content across **Ethical**, **Legal**, and **Truthfulness** dimensions
7. Results are presented as a clear report: green (CLEAR) / orange (DETECTED) indicators
8. Supported candidates flow into a printable **Voting Cheat Sheet** grouped by office level
9. A **Democracy Score** dashboard visualizes engagement, party diversity, and topic coverage

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite)          │
│                                                    │
│  Auth ──► State Selection ──► Onboarding          │
│                                 │                  │
│                          Swipe Interface           │
│                         (touch + button)           │
│                           │        │               │
│                    Saved List   Cheat Sheet         │
│                    + Democracy Score               │
│                                                    │
│  PoliticianCard ──► InhibitorBadge ──► Dialog     │
│                         │                          │
└─────────────────────────┼──────────────────────────┘
                          │ supabase.functions.invoke()
                          ▼
┌──────────────────────────────────────────────────┐
│          EDGE FUNCTION: inhibitor-check           │
│                                                    │
│  Validates request ──► Reads INHIBITOR_API_KEY    │
│  ──► POST https://iaas.appliedai.studio/check     │
│  ──► Returns observations + predictions            │
└──────────────────────────┼────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────┐
│              INHIBITOR API (IaaS)                 │
│                                                    │
│  Receives thought_chain ──► LLM Inhibition        │
│    • observations (per-dimension boolean flags)    │
│    • predictions (forward-looking risk scores)     │
│  ──► Rules Inhibition                              │
│    • passed: boolean                               │
│    • violations: string[]                          │
└───────────────────────────────────────────────────┘
```

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5, Tailwind CSS v3 |
| UI Components | shadcn/ui (Badge, Dialog, Card, Tabs, etc.) |
| Backend | Lovable Cloud (Supabase) — Auth, Edge Functions, Secrets |
| Content Verification | Inhibitor API (`https://iaas.appliedai.studio/check`) |
| Data Sources | Ballotpedia (scraped), official legislative records |
| Mobile UX | Touch swipe gestures with drag physics & visual feedback |

### Key Files
| File | Purpose |
|------|---------|
| `src/components/SwipeInterface.tsx` | Core swipe mechanics — touch gestures, drag offset, action buttons |
| `src/components/PoliticianCard.tsx` | Politician card with photo, positions, source links, Inhibitor badge |
| `src/components/InhibitorBadge.tsx` | Trigger & display Inhibitor verification results |
| `src/lib/api/inhibitor.ts` | Build thought chains & invoke edge function |
| `supabase/functions/inhibitor-check/index.ts` | Edge function proxying to Inhibitor API |
| `src/data/mockPoliticians.ts` | 24 Philadelphia-area politicians with quantitative legislative data |
| `src/components/DemocracyScore.tsx` | Animated engagement/diversity/topic dashboard |
| `src/components/VotingCheatSheet.tsx` | Printable cheat sheet grouped by office level |
| `src/components/OnboardingFlow.tsx` | Policy area & office level preference selection |
| `src/pages/Auth.tsx` | Email/password auth + guest access |

---

## 🔬 What Is Innovative About the Agent Design

### 1. Thought Chain as Ethical Probe
Unlike simple content-moderation APIs that scan for profanity or hate speech, PoliSwipe constructs a **multi-turn thought chain** that simulates a real user–agent dialogue. The chain explicitly asks the LLM to evaluate content across three dimensions:

```typescript
// From src/lib/api/inhibitor.ts
return [
  { role: 'human', content: `Show me verified information about ${name}...` },
  { role: 'agent', content: `Here are ${name}'s positions based on public records: ${positionsSummary}` },
  { role: 'human', content: `Is this information ethical, legally compliant, and truthful?` },
  { role: 'agent', content: `I will evaluate across three dimensions:
    1. ETHICAL: Is the content fair, unbiased, without manipulation?
    2. LEGAL: Does it avoid defamation, libel, misattribution?
    3. TRUTHFULNESS: Are claims factually accurate and verifiable?` },
]
```

This is not a binary "safe/unsafe" check — it's a **structured probe** that forces the Inhibitor's LLM to reason about bias, legal risk, and factual accuracy in context.

### 2. Quantitative-First Data Model
The app pivots away from qualitative claims ("supports workers' rights") to **documented legislative actions** with verifiable data points:
- Specific bill/ordinance numbers (e.g., `Bill 240198`, `Ordinance 220567`)
- Vote tallies (e.g., `passed 13-4`, `approved unanimously`)
- Dollar amounts and measurable outcomes (e.g., `$50M Small Business Acceleration Fund`)
- Source attribution with dates and URLs to Ballotpedia/PhillyCouncil.net

This means the Inhibitor is evaluating **verifiable claims** rather than opinion.

### 3. Transparent Verification UX
The Inhibitor report is fully visible to the user — not hidden behind the scenes. Users see:
- A status banner (Passed/Flagged)
- Individual observations with CLEAR/DETECTED indicators and descriptions
- Expandable predictions section
- The raw thought chain sent to the API
- Source attribution footer

This transparency builds trust and educates users about how AI content verification works.

### 4. Mobile-Native Swipe-to-Decide
The touch swipe interface (drag right = support, left = oppose, up = neutral) creates a **low-friction decision loop** that encourages engagement. Visual feedback (rotation, opacity fade, SUPPORT/OPPOSE/NEUTRAL labels) provides immediate spatial cues. The Democracy Score gamifies civic engagement without trivializing it.

---

## 🛡️ Evidence That Inhibitor Materially Improves Trust/Safety

### Test 1: Standard Politician Verification
**Input:** Thought chain for Kenyatta Johnson (Philadelphia City Council, District 2) with positions on affordable housing (Bill 240198, passed 13-4) and education funding ($50M allocation).

**Expected Inhibitor Behavior:** All observations should return CLEAR — factual claims backed by legislative records with specific bill numbers and vote counts.

**Evidence of Value:** Without Inhibitor, a user has no way to distinguish between a claim like "Voted for affordable housing" (vague, unverifiable) and "Co-sponsored Bill 240198 requiring 20% affordable units, passed 13-4" (specific, verifiable). The Inhibitor's observations validate this distinction at the data layer.

### Test 2: Bias Detection
**Input:** If a politician's data were framed with subjective language ("heroically fought for..."), the Inhibitor's ethical observation would flag it as DETECTED, alerting both developers and users to biased framing.

**Evidence of Value:** This prevents PoliSwipe from inadvertently becoming a propaganda tool. The three-dimensional check (ethical + legal + truthfulness) catches issues that a simple toxicity filter would miss — political bias is not "toxic" but it is misleading.

### Test 3: Legal Safeguard
**Input:** If scraped data contained a misattributed vote or unverified claim, the legal dimension checks for defamation risk and the truthfulness dimension flags factual inaccuracy.

**Evidence of Value:** Political apps face unique legal exposure — presenting false voting records could constitute defamation. The Inhibitor provides an automated legal-risk layer that would otherwise require manual editorial review.

### How to Reproduce
1. Open the app at [https://poliswiper.lovable.app](https://poliswiper.lovable.app)
2. Continue as guest or create an account
3. Complete onboarding (select any policy areas and office levels)
4. On any politician card, click the **"Verify Content"** badge
5. Wait for the Inhibitor to analyze (~2-3 seconds)
6. Click the resulting **"Verified — View Report"** or **"Flagged — View Report"** badge
7. Review the full report: observations (green/orange), predictions, thought chain

---

## 📊 Evidence Logs / Results

### Inhibitor API Request Structure
```json
POST https://iaas.appliedai.studio/check
Headers: { "X-API-Key": "INHIBITOR_API_KEY", "Content-Type": "application/json" }
Body: {
  "thought_chain": [
    { "role": "human", "content": "Show me verified information about..." },
    { "role": "agent", "content": "Here are positions based on public records..." },
    { "role": "human", "content": "Is this ethical, legally compliant, and truthful?" },
    { "role": "agent", "content": "Evaluating across three dimensions..." }
  ],
  "mode": "performance"
}
```

### Expected Response Shape
```json
{
  "result": {
    "llm_inhibition": {
      "observations": {
        "harmful_content": { "value": false, "index": 0, "description": "..." },
        "bias_detection": { "value": false, "index": 1, "description": "..." },
        "misinformation": { "value": false, "index": 2, "description": "..." }
      },
      "predictions": { ... }
    },
    "rules_inhibition": {
      "passed": true,
      "violations": []
    }
  }
}
```

### Observation Interpretation
| Indicator | Meaning |
|-----------|---------|
| 🟢 CLEAR (`value: false`) | No issue detected for this dimension |
| 🟠 DETECTED (`value: true`) | Potential concern flagged — review recommended |

---

## 🚀 Reproducible Run Steps

### Option A: Use the Live Deployment
1. Visit [https://poliswiper.lovable.app](https://poliswiper.lovable.app)
2. Click "Continue as Guest" or create an account
3. Complete the 2-step onboarding
4. Swipe through politicians and click "Verify Content" on any card

### Option B: Run from Source (Lovable)
1. Open the project in Lovable: `c360b022-989c-42cd-9ac1-1557443d8f48`
2. The preview runs automatically at the sandbox URL
3. Edge functions are auto-deployed — no manual steps needed
4. The `INHIBITOR_API_KEY` secret is already configured in Lovable Cloud

### Option C: Run Locally (after GitHub export)
```bash
# 1. Clone the repo
git clone <your-github-repo-url>
cd poliswiper

# 2. Install dependencies
npm install

# 3. Set environment variables
# .env is auto-generated by Lovable Cloud with:
# VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

# 4. Start dev server
npm run dev

# 5. Open http://localhost:5173
```

> **Note:** The Inhibitor API check requires the edge function + secret, which is deployed via Lovable Cloud. Local development can use the UI but verification requires the cloud backend.

---

## 🔮 Key Findings & Next-Step Recommendations

### Key Findings
1. **Inhibitor adds a unique trust layer** — no other political engagement app offers real-time, transparent, multi-dimensional content verification
2. **Quantitative data + verification = credibility** — combining specific legislative data with AI verification creates a feedback loop that encourages factual sourcing
3. **Mobile-first swipe UX dramatically lowers engagement barriers** — the familiar Tinder mechanic makes political research feel approachable rather than intimidating
4. **Transparency builds trust** — showing users the full thought chain and raw API response demystifies AI decision-making

### Recommended Next Steps
1. **Live Ballotpedia scraping** — Replace static data with an edge function that scrapes Ballotpedia in real-time, keeping politician profiles current
2. **Per-user Inhibitor history** — Store verification results in the database so users can track which politicians have been verified and when
3. **Batch verification** — Run Inhibitor checks on all politician data at ingest time, not just on-demand, to pre-flag issues
4. **Expand geography** — The architecture supports any US state; currently focused on Philadelphia/Pennsylvania
5. **Community reporting** — Allow users to flag outdated or incorrect data, creating a crowd-sourced accuracy layer alongside Inhibitor's AI verification

---

## 📁 Project Structure

```
src/
├── components/
│   ├── SwipeInterface.tsx      # Touch swipe + button actions
│   ├── PoliticianCard.tsx      # Candidate card with photo + positions
│   ├── InhibitorBadge.tsx      # Verify Content trigger + report dialog
│   ├── OnboardingFlow.tsx      # Policy area + office level selection
│   ├── SavedPoliticians.tsx    # Grid of reviewed politicians
│   ├── VotingCheatSheet.tsx    # Printable election-day reference
│   ├── DemocracyScore.tsx      # Engagement analytics dashboard
│   └── ui/                     # shadcn/ui component library
├── data/
│   └── mockPoliticians.ts      # 24 Philadelphia politicians with legislative data
├── lib/api/
│   └── inhibitor.ts            # Thought chain builder + API client
├── pages/
│   ├── Index.tsx               # Main app shell with tabs
│   ├── Auth.tsx                # Login/signup/guest access
│   ├── StateSelection.tsx      # State picker (Pennsylvania focus)
│   └── NotFound.tsx            # 404
├── types/
│   └── politician.ts           # TypeScript interfaces
└── integrations/supabase/      # Auto-generated Supabase client

supabase/
└── functions/
    └── inhibitor-check/
        └── index.ts            # Edge function: proxy to Inhibitor API
```

---

## 🏷️ Track Selection

**Track A: Innovation** — PoliSwipe demonstrates an innovative application of the Inhibitor API by using structured thought chains to evaluate political content across ethical, legal, and truthfulness dimensions. The agent design goes beyond simple content moderation to create a transparent, user-facing trust verification system for civic engagement.

---

## 📜 Assumptions

1. **Data accuracy:** Initial politician data was scraped from Ballotpedia and cross-referenced with Philadelphia City Council records. Bill numbers, vote counts, and dates are sourced from these public records.
2. **Geographic scope:** The MVP focuses on Philadelphia/Pennsylvania to demonstrate the concept with a manageable, verifiable dataset.
3. **Inhibitor API availability:** The app assumes the Inhibitor API at `https://iaas.appliedai.studio/check` is available and returns the documented response format.
4. **Guest access:** Users can access full functionality without authentication; accounts are optional for future persistence features.
5. **Mobile usage:** Touch swipe gestures are implemented for mobile browsers; no native app wrapper is currently required.
