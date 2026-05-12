# Supported Regulations and Standards

The Inhibitor supports detection and oversight across a defined set of regulations, standards, and guidance frameworks.

**Support** means that the Inhibitor has encoded rules, detection logic, and enforcement mechanisms to:

- Identify potential violations, non-conformance, or policy-risk conditions
- Prevent or constrain unsafe actions where possible
- Record compliance-relevant events for auditing and review
- Escalate ambiguous, high-risk, or guidance-only findings for human review

This list includes binding regulations, recognized assurance standards, and public guidance frameworks that can be translated into operational policy rules. For non-binding standards and guidance, Inhibitor support means conformance monitoring, risk detection, and oversight support rather than a legal determination of compliance.

This is not a theoretical or partial mapping — these regulations, standards, and guidance frameworks are actively implemented in the Inhibitor’s reasoning and enforcement engine.

---

## Privacy

- **GDPR** – General Data Protection Regulation
- **CCPA** – California Consumer Privacy Act
- **HIPAA** – Health Insurance Portability and Accountability Act
- **LGPD** – Brazilian General Data Protection Law
- **PIPEDA** – Personal Information Protection and Electronic Documents Act (Canada)

## AI Accountability

- **EU AI Act** – Compliance with EU Artificial Intelligence Act obligations
- **Algorithmic Bias Disclosure** – Detection and escalation where bias is unreported
- **High-Risk AI Classification** – Enforcement of required controls for high-risk AI
- **Model Opacity** – Identification of opaque decision-making where transparency is mandated

## Education & Research AI Governance

- **UNESCO Guidance for Generative AI in Education and Research** – Human-centred GenAI governance for education and research use cases, including data privacy, age-appropriate access, institutional validation, ethical and pedagogical appropriateness, and safeguards for human agency, inclusion, equity, gender equality, and cultural and linguistic diversity.
- **UNESCO GenAI Data Privacy** – Detection of workflows that expose learner, educator, researcher, or institutional data without appropriate safeguards, consent, or lawful handling.
- **UNESCO Age-Appropriate GenAI Access** – Enforcement or escalation when independent GenAI use by children, students, or vulnerable learner groups lacks age-appropriate restrictions or institutional controls.
- **UNESCO Institutional GenAI Auditing** – Oversight of institutional GenAI adoption where algorithms, data inputs, generated outputs, user-data protection, or inappropriate-content filtering have not been reviewed or monitored.
- **UNESCO Ethical and Pedagogical Validation** – Detection of GenAI tools or workflows that lack validation for ethical fitness, pedagogical appropriateness, proportionality, user well-being, or predictable harm.
- **UNESCO Terms-of-Use Awareness** – Detection of GenAI usage patterns where users may not be aware of applicable terms of reference, provider obligations, legal constraints, or usage conditions.
- **UNESCO Harmful or Unlawful GenAI Use Monitoring** – Monitoring and escalation for GenAI applications that may violate regulations, damage lawful rights, harm reputations, generate disinformation, promote hate speech, create spam, or assist malware composition.
- **UNESCO Long-Term Learning Impact Review** – Detection and review support for repeated or institutionally significant GenAI use that may affect critical thinking, creativity, assessment integrity, knowledge validation, or research quality over time.

## Cybersecurity

- **DORA** – Digital Operational Resilience Act
- **CRA** – Cyber Resilience Act
- **NIS2** – EU Network and Information Security Directive 2
- **Unpatched Software Exposure** – Detection of systems exposed due to missing security patches

## Finance

- **AML** – Anti-Money Laundering obligations
- **KYC** – Know Your Customer obligations
- **Basel Compliance** – Failures in banking capital and risk requirements
- **Dodd-Frank** – U.S. financial regulation compliance checks
- **MiFID** – EU Markets in Financial Instruments Directive
- **Securities Compliance** – Oversight of securities regulation violations
- **Crypto Travel Rule** – Enforcement of crypto asset transfer disclosure requirements

## Consumer Finance

- **PCI DSS** – Payment Card Industry Data Security Standard
- **FINRA** – Financial Industry Regulatory Authority compliance
- **CFPB** – Consumer Financial Protection Bureau regulations
- **Client Disclosure** – Enforcement of mandatory client disclosures

## Insurance

- **Solvency II** – EU insurance solvency requirements
- **NAIC Standards** – U.S. National Association of Insurance Commissioners standards
- **ACA** – Affordable Care Act compliance checks
- **Unfair Claims Practices** – Detection of unlawful or unethical claims handling
- **Insurance Bias Detection** – Identification of bias in underwriting or claims

## ☁ Cloud / SaaS

- **SOC 2** – Service Organization Control 2 compliance requirements
- **ISO 27001** – Information Security Management System standard
- **Audit Logs** – Detection of missing or incomplete audit trails

---

## Source References

- [UNESCO Guidance for generative AI in education and research](https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research)
- [UNESCO full guidance PDF — Guidance for generative AI in education and research](https://unesdoc.unesco.org/in/rest/annotationSVC/DownloadWatermarkedAttachment/attach_import_59752630-3c8b-464e-8f23-013d99a9dd67?_=386693eng.pdf&from=1&to=48)

---

## Updates

This document represents the authoritative list of supported regulations, standards, and guidance frameworks in the Inhibitor. It is updated as new regulations, standards, and guidance coverage are added or expanded. For the most recent updates, always refer to this file.

---

## Explore adjacent docs

- Connect each regulation or standard to enforcement flows in the [Inhibitor API](./inhibitor-api.md) and the [policy-to-rule examples](./policy-rule-examples/README.md).
- Pair with [GDPR compliance](./gdpr-compliance.md) and [global edge deployment](./global-edge-deployment.md) to understand privacy and locality guardrails.
- Trace how regulations and standards shape design choices in the [Inhibitor Application Sprint](./inhibitor-application-sprint.md) and the [Inside the Inhibitor](./inhibitor-inside.md) walkthrough.
- Track how this list has evolved in [Release Notes 1.1](./release-notes/1.1.md) and the conceptual framing in [ethical inference theory](./ethical-inference-theory.md).