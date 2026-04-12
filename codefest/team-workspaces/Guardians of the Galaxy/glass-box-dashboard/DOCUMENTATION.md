# GlassBox Explained — Technical Documentation

## Philly Codefest 2026 | Challenge 3: Glass Box | Team: Guardians of the Galaxy

---

## 1. Project Overview

**GlassBox Explained** is an AI Safety Audit Dashboard that parses Inhibitor log data and makes every intervention decision transparent to non-technical compliance reviewers. It is a single-page React application that loads CSV pipeline logs and JSONL intervention events entirely client-side — no backend required.

### What It Does
- Parses 17,000+ Inhibitor pipeline events from CSV files
- Parses intervention events (blocked/interrupted actions) from JSONL files
- Visualizes the full AI safety pipeline: embeddings, LLM reasoning, risk signals, compliance checks, rule evaluation, and final validation
- Shows every intervention with before/after comparison (what AI proposed vs what Inhibitor enforced)
- Maps risk correlations between AI behaviors and real-world consequences
- Generates downloadable PDF compliance audit reports
- Supports multiple datasets with session history and comparison
- Light and dark mode themes

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React | 19.2.4 |
| **Language** | TypeScript | 6.0.2 |
| **Build Tool** | Vite | 8.0.4 |
| **Styling** | Tailwind CSS | 4.2.2 |
| **UI Primitives** | Radix UI | (dialog, tabs, tooltip, select, scroll-area) |
| **Charts** | Recharts | 3.8.1 |
| **Correlation Graph** | Custom HTML5 Canvas | (no D3 dependency) |
| **Animations** | Framer Motion | 12.38.0 |
| **CSV Parsing** | PapaParse | 5.5.3 |
| **PDF Export** | jsPDF + jspdf-autotable | 4.2.1 / 5.0.7 |
| **Data Tables** | TanStack React Table | 8.21.3 |
| **Icons** | Lucide React | 1.8.0 |
| **Storage** | localStorage + IndexedDB | Browser native |

---

## 3. Architecture

### Application Flow

```
Landing Page (file upload or sample data)
    ↓
Data Parsing (PapaParse for CSV, JSON.parse for JSONL)
    ↓
Data Processing (group into request lifecycles, compute stats, build correlations)
    ↓
Dashboard (9 pages: Overview, Interventions, Explorer, Risk Map, Performance, Security, Report, History, New Session)
```

### Directory Structure

