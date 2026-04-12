import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const companionApp = readFileSync(new URL("../src/components/companion-app.tsx", import.meta.url), "utf8");
const authProvider = readFileSync(new URL("../src/components/auth-provider.tsx", import.meta.url), "utf8");
const brandMark = readFileSync(new URL("../src/components/chat/brand-mark.tsx", import.meta.url), "utf8");
const sessionSidebar = readFileSync(new URL("../src/components/chat/session-sidebar.tsx", import.meta.url), "utf8");
const settingsButton = readFileSync(new URL("../src/components/settings-button.tsx", import.meta.url), "utf8");
const userProfile = readFileSync(new URL("../src/components/user-profile.tsx", import.meta.url), "utf8");
const globalsCss = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

describe("chat shell layout", () => {
  it("loads editorial fonts, wraps the app with auth, and keeps the sidebar lockup as plain VERITAS text", () => {
    expect(layout).toContain("next/font/google");
    expect(layout).toContain("Manrope");
    expect(layout).toContain("Inter");
    expect(layout).toContain('import "./custom-layout.css"');
    expect(layout).toContain("AuthProvider");
    expect(brandMark).toContain("/brand/good-soup-mark.svg");
    expect(brandMark).toContain("/brand/good-soup-avatar.svg");
    expect(companionApp).toContain("VERITAS");
    expect(companionApp).not.toContain("sidebar-logo-mark");
  });

  it("threads the retention frontend into the main shell without exposing internal agent traffic inline", () => {
    expect(companionApp).toContain("DecksView");
    expect(companionApp).toContain("UserProfile");
    expect(companionApp).toContain("SettingsButton");
    expect(companionApp).toContain("workspace-nav");
    expect(companionApp).toContain("sidebar-bottom");
    expect(companionApp).toContain("showProcess");
    expect(companionApp).not.toContain("process-lane");
  });

  it("uses the server-backed session workspace instead of only local browser cache", () => {
    expect(companionApp).toContain('fetch("/api/sessions"');
    expect(companionApp).toContain('fetch(`/api/sessions/${nextSessionId}`');
    expect(companionApp).not.toContain("loadSessionSummariesSafely");
    expect(companionApp).not.toContain("saveSessionSummaries");
  });

  it("gives the session sidebar rename, archive, delete, and folder controls", () => {
    expect(sessionSidebar).toContain("Rename");
    expect(sessionSidebar).toContain("Archive");
    expect(sessionSidebar).toContain("Delete");
    expect(sessionSidebar).toContain("Move");
    expect(sessionSidebar).toContain("toVisibleModeLabel(session.mode)");
    expect(sessionSidebar).toContain("folder-header-row__actions");
    expect(sessionSidebar).toContain("folder-chevron-btn");
    expect(sessionSidebar).toContain("session-sidebar__icon-btn");
    expect(sessionSidebar).toContain("session-group__add-btn");
    expect(sessionSidebar).not.toContain("+ New thread");
  });

  it("keeps local auth dormant until Google credentials are configured", () => {
    expect(authProvider).toContain("enabled");
    expect(authProvider).toContain("SessionProvider");
    expect(userProfile).toContain("user-profile-bubble");
    expect(userProfile).not.toContain("btn-logout");
    expect(settingsButton).toContain("signOut");
    expect(settingsButton).toContain("signIn");
  });

  it("keeps the polish-v2 user bubble and full-width composer treatment", () => {
    expect(globalsCss).toContain("background: rgba(81, 95, 116, 0.1);");
    expect(globalsCss).toContain("border-radius: 18px 18px 4px 18px;");
    expect(globalsCss).toContain(".composer-wrap {");
    expect(globalsCss).toContain("width: 100%;");
    expect(globalsCss).toContain(".preset-chips {");
    expect(globalsCss).toContain("--chat-center-gutter:");
    expect(globalsCss).toContain("padding-left: calc(50% + (var(--chat-center-gutter) / 2));");
    expect(globalsCss).toContain("padding-right: calc(50% + (var(--chat-center-gutter) / 2));");
  });
});
