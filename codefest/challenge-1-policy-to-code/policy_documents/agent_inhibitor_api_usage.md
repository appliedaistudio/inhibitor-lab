# Inhibitor API Usage – Client Rules (v1.1)

## API Keys and Access
- API key must be present on each request; if missing, block the request.
- Key format: 32 hex chars, optionally grouped with dashes (8-4-4-4-12).
- If key is flagged as revoked, block the request.

## Rate Limits
- Default client rate limit is 600 requests per minute (RPM).
- Burst limit is 120 requests per 10 seconds (RPS).
- If client has premium tier, allow 2000 RPM, 400 RPS.

## Payload Validation
- Content-type must be application/json.
- If payload size exceeds 512KB, reject the request.
- If 'organization' field is missing or empty in the payload, reject the request.
