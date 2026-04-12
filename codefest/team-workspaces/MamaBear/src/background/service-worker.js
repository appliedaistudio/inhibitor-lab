import { generateSalt, derivePinHash } from "../shared/crypto.js";
import { defaultSettings } from "../shared/defaultSettings.js";
import {
  buildCategoryReason,
  evaluateQueryAgainstSettings,
} from "../shared/queryRules.js";
import {
  checkQueryWithGemini,
  checkQueryWithInhibitor,
  checkQueryWithOpenAI,
} from "../shared/aiFilter.js";

const PAGE_CONTEXT_HISTORY_LIMIT = 10;
const DEBUG_EVENT_HISTORY_LIMIT = 50;
const SEARCH_QUERY_PARAM_KEYS = ["q", "p", "query", "search"];
const BACKGROUND_INTERVENTION_WINDOW_MS = 1500;
const AI_DECISION_CACHE_WINDOW_MS = 5000;
const AI_FLAGGED_QUERY_CACHE_KEY = "aiFlaggedQueryCache";
const PUBLIC_SETTINGS_SESSION_KEY = "mamabearPublicSettings";
const AI_FLAGGED_QUERY_CACHE_LIMIT = 250;
const SERVICE_WORKER_KEEPALIVE_INTERVAL_MS = 20_000;

let lastBackgroundInterventionFingerprint = "";
let lastBackgroundInterventionAt = 0;
const aiDecisionCache = new Map();
let cachedEffectiveSettings = mergeSettings();
let effectiveSettingsPromise = null;
let hasLoadedEffectiveSettings = false;
let cachedFlaggedQueryCache = {};
let flaggedQueryCachePromise = null;
let hasLoadedFlaggedQueryCache = false;
let keepAliveIntervalId = null;
let keepAliveRefCount = 0;

function mergeSettings(storedSettings = {}) {
  return {
    ...defaultSettings,
    ...storedSettings,
    categories: {
      ...defaultSettings.categories,
      ...(storedSettings.categories || {}),
    },
  };
}

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function runKeepAliveTick() {
  chrome.runtime.getPlatformInfo().catch(() => {});
}

function startServiceWorkerKeepAlive() {
  keepAliveRefCount += 1;

  if (keepAliveIntervalId !== null) {
    return;
  }

  runKeepAliveTick();
  keepAliveIntervalId = globalThis.setInterval(() => {
    runKeepAliveTick();
  }, SERVICE_WORKER_KEEPALIVE_INTERVAL_MS);
}

function stopServiceWorkerKeepAlive() {
  keepAliveRefCount = Math.max(0, keepAliveRefCount - 1);

  if (keepAliveRefCount > 0 || keepAliveIntervalId === null) {
    return;
  }

  globalThis.clearInterval(keepAliveIntervalId);
  keepAliveIntervalId = null;
}

async function withServiceWorkerKeepAlive(task) {
  startServiceWorkerKeepAlive();

  try {
    return await task();
  } finally {
    stopServiceWorkerKeepAlive();
  }
}

async function ensureStorageAccessLevels() {
  await Promise.allSettled([
    chrome.storage.local.setAccessLevel({
      accessLevel: "TRUSTED_CONTEXTS",
    }),
    chrome.storage.session.setAccessLevel({
      accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
    }),
  ]);
}

async function syncPublicSettingsSnapshot(storedSettings = undefined) {
  const settings =
    storedSettings === undefined
      ? await getEffectiveSettings()
      : mergeSettings(storedSettings);

  await chrome.storage.session.set({
    [PUBLIC_SETTINGS_SESSION_KEY]: settings,
  });

  return settings;
}

function getQueryFromUrl(url) {
  try {
    const parsedUrl = new URL(url);

    for (const key of SEARCH_QUERY_PARAM_KEYS) {
      const value = normalizeWhitespace(parsedUrl.searchParams.get(key) || "");
      if (value) {
        return value;
      }
    }
  } catch (error) {
    console.error("Failed to inspect navigation URL", error);
  }

  return "";
}

function isSupportedNavigationUrl(url = "") {
  return /^https?:\/\//i.test(url);
}

function isAddressBarNavigation(details) {
  const qualifiers = details.transitionQualifiers || [];
  const type = details.transitionType || "";

  return (
    qualifiers.includes("from_address_bar") ||
    ["typed", "generated", "keyword", "keyword_generated"].includes(type)
  );
}

