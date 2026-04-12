import { NextResponse } from "next/server";

import { getRetentionPool } from "../../../lib/retention/db";

function parseUserId(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  try {
    const userId = parseUserId(new URL(request.url).searchParams.get("userId"));
    if (userId === null) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const result = await getRetentionPool().query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    return NextResponse.json({
      ok: true,
      data: result.rows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}
