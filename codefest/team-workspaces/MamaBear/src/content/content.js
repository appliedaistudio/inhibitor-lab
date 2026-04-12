import { defaultSettings } from "../shared/defaultSettings.js";
import { evaluateQueryAgainstSettings } from "../shared/queryRules.js";

const SEARCH_HINT_PATTERN = /\b(search|query|find|lookup|look up|results?)\b/i;
const SEARCH_QUERY_PARAM_KEYS = ["q", "p", "query", "search"];
const KNOWN_SEARCH_ENGINE_HOST_PATTERN =
  /(^|\.)google\.|(^|\.)bing\.com$|(^|\.)search\.brave\.com$|(^|\.)duckduckgo\.com$/i;
const KNOWN_SEARCH_INPUT_SELECTORS = [
  'textarea[name="q"]',
  'input[name="q"]',
  'input[id="sb_form_q"]',
  'textarea[aria-label*="search" i]',
  'input[aria-label*="search" i]',
  'input[placeholder*="search" i]',
  'textarea[placeholder*="search" i]',
  '[role="searchbox"]',
  '[role="search"] input',
  '[role="search"] textarea',
];
const MAX_VISIBLE_TEXT_LENGTH = 1200;
const MAX_SEARCH_BAR_VALUE_LENGTH = 300;
const MAX_SEARCH_BARS = 5;
const INTERVENTION_DEDUPE_WINDOW_MS = 1200;
const RESUME_BYPASS_WINDOW_MS = 2000;
const DEBUG_LOGGING_ENABLED = false;
const BLOCK_REDIRECT_DELAY_MS = 140;
const PUBLIC_SETTINGS_SESSION_KEY = "mamabearPublicSettings";

let latestCaptureFingerprint = "";
let cachedSettings = {
  ...defaultSettings,
  enabled: false,
  categories: {
    ...Object.fromEntries(
      Object.keys(defaultSettings.categories).map((key) => [key, false]),
    ),
  },
};
let lastInterventionFingerprint = "";
let lastInterventionAt = 0;
let hasLoadedSettings = false;
let settingsSyncPromise = null;
let lastResumeFingerprint = "";
let lastResumeAt = 0;

