import type { EvidenceRecord } from "./contracts";

export function makeRequestId(): string {
  return crypto.randomUUID();
}

export function clampRisk(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function containsAny(source: string, terms: string[]): boolean {
  const lowered = source.toLowerCase();
  return terms.some((term) => lowered.includes(term.toLowerCase()));
}

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function keywordOverlapScore(query: string, document: string): number {
  const queryTokens = new Set(tokenize(query));
  const documentTokens = new Set(tokenize(document));

  if (queryTokens.size === 0 || documentTokens.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const token of queryTokens) {
    if (documentTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / queryTokens.size;
}

export function containsSensitivePattern(value: string): boolean {
  const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
  const cardPattern = /\b\d{4}-\d{4}-\d{4}-\d{4}\b/;
  return ssnPattern.test(value) || cardPattern.test(value);
}

export function isObviousHarmRequest(value: string): boolean {
  const lowered = value.toLowerCase();
  const explosiveTerms = ["bomb", "explosive", "pipe bomb", "molotov", "grenade", "napalm"];
  const constructionTerms = [
    "how do i",
    "how to",
    "make",
    "build",
    "create",
    "assemble",
    "construct",
    "mix",
    "instructions"
  ];

  if (containsAny(lowered, explosiveTerms) && containsAny(lowered, constructionTerms)) {
    return true;
  }

  const poisoningTerms = ["poison", "toxin"];
  const harmTerms = ["kill", "hurt", "harm"];
  const planningTerms = ["how do i", "how to", "best way to", "easiest way to"];

  if (containsAny(lowered, poisoningTerms) && containsAny(lowered, planningTerms)) {
    return true;
  }

  return containsAny(lowered, harmTerms) && containsAny(lowered, planningTerms);
}

export function formatCitationList(evidence: EvidenceRecord[]): string[] {
  return evidence.map((item) => `[${item.id}] ${item.title}`);
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
