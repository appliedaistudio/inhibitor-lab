import { describe, expect, it } from "vitest";

describe("session response ownership", () => {
  it("only appends a response when the visible thread still owns it", async () => {
    const moduleOrNull = await import("../src/components/chat/session-response-ownership").catch(() => null);

    expect(
      moduleOrNull?.shouldAppendResponseToVisibleThread({
        activeSessionId: "session-1",
        requestSessionId: "session-1"
      })
    ).toBe(true);

    expect(
      moduleOrNull?.shouldAppendResponseToVisibleThread({
        activeSessionId: "session-2",
        requestSessionId: "session-1"
      })
    ).toBe(false);

    expect(
      moduleOrNull?.shouldAppendResponseToVisibleThread({
        activeSessionId: null,
        requestSessionId: "session-1"
      })
    ).toBe(false);
  });
});
