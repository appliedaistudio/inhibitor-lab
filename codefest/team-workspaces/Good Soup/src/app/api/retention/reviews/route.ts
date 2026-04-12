import { NextResponse } from "next/server";

import { createReview, listReviews, updateReview } from "../../../../lib/retention/service";

function parseIntParam(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  try {
    const cardId = parseIntParam(new URL(request.url).searchParams.get("cardId"));
    if (cardId === null) {
      return NextResponse.json({ error: "Missing card id" }, { status: 400 });
    }

    const data = await listReviews(cardId);
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
    const body = (await request.json()) as { card_id?: number };
    if (!body.card_id) {
      return NextResponse.json({ error: "Missing card id" }, { status: 400 });
    }

    const data = await createReview({ card_id: body.card_id });
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
      user_reasoning?: string;
      ai_feedback?: string;
    };
    if (!body.id) {
      return NextResponse.json({ error: "Missing review id" }, { status: 400 });
    }

    const data = await updateReview(body as { id: number; user_reasoning?: string; ai_feedback?: string });
    if (!data) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
