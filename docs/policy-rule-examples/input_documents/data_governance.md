# Data Governance & Security (v4.0)

## Data Classification
- Customer personal data is classified as "Confidential".
- Production logs must not contain full SSN, full credit card PAN, or unmasked emails.

## Encryption & Storage
- All data classified "Confidential" must be encrypted at rest (AES-256).
- Data in transit must use TLS 1.2 or higher.
- Backups must be encrypted and retained for 35 days.

## Access Controls
- Admin access requires MFA and must be renewed every 90 days.
- Service accounts must be rotated at least every 60 days.
- Quarterly access review is mandatory; revoke any unused access.

## Retention & Deletion
- User account data must be deleted within 30 days of deletion request unless legal hold applies.
- Raw telemetry older than 90 days must be rolled up to aggregated metrics only.
