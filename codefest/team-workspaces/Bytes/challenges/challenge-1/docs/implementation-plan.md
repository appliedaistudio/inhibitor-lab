# Interactive UI Implementation Plan

## Phase 1: Local test UI

Build a single-page interface that submits:

```json
{
  "thought_chain": [
    { "role": "human", "content": "..." },
    { "role": "agent", "content": "..." }
  ],
  "mode": "performance"
}
```

The response should be rendered in two ways:

1. raw JSON for debugging
2. simplified cards for fast review

## Phase 2: Better ergonomics

Add:

- preset scenarios
- copy response button
- response timing
- request history
- side-by-side comparison view

## Phase 3: Workflow fit

Expand the UI into an agent testing console with:

- multi-turn thought chain editing
- saved test cases
- rule-specific scenario packs
- export of results for demos or reports

## Backend recommendation

Use a tiny backend route such as:

- `POST /api/check`

The backend should:

- read the Inhibitor API key from an environment variable
- forward the request to `https://iaas.appliedai.studio/check`
- return the upstream response as JSON or plain text

## Success criteria

- no API key in frontend code
- one-click testing of human plus agent messages
- readable display of inhibitor output
- easy to extend into a demo or red-team tool
