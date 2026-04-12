type ClarificationEnding = "none" | "question";

function trimTrailingPunctuation(value: string): string {
  return value.trim().replace(/[.?!:\s]+$/g, "").trim();
}

function lowercaseFirst(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function formatClarificationRequest(
  detail: string,
  ending: ClarificationEnding = "none"
): string {
  const cleaned = trimTrailingPunctuation(detail);
  if (!cleaned) {
    const fallback = "I need one detail to answer well: please clarify what detail matters most";
    return ending === "question" ? `${fallback}?` : fallback;
  }

  const formatted = `I need one detail to answer well: ${lowercaseFirst(cleaned)}`;
  return ending === "question" ? `${formatted}?` : formatted;
}

export function normalizeClarificationAnswer(answer: string): string {
  const trimmed = answer.trim();
  if (!trimmed) {
    return formatClarificationRequest("please clarify what detail matters most", "question");
  }

  if (/i need one detail to answer well:/i.test(trimmed) && !/^ask the user[:\s]/i.test(trimmed)) {
    return trimmed;
  }

  const asksAboutDraft = /^before i draft/i.test(trimmed);

  const stripped = trimmed
    .replace(/^clarification requested:\s*/i, "")
    .replace(/^before i continue[:,]?\s*/i, "")
    .replace(/^before i draft[^,:]*[:,]?\s*/i, "");

  const rewritten = formatClarificationRequest(
    stripped,
    /[?]\s*$/.test(trimmed) || /[?]\s*$/.test(stripped) ? "question" : "none"
  );

  return asksAboutDraft ? `I can help draft that. ${rewritten}` : rewritten;
}

function joinDetails(parts: string[]): string {
  if (parts.length === 0) {
    return "please clarify what detail matters most";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function formatDraftOnlyClarification(userMessage: string): string {
  const lowered = userMessage.toLowerCase();
  const details: string[] = [];

  if (lowered.includes("email") || lowered.includes("professor") || lowered.includes("recipient")) {
    details.push("what recipient I should address");
  }

  if (lowered.includes("attach") || lowered.includes("attachment")) {
    details.push("whether I should mention the attachment as included");
  }

  if (details.length === 0) {
    details.push("what specific detail you want included");
  }

  return `I can help draft that. ${formatClarificationRequest(joinDetails(details), "question")}`;
}
