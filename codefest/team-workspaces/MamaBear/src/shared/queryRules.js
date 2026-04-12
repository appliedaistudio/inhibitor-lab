import { categoryLabels } from "./defaultSettings.js";

export const categoryQueryRules = {
  edsBodyDysmorphia: [
    /\banorexia\b/i,
    /\bbulimia\b/i,
    /\bthinspo\b/i,
    /\bthinspiration\b/i,
    /\bpro-ana\b/i,
    /\bpro ana\b/i,
    /\bhow to starve\b/i,
    /\bhow to purge\b/i,
    /\banorexia tips\b/i,
    /\bbulimia tips\b/i,
    /\bextreme weight loss\b/i,
  ],
  profanity: [
    /\bfuck\b/i,
    /\bshit\b/i,
    /\bbitch\b/i,
    /\basshole\b/i,
    /\bdamn\b/i,
    /\bcunt\b/i,
    /\bwhore\b/i,
    /\bmotherfucker\b/i,
    /\bslut\b/i,
  ],
  hatefulLanguage: [
    /\bwhite power\b/i,
    /\bethnic cleansing\b/i,
    /\bhate (?:group|race|religion)\b/i,
    /\bkill all (?:men|women|jews|muslims|christians|immigrants|gays)\b/i,
    /\b(?:nigger|faggot|kike|chink|gook|spic|slant)\b/i,
  ],
  sexualContent: [
    /\bporn\b/i,
    /\bsex video\b/i,
    /\bxxx\b/i,
    /\bnudes?\b/i,
    /\badult content\b/i,
    /\bonlyfans\b/i,
    /\bhow to (?:have )?sex\b/i,
    /\bhow to masturbate\b/i,
    /\borgasm\b/i,
    /\bdick\b/i,
    /\bpussy\b/i,
    /\bcock\b/i,
    /\bblowjob\b/i,
    /\bblow job\b/i,
    /\b(?:anal)? sex\b/i,
    /\b(?:rape|molest|incest)\b/i,
  ],
  abuse: [
    /\bchild abuse\b/i,
    /\bdomestic abuse\b/i,
    /\bhow to abuse\b/i,
    /\bsexual abuse\b/i,
    /\bbeat my (?:wife|husband|partner|child)\b/i,
    /\b(?:abuse|rape) (?:my )?(?:partner|child|(?:a )?minor)\b/i,
  ],
  violenceGore: [
    /\bgore\b/i,
    /\bbeheading\b/i,
    /\bdismember(?:ment)?\b/i,
    /\bgraphic violence\b/i,
    /\bbloodbath\b/i,
    /\bhow to kill\b/i,
    /\b(?:kill|murder) (?:my )?(?:partner|child|(?:a )?minor)\b/i,
  ],
  selfHarm: [
    /\bsuicide\b/i,
    /\bself harm\b/i,
    /\b(?:self)?mutilation\b/i,
    /\boverdose\b/i,
    /\bintentional overdose\b/i,
    /\b(?:cut|kill|hang|strangle) myself\b/i,
    /\bshoot myself\b/i,
    /\bshooting myself\b/i,
    /\bput a bullet in my head\b/i,
    /\b(?:jump|leap) from\b/i,
    /\bsuicide\b/i,
  ],
  substanceUse: [
    /\bcocaine\b/i,
    /\bmeth\b/i,
    /\bheroin\b/i,
    /\bfentanyl\b/i,
    /\bhow to get high\b/i,
    /\bbuy weed\b/i,
    /\bvape tricks\b/i,
    /\bdark web\b/i,
    /\bdrug abuse\b/i,
    /\bsubstance abuse\b/i,
    /\bdrug use\b/i,
    /\b(?:alcohol|drugs?|weed|cocaine|meth|heroin|fentanyl|hard drugs?)\b/i,
  ],
  gambling: [
    /\bgambling\b/i,
    /\bcasino\b/i,
    /\bsports betting\b/i,
    /\bbetting odds\b/i,
    /\bslot machine\b/i,
    /\bslots\b/i,
    /\bblackjack\b/i,
    /\broulette\b/i,
    /\bpoker\b/i,
    /\bonline betting\b/i,
    /\blottery\b/i,
  ],
};

export function formatMatchedCategoryLabels(matchedCategories = []) {
  const labels = [...new Set(
    matchedCategories
      .map((categoryKey) => categoryLabels[categoryKey] || categoryKey)
      .filter(Boolean),
  )];

  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function buildCategoryReason(matchedCategories = []) {
  const labelList = formatMatchedCategoryLabels(matchedCategories);

  if (!labelList) {
    return "This query matched protected content filters.";
  }

  if (matchedCategories.length === 1) {
    return `This query matched the protected category ${labelList}.`;
  }

  return `This query matched the protected categories ${labelList}.`;
}

export function evaluateQueryAgainstSettings(query, settings) {
  const normalizedQuery = query.trim();
  const matchedCategories = [];

  if (!normalizedQuery || !settings?.enabled) {
    return {
      matchedCategories,
      reason: "",
      shouldWarn: false,
      shouldBlock: false,
    };
  }

  for (const [categoryKey, patterns] of Object.entries(categoryQueryRules)) {
    if (!settings.categories?.[categoryKey]) {
      continue;
    }

    if (patterns.some((pattern) => pattern.test(normalizedQuery))) {
      matchedCategories.push(categoryKey);
    }
  }

  return {
    matchedCategories,
    reason:
      matchedCategories.length > 0
        ? buildCategoryReason(matchedCategories)
        : "",
    shouldWarn:
      matchedCategories.length > 0 && settings.responseMode === "warn",
    shouldBlock:
      matchedCategories.length > 0 && settings.responseMode === "block",
  };
}
