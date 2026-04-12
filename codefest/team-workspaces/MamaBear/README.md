# Team Template Workspace

MamaBear Web Shield is a Chrome extension that helps parents monitor and filter harmful search content. It combines regex-based keyword detection with optional AI review using OpenAI, Gemini as a fallback, and Inhibitor as a final moderation check.

## Team

- Team name: MamaBear Web Shield
- Team members: Giovanni Iervolino, Kayra Sacan, Ben Fievitz, Lada Volkov, Joseph Chen

## Challenges implemented

- Challenge 2: MamaBear Web Shield, a browser extension that warns or blocks sensitive search queries across search bars and address-bar searches.

## Challenge 2: Track A (Innovation) requirements

- Problem statement and user/workflow context: Parents face a growing challenge keeping children safe from harmful or inappropriate content online. Existing parental control tools are either too rigid (blocking entire domains) or too permissive (missing nuanced harmful queries). MamaBear Web Shield targets the moment of intent, the search bar, intercepting potentially harmful queries before results are ever loaded. The primary users are parents of school-age children who want configurable protection without requiring technical expertise to maintain.
- What is innovative about the agent design: Rather than relying on a single moderation layer, MamaBear Web Shield implements a tiered decision pipeline: (1) Regex rules filter for known harmful patterns, (2) OpenAI provides contextual natural-language judgment for ambiguous queries that slip past regex, and (3) the inhibitor sits as a final, policy-aware arbiter that validates the AI's moderation decision. This layered architecture is novel in the parental controls space. By positioning the inhibitor as a trust gate on top of the AI response rather than a standalone filter, the system gains an auditable second opinion that catches overblocking, underblocking, and AI hallucinations in moderation reasoning, while also citing justifications for its blocking choices that parents/children can read and understand.
- Evidence that Inhibitor materially improves trust/safety behavior: The inhibitor was integrated as the final moderation checkpoint after OpenAI's initial classification. In testing, the inhibitor demonstrably caught cases where OpenAI under-flagged subtly harmful phrasing that bypassed the regex layer (eg. "k1ll everyone", "what i eat in a day to stay skinny"). Each Inhibitor decision is accompanied by cited reasons, giving parents a transparent rationale rather than a black-box block or pass (eg. "user_requests_harmful_action"). This citation trail is critical for trust in regulated or sensitive household contexts. Cited explinations shift the system from "an AI said no" to "here is specifically why this content was flagged." This improves both the safety floor and the accountability of the agent's decisions.

## Run instructions

1. Install dependencies with `npm install`.
2. Build the extension with `npm run build`.
3. Open `chrome://extensions`, enable Developer mode, click `Load unpacked`, and select the `dist` folder.
4. Open the extension popup to create a parent code and configure filter categories.
5. Optionally add `appliedAIstudio`, `OpenAI`, and/or `Gemini` API keys in Settings to enable AI fallback moderation.
6. Test searches in any search engine! The regex should catch blatant violations of the toggle categories, and the OpenAI/Inhibitor logic should catch any violations that are not explicitly included in the regex.

## Assumptions and limitations

- Regex rules are the primary filter and run before any AI check.
- AI fallback only runs when regex does not match and API keys are configured.
- OpenAI is the primary provider, Gemini is used only as backup on missing key, failure, or timeout.
- Inhibitor is the final arbiter for AI-reviewed queries.
- Browser address-bar searches can still briefly begin navigation before the extension intervenes.
- Some search experiences depend on site-specific DOM behavior and Chrome extension permissions.

## License and copyright

Copyright (c) 2025 MamaBear Web Shield Team

This team's submission is provided under the MIT License.

SPDX-License-Identifier: MIT
