import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { AuditEvent, AuditWriter } from "./contracts";

function getAuditPath(): string {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(process.cwd(), "data", "audit", `${day}.jsonl`);
}

export const defaultAuditWriter: AuditWriter = async (event: AuditEvent) => {
  const outputPath = getAuditPath();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await appendFile(outputPath, `${JSON.stringify(event)}\n`, "utf8");
};
