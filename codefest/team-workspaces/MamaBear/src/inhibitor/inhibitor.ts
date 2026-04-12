const INHIBITOR_API_URL = "https://iaas.appliedai.studio/check";

export type InhibitorMode = "insight" | "performance";

export interface ThoughtItem {
  role: "agent" | "human";
  content: string;
}

export interface InhibitorOptions {
  provider?: string;
  model?: string;
}

export interface InhibitorPayload {
  thought_chain: ThoughtItem[];
  mode?: InhibitorMode;
  options?: InhibitorOptions;
}

export interface InhibitorResponse {
  result: Record<string, unknown>;
  version: string;
}

export async function checkWithInhibitor(
  payload: InhibitorPayload,
  retries = 3,
  delayMs = 1000,
): Promise<InhibitorResponse> {
  const { apiKey } = await chrome.storage.local.get("apiKey") as { apiKey?: string };

  if (!apiKey) {
    throw new Error("No API key set. Please add your key in extension settings.");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(INHIBITOR_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return response.json();
    }

    const errorBody = await response.text();

    // Only retry on 502, fail immediately on 400/401
    if (response.status !== 502 || attempt === retries) {
      throw new Error(`Inhibitor API error: ${response.status} ${response.statusText} — ${errorBody}`);
    }

    console.warn(`Attempt ${attempt} failed with 502, retrying in ${delayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs *= 2; // exponential backoff: 1s, 2s, 4s
  }

  throw new Error("Inhibitor API failed after maximum retries.");
}