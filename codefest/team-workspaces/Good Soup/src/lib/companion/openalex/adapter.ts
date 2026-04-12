import type { EvidenceRecord } from "../contracts";
import OpenAI from "openai";
import { getRuntimeConfig } from "../config";

interface OpenAlexWork {
  id?: string;
  display_name?: string;
  publication_year?: number;
  cited_by_count?: number;
  doi?: string;
  primary_location?: {
    landing_page_url?: string;
    source?: {
      display_name?: string;
    };
  };
  authorships?: Array<{
    author?: {
      display_name?: string;
    };
  }>;
}

function wantsRecentWork(query: string): boolean {
  return /\b(latest|recent|new|current|state of the art)\b/i.test(query);
}

function filterResultsForIntent(query: string, results: OpenAlexWork[]): OpenAlexWork[] {
  if (!wantsRecentWork(query)) {
    return results;
  }

  const cutoffYear = new Date().getUTCFullYear() - 7;
  const filtered = results.filter((item) => (item.publication_year ?? 0) >= cutoffYear);
  return filtered.length > 0 ? filtered : results;
}

function canonicalWorkUrl(item: OpenAlexWork): string {
  return item.doi ?? item.primary_location?.landing_page_url ?? item.id ?? "https://api.openalex.org/";
}

async function extractSearchTopic(query: string): Promise<string> {
  const config = getRuntimeConfig();
  if (!config.openai_api_key) {
    return query;
  }

  try {
    const client = new OpenAI({
      apiKey: config.openai_api_key,
      ...(config.llm_base_url ? { baseURL: config.llm_base_url } : {}),
      timeout: 5000,
      maxRetries: 1
    });

    const completion = await client.chat.completions.create({
      model: config.primary_model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You extract the core search subject (1-4 words) from the user's message to query an academic database. Return strict JSON ONLY in this format: { \"topic\": \"the concise topic\" }"
        },
        {
          role: "user",
          content: query
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as { topic?: string };
      if (parsed.topic && typeof parsed.topic === "string" && parsed.topic.trim().length > 0) {
        return parsed.topic.trim();
      }
    }
  } catch (err) {
    console.warn("[OpenAlexAdapter] Failed to extract topic via LLM, falling back to raw query:", err instanceof Error ? err.message : String(err));
  }
  
  return query;
}

export async function retrieveOpenAlexEvidence(query: string, limit = 3): Promise<EvidenceRecord[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const extractedTopic = await extractSearchTopic(query);

    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", extractedTopic);
    url.searchParams.set("per-page", String(limit));
    const apiKey = process.env.OPENALEX_API_KEY?.trim();
    if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    }

    const response = await fetch(
      url,
      {
        headers: {
          "User-Agent": "VerifiedStudentResearchCompanion/0.1"
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { results?: OpenAlexWork[] };
    const results = Array.isArray(payload.results) ? payload.results : [];

    const evidence: EvidenceRecord[] = filterResultsForIntent(query, results).map((item, index) => {
      const authors = (item.authorships ?? [])
        .map((entry) => entry.author?.display_name)
        .filter((value): value is string => Boolean(value))
        .slice(0, 4);
      const canonicalUrl = canonicalWorkUrl(item);
      const venue = item.primary_location?.source?.display_name;

      return {
        id: `OA-${index + 1}`,
        title: item.display_name ?? "OpenAlex result",
        source_type: "openalex",
        snippet:
          `${venue ?? "OpenAlex"}${item.publication_year ? ` · ${item.publication_year}` : ""}`.trim(),
        url: canonicalUrl,
        canonical_url: canonicalUrl,
        score: 0.5,
        authors,
        published_year: item.publication_year,
        venue
      };
    });

    return evidence;
  } catch {
    return [];
  }
}
