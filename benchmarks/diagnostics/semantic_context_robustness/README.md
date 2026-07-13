# Semantic-context robustness diagnostics

The diagnostic audit is complete for semantic-context robustness assets. The retained large-context diagnostic notebook lives in [`notebooks/inhibitor_large_context_stress_test.ipynb`](notebooks/inhibitor_large_context_stress_test.ipynb), and the reusable cybersecurity article fixture lives in [`fixtures/comprehensive_cybersecurity_article.txt`](fixtures/comprehensive_cybersecurity_article.txt). Historical diagnostic result artifacts are archived under [`../../legacy/diagnostics/semantic_context_robustness/semantic_context_results/`](../../legacy/diagnostics/semantic_context_robustness/semantic_context_results/).

The historical results were generated using the retained notebook and cybersecurity article fixture. The notebook inserts an unsafe instruction into long, semantically rich context at different positions and token sizes. Long-context length is treated as a dimension of semantic-context robustness, not as a separate diagnostic suite.

The retained article fixture supports future semantic-context robustness diagnostics. These diagnostics support robustness discussion but do not prove direct production safety efficacy, native runtime enforcement, or replacement for core benchmark claims.

The old report included LLM-based detection-quality review, so it must not be confused with the current core benchmark methodology. The retained notebook should be reviewed before any future execution because it performs live/API-based diagnostic testing.

`stress_benchmarks/` is no longer the canonical diagnostic location after this migration. Retained diagnostic notebooks and fixtures live under `benchmarks/diagnostics/`; archived historical diagnostic result artifacts live under `benchmarks/legacy/diagnostics/`.
