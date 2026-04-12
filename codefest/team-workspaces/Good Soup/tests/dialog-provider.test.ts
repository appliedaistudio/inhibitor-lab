import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dialogSource = readFileSync(new URL("../src/components/ui/dialog.tsx", import.meta.url), "utf8");

describe("DialogProvider sequencing", () => {
  it("clears the current dialog before invoking callbacks so nested dialogs can open", () => {
    expect(dialogSource).toContain("const nextConfig = config;");
    expect(dialogSource).toContain("setConfig(null);");
    expect(dialogSource).toContain('nextConfig?.onConfirm(nextConfig.variant === "prompt" ? inputValue : undefined);');
    expect(dialogSource).toContain("nextConfig?.onCancel?.();");
  });
});
