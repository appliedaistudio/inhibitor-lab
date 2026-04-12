import type { PublicResourceRecord, SessionMessageRecord } from "@/types/companion";

export interface SessionResourceItemView {
  id: string;
  title: string;
  snippet: string;
  url: string;
  canonicalUrl: string;
  kind: PublicResourceRecord["kind"];
  cited: boolean;
  current: boolean;
  authors: string[];
  publishedYear?: number;
  venue?: string;
  lastSeenAt: string;
  currentOrder: number;
  metadataQuality: number;
}

export interface SessionResourceLedgerView {
  items: SessionResourceItemView[];
  citationCount: number;
}

function isPublicUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

function publicResourcesForMessage(message: SessionMessageRecord): PublicResourceRecord[] {
  return (message.result?.synthesis.public_resources ?? []).filter((item) => isPublicUrl(item.url));
}

function publicResourceFingerprint(item: PublicResourceRecord): string {
  return item.url;
}

function metadataQuality(item: PublicResourceRecord): number {
  let quality = 0;
  if (item.snippet.trim().length > 0) {
    quality += 1;
  }
  if ((item.authors?.length ?? 0) > 0) {
    quality += 1;
  }
  if (item.published_year) {
    quality += 1;
  }
  if (item.venue) {
    quality += 1;
  }
  return quality;
}

function prefersResourceCandidate(left: SessionResourceItemView, right: SessionResourceItemView): boolean {
  if (left.current !== right.current) {
    return left.current;
  }
  if (left.kind !== right.kind) {
    return left.kind === "citation";
  }
  if (left.currentOrder !== right.currentOrder) {
    return left.currentOrder < right.currentOrder;
  }
  if (left.lastSeenAt !== right.lastSeenAt) {
    return left.lastSeenAt > right.lastSeenAt;
  }
  if (left.metadataQuality !== right.metadataQuality) {
    return left.metadataQuality > right.metadataQuality;
  }
  return left.title.localeCompare(right.title) <= 0;
}

export function buildSessionResourceLedger(thread: SessionMessageRecord[]): SessionResourceLedgerView {
  const assistantMessages = thread.filter(
    (message): message is SessionMessageRecord & { result: NonNullable<SessionMessageRecord["result"]> } =>
      message.role === "assistant" && Boolean(message.result)
  );
  const currentMessage = assistantMessages.at(-1) ?? null;
  const currentResources = currentMessage ? publicResourcesForMessage(currentMessage) : [];
  const currentResourceOrder = new Map<string, number>();
  for (const [index, item] of currentResources.entries()) {
    const fingerprint = publicResourceFingerprint(item);
    if (!currentResourceOrder.has(fingerprint)) {
      currentResourceOrder.set(fingerprint, index);
    }
  }
  const itemsByFingerprint = new Map<string, SessionResourceItemView>();

  for (const message of assistantMessages) {
    for (const resource of publicResourcesForMessage(message)) {
      const fingerprint = publicResourceFingerprint(resource);
      const previous = itemsByFingerprint.get(fingerprint);
      const nextMetadataQuality = Math.max(previous?.metadataQuality ?? 0, metadataQuality(resource));
      const currentOrder = message === currentMessage ? (currentResourceOrder.get(fingerprint) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      const candidate: SessionResourceItemView = {
        id: resource.evidence_id,
        title: resource.title || previous?.title || "",
        snippet: resource.snippet || previous?.snippet || "",
        url: resource.url,
        canonicalUrl: resource.url,
        kind: resource.kind,
        cited: resource.kind === "citation",
        current: message === currentMessage,
        authors: resource.authors && resource.authors.length > 0 ? resource.authors : previous?.authors ?? [],
        publishedYear: resource.published_year ?? previous?.publishedYear,
        venue: resource.venue ?? previous?.venue,
        lastSeenAt: message.timestamp,
        currentOrder,
        metadataQuality: nextMetadataQuality
      };

      if (!previous) {
        itemsByFingerprint.set(fingerprint, candidate);
        continue;
      }

      const currentCandidates = [previous, candidate].filter((item) => item.current);
      const visibleCandidates = currentCandidates.length > 0 ? currentCandidates : [previous, candidate];
      const preferred = visibleCandidates.reduce((best, item) =>
        prefersResourceCandidate(best, item) ? best : item
      );
      const currentKind =
        currentCandidates.some((item) => item.kind === "citation") ? "citation" : "further_reading";
      const mergedKind =
        currentCandidates.length > 0
          ? currentKind
          : previous.kind === "citation" || candidate.kind === "citation"
            ? "citation"
            : "further_reading";
      itemsByFingerprint.set(fingerprint, {
        ...preferred,
        kind: mergedKind,
        cited: mergedKind === "citation",
        current: currentCandidates.length > 0,
        authors: preferred.authors.length > 0 ? preferred.authors : previous.authors.length > 0 ? previous.authors : candidate.authors,
        publishedYear: preferred.publishedYear ?? previous.publishedYear ?? candidate.publishedYear,
        venue: preferred.venue ?? previous.venue ?? candidate.venue,
        lastSeenAt: previous.lastSeenAt > candidate.lastSeenAt ? previous.lastSeenAt : candidate.lastSeenAt,
        currentOrder:
          currentCandidates.length > 0
            ? Math.min(...currentCandidates.map((item) => item.currentOrder))
            : Number.MAX_SAFE_INTEGER,
        metadataQuality: Math.max(previous.metadataQuality, candidate.metadataQuality)
      });
    }
  }

  const items = [...itemsByFingerprint.values()].sort((left, right) => {
    const leftBucket = left.current ? (left.kind === "citation" ? 0 : 1) : 2;
    const rightBucket = right.current ? (right.kind === "citation" ? 0 : 1) : 2;

    if (leftBucket !== rightBucket) {
      return leftBucket - rightBucket;
    }
    if (left.current && right.current && left.currentOrder !== right.currentOrder) {
      return left.currentOrder - right.currentOrder;
    }
    if (left.lastSeenAt !== right.lastSeenAt) {
      return right.lastSeenAt.localeCompare(left.lastSeenAt);
    }
    if (left.metadataQuality !== right.metadataQuality) {
      return right.metadataQuality - left.metadataQuality;
    }
    return left.title.localeCompare(right.title);
  });

  return {
    items,
    citationCount: items.filter((item) => item.current && item.cited).length
  };
}