function shouldSuppressBackgroundIntervention(action, tabId, query) {
  const fingerprint = `${action}:${tabId}:${normalizeWhitespace(query)}`;
  const now = Date.now();

  if (
    fingerprint === lastBackgroundInterventionFingerprint &&
    now - lastBackgroundInterventionAt < BACKGROUND_INTERVENTION_WINDOW_MS
  ) {
    return true;
  }

  lastBackgroundInterventionFingerprint = fingerprint;
  lastBackgroundInterventionAt = now;
  return false;
}

async function getEffectiveSettings() {
  if (hasLoadedEffectiveSettings) {
    return cachedEffectiveSettings;
  }

  if (effectiveSettingsPromise) {
    return effectiveSettingsPromise;
  }

  effectiveSettingsPromise = chrome.storage.local
    .get(["mamabearSettings"])
    .then(({ mamabearSettings }) => {
      cachedEffectiveSettings = mergeSettings(mamabearSettings);
      hasLoadedEffectiveSettings = true;
      return cachedEffectiveSettings;
    })
    .finally(() => {
      effectiveSettingsPromise = null;
    });

  return effectiveSettingsPromise;
}

async function getAiCredentials() {
  const { apiKey, openAiKey, geminiKey } = await chrome.storage.local.get([
    "apiKey",
    "openAiKey",
    "geminiKey",
  ]);

  return {
    apiKey: apiKey || "",
    openAiKey: openAiKey || "",
    geminiKey: geminiKey || "",
  };
}

