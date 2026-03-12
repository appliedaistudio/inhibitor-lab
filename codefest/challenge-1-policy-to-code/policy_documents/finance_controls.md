# Finance Controls & Anti-Fraud (v3.1)

## Transaction Thresholds
- Card-not-present payments above $1,500 require 3DS verification.
- Wire transfers above $25,000 require an approval code and finance approver ID.
- Any single merchant refund above $5,000 requires manager approval.

## Velocity & Aggregates
- If total refunds exceed $20,000 within 24 hours per merchant, freeze further refunds pending review.
- If 3 or more chargebacks occur for a merchant within 7 days, escalate to Risk.

## KYC/KYB
- Disbursements exceeding $10,000 require a verified business tax ID.
- Payouts to individuals above $600 in a calendar year must collect a TIN (taxpayer identification number).

## Evidence & Logging
- Record approval code, approver ID, and justification for wires and large refunds.
- Do not log full PAN; only last 4 digits may be stored, masked elsewhere.