function isExtensionContextValid() {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

function normalizeSettings(settings = {}) {
  return {
    ...defaultSettings,
    ...settings,
    categories: {
      ...defaultSettings.categories,
      ...(settings.categories || {}),
    },
  };
}

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function getAttr(element, name) {
  return normalizeWhitespace(element?.getAttribute?.(name) || "");
}

function isKnownSearchEngineHost(hostname = window.location.hostname) {
  return KNOWN_SEARCH_ENGINE_HOST_PATTERN.test(hostname);
}

function isVisible(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isSupportedInputType(element) {
  if (element.tagName === "TEXTAREA") {
    return true;
  }

  if (element.tagName !== "INPUT") {
    return false;
  }

  const type = (element.getAttribute("type") || "text").toLowerCase();
  return ["search", "text", "url"].includes(type);
}

function getSearchLikelihoodScore(element) {
  if (!(element instanceof HTMLElement) || !isSupportedInputType(element)) {
    return -1;
  }

  let score = 0;
  const type = (element.getAttribute("type") || "text").toLowerCase();
  const name = getAttr(element, "name").toLowerCase();
  const id = getAttr(element, "id").toLowerCase();
  const placeholder = getAttr(element, "placeholder");
  const ariaLabel = getAttr(element, "aria-label");
  const title = getAttr(element, "title");
  const role = getAttr(element, "role");
  const form = element.closest("form");
  const formAction = normalizeWhitespace(form?.getAttribute("action") || "");
  const formRole = getAttr(form, "role");
  const fieldText = [name, id, placeholder, ariaLabel, title, role].join(" ");

  if (type === "search") {
    score += 5;
  }

  if (name === "q" || name === "query" || name === "search") {
    score += 3;
  }

  if (SEARCH_HINT_PATTERN.test(fieldText)) {
    score += 3;
  }

  if (SEARCH_HINT_PATTERN.test(formAction) || formRole === "search") {
    score += 2;
  }

  if (element.matches('[role="searchbox"], [enterkeyhint="search"]')) {
    score += 2;
  }

  if (
    isKnownSearchEngineHost() &&
    (name === "q" ||
      id === "sb_form_q" ||
      element.matches(
        'textarea[name="q"], input[name="q"], input[id="sb_form_q"]',
      ))
  ) {
    score += 5;
  }

  return score;
}

function getNearbyLabelText(element) {
  if (!(element instanceof HTMLElement)) {
    return "";
  }

  const ariaLabel = getAttr(element, "aria-label");
  if (ariaLabel) {
    return ariaLabel;
  }

  const id = getAttr(element, "id");
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    const labelText = normalizeWhitespace(label?.textContent || "");
    if (labelText) {
      return labelText;
    }
  }

  const wrappingLabel = element.closest("label");
  return normalizeWhitespace(wrappingLabel?.textContent || "");
}

function toSearchBarSnapshot(element) {
  const rect = element.getBoundingClientRect();
  const form = element.closest("form");
  const type =
    element.tagName === "TEXTAREA"
      ? "textarea"
      : (element.getAttribute("type") || "text").toLowerCase();

  return {
    tagName: element.tagName.toLowerCase(),
    type,
    name: getAttr(element, "name"),
    id: getAttr(element, "id"),
    placeholder: getAttr(element, "placeholder"),
    ariaLabel: getAttr(element, "aria-label"),
    labelText: getNearbyLabelText(element),
    value: truncate(
      normalizeWhitespace(element.value || ""),
      MAX_SEARCH_BAR_VALUE_LENGTH,
    ),
    formAction: normalizeWhitespace(
      form?.action || form?.getAttribute("action") || "",
    ),
    formMethod: normalizeWhitespace(form?.getAttribute("method") || ""),
    rect: {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };
}

function getSearchBarCandidates(root = document) {
  const inputs = Array.from(root.querySelectorAll("input, textarea"));
  const scoredInputs = inputs
    .filter((element) => isVisible(element) && isSupportedInputType(element))
    .map((element) => ({
      element,
      score: getSearchLikelihoodScore(element),
    }))
    .sort((left, right) => right.score - left.score);

  if (!(root instanceof Document || root instanceof Element)) {
    return scoredInputs;
  }

  const explicitMatches = KNOWN_SEARCH_INPUT_SELECTORS.flatMap((selector) =>
    Array.from(root.querySelectorAll(selector)),
  )
    .filter((element) => isVisible(element) && isSupportedInputType(element))
    .map((element) => ({
      element,
      score: Math.max(getSearchLikelihoodScore(element), 10),
    }));

  const mergedByElement = new Map();
  for (const candidate of [...explicitMatches, ...scoredInputs]) {
    const existing = mergedByElement.get(candidate.element);
    if (!existing || candidate.score > existing.score) {
      mergedByElement.set(candidate.element, candidate);
    }
  }

  return Array.from(mergedByElement.values()).sort(
    (left, right) => right.score - left.score,
  );
}

function getSearchBarsSnapshot() {
  const candidates = getSearchBarCandidates();
  const positiveMatches = candidates.filter((candidate) => candidate.score > 0);
  const selectedCandidates =
    positiveMatches.length > 0
      ? positiveMatches.slice(0, MAX_SEARCH_BARS)
      : candidates.slice(0, 1);

  return selectedCandidates.map((candidate) =>
    toSearchBarSnapshot(candidate.element),
  );
}

function getActiveSearchBarSnapshot() {
  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLElement &&
    isVisible(activeElement) &&
    isSupportedInputType(activeElement)
  ) {
    return toSearchBarSnapshot(activeElement);
  }

  const [firstCandidate] = getSearchBarCandidates();
  return firstCandidate ? toSearchBarSnapshot(firstCandidate.element) : null;
}

function getVisibleTextSnippet() {
  const preferredRoot =
    document.querySelector("main, [role='main'], article") || document.body;
  const rawText = normalizeWhitespace(preferredRoot?.innerText || "");
  return truncate(rawText, MAX_VISIBLE_TEXT_LENGTH);
}

function buildPageContext({
  eventType,
  submittedQuery = "",
  sourceElement = null,
}) {
  const searchBars = getSearchBarsSnapshot();
  const activeSearchBar =
    sourceElement instanceof HTMLElement
      ? toSearchBarSnapshot(sourceElement)
      : getActiveSearchBarSnapshot();
  const description =
    document
      .querySelector(
        'meta[name="description"], meta[property="og:description"]',
      )
      ?.getAttribute("content") || "";
  const headings = Array.from(document.querySelectorAll("h1, h2"))
    .map((heading) => normalizeWhitespace(heading.textContent || ""))
    .filter(Boolean)
    .slice(0, 5);

  return {
    eventType,
    capturedAt: new Date().toISOString(),
    page: {
      title: document.title,
      url: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      description: normalizeWhitespace(description),
      headings,
      visibleTextSnippet: getVisibleTextSnippet(),
    },
    submittedQuery: truncate(
      normalizeWhitespace(submittedQuery),
      MAX_SEARCH_BAR_VALUE_LENGTH,
    ),
    activeSearchBar,
    searchBars,
  };
}

function getInterventionFingerprint(action, query) {
  return `${action}:${normalizeWhitespace(query)}`;
}

function shouldSuppressIntervention(action, query) {
  const fingerprint = getInterventionFingerprint(action, query);
  const now = Date.now();

  if (
    fingerprint === lastInterventionFingerprint &&
    now - lastInterventionAt < INTERVENTION_DEDUPE_WINDOW_MS
  ) {
    return true;
  }

  lastInterventionFingerprint = fingerprint;
  lastInterventionAt = now;
  return false;
}

function markResumedSubmission(query) {
  lastResumeFingerprint = getInterventionFingerprint("resume", query);
  lastResumeAt = Date.now();
}

function shouldBypassResumedSubmission(query) {
  const fingerprint = getInterventionFingerprint("resume", query);
  const shouldBypass =
    fingerprint === lastResumeFingerprint &&
    Date.now() - lastResumeAt < RESUME_BYPASS_WINDOW_MS;

  if (shouldBypass) {
    lastResumeFingerprint = "";
    lastResumeAt = 0;
  }

  return shouldBypass;
}

function evaluateQueryPolicy(query) {
  return evaluateQueryAgainstSettings(query, cachedSettings);
}

function getBlockedQueryFromUrl(url = window.location.href) {
  try {
    const parsedUrl = new URL(url);

    for (const key of SEARCH_QUERY_PARAM_KEYS) {
      const value = normalizeWhitespace(parsedUrl.searchParams.get(key) || "");
      if (!value) {
        continue;
      }

      const evaluation = evaluateQueryPolicy(value);
      if (evaluation.shouldWarn || evaluation.shouldBlock) {
        return {
          query: value,
          evaluation,
        };
      }
    }
  } catch (error) {
    console.error("MamaBear failed to inspect URL", error);
  }

  return null;
}

function blockSearchEvent(event, query) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  event.returnValue = false;
  event.cancelBubble = true;
  console.warn("MamaBear blocked search query:", normalizeWhitespace(query));
}

function preventSearchEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  event.returnValue = false;
  event.cancelBubble = true;
}

function getWarningMessage(query, reason = "") {
  const normalizedReason =
    typeof reason === "string" ? reason.trim() : "";

  return `MamaBear warning: "${query}" was flagged.\n\nReason: ${normalizedReason || "This search may contain protected content."}`;
}

function redirectToBlockedPage(query, evaluation = null) {
  try {
    if (!isExtensionContextValid()) {
      return false;
    }

    const blockedUrl = new URL(chrome.runtime.getURL("blocked.html"));
    blockedUrl.searchParams.set("query", normalizeWhitespace(query));
    blockedUrl.searchParams.set("source", window.location.href);
    if (evaluation?.reason) {
      blockedUrl.searchParams.set("reason", evaluation.reason);
    }
    if (evaluation?.source) {
      blockedUrl.searchParams.set("review", evaluation.source);
    }
    window.location.replace(blockedUrl.toString());
    return true;
  } catch (error) {
    if (
      error?.message?.includes("Extension context invalidated") ||
      error?.message?.includes("Cannot access contents of url")
    ) {
      return false;
    }

    console.error("MamaBear redirect failed", error);
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function sendRuntimeMessage(message) {
  try {
    if (!isExtensionContextValid()) {
      return null;
    }
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    if (
      error?.message?.includes("Extension context invalidated") ||
      error?.message?.includes("Could not establish connection")
    ) {
      return null;
    }
    console.error("MamaBear message failed", error);
    return null;
  }
}

async function debugLog(type, details = {}) {
  if (!DEBUG_LOGGING_ENABLED) {
    return;
  }

  await sendRuntimeMessage({
    type: "DEBUG_LOG_EVENT",
    payload: {
      type,
      details,
      pageUrl: window.location.href,
    },
  });
}

async function loadSettingsFromSession() {
  if (!chrome?.storage?.session) {
    return null;
  }

  try {
    const result = await chrome.storage.session.get([PUBLIC_SETTINGS_SESSION_KEY]);
    const publicSettings = result?.[PUBLIC_SETTINGS_SESSION_KEY];

    if (!publicSettings) {
      return null;
    }

    cachedSettings = normalizeSettings(publicSettings);
    hasLoadedSettings = true;
    return cachedSettings;
  } catch {
    return null;
  }
}

async function syncSettings() {
  if (!isExtensionContextValid()) {
    return cachedSettings;
  }

  if (settingsSyncPromise) {
    return settingsSyncPromise;
  }

  settingsSyncPromise = (async () => {
    const sessionSettings = await loadSettingsFromSession();
    if (sessionSettings) {
      return sessionSettings;
    }

    const response = await sendRuntimeMessage({
      type: "GET_MAMABEAR_SETTINGS",
    });

    if (response?.ok && response.settings) {
      cachedSettings = normalizeSettings(response.settings);
      hasLoadedSettings = true;
    }

    return cachedSettings;
  })();

  try {
    return await settingsSyncPromise;
  } finally {
    settingsSyncPromise = null;
  }
}

async function ensureSettingsLoaded() {
  if (hasLoadedSettings) {
    return cachedSettings;
  }

  return syncSettings();
}

async function getAiFallbackEvaluation(query) {
  if (!isExtensionContextValid()) {
    return { ok: false, harmful: false };
  }

  return sendRuntimeMessage({
    type: "AI_CHECK_QUERY",
    query,
  }).then((response) => response || { ok: false, harmful: false });
}

function enforceBlockedQueryOnCurrentPage(eventType) {
  if (!hasLoadedSettings || !cachedSettings.enabled) {
    return false;
  }

  const blockedEntry = getBlockedQueryFromUrl();
  if (!blockedEntry) {
    return false;
  }

  const { query, evaluation } = blockedEntry;

  if (evaluation.shouldWarn) {
    if (shouldSuppressIntervention("warn-url", query)) {
      return true;
    }

    debugLog("warned-query-url", {
      eventType,
      query,
      matchedCategories: evaluation.matchedCategories,
      url: window.location.href,
    });
    return false;
  }

  debugLog("blocked-query-url", {
    eventType,
    blockedQuery: query,
    matchedCategories: evaluation.matchedCategories,
    url: window.location.href,
  });
  redirectToBlockedPage(query, evaluation);
  return true;
}

async function capturePageContext(eventType, options = {}) {
  if (!isExtensionContextValid()) {
    return;
  }

  const settingsResponse = await sendRuntimeMessage({
    type: "GET_MAMABEAR_SETTINGS",
  });

  if (!settingsResponse?.ok || !settingsResponse.settings?.enabled) {
    return;
  }

  const payload = buildPageContext({
    eventType,
    submittedQuery: options.submittedQuery,
    sourceElement: options.sourceElement,
  });

  if (eventType === "search-submit") {
    console.log("MamaBear siphoned page context:", payload);
  }

  const fingerprint = JSON.stringify({
    eventType: payload.eventType,
    url: payload.page.url,
    submittedQuery: payload.submittedQuery,
    activeValue: payload.activeSearchBar?.value || "",
    searchBarValues: payload.searchBars.map((bar) => bar.value),
  });

  if (fingerprint === latestCaptureFingerprint) {
    return;
  }

  latestCaptureFingerprint = fingerprint;

  await sendRuntimeMessage({
    type: "CAPTURE_PAGE_CONTEXT",
    payload,
  });
}

function debounce(callback, delayMs) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delayMs);
  };
}

