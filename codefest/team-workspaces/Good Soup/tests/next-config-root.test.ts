import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import nextConfig, { resolveTurbopackRoot } from "../next.config.mjs";

describe("next config turbopack root", () => {
  it("resolves next from the chosen turbopack root in a nested worktree", () => {
    const turbopackRoot = resolveTurbopackRoot();

    expect(typeof turbopackRoot).toBe("string");
    expect(existsSync(join(turbopackRoot as string, "node_modules/next/package.json"))).toBe(true);
    expect(nextConfig.turbopack?.root).toBe(turbopackRoot);
  });
});
