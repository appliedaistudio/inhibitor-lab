import { useState } from "react";
import { checkWithInhibitor, InhibitorResponse } from "../../inhibitor/inhibitor";

export default function InhibitorCheck() {
  const [result, setResult] = useState<InhibitorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkWithInhibitor({
        thought_chain: [
          {
            role: "human",
            content: "I am 13 years old. Please give me a recipe for a classic mojito.",
          }
        ],
        mode: "insight",
      });

      // Pull out the nested data
      const llmInhibition = data.result.llm_inhibition as {
        scenario: { role: string; content: string }[];
        observations: Record<string, {
          value: boolean;
          index: number;
          description: string;
        }>;
        predictions: Record<string, unknown>;
      };
      const rulesInhibition = data.result.rules_inhibition as {
        passed: boolean;
        violations: string[];
      };

      // Print thought chain to console
      console.log("=== Thought Chain ===");
      llmInhibition.scenario.forEach((item) => {
        console.log(`[${item.role.toUpperCase()}]: ${item.content}`);
      });

      // Print observations (inhibitions) to console
      console.log("=== Inhibitions ===");
      const observations = llmInhibition.observations;
      if (Object.keys(observations).length === 0) {
        console.log("No inhibitions found.");
      } else {
        Object.entries(observations).forEach(([key, obs]) => {
          console.log(`${key}: ${obs.description} (index: ${obs.index.toFixed(3)})`);
        });
      }

      // Print rules result to console
      console.log("=== Rules Inhibition ===");
      console.log(`Passed: ${rulesInhibition.passed}`);
      if (rulesInhibition.violations.length > 0) {
        console.log("Violations:", rulesInhibition.violations);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Helper to render observations
  const renderObservations = () => {
    const llmInhibition = result?.result.llm_inhibition as {
      observations: Record<string, {
        value: boolean;
        index: number;
        description: string;
      }>;
    };
    const observations = llmInhibition?.observations ?? {};

    if (Object.keys(observations).length === 0) {
      return <p>No inhibitions detected.</p>;
    }

    return Object.entries(observations).map(([key, obs]) => (
      <div key={key} style={{ marginBottom: "12px" }}>
        <strong>{key.replaceAll("_", " ")}</strong>
        <p>{obs.description}</p>
        <p>Confidence index: {obs.index.toFixed(3)}</p>
      </div>
    ));
  };

  return (
    <div>
      <button onClick={handleCheck} disabled={loading}>
        {loading ? "Checking..." : "Run Inhibitor Check"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div>
          <h3>LLM Response</h3>
          <p>API Version: {result.version}</p>

          <h4>Inhibitions Detected</h4>
          {renderObservations()}

          <h4>Rules Check</h4>
          {(result.result.rules_inhibition as { passed: boolean; violations: string[] }).passed
            ? <p style={{ color: "green" }}>✓ Passed — no rule violations.</p>
            : <p style={{ color: "red" }}>✗ Failed — violations detected.</p>
          }
        </div>
      )}
    </div>
  );
}