function getSubmittedSearchElement(form) {
  if (!(form instanceof HTMLFormElement)) {
    return null;
  }

  const candidates = getSearchBarCandidates(form);
  return candidates[0]?.element || null;
}

function getPreferredSearchElement(form = null, eventTarget = null) {
  const fromForm = getSubmittedSearchElement(form);
  if (fromForm) {
    return fromForm;
  }

  if (
    eventTarget instanceof HTMLElement &&
    isSupportedInputType(eventTarget) &&
    isVisible(eventTarget)
  ) {
    return eventTarget;
  }

  const activeSearchBar = getActiveSearchBarSnapshot();
  if (activeSearchBar?.id) {
    const activeById = document.getElementById(activeSearchBar.id);
    if (activeById instanceof HTMLElement) {
      return activeById;
    }
  }

  const [firstCandidate] = getSearchBarCandidates();
  return firstCandidate?.element || null;
}

function getSearchForm(searchElement) {
  return searchElement instanceof HTMLElement
    ? searchElement.closest("form")
    : null;
}

function resumeSearchSubmission(searchElement, submitter = null) {
  const form = getSearchForm(searchElement);
  if (!(form instanceof HTMLFormElement)) {
    return false;
  }

  markResumedSubmission(normalizeWhitespace(searchElement.value || ""));

  if (submitter instanceof HTMLElement) {
    form.requestSubmit(submitter);
    return true;
  }

  form.requestSubmit();
  return true;
}

