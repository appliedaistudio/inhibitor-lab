import { NextResponse } from "next/server";

import { getRuntimeConfig } from "../../../lib/companion/config";

export const runtime = "nodejs";

export async function GET() {
  const config = getRuntimeConfig();

  return NextResponse.json({
    ok: true,
    has_openai_key: Boolean(config.openai_api_key),
    has_inhibitor_key: Boolean(config.inhibitor_api_key),
    has_opencode_server: Boolean(config.opencode_server_url),
    primary_model: config.primary_model,
    verifier_model: config.verifier_model,
    opencode_server_url: config.opencode_server_url ?? null
  });
}
