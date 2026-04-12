import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getRuntimeConfig } from "../src/lib/companion/config";

const scratchDirs: string[] = [];
const originalCwd = process.cwd();
const originalEnv = { ...process.env };

afterEach(async () => {
  process.chdir(originalCwd);

  for (const key of ["OPENAI_API_KEY", "OPENAI_KEY", "INHIB_KEY", "PRIMARY_MODEL"]) {
    if (key in originalEnv) {
      process.env[key] = originalEnv[key];
    } else {
      delete process.env[key];
    }
  }

  await Promise.all(
    scratchDirs.splice(0).map((target) => rm(target, { recursive: true, force: true }))
  );
});

describe("getRuntimeConfig", () => {
  it("loads runtime keys from an ancestor .env when running inside a worktree", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-runtime-config-"));
    scratchDirs.push(rootDir);

    const worktreeDir = path.join(rootDir, ".worktrees", "branch-a");
    await mkdir(worktreeDir, { recursive: true });
    await writeFile(
      path.join(rootDir, ".env"),
      [
        "OPENAI_API_KEY=sk-test-from-root",
        "INHIB_KEY=inhib-test-from-root",
        "PRIMARY_MODEL=gpt-test-model",
      ].join("\n") + "\n",
      "utf8"
    );

    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_KEY;
    delete process.env.INHIB_KEY;
    delete process.env.PRIMARY_MODEL;

    process.chdir(worktreeDir);

    const config = getRuntimeConfig();

    expect(config.openai_api_key).toBe("sk-test-from-root");
    expect(config.inhibitor_api_key).toBe("inhib-test-from-root");
    expect(config.primary_model).toBe("gpt-test-model");
  });
});
