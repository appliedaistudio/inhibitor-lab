import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Composer } from "../src/components/chat/composer";
import { ProcessTrace } from "../src/components/chat/process-trace";
import { findRegenerateSourceMessage } from "../src/components/companion-app";
import type { AttachmentReference, ProcessMessage } from "../src/types/companion";

describe("chat process trace", () => {
  it("renders the process trace title and body", () => {
    const messages: ProcessMessage[] = [
      {
        id: "process-1",
        participant: "grounding_verifier",
        title: "Grounding verifier",
        body: "grounding: warn - source coverage is thin",
        created_at: "2026-04-11T16:00:00.000Z"
      }
    ];

    const html = renderToStaticMarkup(React.createElement(ProcessTrace, { messages }));

    expect(html).toContain("Grounding verifier");
    expect(html).toContain("source coverage is thin");
  });

  it("renders pending attachment names in the composer", () => {
    const attachments: AttachmentReference[] = [
      {
        id: "file-1",
        name: "notes.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024
      }
    ];

    const html = renderToStaticMarkup(
      React.createElement(Composer, {
        mode: "research",
        value: "",
        pendingAttachments: attachments,
        onChange: () => undefined,
        onPickFiles: () => undefined,
        onRemoveAttachment: () => undefined,
        onSubmit: () => undefined
      })
    );

    expect(html).toContain("notes.pdf");
    expect(html).toContain("composer-shell__attach-icon");
    expect(html).not.toContain("⌂");
  });

  it("keeps the submit button disabled when the composer only has attachments", () => {
    const html = renderToStaticMarkup(
      React.createElement(Composer, {
        mode: "research",
        value: "",
        pendingAttachments: [
          {
            id: "file-1",
            name: "notes.pdf",
            mime_type: "application/pdf",
            size_bytes: 1024
          }
        ],
        onChange: () => undefined,
        onPickFiles: () => undefined,
        onRemoveAttachment: () => undefined,
        onSubmit: () => undefined
      })
    );

    expect(html).toMatch(/<button[^>]*class="composer-shell__submit"[^>]*disabled[^>]*>Initialize<\/button>/);
  });

  it("finds the user turn immediately before an assistant message", () => {
    const source = findRegenerateSourceMessage(
      [
        {
          id: "u-1",
          role: "user",
          content: "First question",
          attachments: [
            {
              id: "file-1",
              name: "notes.pdf",
              mime_type: "application/pdf",
              size_bytes: 1024
            }
          ],
          timestamp: new Date("2026-04-11T15:00:00.000Z")
        },
        { id: "a-1", role: "assistant", content: "First answer", timestamp: new Date("2026-04-11T15:01:00.000Z") },
        {
          id: "u-2",
          role: "user",
          content: "Second question",
          attachments: [
            {
              id: "file-2",
              name: "diagram.png",
              mime_type: "image/png",
              size_bytes: 2048
            }
          ],
          timestamp: new Date("2026-04-11T15:02:00.000Z")
        },
        { id: "a-2", role: "assistant", content: "Second answer", timestamp: new Date("2026-04-11T15:03:00.000Z") }
      ],
      "a-2"
    );

    expect(source?.content).toBe("Second question");
    expect(source?.attachments).toEqual([
      {
        id: "file-2",
        name: "diagram.png",
        mime_type: "image/png",
        size_bytes: 2048
      }
    ]);
  });
});