```
src/
├── App.tsx                          # Root component, routing, state management
├── main.tsx                         # Entry point, ThemeProvider wrapper
├── index.css                        # Tailwind config, dark/light theme variables, utility classes
├── contexts/
│   └── ThemeContext.tsx              # Light/dark mode context + provider
├── hooks/
│   ├── useInhibitorData.ts          # Core data hook: load, parse, manage datasets
│   └── useChatbot.ts               # Chatbot state management
├── lib/
│   ├── types.ts                     # All TypeScript interfaces
│   ├── parseCsv.ts                  # CSV parsing with Python dict→JSON converter
│   ├── parseJsonl.ts                # JSONL parsing with validation
│   ├── groupRequests.ts             # Groups events into request lifecycles
│   ├── computeStats.ts              # Computes dashboard metrics
│   ├── correlations.ts              # Observation↔Prediction co-occurrence matrix
│   ├── humanize.ts                  # Event names → plain English labels
│   ├── sessionStorage.ts            # localStorage + IndexedDB persistence
│   ├── themeColors.ts               # Color palette lookup for dark/light themes
│   ├── chatEngine.ts                # Chat system prompt and response handling
│   ├── chatContextBuilder.ts        # Builds dataset context for chatbot
│   ├── chatIntents.ts               # Intent detection for chat queries
│   └── governanceData.ts            # Governance review data builder
├── components/
│   ├── landing/LandingPage.tsx       # File upload + sample data entry point
│   ├── layout/
│   │   ├── AppShell.tsx              # Dashboard shell (sidebar + header + content)
│   │   ├── Sidebar.tsx               # Navigation with 9 tabs
│   │   └── Header.tsx                # Status bar + theme toggle
│   ├── overview/
│   │   ├── OverviewPage.tsx          # Main dashboard with audit summary
│   │   ├── KpiCards.tsx              # Animated metric cards
│   │   ├── RadialPipeline.tsx        # Concentric rings pipeline visualization (Canvas)
│   │   ├── PipelineFlow.tsx          # Linear pipeline stage visualization
│   │   ├── RiskRadar.tsx             # Radar chart for top risk patterns
│   │   ├── RiskSignalChart.tsx       # Bar chart of observation frequencies
│   │   ├── ComplianceChart.tsx       # Bar chart grouped by compliance domain
│   │   ├── TimelineChart.tsx         # Area chart of requests over time
│   │   └── EventBreakdownChart.tsx   # Event type distribution chart
│   ├── interventions/
│   │   ├── InterventionsPage.tsx     # Intervention list with agent cards + PDF export
│   │   └── InterventionCard.tsx      # Before/after intervention comparison card
│   ├── explorer/
│   │   ├── ExplorerPage.tsx          # Request table + timeline drill-down
│   │   ├── RequestTable.tsx          # Sortable/filterable request list
│   │   └── RequestTimeline.tsx       # Vertical event timeline for single request
│   ├── correlation/
│   │   └── CorrelationMap.tsx        # Force-directed network graph (Canvas)
│   ├── performance/
│   │   └── PerformancePage.tsx       # Latency histograms + scatter plot
│   ├── security/
│   │   └── SecurityPage.tsx          # Auth failure cards with geolocation
│   ├── report/
│   │   └── ReportGenerator.tsx       # PDF compliance report generator
│   ├── comparison/
│   │   └── ComparisonView.tsx        # Side-by-side dataset comparison
│   ├── history/
│   │   └── HistoryPage.tsx           # Saved session list with restore
│   ├── upload/
│   │   └── NewSessionPage.tsx        # In-dashboard file upload
│   ├── replay/
│   │   └── TimelineReplay.tsx        # Animated pipeline replay
│   ├── governance/
│   │   ├── GovernanceReviewModal.tsx  # Governance review overlay
│   │   └── GovernanceRadarChart.tsx   # Governance radar visualization
│   ├── chatbot/
│   │   ├── ChatFab.tsx               # Floating chat button
│   │   ├── ChatPanel.tsx             # Chat panel with messages
│   │   ├── ChatInput.tsx             # Chat input field
│   │   ├── ChatMessage.tsx           # Single chat message
│   │   └── SuggestedQuestions.tsx     # Quick question chips
│   └── shared/
│       ├── CyberBackground.tsx       # Animated particle field (Canvas)
│       ├── DatasetUploadForm.tsx      # Reusable upload form
│       ├── FileUploadZone.tsx         # Drag-and-drop file input
│       ├── SeverityBadge.tsx          # Color-coded severity indicator
│       ├── LoadingScreen.tsx          # Loading overlay with animation
│       └── AddDatasetModal.tsx        # Dataset add modal
```

---

## 4. Data Processing Pipeline

### 4.1 CSV Parsing (`parseCsv.ts`)

The CSV file (`inhibitor_logs.csv`) contains raw Inhibitor pipeline events. Each row has:
- `timestamp` — ISO 8601 timestamp
- `apiKey` — request source identifier
- `event` — pipeline event type (16 distinct types)
- `meta` — JSON metadata in **Python dict syntax**

**Python Dict → JSON Conversion:** The meta column uses Python syntax (single quotes, `True`/`False`, `None`). Our `pythonDictToJson()` function walks the string character-by-character:
1. Replaces `True` → `true`, `False` → `false`, `None` → `null`
2. Converts single-quoted strings to double-quoted, escaping inner double quotes
3. Handles nested structures like `'cf-visitor': '{"scheme":"https"}'`
4. Falls back to `{ raw: string }` if parsing fails

### 4.2 JSONL Parsing (`parseJsonl.ts`)

The JSONL file (`inhibitor_events.jsonl`) contains high-level intervention records. Each line is a JSON object with: `timestamp`, `agent_id`, `request_id`, `mode`, `policy_trigger`, `severity`, `action`, `reason`, `proposed_action`, `corrected_action`.

