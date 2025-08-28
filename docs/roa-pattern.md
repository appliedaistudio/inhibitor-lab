## Design Pattern: Reason-Observe-Adjust (ROA)

### Intent

Enable intelligent agents to make ethical, responsive, and explainable decisions by iterating through structured steps: reasoning, observing outcomes, and adjusting plans based on feedback.

---

### Context

Used when agents operate in dynamic environments and require real-time reasoning, auditability, and safe interaction. Essential in systems where autonomy, ethical compliance, and human alignment are critical.

---

### Problem

Agents may rush to decisions based on incomplete or flawed reasoning, leading to unintended or unethical outcomes. Static AI responses lack robustness, particularly when evaluating edge cases, conflicting inputs, or sensitive domains.

---

### Forces

* Need for timely action vs. safe, ethical behavior.
* Decoupling observation and execution to isolate ethical evaluation.
* Maintaining transparency and accountability in autonomous systems.
* Enabling feedback loops to iteratively refine decisions.

---

### Solution

Decompose the agent’s process into three structured stages:

1. **Reason**: Generate hypotheses or planned actions based on the initial prompt or situation.
2. **Observe**: Use an inhibition engine to evaluate the ethical and contextual implications of the planned action before execution.
3. **Adjust**: Modify, reject, or confirm the plan based on ethical checks and system feedback.

This tri-phase loop continues until the agent produces a response that satisfies all system constraints.

---

### Structure

```
+----------+      +-----------+      +-----------+
|  Reason  | ---> |  Observe  | ---> |  Adjust   |
+----------+      +-----------+      +-----------+
      ^                                 |
      |---------------------------------|
               (feedback loop)
```

---

### Participants

* **Agent Core**: The reasoning engine.
* **Inhibitor Engine**: Performs ethical evaluation (observation).
* **Feedback Loop**: Refines action based on observation results.

---

### Consequences

* ✅ Increased safety and explainability.
* ✅ Higher trust and auditability.
* ❌ Additional latency in decision making.
* ❌ Increased system complexity.

---

### Examples

* Inhibitor’s AI assistant evaluating company compliance reports.
* Use in DeFi for adjusting risk assessments based on evolving claims data.

---

### Related Patterns

* Reflection
* Reactive Systems
* Layered Decision-Making
* Human-in-the-Loop AI

---

### Known Uses

* Inhibitor AI
* Safety-centric agent architectures
* Ethical review loops in financial or healthcare applications

---

### Pseudocode Example

```javascript
// Entry point for agent reasoning process
async function runAgent(prompt) {

  // Generate initial plan or hypothesis from the input prompt
  let thought = await generateInitialThought(prompt);

  // Allow for iterative refinement through a bounded loop
  for (let step = 0; step < 10; step++) {

    // Evaluate the ethical and contextual risk of the current plan
    const evaluation = await callInhibitor(thought);

    // If evaluation returns high risk, adjust the plan
    if (evaluation.totalSeverity > 0.2) {
      thought = applyInhibitorFeedback(thought, evaluation);
      continue; // Reassess after applying feedback
    }

    // Extract a proposed executable action from the thought
    const action = extractAction(thought);

    // Execute the action and capture the environment's response
    const observation = await performAction(action);

    // If the action is a final user-facing output, validate it again
    if (action.name === "RespondToUser") {

      // Perform one last ethical check before surfacing the response
      const finalCheck = await callInhibitor(observation);

      // Block response if final check fails
      if (finalCheck.totalSeverity > 0.2) {
        return "Sorry, I can't respond right now due to ethical concerns.";
      }

      // Return the validated output
      return observation;
    }

    // Use the environment's feedback to generate the next iteration
    thought = await generateNextThought(observation);
  }

  // Fallback if a safe and valid output isn't reached in time
  return "Sorry, I couldn't complete the task.";
}
```

---
