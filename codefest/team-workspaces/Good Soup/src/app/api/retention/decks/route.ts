import { NextResponse } from "next/server";

import { createDeck, deleteDeck, listDecks } from "../../../../lib/retention/service";

function parseRequiredInt(value: string | null, name: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const userId = parseRequiredInt(params.get("userId"), "userId");
    if (userId === null) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const data = await listDecks({
      userId,
      endOfDay: params.get("endOfDay") ?? undefined,
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { user_id?: number; name?: string };
    if (!body.user_id || !body.name?.trim()) {
      return NextResponse.json({ error: "Missing user_id or deck name" }, { status: 400 });
    }

    const data = await createDeck({ user_id: body.user_id, name: body.name.trim() });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const deckId = parseRequiredInt(new URL(request.url).searchParams.get("id"), "id");
    if (deckId === null) {
      return NextResponse.json({ error: "Missing deck id" }, { status: 400 });
    }

    const result = await deleteDeck(deckId);
    if (!result.deleted) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
