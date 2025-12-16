[
![Inhibitor hero banner](docs/assets/images/inhibitor-hero.jpg)
](docs/inhibitor-application-sprint.md)

# inhibitor-lab

**inhibitor-lab** is the open-source R&D space for integrating the **Inhibitor** into agent-based systems. The audience is AI technologists who need defensible, real-time controls to keep autonomous agents from doing unsafe or wasteful work.

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
3. **Run an example notebook** (pick one):
   - [Quickstart: Inhibitor API](notebooks/quickstart_inhibitor.ipynb)
   - [Adaptive Feedback Agent](notebooks/adaptive_agent_feedback_loops.ipynb)
   - [Real-Time Moderation Agent](notebooks/realtime_moderation_agent.ipynb)
4. **Layer the Inhibitor into your agent loop** (oversight, critique, and action correction).
5. **Stress-test and monitor** using the [Inhibitor Application Sprint](docs/inhibitor-application-sprint.md).

---

## Compliance and regulation coverage

The Inhibitor tracks and surfaces violations across a maintained set of regulations. See [docs/supported-regulations.md](docs/supported-regulations.md) for the latest mappings.

---

## Repository map

- `notebooks/` – interactive scenarios showing oversight and moderation patterns.
- `examples/` – lightweight code snippets for quick integration.
- `docs/` – API reference, deployment guidance, and governance resources.
- `benchmarks/` – latency and performance tracking.

---

## Build with confidence

- Walk the full implementation playbook: [Inhibitor Application Sprint](docs/inhibitor-application-sprint.md).
- Need help or an enterprise key? Visit [appliedAIstudio](https://www.appliedai.studio/).

