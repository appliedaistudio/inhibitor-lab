const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export type LocationConfidence = "direct" | "context" | "none";

export interface Incident {
  id: string;
  reported_at: string;
  raw_text: string;
  severity_category: string;
  s_base: number;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  confidence: number;
  geocode_status: string;
  location_confidence: LocationConfidence;
  inhibitor_status: string;
  inhibitor_reason: string | null;
  w_eff: number;
  audio_clip: string | null;
  feed_id: string | null;
  description: string | null;
  hidden?: boolean;
}

export interface PreprocessMeta {
  vad_duration_s: number;
  norm_percentile: number | null;
  norm_level: number;
  highpass_hz: number;
  vad_aggressiveness: number | null;
}

export interface WhisperMeta {
  no_speech_prob: number;
  duration_s: number;
}

export interface VariantResult {
  name: string;
  audio_clip: string | null;
  transcript: string;
  preprocess_meta: PreprocessMeta | null;
  whisper_meta: WhisperMeta | null;
}

export interface Extraction {
  id: string;
  feed_id: string;
  raw_text: string;
  reported_at: string;
  audio_clip: string | null;
  raw_audio_clip: string | null;
  preprocess_meta: PreprocessMeta | null;
  variants: VariantResult[];
  llm_relevant: boolean;
  llm_category: string | null;
  llm_confidence: number;
  llm_location_text: string | null;
  inhibitor_status: string | null;
  inhibitor_reason: string | null;
  geocode_status: string | null;
  incident_id: string | null;
}

export interface HealthResponse {
  status: string;
  llm_configured: boolean;
  inhibitor_configured: boolean;
  incident_count: number;
}

export interface StatsResponse {
  total_incidents: number;
  inhibitor_stats: Record<string, number>;
}

export interface SummaryResponse {
  summary: string;
  incident_count: number;
}

export async function fetchIncidents(
  since?: string,
  category?: string
): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (since) params.set("since", since);
  if (category) params.set("category", category);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/api/incidents${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to fetch incidents: ${res.status}`);
  const data = await res.json();
  return data.incidents;
}

export async function fetchSummary(): Promise<SummaryResponse> {
  const res = await fetch(`${API_BASE}/api/summary`);
  if (!res.ok) throw new Error(`Failed to fetch summary: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`Failed to fetch health: ${res.status}`);
  return res.json();
}

export async function simulateIncident(): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/simulate`, { method: "POST" });
  if (!res.ok) throw new Error(`Simulate failed: ${res.status}`);
  return res.json();
}

export async function seedDemoData(): Promise<{ status: string; count: number }> {
  const res = await fetch(`${API_BASE}/api/seed`, { method: "POST" });
  if (!res.ok) throw new Error(`Seed failed: ${res.status}`);
  return res.json();
}
