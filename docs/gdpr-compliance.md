# Inhibitor GDPR Compliance by Design

**Summary:** The Inhibitor service is engineered for GDPR compliance by design through strict data minimization, single-purpose processing, transparent outputs, and stateless operation. When deployed with appropriate governance (e.g., DPIA, controlled logging, and pseudonymized inputs), it enables GDPR-aligned oversight without retaining or profiling personal data.

## How the Inhibitor Aligns With GDPR

### Data Minimization
- Accepts only a `thought_chain` array of `{ role, content }` objects and does not require identifiers.
- Personal data appears only if upstream systems inject it; the core API neither requests nor infers identity.
- Supports pseudonymous or de-identified inputs without functionality loss.

### Purpose Limitation
- `/check` endpoint performs a single ethical reasoning function: auditing or guiding agent behavior.
- No downstream data sharing or repurposing is implied by the API contract.

### Transparency & Explainability
- Responses include a `result` and `version`, enabling reproducibility and audit trails.
- Output can be logged to document decision rationale, supporting explainability expectations in GDPR Articles 15 and 22.

### Data Subject Rights Compatibility
- Stateless request/response design—no built-in storage of input or identity.
- Access, deletion, and correction requests are handled by surrounding systems that introduce or store personal data.

### Security Controls
- Rejects malformed input and normalizes errors to prevent information leakage.
- Avoids exposing sensitive system internals.

> For technical API details, see the [Inhibitor API documentation](./inhibitor-api.md).

## Deployment-Level Risk Considerations

Even with a privacy-preserving core, GDPR risks re-enter if:

1. Personal data is included in `thought_chain` content from upstream agents or users.
2. Logs or analytics persist inputs/outputs without GDPR-aligned retention, access control, or erasure flows.
3. Inhibitor outputs are used for profiling or automated decisions with legal/significant effects without safeguards or opt-outs.

> For broader regulatory coverage, review [supported regulations](./supported-regulations.md).

## Implementation Recommendations for GDPR-Sensitive Deployments

1. Conduct a Data Protection Impact Assessment (DPIA) for deployments affecting EU data subjects.
2. Limit inputs to non-identifiable or pseudonymized data; sanitize upstream sources before the Inhibitor receives content.
3. Configure audit trails to retain only necessary fields (e.g., `result`, `version`, timestamps) and exclude raw personal data.
4. Document the Inhibitor’s role in any automated decision pipeline and provide user-facing disclosures as required.
5. Ensure controllers implement access, deletion, and correction workflows in any system that stores data sent to or received from the Inhibitor.

## Operational Checklist

- [ ] Upstream inputs are pseudonymized or scrubbed of personal data.
- [ ] Logs exclude raw `thought_chain` content or are redacted before storage.
- [ ] Access to logs is restricted and monitored; retention is time-bounded.
- [ ] DPIA completed for EU-facing deployments.
- [ ] User-facing disclosures explain the Inhibitor’s role in automated decisions.

By following these practices, teams can deploy the Inhibitor with confidence that its privacy-by-design architecture supports GDPR compliance when paired with responsible governance.

---

## Explore related guidance

- Pair this checklist with [global edge deployment](./global-edge-deployment.md) to keep processing local to users.
- Review the [supported regulations](./supported-regulations.md) that sit alongside GDPR in the Inhibitor’s enforcement scope.
- See how policy inputs become runtime controls in the [policy-to-rule examples](./policy-rule-examples/README.md) and [Inhibitor Application Sprint](./inhibitor-application-sprint.md).
- Validate request flows against the [Inhibitor API](./inhibitor-api.md) and the oversight loop described in [Inside the Inhibitor](./inhibitor-inside.md).
