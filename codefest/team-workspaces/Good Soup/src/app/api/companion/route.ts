import { NextResponse } from "next/server";

import { runCompanionPipeline } from "../../../lib/companion/pipeline";
import { fileSessionWorkspaceStore } from "../../../lib/companion/session-workspace-store";
import type { RunCompanionRequest } from "../../../types/companion";

export const runtime = "nodejs";

function buildSessionTitle(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "New thread";
  }

  const firstSentence = normalized.split(/[.!?]/)[0]?.trim() || normalized;
  return firstSentence.length > 56 ? `${firstSentence.slice(0, 56).trimEnd()}…` : firstSentence;
}

function buildSessionPreview(answer: string): string {
  const normalized = answer.replace(/\s+/g, " ").trim();
  return normalized.length > 120 ? `${normalized.slice(0, 120).trimEnd()}…` : normalized;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<RunCompanionRequest>;

    if (!payload.user_message || !payload.mode) {
      return NextResponse.json(
        {
          error: "Missing required fields: mode, user_message."
        },
        { status: 400 }
      );
    }

    const sessionId = payload.session_id?.trim() || crypto.randomUUID();
    const result = await runCompanionPipeline({
      session_id: sessionId,
      mode: payload.mode,
      user_message: payload.user_message,
      attachments: payload.attachments,
      show_process: payload.show_process
    });

    await fileSessionWorkspaceStore.appendExchange({
      session_id: sessionId,
      mode: payload.mode,
      title: buildSessionTitle(payload.user_message),
      preview: buildSessionPreview(result.synthesis.final_answer),
      user_message: payload.user_message,
      attachments: payload.attachments ?? [],
      result
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error"
      },
      { status: 500 }
    );
  }
}
