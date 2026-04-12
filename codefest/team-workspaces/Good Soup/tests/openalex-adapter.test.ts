import { beforeEach, describe, expect, it, vi } from "vitest";

import { retrieveOpenAlexEvidence } from "../src/lib/companion/openalex/adapter";

const createMock = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: JSON.stringify({ topic: "PPO reinforcement learning" })
      }
    }
  ]
});

// Mock OpenAI
vi.mock("openai", () => {
  return {
    default: class {
      chat = {
        completions: {
          create: createMock
        }
      }
    }
  };
});

describe("retrieveOpenAlexEvidence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("extracts topic via LLM and normalizes results", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: "https://openalex.org/W1",
              display_name: "Older paper",
              publication_year: 2012,
              doi: "https://doi.org/10.1000/old",
              primary_location: {
                landing_page_url: "https://publisher.test/old",
                source: { display_name: "Journal A" }
              },
              authorships: [{ author: { display_name: "Ada Lovelace" } }]
            },
            {
              id: "https://openalex.org/W2",
              display_name: "Recent paper",
              publication_year: 2024,
              doi: "https://doi.org/10.1000/new",
              primary_location: {
                landing_page_url: "https://publisher.test/new",
                source: { display_name: "Conference B" }
              },
              authorships: [{ author: { display_name: "Grace Hopper" } }]
            }
          ]
        }),
        { status: 200 }
      )
    );

    const items = await retrieveOpenAlexEvidence("latest PPO papers", 5);

    // Should only have 1 item because of recent-intent filtering (2024 vs 2012)
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Recent paper",
      url: "https://doi.org/10.1000/new",
      canonical_url: "https://doi.org/10.1000/new",
      authors: ["Grace Hopper"],
      published_year: 2024,
      venue: "Conference B"
    });

    // Check that fetch was called with the EXTRACTED topic, not the raw query
    const callUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(callUrl.searchParams.get("search")).toBe("PPO reinforcement learning");
  });
});
