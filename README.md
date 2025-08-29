# inhibitor-lab

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
- [📎 Local PDF Copy (docs/FLI-AI-Safety-Index-Summer-2025.pdf)](docs/FLI-AI-Safety-Index-Summer-2025.pdf)

## 🚀 Notebooks

Explore hands-on examples of how to integrate and test the Inhibitor with different types of agents:

- **[Quickstart: Inhibitor API](notebooks/quickstart_inhibitor.ipynb)**
  Minimal example showing how to connect to the API, send text, and view results.  
  [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/appliedaistudio/inhibitor-lab/blob/main/notebooks/quickstart_inhibitor.ipynb)

- **[LLM Feedback Agent](notebooks/llm_feedback_agent.ipynb)**
  Demonstrates the Reason–Observe–Adjust loop with an LLM assistant. Shows how unsafe recommendations are caught.  
  [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/appliedaistudio/inhibitor-lab/blob/main/notebooks/llm_feedback_agent.ipynb)

- **[Real-Time Moderation Agent](notebooks/realtime_moderation_agent.ipynb)**  
  Demonstrates **performance mode** for fast, real-time oversight of streaming inputs.  
  [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/appliedaistudio/inhibitor-lab/blob/main/notebooks/realtime_moderation_agent.ipynb)

- **[AI Security Attacks](notebooks/ai_security_attacks.ipynb)**  
  Demonstrates common vulnerabilities (prompt injection, PII leakage, malicious code) and how the Inhibitor flags them.  
  [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/appliedaistudio/inhibitor-lab/blob/main/notebooks/ai_security_attacks.ipynb)

- **[Data Handling Agent](notebooks/data_handling_agent.ipynb)**  
  Demonstrates safe vs unsafe handling of sensitive information (PII, HR, healthcare). Shows tradeoffs between **insight** and **performance** modes.  
  [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/appliedaistudio/inhibitor-lab/blob/main/notebooks/data_handling_agent.ipynb)

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

> **Note:** The Inhibitor service is developed by [appliedAIstudio](https://www.appliedai.studio/).

