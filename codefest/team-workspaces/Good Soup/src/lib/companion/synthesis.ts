import type {
  EvidenceRecord,
  PublicResourceRecord,
  SynthesisInput,
  SynthesisResult
} from "./contracts";
import { formatClarificationRequest, normalizeClarificationAnswer } from "./clarification";
import { formatCitationList, unique } from "./utils";

function carriesClarifyingAnswer(answer: string): boolean {
  const lowered = answer.toLowerCase();
  return answer.includes("?") ||
    lowered.startsWith("before i continue") ||
    lowered.startsWith("before i draft") ||
    lowered.startsWith("clarification requested") ||
    lowered.startsWith("i need one detail to answer well:") ||
    lowered.startsWith("i can help draft that.");
}

function isPublicExternalEvidence(item: EvidenceRecord): boolean {
  const url = item.canonical_url ?? item.url;
  return item.source_type !== "local_corpus" && /^https?:\/\//.test(url);
}

function toPublicResourceRecord(
  item: EvidenceRecord,
  kind: "citation" | "further_reading"
): PublicResourceRecord {
  return {
    evidence_id: item.id,
    title: item.title,
    url: item.canonical_url ?? item.url,
    label: `[${item.id}] ${item.title}`,
    kind,
    snippet: item.snippet,
    authors: item.authors,
    published_year: item.published_year,
    venue: item.venue
  };
}

export async function synthesizeResponse(input: SynthesisInput): Promise<SynthesisResult> {
  const citedIds = input.draft.citations_used ?? [];
  const recommendedIds = input.draft.recommended_resource_ids ?? [];
  const citedEvidence = input.evidence.filter(
    (item) => citedIds.includes(item.id) && isPublicExternalEvidence(item)
  );
  const citations = formatCitationList(citedEvidence);
  const citationRecords = citedEvidence.map((item) => ({
    evidence_id: item.id,
    label: `[${item.id}] ${item.title}`,
    title: item.title,
    url: item.canonical_url ?? item.url
  }));
  const recommendedEvidence = input.evidence.filter(
    (item) =>
      recommendedIds.includes(item.id) &&
      !citedIds.includes(item.id) &&
      isPublicExternalEvidence(item)
  );
  const publicResources = [
    ...citedEvidence.map((item) => toPublicResourceRecord(item, "citation")),
    ...recommendedEvidence.map((item) => toPublicResourceRecord(item, "further_reading"))
  ];
  const uncertaintyNotes = unique(input.draft.uncertainty_notes);
  const shared = {
    citations,
    citation_records: citationRecords,
    public_resources: publicResources,
    uncertainty_notes: uncertaintyNotes
  };

  switch (input.decision.decision) {
    case "allow":
    case "revise":
      return {
        final_answer: input.draft.answer,
        ...shared
      };
    case "block_action":
      return {
        final_answer: `I can't help with that as written. ${input.decision.blocking_reasons.join(" ")}`.trim(),
        ...shared
      };
    case "ask_clarifying_question":
      return {
        final_answer: carriesClarifyingAnswer(input.draft.answer)
          ? normalizeClarificationAnswer(input.draft.answer)
          : formatClarificationRequest(input.decision.blocking_reasons.join(" ")),
        ...shared
      };
    case "escalate":
      return {
        final_answer: "This request needs human review before I can answer safely.",
        ...shared
      };
    default: {
      const exhaustive: never = input.decision.decision;
      return exhaustive;
    }
  }
}
