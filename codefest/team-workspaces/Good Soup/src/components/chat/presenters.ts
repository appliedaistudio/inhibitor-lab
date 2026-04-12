import type {
  CitationRecord,
  CompanionPipelineResult,
  EvidenceRecord,
  ProcessMessage,
  SessionSummary
} from "@/types/companion";

export interface AssistantTurnView {
  answer: string;
  citations: Array<string | CitationRecord>;
  decision: CompanionPipelineResult["decision"]["decision"];
}

export interface ResourceItemView {
  id: string;
  title: string;
  sourceType: EvidenceRecord["source_type"];
  snippet: string;
  url: string;
  cited: boolean;
}

export interface ResourcesView {
  items: ResourceItemView[];
  citationCount: number;
}

export function buildAssistantTurnView(result: CompanionPipelineResult): AssistantTurnView {
  return {
    answer: result.synthesis.final_answer,
    citations: result.synthesis.citation_records?.length
      ? result.synthesis.citation_records
      : result.synthesis.citations,
    decision: result.decision.decision
  };
}

export function buildProcessMessages(result: CompanionPipelineResult): ProcessMessage[] {
  return result.process_events.map((event) => ({
    id: event.id,
    participant: event.participant,
    title: event.title,
    body: event.body,
    created_at: event.created_at
  }));
}

export function buildResourcesView(result: CompanionPipelineResult): ResourcesView {
  const citedIds = result.synthesis.citation_records?.length
    ? new Set(result.synthesis.citation_records.map((item) => item.evidence_id))
    : new Set(result.synthesis.citations);
  const items = result.evidence
    .map((item) => ({
      id: item.id,
      title: item.title,
      sourceType: item.source_type,
      snippet: item.snippet,
      url: item.url,
      cited: citedIds.has(item.id)
    }))
    .sort((left, right) => {
      if (left.cited === right.cited) {
        return left.id.localeCompare(right.id);
      }

      return left.cited ? -1 : 1;
    });

  return {
    items,
    citationCount: result.synthesis.citations.length
  };
}

export function upsertSessionSummary(
  current: SessionSummary[],
  incoming: SessionSummary
): SessionSummary[] {
  const uniqueBySession = new Map<string, SessionSummary>();

  for (const summary of current) {
    if (summary.session_id !== incoming.session_id) {
      uniqueBySession.set(summary.session_id, summary);
    }
  }

  uniqueBySession.set(incoming.session_id, incoming);

  return Array.from(uniqueBySession.values()).sort(
    (a, b) => Date.parse(b.touched_at) - Date.parse(a.touched_at)
  );
}
