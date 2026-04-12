import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: sessionId } = await params;
  const benchmarkPath = path.join(
    process.cwd(),
    "data",
    "sessions",
    sessionId,
    "benchmark.jsonl"
  );

  let contents: string;
  try {
    contents = await readFile(benchmarkPath, "utf8");
  } catch {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lines = contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastLine = lines[lines.length - 1];
  const parsed: unknown = JSON.parse(lastLine);

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