### 4.3 Request Lifecycle Grouping (`groupRequests.ts`)

Raw events are grouped into request lifecycles by:
1. Identifying `anon` API key `request_success` events as request boundaries
2. Matching subsequent `GEN_*` events to each request by temporal proximity
3. Extracting per-request: observations, predictions, rule results, validation status, timing

### 4.4 Statistics Computation (`computeStats.ts`)

Computes: total events, total requests, observation/prediction key counts, validation pass rate, average request duration, embedding/LLM latency distributions (with p50/p95/p99), requests per hour buckets.

### 4.5 Correlation Analysis (`correlations.ts`)

Builds an observation → prediction co-occurrence matrix across all requests. For each request, every observation key is paired with every prediction key. Weight = number of requests where both appeared. Top N nodes by frequency are selected for visualization.

---

## 5. Dashboard Pages

### 5.1 Overview
- Audit summary hero with KPI highlights
- KPI cards with animated counters (requests, risk signals, compliance checks, pass rate, auth failures)
- Radial Pipeline Flow (animated concentric rings showing event volume per processing stage)
- Risk Signal Radar (top 10 observation patterns as radar chart)
- Pipeline Flow (linear stage visualization)
- Request Volume Over Time (area chart)
- Risk Signals + Compliance Violations (bar charts)

### 5.2 Interventions
- Agent health status cards showing per-agent metrics
- Before/after intervention cards (red = what AI proposed, green = what Inhibitor enforced)
- Three correction strategies: Gate (defer to human), Sanitize (strip sensitive data), Reject (discard attack)
- Inline PDF report generation with one-click download

### 5.3 Explorer
- Sortable/filterable request table (120 requests)
- Click any row → side panel with full processing timeline
- Color-coded pipeline stages with expandable metadata
- Independent scrolling for list and timeline panels
- Governance Review modal for detailed request analysis

### 5.4 Risk Map (Correlation)
- Custom Canvas force-directed network graph
- Left nodes (amber): risk signals / Right nodes (red): consequences
- Connecting lines show co-occurrence strength
- Click any node to highlight connected chains with detail panel

### 5.5 Performance
- Embedding latency histogram (OpenAI text-embedding-3-small)
- LLM reasoning latency histogram (Groq llama-3.3-70b)
- Min/Median/Mean/P95/P99/Max stat cards
- Request duration scatter plot

### 5.6 Security
- Auth failure probe cards with IP, country, user agent, target path
- Geographic breakdown (country flags)
- Threat type classification (Credential Harvesting, Service Probing, Reconnaissance)

### 5.7 Report
- One-click PDF generation with jsPDF
- Sections: Title, Executive Summary, Interventions, Risk Signals, Compliance by Domain, Performance, Security

### 5.8 Comparison
- Side-by-side dataset comparison (requires 2+ datasets)
- KPI delta badges with percentage change
- Grouped bar chart comparing compliance violations by domain
- Risk signal frequency comparison table

### 5.9 History
- Auto-saved sessions with metadata in localStorage
- Raw data blobs in IndexedDB for full session restore
- Click any saved session to reload complete analysis
- Delete individual sessions or clear all

### 5.10 New Session
- In-dashboard file upload form (reuses DatasetUploadForm component)
- Upload new CSV + JSONL without leaving the dashboard

---

## 6. Key Technical Decisions

### Why Client-Side Only?
- **Data privacy:** Inhibitor logs contain sensitive security data — never leaves user's machine
- **Zero friction:** No server setup, database, or API keys needed to run
- **Challenge scope:** Challenge 3 asks for UI/analysis components, not infrastructure

### Why PapaParse for CSV?
- Handles streaming parse of large files (17,000+ rows) without blocking the UI
- Correctly handles quoted fields containing the Python dict meta column
- Supports both File objects (upload) and string input (session restore)

### Why Custom Canvas Instead of D3?
- D3 adds significant bundle size for a single visualization
- Canvas gives direct pixel control for the force-directed layout
- Custom physics simulation (200 frames, damped springs) is simpler than configuring D3-force
- No dependency management overhead

