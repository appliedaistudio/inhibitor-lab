import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ChatThread } from "../src/components/chat/chat-thread";
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null, status: "unauthenticated" }) }));
import type { CompanionPipelineResult } from "../src/types/companion";

const activeResult = {
  request_id: "req-1",
  session_id: "session-1",
  mode: "research",
  inhibitor: { blocked: false, reasons: [], raw: {} },
  evidence: [],
  draft: null,
  runtime: { backend: "opencode", agent: "research", session_id: "session-1", degraded: false },
  judgments: [],
  decision: { decision: "allow", blocking_reasons: [], revision_notes: [], verifier_summary: [] },
  synthesis: {
    final_answer: "This is the assistant answer.",
    citations: ["OA-1"],
    uncertainty_notes: []
  },
  audit_trail: [],
  process_events: []
} satisfies CompanionPipelineResult;

describe("ChatThread", () => {
  it("renders user and assistant turns with Veritas chrome and a show-work toggle", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChatThread, {
        messages: [
          {
            id: "u-1",
            role: "user",
            content: "What is the result?",
            attachments: [
              {
                id: "file-1",
                name: "notes.pdf",
                mime_type: "application/pdf",
                size_bytes: 1024
              }
            ],
            timestamp: new Date()
          },
          { id: "a-1", role: "assistant", content: "This is the assistant answer.", result: activeResult, timestamp: new Date() }
        ],
        activeResult,
        showProcess: false,
        onToggleProcess: () => undefined,
        onRegenerate: () => undefined
      })
    );

    expect(html).toContain("What is the result?");
    expect(html).toContain("notes.pdf");
    expect(html).toContain("application/pdf");
    expect(html).toContain("This is the assistant answer.");
    expect(html).toContain("/brand/veritas.png");
    expect(html).toContain("assistant-turn__bubble");
    expect(html).toContain("user-turn__avatar");
    expect(html).toContain("Research");
    expect(html).toContain("1 cited source");
    expect(html).toContain("Show work");
    expect(html).not.toContain("opencode · research");
    expect(html).not.toContain(">allow<");
    expect(html).not.toContain("assistant-turn__name");
  });

  it("shows a work dropdown state when no process data is available", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChatThread, {
        messages: [
          { id: "u-1", role: "user", content: "What is the result?", timestamp: new Date() }
        ],
        activeResult,
        showProcess: true,
        onToggleProcess: () => undefined,
        onRegenerate: () => undefined
      })
    );

    expect(html).toContain("No process data yet");
    expect(html).toContain("Hide work");
  });

  it("renders internal process events from process_events when the process panel is open", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChatThread, {
        messages: [
          { id: "u-1", role: "user", content: "What is the result?", timestamp: new Date() }
        ],
        activeResult: {
          ...activeResult,
          process_events: [
            {
              id: "event-1",
              participant: "action_verifier",
              stage: "verifier_output",
              title: "Action verifier warn",
              body: "The action verifier requested a confirmation step.",
              created_at: "2026-04-11T16:00:00.000Z"
            }
          ]
        },
        showProcess: true,
        onToggleProcess: () => undefined,
        onRegenerate: () => undefined
      })
    );

    expect(html).toContain("Action verifier warn");
    expect(html).toContain("The action verifier requested a confirmation step.");
    expect(html).toContain("action verifier");
  });

  it("renders an assistant turn without result data", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChatThread, {
        messages: [
          { id: "a-1", role: "assistant", content: "Standalone answer.", timestamp: new Date() }
        ],
        activeResult: null,
        showProcess: false,
        onToggleProcess: () => undefined,
        onRegenerate: () => undefined
      })
    );

    expect(html).toContain("Standalone answer.");
    expect(html).not.toContain("Regenerate");
    expect(html).not.toContain("citation-chip");
  });

  it("renders assistant markdown as structured HTML", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChatThread, {
        messages: [
          {
            id: "a-1",
            role: "assistant",
            content: "## Steps\n\n- First point\n- Second point with [source](https://example.com)\n\n`inline code`",
            timestamp: new Date()
          }
        ],
        activeResult: null,
        showProcess: false,
        onToggleProcess: () => undefined,
        onRegenerate: () => undefined
      })
    );

    expect(html).toContain("<h2>Steps</h2>");
    expect(html).toContain("<li>First point</li>");
    expect(html).toContain("href=\"https://example.com\"");
    expect(html).toContain("target=\"_blank\"");
    expect(html).toContain("<code>inline code</code>");
  });

  it("renders Socratic as the visible learning mode label without a generic ready summary", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChatThread, {
        messages: [
          { id: "a-1", role: "assistant", content: "Let’s test the missing step.", timestamp: new Date() }
        ],
        activeResult: {
          ...activeResult,
          mode: "learning",
          synthesis: {
            final_answer: "Let’s test the missing step.",
            citations: [],
            uncertainty_notes: []
          }
        },
        showProcess: false,
        onToggleProcess: () => undefined,
        onRegenerate: () => undefined
      })
    );

    expect(html).toContain("Socratic");
    expect(html).not.toContain("Learning");
    expect(html).not.toContain("Response ready");
  });
});