async function maybeBlockSearchQuery(event, searchElement, options = {}) {
  if (!(searchElement instanceof HTMLElement)) {
    return { handled: false, blocked: false, warned: false, paused: false };
  }

  const query = normalizeWhitespace(searchElement.value || "");
  if (!query || shouldBypassResumedSubmission(query)) {
    return { handled: false, blocked: false, warned: false, paused: false };
  }

  const form = getSearchForm(searchElement);
  const shouldPauseSubmission =
    event?.cancelable && form instanceof HTMLFormElement;

  if (shouldPauseSubmission) {
    preventSearchEvent(event);
  }

  await ensureSettingsLoaded();

  const evaluation = evaluateQueryPolicy(query);
  const matchedCategories = evaluation.matchedCategories || [];

  if (evaluation.shouldWarn) {
    if (!shouldSuppressIntervention("warn", query)) {
      window.alert(getWarningMessage(query, evaluation.reason));
    }
    debugLog("warned-search", {
      query,
      matchedCategories,
      source: "regex",
      targetTag: searchElement.tagName.toLowerCase(),
      targetName: getAttr(searchElement, "name"),
      targetId: getAttr(searchElement, "id"),
    });
    return { handled: true, blocked: false, warned: true, paused: false };
  }

  if (evaluation.shouldBlock) {
    blockSearchEvent(event, query);
    if ("value" in searchElement) {
      searchElement.value = "";
    }
    searchElement.blur();
    debugLog("blocked-search", {
      query,
      matchedCategories,
      source: "regex",
      targetTag: searchElement.tagName.toLowerCase(),
      targetName: getAttr(searchElement, "name"),
      targetId: getAttr(searchElement, "id"),
    });
    await delay(BLOCK_REDIRECT_DELAY_MS);
    redirectToBlockedPage(query, evaluation);
    return { handled: true, blocked: true, warned: false, paused: true };
  }

  if (!(form instanceof HTMLFormElement)) {
    return { handled: false, blocked: false, warned: false, paused: false };
  }

  const aiResponse = await getAiFallbackEvaluation(query);

  if (!aiResponse?.ok || !aiResponse.harmful) {
    resumeSearchSubmission(searchElement, options.submitter || null);
    return { handled: true, blocked: false, warned: false, paused: true };
  }

  if (aiResponse.shouldWarn) {
    if (!shouldSuppressIntervention("warn-ai", query)) {
      window.alert(getWarningMessage(query, aiResponse.reason));
    }
    debugLog("warned-search", {
      query,
      matchedCategories: aiResponse.matchedCategories || [],
      source: aiResponse.source || "ai",
      targetTag: searchElement.tagName.toLowerCase(),
      targetName: getAttr(searchElement, "name"),
      targetId: getAttr(searchElement, "id"),
    });
    resumeSearchSubmission(searchElement, options.submitter || null);
    return { handled: true, blocked: false, warned: true, paused: true };
  }

  if ("value" in searchElement) {
    searchElement.value = "";
  }
  searchElement.blur();
  debugLog("blocked-search", {
    query,
    matchedCategories: aiResponse.matchedCategories || [],
    source: aiResponse.source || "ai",
    targetTag: searchElement.tagName.toLowerCase(),
    targetName: getAttr(searchElement, "name"),
    targetId: getAttr(searchElement, "id"),
  });
  await delay(BLOCK_REDIRECT_DELAY_MS);
  redirectToBlockedPage(query, aiResponse);
  return { handled: true, blocked: true, warned: false, paused: true };
}

const debouncedInputCapture = debounce((element) => {
  capturePageContext("search-input", { sourceElement: element });
}, 350);

