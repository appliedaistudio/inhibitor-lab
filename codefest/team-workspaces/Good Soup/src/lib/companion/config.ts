import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface RuntimeConfig {
  openai_api_key?: string;
  inhibitor_api_key?: string;
  inhibitor_url: string;
  primary_model: string;
  verifier_model: string;
  llm_base_url?: string;
  opencode_server_url?: string;
  opencode_model?: string;
  opencode_agent?: string;
  opencode_username?: string;
  opencode_password?: string;
}

function parseDotEnv(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [rawKey, ...rawValueParts] = trimmed.split("=");
    const key = rawKey.trim();
    const rawValue = rawValueParts.join("=").trim();
    const value =
      (rawValue.startsWith("\"") && rawValue.endsWith("\"")) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    parsed[key] = value;
  }

  return parsed;
}

function loadAncestorEnv(): Record<string, string> {
  let currentDir = process.cwd();

  while (true) {
    const candidate = path.join(currentDir, ".env");
    if (existsSync(candidate)) {
      try {
        return parseDotEnv(readFileSync(candidate, "utf8"));
      } catch {
        return {};
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return {};
}

export function firstEnv(keys: string[]): string | undefined {
  const fileEnv = loadAncestorEnv();

  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  for (const key of keys) {
    const fileValue = fileEnv[key];
    if (fileValue && fileValue.trim()) {
      return fileValue.trim();
    }
  }
  return undefined;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    openai_api_key: firstEnv(["OPENAI_API_KEY", "OPENAI_KEY"]),
    inhibitor_api_key: firstEnv(["INHIB_KEY", "INHIBITOR_API_KEY"]),
    inhibitor_url: firstEnv(["INHIBITOR_URL"]) ?? "https://iaas.appliedai.studio/check",
    primary_model: firstEnv(["PRIMARY_MODEL", "OPENCODE_MODEL", "OPENAI_MODEL"]) ?? "gpt-4.1-mini",
    verifier_model: firstEnv(["VERIFIER_MODEL", "OPENCODE_MODEL"]) ?? "gpt-4.1-nano",
    llm_base_url: firstEnv(["LLM_BASE_URL", "OPENCODE_BASE_URL"]),
    opencode_server_url: firstEnv(["OPENCODE_SERVER_URL", "OPENCODE_BASE_URL"]),
    opencode_model: firstEnv(["OPENCODE_MODEL"]),
    opencode_agent: firstEnv(["OPENCODE_AGENT"]),
    opencode_username: firstEnv(["OPENCODE_SERVER_USERNAME"]),
    opencode_password: firstEnv(["OPENCODE_SERVER_PASSWORD"])
  };
}
