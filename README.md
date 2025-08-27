# inhibitor-lab

**inhibitor-lab** is the official open-source project from [appliedAIstudio](https://appliedaistudio.com) for demonstrating how to integrate and experiment with the Inhibitor service in agent-based systems.

This repository is designed for developers, researchers, and teams looking to build ethical, interruptible, and auditable agents. It includes working examples, live integrations, reference patterns, and technical documentation to support safe and responsible agent development using the Inhibitor.

---

## 🚀 Notebooks

Explore hands-on examples of how to integrate and test the Inhibitor with different types of agents:

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

> **Note:** The Inhibitor service is developed by appliedAIstudio. To learn more, visit [appliedAIstudio.com](https://appliedaistudio.com).
