import { NextResponse } from "next/server";

import { fileSessionWorkspaceStore } from "../../../lib/companion/session-workspace-store";
import type { CompanionMode } from "../../../types/companion";

export const runtime = "nodejs";

function isMode(value: unknown): value is CompanionMode {
  return value === "research" || value === "learning";
}

export async function GET(): Promise<Response> {
  const workspace = await fileSessionWorkspaceStore.listWorkspace({ includeArchived: true });
  return NextResponse.json(workspace);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json() as {
      session_id?: string;
      mode?: CompanionMode;
      title?: string;
      folder?: string | null;
    };

    if (!isMode(payload.mode)) {
      return NextResponse.json({ error: "Missing required field: mode." }, { status: 400 });
    }

    const created = await fileSessionWorkspaceStore.createSession({
      session_id: payload.session_id,
      mode: payload.mode,
      title: payload.title,
      folder: payload.folder
    });

    return NextResponse.json(created);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
