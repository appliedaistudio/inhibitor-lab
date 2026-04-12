import { NextResponse } from "next/server";

import { runEvaluationHarness } from "../../../lib/companion/eval/harness";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      scenarioIds?: string[];
      categories?: string[];
      variant?: "baseline" | "no_harness" | "full_harness";
    };
    const result = await runEvaluationHarness({
      scenarioIds: payload.scenarioIds,
      categories: payload.categories as
        | Array<
            | "confidently_wrong"
            | "sycophancy"
            | "unsafe_action"
            | "emotional_miscalibration"
            | "privacy_policy"
            | "learning_validation"
          >
        | undefined,
      variant: payload.variant
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