### Why Two-Layer Storage?
- localStorage: Fast, synchronous, perfect for small session metadata
- IndexedDB: Handles multi-megabyte CSV/JSONL blobs that exceed localStorage's 5MB limit
- Re-parsing from raw text avoids Date serialization issues (Date objects don't survive JSON.stringify)

### Why Tailwind CSS 4 @theme?
- CSS custom properties defined once, referenced everywhere
- `[data-theme="light"]` override block enables theme switching without JavaScript color logic
- Tailwind utility classes (`bg-background`, `text-accent`) automatically respond to theme changes

---

## 7. Event Taxonomy

### 16 Pipeline Event Types (CSV)

| Event | Plain English | Category |
|-------|--------------|----------|
| `request_success` | Request Received | Request |
| `embedding_start` | Analyzing Content | Embedding |
| `embedding_complete` | Content Analysis Complete | Embedding |
| `llm_prompt_start` | AI Reasoning Step Started | LLM |
| `llm_prompt_complete` | AI Reasoning Step Complete | LLM |
| `inhibition_observation_description_response` | Risk Signal Detected | Observation |
| `inhibition_prediction_reason_response` | Compliance Check Triggered | Prediction |
| `rules_inhibition_rule_start` | Rule Evaluation Started | Rules |
| `rules_inhibition_rule_passed` | Rule Evaluation Passed | Rules |
| `rules_inhibition_rule_binding_missing` | Missing Required Field | Rules |
| `rules_extraction_value_missing` | Missing Data Value | Rules |
| `rules_inhibition_complete` | Rule Check Complete | Rules |
| `inhibition_describe_result_validation` | Result Validated | Validation |
| `inhibition_final_validation` | Final Validation Complete | Validation |
| `auth_failed_invalid_key` | Unauthorized Access Blocked | Auth |

### 5 Compliance Domains

| Domain | Color | Prediction Keys |
|--------|-------|-----------------|
| Financial | Amber | cfpb_violation, aml_violation, unfair_claims_practice, unjustified_cost |
| Privacy & Data | Purple | gdpr_violation, ccpa_violation, hipaa_violation, lgpd_violation, pipeda_violation, privacy_violated, transparency_or_consent_violated |
| Security | Red | system_exploitation_risk, unsafe_autonomous_decision, malicious_request_detected, safety_disregarded, system_integrity_violated |
| Fairness & Ethics | Green | unfair_treatment, fairness_violated, dignity_or_respect_violated, control_or_autonomy_violated, public_offense |
| Quality & Trust | Cyan | eroded_trust, decision_quality_violated, invalid_output, ai_act_violation, harm, accountability_obscured, soc2_noncompliance, iso27001_violation, stakeholder_unawareness_risk |

---

## 8. How to Run

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

No environment variables required for core functionality. The chatbot requires `VITE_OPENAI_API_KEY` in a `.env` file for AI-powered responses.

---

## 9. Scoring Alignment (100 points)

| Criterion | Points | Features |
|-----------|--------|----------|
| **Visual Clarity** | 40 | Radial pipeline flow, risk radar, correlation network map, animated KPI counters, intervention before/after cards, compliance domain charts, event distribution, request timeline |
| **Correct Parsing** | 25 | Python dict→JSON converter, CSV with PapaParse, JSONL validation, request lifecycle grouping, latency computation, auth failure extraction with IP/country |
| **UX for Non-Technical** | 20 | 66 event types humanized to plain English, progressive disclosure, one-click PDF export, AI chatbot, session history, light/dark mode |
| **Integration Ready** | 15 | TypeScript throughout, hook-based architecture, reusable components, file drag-and-drop, multi-dataset support, works with any Inhibitor log file |

---

## 10. Project Stats

| Metric | Value |
|--------|-------|
| Total files | 57 TypeScript/React files |
| Lines of code | 8,196 |
| React components | 40+ |
| Feature modules | 16 |
| Production dependencies | 18 |
| Build time | < 600ms |
| CSV parse time | < 2 seconds for 17,000+ rows |

---

*Built by Team Guardians of the Galaxy for Philly Codefest 2026*
