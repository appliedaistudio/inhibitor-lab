import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const companionApp = readFileSync(new URL("../src/components/companion-app.tsx", import.meta.url), "utf8");

describe("editorial chat shell styling", () => {
  it("defines the editorial surface tokens and shell wrapper hooks", () => {
    expect(css).toContain("--surface-base: #f8f9fa;");
    expect(css).toContain("--surface-sidebar: #e3e8ec;");
    expect(css).toContain("--surface-float: rgba(255, 255, 255, 0.82);");
    expect(css).toContain("--reading-column-width: 46rem;");
    expect(css).toContain(".app-shell--editorial");
    expect(css).toContain(".chat-main--editorial");
    expect(css).toContain(".chat-thread-frame--process-open");
    expect(css).toContain(".chat-input-area--editorial");
    expect(companionApp).toContain("app-shell--editorial");
    expect(companionApp).toContain("sidebar--editorial");
    expect(companionApp).toContain("chat-main--editorial");
    expect(companionApp).toContain("chat-thread-frame--process-open");
    expect(companionApp).toContain("chat-input-area--editorial");
  });

  it("defines a docked resources rail with a right-edge collapsed toggle treatment", () => {
    expect(css).toContain(".chat-layout");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) auto;");
    expect(css).toContain("--resources-rail-width:");
    expect(css).toContain("--chat-column-width: clamp(52rem, calc(100vw - var(--sidebar-width) - var(--resources-rail-width) - (var(--shell-pad) * 4)), 72rem);");
    expect(css).toContain(".resources-rail-shell");
    expect(css).toContain(".resources-rail-shell--collapsed");
    expect(css).toContain("margin-left: auto;");
    expect(css).toContain("width: 2rem;");
    expect(css).toContain(".resources-rail__toggle--collapsed");
    expect(css).toContain("justify-content: flex-end;");
    expect(css).toContain(".resources-rail__toggle-icon--active");
    expect(companionApp).toContain("resources-rail-shell");
    expect(companionApp).toContain("resources-rail-shell--collapsed");
  });

  it("uses the same centered chat column for the thread and composer", () => {
    expect(css).toContain(".chat-thread-frame");
    expect(css).toContain("width: 100%;");
    expect(css).toContain(".chat-input-area--editorial");
    expect(css).toContain("position: sticky;");
    expect(css).toContain("background: transparent;");
    expect(css).toContain(".chat-input-area--editorial .composer-wrap,");
    expect(css).toContain(".chat-input-area--editorial .preset-chips,");
    expect(css).toContain("scrollbar-width: none;");
  });

  it("uses oversized corner avatars with bubble styling", () => {
    expect(css).toContain(".assistant-turn__avatar");
    expect(css).toContain("width: 48px;");
    expect(css).toContain("height: 48px;");
    expect(css).toContain("object-fit: contain;");
    expect(css).toContain("background: transparent;");
    expect(css).toContain("image-rendering: pixelated;");
    expect(css).toContain(".assistant-turn__bubble");
    expect(css).toContain(".user-turn__avatar");
    expect(css).toContain(".user-turn__bubble");
    expect(css).toContain("align-items: flex-start;");
  });

  it("keeps the mode tabs vertically centered so Socratic does not clip", () => {
    expect(css).toContain(".mode-tab");
    expect(css).toContain("display: inline-flex;");
    expect(css).toContain("align-items: center;");
    expect(css).toContain("line-height: 1.1;");
  });
});
