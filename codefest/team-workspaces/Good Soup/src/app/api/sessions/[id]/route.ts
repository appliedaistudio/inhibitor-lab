import { NextResponse } from "next/server";

import { fileSessionWorkspaceStore } from "../../../../lib/companion/session-workspace-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const detail = await fileSessionWorkspaceStore.getSessionDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const payload = await request.json() as {
      title?: string;
      folder?: string | null;
      archived?: boolean;
    };

    const updated = await fileSessionWorkspaceStore.updateSession(id, {
      title: payload.title,
      folder: payload.folder,
      archived: payload.archived
    });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const shouldArchive = new URL(request.url).searchParams.get("archive") === "1";

  if (shouldArchive) {
    const archived = await fileSessionWorkspaceStore.archiveSession(id);
    if (!archived) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(archived);
  }

  const deleted = await fileSessionWorkspaceStore.deleteSession(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
