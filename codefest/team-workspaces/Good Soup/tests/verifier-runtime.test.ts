import { describe, expect, it, vi } from "vitest";

const { openAIConstructor } = vi.hoisted(() => {
  const openAIConstructor = vi.fn(function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };
  });

  return {
    openAIConstructor
  };
});

vi.mock("openai", () => ({
  default: openAIConstructor
}));

import { createVerifierClient } from "../src/lib/companion/verifiers/shared";

describe("createVerifierClient", () => {
  it("uses a bounded local-model configuration for verifier calls", () => {
    createVerifierClient({
      openai_api_key: "test-key",
      llm_base_url: "http://localhost:8000/v1"
    });

    expect(openAIConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-key",
        baseURL: "http://localhost:8000/v1",
        timeout: 4000,
        maxRetries: 0
      })
    );
  });
});
