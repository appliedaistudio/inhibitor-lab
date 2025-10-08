# inhibitor-lab
[![GitHub Pre-Release](https://img.shields.io/github/v/release/appliedaistudio/inhibitor-lab?include_prereleases&label=Pre-Release)](https://github.com/appliedaistudio/inhibitor-lab/releases)


**inhibitor-lab** is the official open-source project from [appliedAIstudio](https://www.appliedai.studio/) for demonstrating how to integrate and experiment with the Inhibitor service in agent-based systems.

This repository is designed for developers, researchers, and teams looking to build ethical, interruptible, and auditable agents. It includes working examples, live integrations, reference patterns, and technical documentation to support safe and responsible agent development using the Inhibitor.

---

## 🔎 **AI Safety Index (July 2025)**  
> The 2025 *AI Safety Index* exposes a critical industry gap: leading AI companies are rapidly scaling model capabilities **without embedding real-time ethical reasoning**.  
> While most firms perform adequately on transparency and post-hoc governance, **all seven** scored poorly—many failing outright—on:
>
> - Existential safety (no company scored above a D)
> - Dangerous capability testing (only 3 of 7 attempted)
> - Real-time decision safety (none had actionable strategies)
>
> 🧠 This is where the **Inhibitor** applies: real-time ethical reasoning and interruptibility, by design.

📄 **Read the report**:  
- [Future of Life Institute – Full Report](https://futureoflife.org/ai-safety-index-summer-2025/)  
- [📎 Local PDF Copy (docs/FLI-AI-Safety-Index-Report-Summer-2025.pdf)](docs/FLI-AI-Safety-Index-Report-Summer-2025.pdf)

## 🚀 Notebooks

### Example Notebooks

- **[Quickstart: Inhibitor API](notebooks/quickstart_inhibitor.ipynb)**  
  Minimal example for connecting to the API, sending inputs, and viewing moderation results.

- **[Adaptive Feedback Agent](notebooks/adaptive_agent_feedback_loops.ipynb)**  
  Unified agent that performs real-time oversight, critique, and adjustment using LLMs. Replaces older AI security and data handling agents.

- **[Real-Time Moderation Agent](notebooks/realtime_moderation_agent.ipynb)**  
  Demonstrates performance mode for rapid, inline moderation of streamed inputs.

---

## 🔌 API Documentation

The Inhibitor service exposes a REST API for ethical evaluation, logging, and oversight.  
Full details are available here: [docs/inhibitor-api.md](docs/inhibitor-api.md)

👉 You must obtain an **Inhibitor API key** from [appliedAIstudio](https://www.appliedai.studio/) to use the service.

---

## 📜 Regulations

The Inhibitor actively supports detection and oversight across a defined set of regulations.
The complete list is maintained in a dedicated document: [docs/supported-regulations.md](docs/supported-regulations.md)
Refer to this document for details on which regulations are covered and how support is implemented.

---

## ⚡ Insight vs Performance Modes

The Inhibitor provides two modes of operation:

- **Insight Mode**  
  Slower but provides detailed reasoning for why outputs are flagged.  
  Best for compliance, audits, and debugging.  

- **Performance Mode**  
  Fast, minimal feedback (flag only).  
  Best for real-time agents, moderation, or high-throughput use.  

---

## 📂 Repository Structure

- `notebooks/` → Interactive Jupyter notebooks demonstrating different agent scenarios
- `examples/` → Lightweight code samples for quick integration
- `docs/` → Technical documentation and integration guides
- `benchmarks/` → Performance and latency tracking results

---

## Getting Started

1. Clone this repo
2. Open notebooks or examples
3. Follow documentation in `/docs` to start integrating

### 🧭 Plan Your Build Sprint

If you are preparing to integrate the Inhibitor into a new agent, walk through the [Inhibitor Application Sprint](docs/inhibitor-application-sprint.md). It provides a phase-by-phase guide for defining inhibitions, building reflective loops, activating the Inhibitor, stress-testing your agent, and launching with ongoing oversight.

> **Note:** The Inhibitor service is developed by [appliedAIstudio](https://www.appliedai.studio/).

