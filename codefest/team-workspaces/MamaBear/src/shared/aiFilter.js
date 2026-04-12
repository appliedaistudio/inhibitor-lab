import { categoryLabels } from "./defaultSettings.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const INHIBITOR_API_URL = "https://iaas.appliedai.studio/check";

const OPENAI_MODEL = "gpt-5.4-mini";
const GEMINI_MODEL = "gemini-2.5-flash";
const PROVIDER_TIMEOUT_MS = 2500;
const INHIBITOR_TIMEOUT_MS = 2500;

function normalizeMatchedCategories(matchedCategories, enabledCategories) {
  if (!Array.isArray(matchedCategories)) {
    return [];
  }

  const enabledCategorySet = new Set(enabledCategories);
  return [...new Set(matchedCategories)].filter((key) =>
    enabledCategorySet.has(key),
  );
}

function buildEnabledCategoryLabelList(enabledCategories) {
  return enabledCategories.map((key) => categoryLabels[key] || key).join(", ");
}

function buildAssessmentSchema(enabledCategories) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      harmful: {
        type: "boolean",
      },
      matchedCategories: {
        type: "array",
        items: {
          type: "string",
          enum: enabledCategories,
        },
      },
      reason: {
        type: "string",
      },
    },
    required: ["harmful", "matchedCategories", "reason"],
  };
}

function buildSystemInstruction(enabledCategories) {
  const categoryList = buildEnabledCategoryLabelList(enabledCategories);

  return `You evaluate whether a search query is sensitive, harmful, or inappropriate for the enabled safety categories.

Only use these exact enabled categories when returning matches: ${enabledCategories.join(", ") || "none"}.
Enabled category labels: ${categoryList || "none"}.

Be conservative. Only flag a query when it clearly belongs to one or more enabled categories.
If a query is harmful in general but does not belong to any enabled category, you must return harmful=false and matchedCategories=[].
For example, if only gambling is enabled, violent or hateful queries must not be flagged.
Do not flag benign, ambiguous, academic, informational, support, news, or software queries unless they are clearly unsafe for a child in one or more enabled categories.

Return valid JSON that exactly matches the provided schema.`;
}

function buildUserPrompt(query, enabledCategories) {
  return `Assess this search query for the enabled child-safety categories.

Query: "${query}"
Enabled category keys: ${enabledCategories.join(", ") || "none"}

If the query belongs to a different safety category than the enabled ones, return harmful=false.
If the query is not clearly harmful for the enabled categories, set "harmful" to false and return an empty "matchedCategories" array.`;
}

function createTimeoutController(timeoutMs) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return { controller, timeoutId };
}

async function fetchJsonWithTimeout(url, options, timeoutMs, errorPrefix) {
  const { controller, timeoutId } = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`${errorPrefix} response body:`, errorBody);
      throw new Error(
        `${errorPrefix}: ${response.status} ${response.statusText} - ${errorBody}`,
      );
    }

    const data = await response.json();
    console.log(`${errorPrefix} success response:`, data);
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${errorPrefix}: timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function extractOpenAiText(data) {
  const messageContent = data?.choices?.[0]?.message?.content;

  if (typeof messageContent === "string") {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  return "";
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function parseStructuredAssessment(
  rawText,
  enabledCategories,
  provider,
  model,
) {
  if (!rawText) {
    throw new Error(`${provider} returned an empty response`);
  }

  const cleanText = rawText.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleanText);

  if (typeof parsed?.harmful !== "boolean") {
    throw new Error(`${provider} response missing boolean harmful field`);
  }

  if (!Array.isArray(parsed?.matchedCategories)) {
    throw new Error(`${provider} response missing matchedCategories array`);
  }

  if (typeof parsed?.reason !== "string") {
    throw new Error(`${provider} response missing reason string`);
  }

  const matchedCategories = normalizeMatchedCategories(
    parsed.matchedCategories,
    enabledCategories,
  );
  const harmful = Boolean(parsed.harmful) && matchedCategories.length > 0;

  return {
    harmful,
    matchedCategories: harmful ? matchedCategories : [],
    reason: parsed.reason.trim(),
    provider,
    model,
    rawResponseText: cleanText,
  };
}

export async function checkQueryWithOpenAI(
  query,
  enabledCategories,
  openAiKey,
) {
  const systemInstruction = buildSystemInstruction(enabledCategories);
  const userPrompt = buildUserPrompt(query, enabledCategories);
  const schema = buildAssessmentSchema(enabledCategories);

  const data = await fetchJsonWithTimeout(
    OPENAI_API_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: systemInstruction,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "query_safety_assessment",
            strict: true,
            schema,
          },
        },
      }),
    },
    PROVIDER_TIMEOUT_MS,
    "OpenAI error",
  );

  const refusal = data?.choices?.[0]?.message?.refusal;
  if (typeof refusal === "string" && refusal.trim()) {
    throw new Error(`OpenAI refusal: ${refusal.trim()}`);
  }

  return parseStructuredAssessment(
    extractOpenAiText(data),
    enabledCategories,
    "openai",
    OPENAI_MODEL,
  );
}

export async function checkQueryWithGemini(
  query,
  enabledCategories,
  geminiKey,
) {
  const systemInstruction = buildSystemInstruction(enabledCategories);
  const userPrompt = buildUserPrompt(query, enabledCategories);
  const geminiUrl = new URL(GEMINI_API_URL);
  geminiUrl.searchParams.set("key", geminiKey);

  const data = await fetchJsonWithTimeout(
    geminiUrl.toString(),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: systemInstruction,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: userPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 200,
          responseMimeType: "application/json",
          responseSchema: buildAssessmentSchema(enabledCategories),
        },
      }),
    },
    PROVIDER_TIMEOUT_MS,
    "Gemini error",
  );

  return parseStructuredAssessment(
    extractGeminiText(data),
    enabledCategories,
    "gemini",
    GEMINI_MODEL,
  );
}

function deriveInhibitorFlag(data) {
  const llmObservations =
    data?.result?.llm_inhibition?.observations || data?.result?.observations;
  const ruleViolations =
    data?.result?.rules_inhibition?.violations || data?.result?.violations;

  return (
    Boolean(data?.result?.flagged) ||
    (llmObservations &&
      typeof llmObservations === "object" &&
      Object.keys(llmObservations).length > 0) ||
    (Array.isArray(ruleViolations) && ruleViolations.length > 0)
  );
}

export async function checkQueryWithInhibitor(
  query,
  providerAssessment,
  inhibitorKey,
) {
  const thoughtChain = [
    {
      role: "human",
      content: `User search query: ${query}`,
    },
    {
      role: "agent",
      content: JSON.stringify({
        provider: providerAssessment.provider,
        model: providerAssessment.model,
        harmful: providerAssessment.harmful,
        matchedCategories: providerAssessment.matchedCategories,
        reason: providerAssessment.reason,
      }),
    },
  ];

  const data = await fetchJsonWithTimeout(
    INHIBITOR_API_URL,
    {
      method: "POST",
      headers: {
        "X-API-Key": inhibitorKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        thought_chain: thoughtChain,
        mode: "performance",
      }),
    },
    INHIBITOR_TIMEOUT_MS,
    "Inhibitor error",
  );

  return {
    flagged: deriveInhibitorFlag(data),
    data,
  };
}
