# Policy Documents Folder

This folder contains a curated subset of example policy documents that can be used as inputs to the rule generation workflow. These files were selected to show the kinds of operational policies that translate well into enforceable rules.

The example set includes a mix of supported document types to reflect the kinds of files commonly used as rule generation inputs.

## Included documents

### 1. `hr_policy_background_checks.txt`
A plain-text HR policy focused on candidate screening and hiring prerequisites.  
This document is a good example of rules that define required checks or conditions that must be satisfied before a process can move forward.

Example themes:
- background check completion requirements
- required candidate information before proceeding
- hiring gate conditions

### 2. `pii_policy.txt`
A plain-text policy covering personally identifiable information (PII) handling requirements.  
This document is useful for generating rules about how sensitive personal data should be collected, validated, masked, stored, or restricted.

Example themes:
- handling of sensitive or personal data
- masking and validation requirements
- sharing restrictions
- formatting and data-quality checks

### 3. `finance_controls.md`
A Markdown policy document covering finance and payment controls.  
This is useful for generating rules tied to approvals, thresholds, fraud prevention, and transaction validation.

Example themes:
- approval requirements for payments or transfers
- transaction thresholds
- refund and payout controls
- anti-fraud checks

### 4. `agent_inhibitor_api_usage.md`
A Markdown document describing API and service usage expectations.  
This helps demonstrate how technical and operational requirements can become enforceable runtime rules in an agent system.

Example themes:
- required API key usage
- request validation requirements
- payload or rate constraints
- required request fields

### 5. `vendor_risk_management.md`
A Markdown policy focused on third-party or vendor oversight.  
This document broadens the example set by showing how approval workflows and risk controls for external parties can be represented as rules.

Example themes:
- vendor review requirements
- approval steps before onboarding
- risk tiering or diligence requirements
- controls for external access or services

### 6. `legal_and_retention.docx`
A Word document containing legal, records, or retention guidance.  
This is a strong example of rules around document handling, retention timing, and legal-hold behavior.

Example themes:
- retention requirements
- deletion restrictions
- legal hold conditions
- records management rules

## Why these documents were selected

These six documents were chosen because they are good examples of policy content that tends to produce clear, testable, enforceable rules. Together, they cover a range of realistic domains:

- HR and hiring controls
- PII and sensitive data handling
- finance and payment controls
- technical/API usage requirements
- vendor and third-party risk controls
- legal retention requirements

This makes them well suited for:
- generating rules with meaningful safety coverage
- linking rules to an Inhibitor-backed agent
- testing expected safe and unsafe agent behavior
- explaining the mapping from policy text to implemented rules

## Usage notes

These documents are provided as reference examples only.

When choosing policy documents for rule generation, prioritize documents that contain:
- clear requirements
- operational constraints
- approval conditions
- thresholds or mandatory checks
- language that can be tested in agent behavior

Documents that are purely descriptive or informational are generally less useful for rule generation than documents with explicit enforceable guidance.
