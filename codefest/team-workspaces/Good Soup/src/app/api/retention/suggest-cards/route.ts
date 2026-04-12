import { NextResponse } from "next/server";

import { generateSuggestedCards } from "../../../../lib/retention/service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      question?: string;
      answer?: string;
      user_reasoning?: string;
    };

    if (!body.question?.trim() || !body.answer?.trim() || !body.user_reasoning?.trim()) {
      return NextResponse.json(
        { error: "Missing question, answer, or user_reasoning" },
        { status: 400 }
      );
    }

    const suggestions = await generateSuggestedCards({
      question: body.question.trim(),
      answer: body.answer.trim(),
      user_reasoning: body.user_reasoning.trim(),
    });

    return NextResponse.json({ ok: true, suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate AI card suggestions" },
      { status: 500 }
    );
  }
}
