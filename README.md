[
![Inhibitor hero banner](docs/assets/images/inhibitor-hero.jpg)
](docs/inhibitor-application-sprint.md)

# inhibitor-lab

**inhibitor-lab** is the open-source R&D space for integrating the **Inhibitor** into agent-based systems. The audience is AI technologists who need defensible, real-time controls to keep autonomous agents from doing unsafe or wasteful work.

---

## Philly Codefest OpenBuild kit

- Start here: [`codefest/README.md`](codefest/README.md)
- Team operations: [`codefest/TEAM_MANAGEMENT.md`](codefest/TEAM_MANAGEMENT.md)

---

## Why teams ship with the Inhibitor

- **Real-time guardrails** for LLM-driven agents, with interruptibility and course correction rather than post-hoc filters.
- **Audit-ready trails** that explain why actions were blocked, enabling compliance reviews and root-cause analysis.
- **Deployment agility** via edge-first, stateless design that respects geographic data boundaries and GDPR expectations.

### Industry signal: AI Safety Index (July 2025)

Leading AI companies scored **D or worse** on existential safety and lacked real-time decision safeguards. The Inhibitor is designed to close that gap with inline ethical reasoning and actionability.

References:
- [Future of Life Institute – Full Report](https://futureoflife.org/ai-safety-index-summer-2025/)
- [Local PDF Copy](docs/FLI-AI-Safety-Index-Report-Summer-2025.pdf)

---

## Core capabilities

- **Insight Mode** – slower, with narrative reasoning for compliance, audits, and debugging.
- **Performance Mode** – fast, flag-only moderation for real-time agents and high-throughput tasks.
- **GDPR compliance by design** – data minimization, single-purpose processing, and stateless operation. See [docs/gdpr-compliance.md](docs/gdpr-compliance.md).
- **Global edge deployment** – compute stays close to users to reduce cross-border movement. See [docs/global-edge-deployment.md](docs/global-edge-deployment.md).
- **Explained oversight** – see [docs/inhibitor-inside.md](docs/inhibitor-inside.md) for a narrative on how the Inhibitor converts agent thoughts into structured, ethical decisions.
- **See it live** – explore the [Inhibitor Demo](https://iaas-demo.replit.app/) to watch how risky prompts are detected, interventions fire, and responses get redirected in real time.

---

## Quickstart (developers)

1. **Get an API key** from [appliedAIstudio](https://www.appliedai.studio/iaas).
2. **Review the REST API**: [docs/inhibitor-api.md](docs/inhibitor-api.md).
3. **Fetch the latest OpenAPI spec** (no API key required):
   - JSON: `curl https://iaas.appliedai.studio/openapi.json`
   - YAML: `curl https://iaas.appliedai.studio/openapi.yaml`
4. **Run an example notebook** (pick one):
   - [Quickstart: Inhibitor API](notebooks/quickstart_inhibitor.ipynb)
   - [Adaptive Feedback Agent](notebooks/adaptive_agent_feedback_loops.ipynb)
   - [Real-Time Moderation Agent](notebooks/realtime_moderation_agent.ipynb)
5. **Layer the Inhibitor into your agent loop** (oversight, critique, and action correction).
6. **Stress-test and monitor** using the [Inhibitor Application Sprint](docs/inhibitor-application-sprint.md).

---

## Compliance and regulation coverage

The Inhibitor tracks and surfaces violations across a maintained set of regulations. See [docs/supported-regulations.md](docs/supported-regulations.md) for the latest mappings.

---

## Repository map

- `notebooks/` – interactive scenarios showing oversight and moderation patterns.
- `examples/` – lightweight code snippets for quick integration.
- `docs/` – API reference, deployment guidance, and governance resources.
- [`benchmarks/`](benchmarks/) – entry point for supported workflows and historical benchmark assets.
  - [`benchmarks/supported/`](benchmarks/supported/) – actively maintained benchmark workflows.
  - [`benchmarks/supported/operational/`](benchmarks/supported/operational/) – supported operational load and recovery benchmark.
  - [`benchmarks/legacy/`](benchmarks/legacy/) – historical benchmark implementations and result artifacts.
- `codefest/` – Philly Codefest OpenBuild challenge kits, starter notebooks, shared logs, and team operations docs.

### Benchmarks

Start with the [benchmark lifecycle guide](benchmarks/README.md). [Supported benchmarks](benchmarks/supported/README.md) are the authoritative entry points for new execution, while historical benchmark implementations and outputs remain available under [`benchmarks/legacy/`](benchmarks/legacy/) for provenance and comparison.

- **Supported operational benchmark** – review the [operational guide](benchmarks/supported/operational/README.md), run the [benchmark notebook](benchmarks/supported/operational/inhibitor_operational_benchmark.ipynb), and use [`benchmark_reporting.py`](benchmarks/supported/operational/benchmark_reporting.py) for its deterministic reporting workflow.
- **Completed reference result** – read the included [operational benchmark report](benchmarks/supported/operational/results/operational-v2.24.1-2026-07-31T16-07-17Z/benchmark_report.md) for run-specific evidence and interpretation.

### Documentation trails

- **Implementation flow** – Start with the [Inhibitor Application Sprint](docs/inhibitor-application-sprint.md), then dive into the [Reason-Observe-Adjust pattern](docs/roa-pattern.md) and the [Inside the Inhibitor](docs/inhibitor-inside.md) narrative to see how the oversight loop runs.
- **Adoption progression** – Follow the [typical Inhibitor adoption progression](docs/inhibitor-progression.md) to sequence confidence calibration, schema hardening, error prevention, and auditability.
- **Case studies** – See how the inhibitor performs in production with the [healthcare case impact report](docs/case-studies/healthcare-case-impact.md).
- **Policy to runtime** – Trace how written policies become DILL rules in the [policy-to-rule examples](docs/policy-rule-examples/README.md), then compare enforcement outcomes in the [API reference](docs/inhibitor-api.md) and [supported regulations](docs/supported-regulations.md).
- **Governance and compliance** – Pair [GDPR guidance](docs/gdpr-compliance.md) with [global edge deployment](docs/global-edge-deployment.md) and zoom out to the [ethical inference theory](docs/ethical-inference-theory.md) that underpins the system.
- **Change history** – Start with [release notes 1.11](docs/release-notes/1.11.md) for the benchmark lifecycle restructuring, then review [release notes 1.10](docs/release-notes/1.10.md) for API integration documentation, [release notes 1.9](docs/release-notes/1.9.md) for policy validation workflows, or [release notes 1.8](docs/release-notes/1.8.md) for the preceding release.

---

## Build with confidence

- Walk the full implementation playbook: [Inhibitor Application Sprint](docs/inhibitor-application-sprint.md).
- Need help or an enterprise key? Visit [appliedAIstudio](https://www.appliedai.studio/).