debugLog("content-script-loaded", {
  title: document.title,
});

syncSettings()
  .then(() => {
    enforceBlockedQueryOnCurrentPage("settings-sync");
  })
  .catch(() => {});

if (isExtensionContextValid()) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName === "session" &&
      changes[PUBLIC_SETTINGS_SESSION_KEY]?.newValue
    ) {
      cachedSettings = normalizeSettings(
        changes[PUBLIC_SETTINGS_SESSION_KEY].newValue,
      );
      hasLoadedSettings = true;
      return;
    }

    if (areaName === "local" && changes.mamabearSettings?.newValue) {
      cachedSettings = normalizeSettings(changes.mamabearSettings.newValue);
      hasLoadedSettings = true;
    }
  });
}

window.addEventListener("focus", () => {
  syncSettings().catch(() => {});
});

window.addEventListener("pageshow", () => {
  syncSettings()
    .then(() => {
      enforceBlockedQueryOnCurrentPage("pageshow");
    })
    .catch(() => {});
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") {
    return;
  }

  syncSettings()
    .then(() => {
      enforceBlockedQueryOnCurrentPage("visibilitychange");
    })
    .catch(() => {});
});

enforceBlockedQueryOnCurrentPage("page-load");

document.addEventListener(
  "focusin",
  (event) => {
    if (
      event.target instanceof HTMLElement &&
      getSearchLikelihoodScore(event.target) >= 0
    ) {
      syncSettings().catch(() => {});
    }
  },
  true,
);

document.addEventListener(
  "input",
  (event) => {
    if (
      event.target instanceof HTMLElement &&
      getSearchLikelihoodScore(event.target) >= 0
    ) {
      // Keep the hot path lean while typing; only capture on submit/navigation.
    }
  },
  true,
);

document.addEventListener(
  "keydown",
  async (event) => {
    if (event.defaultPrevented || event.key !== "Enter" || event.isComposing) {
      return;
    }

    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    if (
      getSearchLikelihoodScore(event.target) < 0 &&
      !(isKnownSearchEngineHost() && isSupportedInputType(event.target))
    ) {
      return;
    }

    debugLog("search-keydown-enter", {
      targetTag: event.target.tagName.toLowerCase(),
      targetName: getAttr(event.target, "name"),
      targetId: getAttr(event.target, "id"),
      value: normalizeWhitespace(event.target.value || ""),
    });

    await maybeBlockSearchQuery(event, event.target);
  },
  true,
);

document.addEventListener(
  "click",
  async (event) => {
    if (event.defaultPrevented || !(event.target instanceof Element)) {
      return;
    }

    const submitControl = event.target.closest(
      'button, input[type="submit"], input[type="button"]',
    );

    if (!submitControl) {
      return;
    }

    const form = submitControl.closest("form");
    const searchElement = getPreferredSearchElement(form, document.activeElement);
    if (!searchElement) {
      return;
    }

    debugLog("search-submit-click", {
      buttonText: normalizeWhitespace(submitControl.textContent || ""),
      inputValue: normalizeWhitespace(searchElement.value || ""),
    });

    await maybeBlockSearchQuery(event, searchElement, {
      submitter: submitControl,
    });
  },
  true,
);

document.addEventListener(
  "submit",
  async (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const searchElement = getPreferredSearchElement(event.target, event.target);
    if (!searchElement) {
      return;
    }

    debugLog("search-form-submit", {
      inputValue: normalizeWhitespace(searchElement.value || ""),
      formAction: normalizeWhitespace(event.target.action || ""),
    });

    const action = await maybeBlockSearchQuery(event, searchElement, {
      submitter: event.submitter || null,
    });
    if (action.paused || action.blocked) {
      return;
    }

    const submittedQuery = normalizeWhitespace(searchElement.value || "");
    if (!submittedQuery) {
      return;
    }

    capturePageContext("search-submit", {
      submittedQuery,
      sourceElement: searchElement,
    });
  },
  true,
);

const debouncedNavigationCapture = debounce(() => {
  if (enforceBlockedQueryOnCurrentPage("page-navigation")) {
    return;
  }

  capturePageContext("page-navigation");
}, 250);

window.addEventListener("hashchange", debouncedNavigationCapture);
window.addEventListener("popstate", debouncedNavigationCapture);

syncSettings()
  .then(() => {
    capturePageContext("page-load");
  })
  .catch(() => {});
