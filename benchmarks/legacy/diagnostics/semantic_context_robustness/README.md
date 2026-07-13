# Semantic-context robustness legacy diagnostics

[`semantic_context_results/`](semantic_context_results/) contains historical semantic-context robustness diagnostic outputs. These results were generated using the retained large-context notebook and cybersecurity article fixture now archived in the current diagnostic asset structure.

The historical methodology inserted an unsafe instruction into long, semantically rich context at different positions and token sizes. Long-context length is treated as a dimension of semantic-context robustness, not as a separate benchmark suite.

The old report included LLM-based detection-quality review, so these artifacts must not be confused with the current core benchmark methodology. They support robustness discussion and historical traceability, but they do not prove direct production safety efficacy and should not be reported as current production safety-efficacy evidence.

The retained notebook should be reviewed before any future execution because it performs live/API-based diagnostic testing.
