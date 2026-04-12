import { NextResponse } from "next/server";

import { createCard, deleteCard, listCards, updateCard } from "../../../../lib/retention/service";

function parseIntParam(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const cardId = parseIntParam(params.get("id"));
    const deckId = parseIntParam(params.get("deckId"));
    const endOfDay = params.get("endOfDay") ?? undefined;

    if (cardId === null && deckId === null) {
      return NextResponse.json({ error: "Missing card id or deck id" }, { status: 400 });
    }

    const data = await listCards({
      cardId: cardId ?? undefined,
      deckId: deckId ?? undefined,
      endOfDay,
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
    const body = (await request.json()) as {
      deck_id?: number;
      question?: string;
      answer?: string;
    };

    if (!body.deck_id || !body.question?.trim() || !body.answer?.trim()) {
      return NextResponse.json(
        { error: "Missing deck_id, question, or answer" },
        { status: 400 }
      );
    }

    const data = await createCard({
      deck_id: body.deck_id,
      question: body.question.trim(),
      answer: body.answer.trim(),
    });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: number;
      question?: string;
      answer?: string;
      streak?: number;
      times_seen?: number;
      next_review?: string;
    };

    if (!body.id) {
      return NextResponse.json({ error: "Missing card id" }, { status: 400 });
    }

    const data = await updateCard(
      body as {
        id: number;
        question?: string;
        answer?: string;
        streak?: number;
        times_seen?: number;
        next_review?: string;
      }
    );
    if (!data) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const cardId = parseIntParam(new URL(request.url).searchParams.get("id"));
    if (cardId === null) {
      return NextResponse.json({ error: "Missing card id" }, { status: 400 });
    }

    const result = await deleteCard(cardId);
    if (!result.deleted) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