function getEnabledCategoryKeys(settings) {
  return Object.entries(settings.categories || {})
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

function getNormalizedQueryCacheKey(query = "") {
  return normalizeWhitespace(query).toLowerCase();
}

function getSettingsCacheKey(settings) {
  const enabledCategories = getEnabledCategoryKeys(settings).sort().join(",");
  return [
    settings.enabled ? "enabled" : "disabled",
    settings.responseMode || "warn",
    enabledCategories,
  ].join("|");
}

function getAiDecisionCacheKey(query, settings) {
  return `${getNormalizedQueryCacheKey(query)}|${getSettingsCacheKey(settings)}`;
}

async function getFlaggedQueryCache() {
  if (hasLoadedFlaggedQueryCache) {
    return cachedFlaggedQueryCache;
  }

  if (flaggedQueryCachePromise) {
    return flaggedQueryCachePromise;
  }

  flaggedQueryCachePromise = chrome.storage.local
    .get([AI_FLAGGED_QUERY_CACHE_KEY])
    .then((result) => {
      cachedFlaggedQueryCache = result[AI_FLAGGED_QUERY_CACHE_KEY] || {};
      hasLoadedFlaggedQueryCache = true;
      return cachedFlaggedQueryCache;
    })
    .finally(() => {
      flaggedQueryCachePromise = null;
    });

  return flaggedQueryCachePromise;
}

function getCacheableMatchedCategories(matchedCategories = []) {
  return Array.isArray(matchedCategories)
    ? matchedCategories.filter(Boolean)
    : [];
}

function getCachedFlaggedQueryEntry(query, settings, flaggedQueryCache) {
  const normalizedQuery = getNormalizedQueryCacheKey(query);
  const entry = flaggedQueryCache?.[normalizedQuery];

  if (!entry) {
    return null;
  }

  const enabledCategories = new Set(getEnabledCategoryKeys(settings));
  const matchedCategories = getCacheableMatchedCategories(entry.matchedCategories);

  if (matchedCategories.length === 0) {
    return null;
  }

  const activeMatchedCategories = matchedCategories.filter((category) =>
    enabledCategories.has(category),
  );

  if (activeMatchedCategories.length === 0) {
    return null;
  }

  return {
    ...entry,
    matchedCategories: activeMatchedCategories,
  };
}

async function storeFlaggedAiQuery(
  query,
  matchedCategories,
  source,
  detail = null,
  reason = "",
) {
  const categoriesToStore = getCacheableMatchedCategories(matchedCategories);

  if (!query || categoriesToStore.length === 0) {
    return;
  }

  const flaggedQueryCache = await getFlaggedQueryCache();
  const normalizedQuery = getNormalizedQueryCacheKey(query);
  const nextCache = {
    ...flaggedQueryCache,
    [normalizedQuery]: {
      query: normalizeWhitespace(query),
      matchedCategories: categoriesToStore,
      source,
      cachedAt: new Date().toISOString(),
      provider: detail?.provider?.provider || null,
      reason: normalizeReason(reason),
    },
  };
  const nextEntries = Object.entries(nextCache).sort((left, right) => {
    const leftTime = Date.parse(left[1]?.cachedAt || 0);
    const rightTime = Date.parse(right[1]?.cachedAt || 0);
    return rightTime - leftTime;
  });
  const trimmedCache = Object.fromEntries(
    nextEntries.slice(0, AI_FLAGGED_QUERY_CACHE_LIMIT),
  );

  cachedFlaggedQueryCache = trimmedCache;
  hasLoadedFlaggedQueryCache = true;
  clearAiDecisionCache();

  await chrome.storage.local.set({
    [AI_FLAGGED_QUERY_CACHE_KEY]: trimmedCache,
  });
}

function clearAiDecisionCache() {
  aiDecisionCache.clear();
}

function pruneAiDecisionCache() {
  const now = Date.now();

  for (const [key, entry] of aiDecisionCache.entries()) {
    if (now - entry.createdAt >= AI_DECISION_CACHE_WINDOW_MS) {
      aiDecisionCache.delete(key);
    }
  }
}

function createAiDecisionDetail(overrides = {}) {
  return {
    provider: null,
    inhibitor: null,
    providerFallbackUsed: false,
    errors: [],
    note: "",
    ...overrides,
  };
}

function normalizeReason(reason = "") {
  return typeof reason === "string" ? reason.trim() : "";
}

function buildAiReason(providerAssessment, matchedCategories = []) {
  const providerReason = normalizeReason(providerAssessment?.reason);
  const categoryReason = buildCategoryReason(matchedCategories);

  if (providerReason && matchedCategories.length > 0) {
    return `${providerReason} ${categoryReason}`;
  }

  if (providerReason) {
    return providerReason;
  }

  return categoryReason || "This query was flagged by the AI safety review.";
}

function buildAiFallbackResult({
  checked = false,
  harmful = false,
  matchedCategories = [],
  reason = "",
  source = "ai-unavailable",
  detail = {},
}) {
  return {
    checked,
    harmful,
    matchedCategories: harmful ? matchedCategories : [],
    reason: harmful ? normalizeReason(reason) : "",
    source,
    detail: createAiDecisionDetail(detail),
  };
}

function hasUsableMatchedCategories(providerResult) {
  return (
    Array.isArray(providerResult?.matchedCategories) &&
    providerResult.matchedCategories.length > 0
  );
}

function logAiDecisionFailure(message, details = {}) {
  console.warn("MamaBear AI decision fallback:", message, details);
}

async function getProviderVerdict(query, enabledCategories, credentials) {
  const errors = [];

  if (credentials.openAiKey) {
    try {
      const provider = await checkQueryWithOpenAI(
        query,
        enabledCategories,
        credentials.openAiKey,
      );

      return {
        provider,
        providerFallbackUsed: false,
        errors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`openai: ${message}`);
      console.warn("OpenAI query check failed", error);
    }
  } else {
    errors.push("openai: key missing");
  }

  if (credentials.geminiKey) {
    try {
      const provider = await checkQueryWithGemini(
        query,
        enabledCategories,
        credentials.geminiKey,
      );

      return {
        provider,
        providerFallbackUsed: true,
        errors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`gemini: ${message}`);
      console.warn("Gemini query check failed", error);
    }
  } else {
    errors.push("gemini: key missing");
  }

  return {
    provider: null,
    providerFallbackUsed: Boolean(credentials.openAiKey),
    errors,
  };
}

async function computeAiFallbackQueryCheck(query, settings, credentials) {
  const enabledCategories = getEnabledCategoryKeys(settings);

  if (!settings.enabled || enabledCategories.length === 0) {
    return buildAiFallbackResult({
      source: "disabled",
      detail: {
        note: "Filtering disabled or no categories enabled.",
      },
    });
  }

  const flaggedQueryCache = await getFlaggedQueryCache();
  const cachedFlaggedEntry = getCachedFlaggedQueryEntry(
    query,
    settings,
    flaggedQueryCache,
  );

  if (cachedFlaggedEntry) {
    return buildAiFallbackResult({
      checked: true,
      harmful: true,
      matchedCategories: cachedFlaggedEntry.matchedCategories,
      reason:
        normalizeReason(cachedFlaggedEntry.reason) ||
        buildCategoryReason(cachedFlaggedEntry.matchedCategories),
      source: "ai-cache",
      detail: {
        note: "Query previously flagged by AI and auto-blocked from cache.",
      },
    });
  }

  const providerResult = await getProviderVerdict(
    query,
    enabledCategories,
    credentials,
  );

  if (!providerResult.provider) {
    const noProviderKeys =
      !credentials.openAiKey && !credentials.geminiKey;
    const note = noProviderKeys
      ? "No OpenAI or Gemini key configured."
      : "No provider verdict available after fallback attempts.";

    logAiDecisionFailure(note, {
      query,
      errors: providerResult.errors,
    });

    return buildAiFallbackResult({
      source: noProviderKeys ? "no-provider-key" : "provider-error",
      detail: {
        providerFallbackUsed: providerResult.providerFallbackUsed,
        errors: providerResult.errors,
        note,
      },
    });
  }

  if (!hasUsableMatchedCategories(providerResult.provider)) {
    return buildAiFallbackResult({
      checked: true,
      harmful: false,
      source: providerResult.provider.provider,
      detail: {
        provider: providerResult.provider,
        providerFallbackUsed: providerResult.providerFallbackUsed,
        errors: providerResult.errors,
        note: "Provider did not return any enabled matched categories.",
      },
    });
  }

  if (!credentials.apiKey) {
    const note = "Inhibitor key missing; AI fallback is fail-open.";
    logAiDecisionFailure(note, {
      query,
      provider: providerResult.provider.provider,
    });

    return buildAiFallbackResult({
      source: "inhibitor-key-missing",
      detail: {
        provider: providerResult.provider,
        providerFallbackUsed: providerResult.providerFallbackUsed,
        errors: [...providerResult.errors, "inhibitor: key missing"],
        note,
      },
    });
  }

  try {
    const inhibitorResult = await checkQueryWithInhibitor(
      query,
      providerResult.provider,
      credentials.apiKey,
    );
    const harmful =
      inhibitorResult.flagged && hasUsableMatchedCategories(providerResult.provider);

    if (harmful) {
      const reason = buildAiReason(
        providerResult.provider,
        providerResult.provider.matchedCategories,
      );
      await storeFlaggedAiQuery(
        query,
        providerResult.provider.matchedCategories,
        `${providerResult.provider.provider}+inhibitor`,
        {
          provider: providerResult.provider,
        },
        reason,
      );
    }

    return buildAiFallbackResult({
      checked: true,
      harmful,
      matchedCategories: providerResult.provider.matchedCategories,
      reason: buildAiReason(
        providerResult.provider,
        providerResult.provider.matchedCategories,
      ),
      source: `${providerResult.provider.provider}+inhibitor`,
      detail: {
        provider: providerResult.provider,
        inhibitor: inhibitorResult,
        providerFallbackUsed: providerResult.providerFallbackUsed,
        errors: providerResult.errors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const errors = [...providerResult.errors, `inhibitor: ${message}`];

    logAiDecisionFailure("Inhibitor query check failed.", {
      query,
      errors,
      provider: providerResult.provider.provider,
    });

    return buildAiFallbackResult({
      source: "inhibitor-error",
      detail: {
        provider: providerResult.provider,
        providerFallbackUsed: providerResult.providerFallbackUsed,
        errors,
        note: "Inhibitor request failed; AI fallback is fail-open.",
      },
    });
  }
}

async function runAiFallbackQueryCheck(query, settings, credentials = null) {
  const resolvedCredentials = credentials || (await getAiCredentials());
  const cacheKey = getAiDecisionCacheKey(query, settings);
  const cached = aiDecisionCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < AI_DECISION_CACHE_WINDOW_MS) {
    return cached.promise;
  }

  pruneAiDecisionCache();

  const promise = computeAiFallbackQueryCheck(
    query,
    settings,
    resolvedCredentials,
  );

  aiDecisionCache.set(cacheKey, {
    createdAt: Date.now(),
    promise,
  });

  return promise;
}

async function evaluateQueryIntervention(query, settings, credentials = null) {
  const regexEvaluation = evaluateQueryAgainstSettings(query, settings);

  if (regexEvaluation.shouldWarn || regexEvaluation.shouldBlock) {
    return {
      ...regexEvaluation,
      harmful: true,
      source: "regex",
      detail: createAiDecisionDetail(),
    };
  }

  const aiEvaluation = await runAiFallbackQueryCheck(query, settings, credentials);
  const harmful = Boolean(aiEvaluation.harmful);

  return {
    harmful,
    matchedCategories: harmful ? aiEvaluation.matchedCategories : [],
    reason: harmful ? normalizeReason(aiEvaluation.reason) : "",
    shouldWarn: harmful && settings.responseMode === "warn",
    shouldBlock: harmful && settings.responseMode === "block",
    source: aiEvaluation.source,
    detail: aiEvaluation.detail,
  };
}

function getBlockedPageUrl(query, sourceUrl, evaluation = null) {
  const blockedUrl = new URL(chrome.runtime.getURL("blocked.html"));
  blockedUrl.searchParams.set("query", normalizeWhitespace(query));
  blockedUrl.searchParams.set("source", sourceUrl);
  if (evaluation?.reason) {
    blockedUrl.searchParams.set("reason", evaluation.reason);
  }
  if (evaluation?.source) {
    blockedUrl.searchParams.set("review", evaluation.source);
  }
  return blockedUrl.toString();
}

async function maybeFilterAddressBarNavigation(details) {
  if (
    details.frameId !== 0 ||
    !isSupportedNavigationUrl(details.url) ||
    !isAddressBarNavigation(details)
  ) {
    return;
  }

  const settings = await getEffectiveSettings();
  if (!settings.enabled) {
    return;
  }

  const query = getQueryFromUrl(details.url);
  if (!query) {
    return;
  }

  const credentials = await getAiCredentials();
  const evaluation = await evaluateQueryIntervention(
    query,
    settings,
    credentials,
  );
  if (!evaluation.shouldWarn && !evaluation.shouldBlock) {
    return;
  }

  if (
    shouldSuppressBackgroundIntervention(
      evaluation.shouldBlock ? "block" : "warn",
      details.tabId,
      query,
    )
  ) {
    return;
  }

  if (evaluation.shouldBlock) {
    await chrome.tabs.update(details.tabId, {
      url: getBlockedPageUrl(query, details.url, evaluation),
    });
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    func: (warnedQuery, reason) => {
      window.alert(
        `MamaBear warning: "${warnedQuery}" was flagged.\n\nReason: ${reason || "This search may contain protected content."}`,
      );
    },
    args: [query, evaluation.reason],
  });
}

ensureStorageAccessLevels()
  .then(() => syncPublicSettingsSnapshot())
  .catch((error) => {
    console.error("Failed to initialize storage access levels", error);
  });

chrome.runtime.onInstalled.addListener(async () => {
  await ensureStorageAccessLevels();
  await syncPublicSettingsSnapshot();
  console.log("MamaBear Web Shield installed");
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.mamabearSettings) {
    cachedEffectiveSettings = mergeSettings(changes.mamabearSettings.newValue);
    hasLoadedEffectiveSettings = true;
    chrome.storage.session
      .set({
        [PUBLIC_SETTINGS_SESSION_KEY]: cachedEffectiveSettings,
      })
      .catch((error) => {
        console.error("Failed to sync public settings snapshot", error);
      });
  }

  if (changes[AI_FLAGGED_QUERY_CACHE_KEY]) {
    cachedFlaggedQueryCache = changes[AI_FLAGGED_QUERY_CACHE_KEY].newValue || {};
    hasLoadedFlaggedQueryCache = true;
  }

  if (
    changes.mamabearSettings ||
    changes.apiKey ||
    changes.openAiKey ||
    changes.geminiKey ||
    changes[AI_FLAGGED_QUERY_CACHE_KEY]
  ) {
    clearAiDecisionCache();
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  withServiceWorkerKeepAlive(() => maybeFilterAddressBarNavigation(details)).catch(
    (error) => {
      console.error("Failed to filter address bar navigation", error);
    },
  );
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === "SET_PARENT_PIN") {
        const salt = generateSalt();
        const hash = await derivePinHash(message.pin, salt);

        await chrome.storage.local.set({
          parentPinSalt: salt,
          parentPinHash: hash,
        });

        sendResponse({ ok: true });
        return;
      }

      if (message.type === "VERIFY_PARENT_PIN") {
        const { parentPinSalt, parentPinHash } = await chrome.storage.local.get([
          "parentPinSalt",
          "parentPinHash",
        ]);

        if (!parentPinSalt || !parentPinHash) {
          sendResponse({ ok: false, error: "No parent PIN set" });
          return;
        }

        const attemptedHash = await derivePinHash(message.pin, parentPinSalt);
        const valid = attemptedHash === parentPinHash;

        if (valid) {
          const unlockExpiresAt = Date.now() + 10 * 60 * 1000;
          await chrome.storage.session.set({
            parentUnlocked: true,
            unlockExpiresAt,
          });
        }

        sendResponse({ ok: true, valid });
        return;
      }

      if (message.type === "CHECK_PARENT_UNLOCK") {
        const { parentUnlocked, unlockExpiresAt } =
          await chrome.storage.session.get(["parentUnlocked", "unlockExpiresAt"]);

        const valid =
          Boolean(parentUnlocked) &&
          typeof unlockExpiresAt === "number" &&
          Date.now() < unlockExpiresAt;

        if (!valid) {
          await chrome.storage.session.remove([
            "parentUnlocked",
            "unlockExpiresAt",
          ]);
        }

        sendResponse({ ok: true, unlocked: valid });
        return;
      }

      if (message.type === "LOCK_PARENT_CONTROLS") {
        await chrome.storage.session.remove([
          "parentUnlocked",
          "unlockExpiresAt",
        ]);
        sendResponse({ ok: true });
        return;
      }

      if (message.type === "GET_MAMABEAR_SETTINGS") {
        sendResponse({
          ok: true,
          settings: await getEffectiveSettings(),
        });
        return;
      }

      if (message.type === "CAPTURE_PAGE_CONTEXT") {
        const payload = message.payload;
        const storedPayload = {
          ...payload,
          storedAt: new Date().toISOString(),
          tabId: sender.tab?.id ?? null,
          tabUrl: sender.tab?.url ?? payload?.page?.url ?? "",
          frameId: sender.frameId ?? 0,
        };

        const { pageContextHistory = [] } = await chrome.storage.session.get([
          "pageContextHistory",
        ]);

        const nextHistory = [storedPayload, ...pageContextHistory].slice(
          0,
          PAGE_CONTEXT_HISTORY_LIMIT,
        );

        await chrome.storage.session.set({
          latestPageContext: storedPayload,
          pageContextHistory: nextHistory,
        });

        sendResponse({ ok: true });
        return;
      }

      if (message.type === "GET_LATEST_PAGE_CONTEXT") {
        const { latestPageContext, pageContextHistory = [] } =
          await chrome.storage.session.get([
            "latestPageContext",
            "pageContextHistory",
          ]);

        sendResponse({
          ok: true,
          latestPageContext: latestPageContext || null,
          pageContextHistory,
        });
        return;
      }

      if (message.type === "DEBUG_LOG_EVENT") {
        const payload = message.payload || {};
        const event = {
          ...payload,
          storedAt: new Date().toISOString(),
          tabId: sender.tab?.id ?? null,
          tabUrl: sender.tab?.url ?? payload.pageUrl ?? "",
          frameId: sender.frameId ?? 0,
        };

        const { debugEventHistory = [] } = await chrome.storage.session.get([
          "debugEventHistory",
        ]);

        await chrome.storage.session.set({
          debugEventHistory: [event, ...debugEventHistory].slice(
            0,
            DEBUG_EVENT_HISTORY_LIMIT,
          ),
        });

        sendResponse({ ok: true });
        return;
      }

      if (message.type === "GET_DEBUG_EVENTS") {
        const { debugEventHistory = [] } = await chrome.storage.session.get([
          "debugEventHistory",
        ]);

        sendResponse({
          ok: true,
          debugEventHistory,
        });
        return;
      }

      if (message.type === "AI_CHECK_QUERY") {
        const { query } = message;
        const settings = await getEffectiveSettings();
        const credentials = await getAiCredentials();
        const evaluation = await withServiceWorkerKeepAlive(() =>
          evaluateQueryIntervention(query, settings, credentials),
        );

        sendResponse({
          ok: true,
          harmful: evaluation.harmful,
          shouldWarn: evaluation.shouldWarn,
          shouldBlock: evaluation.shouldBlock,
          matchedCategories: evaluation.matchedCategories,
          reason: evaluation.reason,
          source: evaluation.source,
          detail: evaluation.detail,
        });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (error) {
      console.error("runtime.onMessage failed", error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })();

  return true;
});
