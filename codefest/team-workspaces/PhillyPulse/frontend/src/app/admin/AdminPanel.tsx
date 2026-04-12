"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Shield,
  Brain,
  Radio,
  Layers,
  Eye,
  EyeOff,
  Trash2,
  Map,
} from "lucide-react";
import {
  useAdminStream,
  type FeedInfo,
} from "@/hooks/useAdminStream";
import { subscribeExtractions, subscribeAllExtractions } from "@/lib/firestore";
import type { Extraction, VariantResult } from "@/lib/api";
import AuthBar from "@/components/AuthBar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Props {
  onBack: () => void;
}

const TIME_FILTERS = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
  { label: "90d", hours: 24 * 90 },
  { label: "6mo", hours: 24 * 180 },
  { label: "All", hours: 0 },
] as const;

function confidenceColor(c: number): string {
  if (c >= 0.7) return "#22c55e";
  if (c >= 0.4) return "#eab308";
  return "#ef4444";
}

// ── Live Audio Header ────────────────────────────────────────────────

function LiveAudioHeader({ feed }: { feed: FeedInfo }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      const a = new Audio(`${API_BASE}/api/admin/stream/${feed.feed_id}`);
      a.addEventListener("ended", () => setPlaying(false));
      a.addEventListener("error", () => setPlaying(false));
      audioRef.current = a;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) audioRef.current.muted = !muted;
    setMuted(!muted);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 shrink-0"
      style={{
        background: playing
          ? "rgba(59,130,246,0.08)"
          : "var(--panel-input-bg, rgba(255,255,255,0.04))",
        borderBottom: "1px solid var(--panel-border, rgba(255,255,255,0.08))",
      }}
    >
      <Radio className="w-4 h-4 text-blue-400" />
      <span className="text-sm font-medium" style={{ color: "var(--panel-text)" }}>
        Live: {feed.label}
      </span>
      <span className="text-xs" style={{ color: "var(--panel-text-muted)" }}>
        Feed {feed.feed_id}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="p-1.5 rounded opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--panel-text-muted)" }}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button
          onClick={toggle}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
            playing
              ? "bg-blue-500 text-white"
              : "bg-white/5 hover:bg-white/10"
          }`}
          style={!playing ? { color: "var(--panel-text-secondary)" } : {}}
        >
          {playing ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Play Live
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Audio Player (with seek bar, restart, time display) ──────────────

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const WAVEFORM_BARS = 80;

function computeWaveform(audioBuffer: AudioBuffer, bars: number): number[] {
  const raw = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(raw.length / bars);
  const peaks = new Array(bars);
  for (let i = 0; i < bars; i++) {
    let sum = 0;
    const start = i * blockSize;
    for (let j = start; j < start + blockSize; j++) {
      sum += Math.abs(raw[j]);
    }
    peaks[i] = sum / blockSize;
  }
  const max = Math.max(...peaks, 0.001);
  for (let i = 0; i < bars; i++) peaks[i] = peaks[i] / max;
  return peaks;
}

let _audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}

function AudioPlayer({
  clipId,
  endpoint,
  label,
  accentColor,
}: {
  clipId: string | null;
  endpoint: string;
  label: string;
  accentColor?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const ref = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);
  const waveformFetched = useRef(false);
  const accent = accentColor || "#3b82f6";
  const audioUrl = clipId ? `${API_BASE}/api/${endpoint}/${clipId}` : null;

  const fetchWaveform = useCallback(() => {
    if (!audioUrl || waveformFetched.current) return;
    waveformFetched.current = true;
    fetch(audioUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => getAudioContext().decodeAudioData(buf))
      .then((decoded) => {
        setWaveform(computeWaveform(decoded, WAVEFORM_BARS));
        setDuration(decoded.duration);
        setLoaded(true);
      })
      .catch(() => { setLoadError(true); });
  }, [audioUrl]);

  const ensureAudio = useCallback(() => {
    if (ref.current) return ref.current;
    if (!audioUrl) return null;
    const a = new Audio(audioUrl);
    a.addEventListener("loadedmetadata", () => {
      setDuration(a.duration);
      setLoaded(true);
    });
    a.addEventListener("ended", () => {
      setPlaying(false);
      cancelAnimationFrame(animRef.current);
    });
    a.addEventListener("error", () => {
      setPlaying(false);
      setLoadError(true);
      cancelAnimationFrame(animRef.current);
    });
    ref.current = a;
    return a;
  }, [audioUrl]);

  const tick = useCallback(() => {
    if (ref.current) setCurrentTime(ref.current.currentTime);
    animRef.current = requestAnimationFrame(tick);
  }, []);

  const togglePlay = () => {
    const a = ensureAudio();
    if (!a) return;
    fetchWaveform();
    if (playing) {
      a.pause();
      cancelAnimationFrame(animRef.current);
      setPlaying(false);
    } else {
      a.play().catch(() => { setPlaying(false); setLoadError(true); });
      animRef.current = requestAnimationFrame(tick);
      setPlaying(true);
    }
  };

  const restart = () => {
    const a = ensureAudio();
    if (!a) return;
    fetchWaveform();
    a.currentTime = 0;
    setCurrentTime(0);
    if (!playing) {
      a.play().catch(() => { setPlaying(false); setLoadError(true); });
      animRef.current = requestAnimationFrame(tick);
      setPlaying(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = ensureAudio();
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrentTime(a.currentTime);
  };

  useEffect(() => () => {
    ref.current?.pause();
    cancelAnimationFrame(animRef.current);
  }, []);

  if (!clipId) return null;
  if (loadError) return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px]" style={{ color: "var(--panel-text-muted, #6b7280)" }}>
      <XCircle className="w-3 h-3" /> Audio unavailable
    </div>
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex items-center gap-1.5 w-full min-w-0">
      {/* Restart */}
      <button
        onClick={restart}
        className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
        style={{ color: "var(--panel-text-muted)" }}
        title="Restart"
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2v12l-2-2v-8l2-2zm2 1v10l8-5-8-5z" />
        </svg>
      </button>

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className="shrink-0 p-1 rounded transition-all"
        style={{
          background: playing ? accent : "rgba(255,255,255,0.05)",
          color: playing ? "#fff" : "var(--panel-text-secondary)",
        }}
        title={playing ? "Pause" : `Play ${label}`}
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>

      {/* Waveform + seek */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div
          className="h-6 cursor-pointer relative group flex items-end gap-px rounded"
          style={{ background: "rgba(255,255,255,0.03)" }}
          onClick={seek}
        >
          {waveform ? (
            waveform.map((amp, i) => {
              const barProgress = i / waveform.length;
              const isPlayed = barProgress < progress;
              const minH = 2;
              const maxH = 22;
              const h = minH + amp * (maxH - minH);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-colors duration-75"
                  style={{
                    height: `${h}px`,
                    background: isPlayed ? accent : "rgba(255,255,255,0.12)",
                    opacity: isPlayed ? 1 : 0.6,
                  }}
                />
              );
            })
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[8px]" style={{ color: "var(--panel-text-muted)" }}>
                Loading...
              </span>
            </div>
          )}
          {/* Playhead line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
            style={{
              left: `${progress * 100}%`,
              background: "#fff",
              boxShadow: `0 0 4px ${accent}`,
              opacity: loaded ? 0.9 : 0,
            }}
          />
          {/* Hover scrub handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{
              left: `calc(${progress * 100}% - 6px)`,
              background: accent,
              boxShadow: `0 0 6px ${accent}aa`,
              border: "2px solid #fff",
            }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[8px] tabular-nums" style={{ color: "var(--panel-text-muted)" }}>
            {formatTime(currentTime)}
          </span>
          <span className="text-[8px] tabular-nums" style={{ color: "var(--panel-text-muted)" }}>
            {loaded ? formatTime(duration) : label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Variant Column ──────────────────────────────────────────────────

function VariantColumn({ v }: { v: VariantResult }) {
  const meta = v.preprocess_meta;
  const wm = v.whisper_meta;
  const nameColors: Record<string, string> = {
    aggressive: "#3b82f6",
  };
  const color = nameColors[v.name] ?? "#6b7280";

  return (
    <div
      className="flex-1 min-w-[180px] rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${color}33`,
        background: `${color}08`,
      }}
    >
      {/* Variant header */}
      <div
        className="px-2.5 py-1.5 space-y-1"
        style={{ borderBottom: `1px solid ${color}22` }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ color }}
        >
          {v.name}
        </span>
        <AudioPlayer clipId={v.audio_clip} endpoint="audio" label={v.name} accentColor={color} />
      </div>

      {/* Transcript */}
      <div className="px-2.5 py-2">
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--panel-text, #e5e7eb)" }}>
          {v.transcript || <span className="italic text-gray-500">No transcript</span>}
        </p>
      </div>

      {/* Metadata */}
      <div
        className="px-2.5 py-1.5 text-[9px] flex flex-wrap gap-x-3 gap-y-0.5"
        style={{ borderTop: `1px solid ${color}15`, color: "var(--panel-text-muted)" }}
      >
        {meta && (
          <>
            <span>HPF: {meta.highpass_hz}Hz</span>
            <span>VAD: {meta.vad_aggressiveness ?? "off"}</span>
            <span>Norm: {meta.norm_percentile != null ? `p${meta.norm_percentile}` : "off"}</span>
            <span>Dur: {meta.vad_duration_s}s</span>
          </>
        )}
        {wm && (
          <>
            <span>NSP: {(wm.no_speech_prob * 100).toFixed(1)}%</span>
            <span>Wh.Dur: {wm.duration_s}s</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Re-transcribe Form ──────────────────────────────────────────────

function RetranscribeForm({
  extractionId,
  onDone,
}: {
  extractionId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hpf, setHpf] = useState("100");
  const [vad, setVad] = useState("1");
  const [norm, setNorm] = useState("95");
  const [beam, setBeam] = useState("5");
  const [running, setRunning] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] font-medium px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
      >
        Re-transcribe
      </button>
    );
  }

  const submit = async () => {
    setRunning(true);
    try {
      const body = {
        extraction_id: extractionId,
        highpass_hz: parseInt(hpf) || 0,
        vad_aggressiveness: vad === "off" ? null : parseInt(vad),
        norm_percentile: norm === "off" ? null : parseInt(norm),
        beam_size: parseInt(beam) || 5,
      };
      const res = await fetch(`${API_BASE}/api/admin/retranscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        alert(`Re-transcribe failed: ${err.detail || res.status}`);
      } else {
        onDone();
      }
    } catch (err) {
      alert(`Re-transcribe error: ${err}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="rounded-lg p-2.5 space-y-2"
      style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--panel-border)" }}
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase" style={{ color: "var(--panel-text-muted)" }}>
        Custom Re-transcription
        <button onClick={() => setOpen(false)} className="ml-auto text-gray-500 hover:text-gray-300">
          <XCircle className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 text-[10px]">
        <label className="space-y-0.5">
          <span style={{ color: "var(--panel-text-muted)" }}>HPF (Hz)</span>
          <input
            value={hpf}
            onChange={(e) => setHpf(e.target.value)}
            className="w-full px-1.5 py-1 rounded text-[10px] bg-white/5 border border-white/10 outline-none focus:border-cyan-500/50"
            style={{ color: "var(--panel-text)" }}
          />
        </label>
        <label className="space-y-0.5">
          <span style={{ color: "var(--panel-text-muted)" }}>VAD Aggr.</span>
          <select
            value={vad}
            onChange={(e) => setVad(e.target.value)}
            className="w-full px-1.5 py-1 rounded text-[10px] bg-white/5 border border-white/10 outline-none focus:border-cyan-500/50"
            style={{ color: "var(--panel-text)" }}
          >
            <option value="off">Off</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <label className="space-y-0.5">
          <span style={{ color: "var(--panel-text-muted)" }}>Norm %ile</span>
          <input
            value={norm}
            onChange={(e) => setNorm(e.target.value)}
            className="w-full px-1.5 py-1 rounded text-[10px] bg-white/5 border border-white/10 outline-none focus:border-cyan-500/50"
            style={{ color: "var(--panel-text)" }}
            placeholder="off"
          />
        </label>
        <label className="space-y-0.5">
          <span style={{ color: "var(--panel-text-muted)" }}>Beam</span>
          <input
            value={beam}
            onChange={(e) => setBeam(e.target.value)}
            className="w-full px-1.5 py-1 rounded text-[10px] bg-white/5 border border-white/10 outline-none focus:border-cyan-500/50"
            style={{ color: "var(--panel-text)" }}
          />
        </label>
      </div>
      <button
        onClick={submit}
        disabled={running}
        className="w-full py-1.5 rounded-lg text-[11px] font-medium bg-cyan-500 text-white hover:bg-cyan-600 transition-colors disabled:opacity-50"
      >
        {running ? "Processing..." : "Run Custom Variant"}
      </button>
    </div>
  );
}

// ── Inline Verify Play Button (for LLM prediction row) ──────────────

function VerifyPlayButton({ extraction }: { extraction: Extraction }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clipId = extraction.variants?.[0]?.audio_clip ?? extraction.raw_audio_clip;
  const endpoint = extraction.variants?.[0]?.audio_clip ? "audio" : "audio-raw";
  const audioUrl = clipId ? `${API_BASE}/api/${endpoint}/${clipId}` : null;

  const toggle = () => {
    if (!audioUrl) { setError(true); return; }
    if (!audioRef.current) {
      const a = new Audio(audioUrl);
      a.addEventListener("ended", () => setPlaying(false));
      a.addEventListener("error", () => { setPlaying(false); setError(true); });
      audioRef.current = a;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      setError(false);
      audioRef.current.play().catch(() => { setPlaying(false); setError(true); });
      setPlaying(true);
    }
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  if (!clipId) return null;

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
        error
          ? "bg-red-500/15 text-red-400"
          : playing
            ? "bg-blue-500/20 text-blue-400"
            : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-300"
      }`}
      title={error ? "Audio unavailable" : playing ? "Pause verification audio" : "Play audio to verify prediction"}
    >
      {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      <span>{error ? "Unavailable" : playing ? "Playing" : "Verify"}</span>
    </button>
  );
}

// ── Extraction Card ──────────────────────────────────────────────────

function ExtractionCard({
  extraction,
  onPredict,
}: {
  extraction: Extraction;
  onPredict: (id: string) => Promise<void> | void;
}) {
  const [predicting, setPredicting] = useState(false);
  const [hiddenOnMap, setHiddenOnMap] = useState(false);
  const [togglingVis, setTogglingVis] = useState(false);
  const [incidentDeleted, setIncidentDeleted] = useState(false);

  const hasLlmResult =
    extraction.llm_relevant || extraction.llm_confidence > 0 || extraction.llm_category !== null;

  const time = (() => {
    try {
      const d = new Date(extraction.reported_at);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  })();

  const date = (() => {
    try {
      const d = new Date(extraction.reported_at);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  })();

  const runPredict = async () => {
    setPredicting(true);
    try {
      await onPredict(extraction.id);
    } finally {
      setPredicting(false);
    }
  };

  const dimmed = hasLlmResult && !extraction.llm_relevant;
  const hasRaw = !!extraction.raw_audio_clip;
  const variants = extraction.variants ?? [];

  return (
    <div
      className={`rounded-lg overflow-hidden transition-all ${dimmed ? "opacity-60" : ""}`}
      style={{
        background: "var(--panel-input-bg, rgba(255,255,255,0.04))",
        border: `1px solid ${
          dimmed
            ? "var(--panel-border, rgba(255,255,255,0.04))"
            : "var(--panel-border, rgba(255,255,255,0.08))"
        }`,
      }}
    >
      {/* Header: timestamp + status + raw audio */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--panel-border)" }}>
        <span className="text-xs font-medium" style={{ color: "var(--panel-text)" }}>
          {time}
        </span>
        <span className="text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
          {date}
        </span>

        {hasLlmResult && !extraction.llm_relevant && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 font-medium">
            Not Relevant
          </span>
        )}
        {!hasLlmResult && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">
            Pending
          </span>
        )}

        {variants.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
            {variants.length} variant{variants.length !== 1 ? "s" : ""}
          </span>
        )}

        {hasRaw && (
          <div className="ml-auto w-48">
            <AudioPlayer clipId={extraction.raw_audio_clip} endpoint="audio-raw" label="Raw Audio" accentColor="#10b981" />
          </div>
        )}
      </div>

      {/* Transcript + processed audio */}
      {variants.length > 0 ? (
        <div className="px-3 py-2.5 space-y-2">
          {variants[0].audio_clip && (
            <div className="w-full">
              <AudioPlayer clipId={variants[0].audio_clip} endpoint="audio" label="Processed" accentColor="#3b82f6" />
            </div>
          )}
          <p className="text-xs leading-relaxed" style={{ color: "var(--panel-text, #e5e7eb)" }}>
            {variants[0].transcript || <span className="italic text-gray-500">No transcript</span>}
          </p>
          {variants[0].whisper_meta && (
            <div className="flex gap-3 text-[9px]" style={{ color: "var(--panel-text-muted)" }}>
              <span>NSP: {(variants[0].whisper_meta.no_speech_prob * 100).toFixed(1)}%</span>
              <span>Duration: {variants[0].whisper_meta.duration_s}s</span>
              {variants[0].preprocess_meta && (
                <span>VAD kept: {variants[0].preprocess_meta.vad_duration_s}s</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 py-2.5">
          <p className="text-xs leading-relaxed" style={{ color: "var(--panel-text, #e5e7eb)" }}>
            {extraction.raw_text}
          </p>
        </div>
      )}

      {/* Re-transcribe form */}
      {hasRaw && (
        <div className="px-3 py-2" style={{ borderTop: "1px solid var(--panel-border)" }}>
          <RetranscribeForm extractionId={extraction.id} onDone={() => {}} />
        </div>
      )}

      {/* LLM Decision + Pipeline Row */}
      <div
        className="px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]"
        style={{
          borderTop: "1px solid var(--panel-border)",
          background: "rgba(0,0,0,0.15)",
        }}
      >
        {hasLlmResult ? (
          <>
            <div className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-purple-400" />
              <span style={{ color: "var(--panel-text-muted)" }}>LLM:</span>
              <span style={{ color: extraction.llm_relevant ? "#22c55e" : "#6b7280" }}>
                {extraction.llm_relevant ? "Relevant" : "Rejected"}
                {extraction.llm_relevant ? " \u2713" : " \u2717"}
              </span>
            </div>

            {extraction.llm_category && (
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--panel-text-muted)" }}>Category:</span>
                <span style={{ color: "var(--panel-text)" }}>
                  {extraction.llm_category.replace(/_/g, " ")}
                </span>
              </div>
            )}

            {extraction.llm_confidence > 0 && (
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--panel-text-muted)" }}>Conf:</span>
                <span style={{ color: confidenceColor(extraction.llm_confidence) }}>
                  {(extraction.llm_confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {extraction.inhibitor_status && (
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3" style={{ color: "var(--panel-text-muted)" }} />
                <span style={{ color: "var(--panel-text-muted)" }}>Inhibitor:</span>
                <span
                  style={{
                    color:
                      extraction.inhibitor_status === "passed"
                        ? "#22c55e"
                        : extraction.inhibitor_status === "blocked"
                          ? "#ef4444"
                          : "#eab308",
                  }}
                >
                  {extraction.inhibitor_status}
                </span>
              </div>
            )}

            {extraction.geocode_status && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" style={{ color: "var(--panel-text-muted)" }} />
                <span style={{ color: "var(--panel-text-muted)" }}>Geocode:</span>
                <span
                  style={{
                    color:
                      extraction.geocode_status === "success"
                        ? "#22c55e"
                        : extraction.geocode_status === "llm_fallback"
                          ? "#eab308"
                          : "#6b7280",
                  }}
                >
                  {extraction.geocode_status}
                </span>
              </div>
            )}

            {extraction.incident_id && !incidentDeleted ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span style={{ color: "#22c55e" }}>Stored</span>
                {hiddenOnMap && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Hidden</span>
                )}
              </div>
            ) : incidentDeleted ? (
              <div className="flex items-center gap-1.5">
                <Trash2 className="w-3 h-3 text-gray-500" />
                <span style={{ color: "#6b7280" }}>Deleted</span>
              </div>
            ) : extraction.llm_relevant && extraction.inhibitor_status === "blocked" ? (
              <div className="flex items-center gap-1.5">
                <XCircle className="w-3 h-3 text-red-500" />
                <span style={{ color: "#ef4444" }}>Blocked</span>
              </div>
            ) : null}

            <div className="ml-auto flex items-center gap-2">
              <VerifyPlayButton extraction={extraction} />
              <button
                onClick={runPredict}
                disabled={predicting}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 transition-colors disabled:opacity-50"
              >
                {predicting ? "Running..." : "Re-run"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-gray-500" />
              <span style={{ color: "var(--panel-text-muted)" }}>No LLM prediction yet</span>
            </div>
            <button
              onClick={runPredict}
              disabled={predicting}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              <Brain className="w-3.5 h-3.5" />
              {predicting ? "Running..." : "Run Prediction"}
            </button>
          </>
        )}
      </div>

      {/* Map Control Row */}
      {extraction.incident_id && !incidentDeleted && (
        <div
          className="px-3 py-1.5 flex items-center gap-2 text-[11px]"
          style={{
            borderTop: "1px solid var(--panel-border)",
            background: "rgba(0,0,0,0.1)",
          }}
        >
          <Map className="w-3 h-3" style={{ color: "var(--panel-text-muted)" }} />
          <span style={{ color: "var(--panel-text-muted)" }}>Map:</span>

          <button
            onClick={async () => {
              setTogglingVis(true);
              try {
                const res = await fetch(`${API_BASE}/api/admin/incident/${extraction.incident_id}/visibility`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ hidden: !hiddenOnMap }),
                });
                if (res.ok) setHiddenOnMap(!hiddenOnMap);
              } finally {
                setTogglingVis(false);
              }
            }}
            disabled={togglingVis}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all disabled:opacity-50 ${
              hiddenOnMap
                ? "bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25"
                : "bg-green-500/15 text-green-400 hover:bg-green-500/25"
            }`}
          >
            {hiddenOnMap ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {togglingVis ? "..." : hiddenOnMap ? "Hidden — Show on Map" : "Visible on Map"}
          </button>

          <button
            onClick={async () => {
              if (!confirm("Permanently delete this incident from the map?")) return;
              try {
                const res = await fetch(`${API_BASE}/api/admin/incident/${extraction.incident_id}`, {
                  method: "DELETE",
                });
                if (res.ok) setIncidentDeleted(true);
              } catch { /* ignore */ }
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Feed Tab Content ─────────────────────────────────────────────────

function FeedTabContent({ feed }: { feed: FeedInfo }) {
  const [timeFilter, setTimeFilter] = useState(24 * 30);
  const [onMapOnly, setOnMapOnly] = useState(false);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    const since =
      timeFilter === 0
        ? new Date(0)
        : new Date(now.getTime() - timeFilter * 60 * 60 * 1000);

    const unsub = subscribeExtractions(
      feed.feed_id,
      since,
      now,
      (data) => {
        setExtractions(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [feed.feed_id, timeFilter]);

  const visibleExtractions = onMapOnly
    ? extractions.filter((e) => e.incident_id != null)
    : extractions;

  const handlePredict = async (extractionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction_id: extractionId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        alert(`Prediction failed: ${err.detail || res.status}`);
      }
    } catch (err) {
      alert(`Prediction error: ${err}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Feed title */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 shrink-0"
        style={{
          background: "var(--panel-input-bg, rgba(255,255,255,0.04))",
          borderBottom: "1px solid var(--panel-border, rgba(255,255,255,0.08))",
        }}
      >
        <Radio className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium" style={{ color: "var(--panel-text)" }}>
          {feed.label}
        </span>
        <span className="text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
          Feed {feed.feed_id}
        </span>
      </div>

      {/* Date range filter */}
      <div
        className="flex items-center gap-1.5 px-4 py-2.5 shrink-0 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--panel-border, rgba(255,255,255,0.08))" }}
      >
        <span className="text-[10px] font-semibold uppercase mr-2" style={{ color: "var(--panel-text-muted)" }}>
          Range:
        </span>
        {TIME_FILTERS.map((tf) => (
          <button
            key={tf.label}
            onClick={() => setTimeFilter(tf.hours)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
              timeFilter === tf.hours
                ? "bg-blue-500 text-white"
                : "bg-white/5 hover:bg-white/10"
            }`}
            style={
              timeFilter !== tf.hours
                ? { color: "var(--panel-text-secondary)" }
                : {}
            }
          >
            {tf.label}
          </button>
        ))}

        <div className="w-px h-4 mx-1 bg-white/10" />

        <button
          onClick={() => setOnMapOnly((v) => !v)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
            onMapOnly
              ? "bg-green-500 text-white"
              : "bg-white/5 hover:bg-white/10"
          }`}
          style={!onMapOnly ? { color: "var(--panel-text-secondary)" } : {}}
          title="Show only extractions promoted to the map"
        >
          <Map className="w-3 h-3" />
          On Map
        </button>

        <span className="ml-auto text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
          {visibleExtractions.length}
          {onMapOnly ? "" : ""} extraction{visibleExtractions.length !== 1 ? "s" : ""}
          {onMapOnly && extractions.length !== visibleExtractions.length
            ? ` of ${extractions.length}`
            : ""}
        </span>
      </div>

      {/* Extraction list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="text-center py-12 text-xs" style={{ color: "var(--panel-text-muted)" }}>
            Loading extractions...
          </div>
        )}
        {!loading && visibleExtractions.length === 0 && (
          <div className="text-center py-12 text-xs" style={{ color: "var(--panel-text-muted)" }}>
            {onMapOnly
              ? "No map-published extractions in this time range."
              : "No extractions found for this feed in the selected time range."}
          </div>
        )}
        {visibleExtractions.map((e) => (
          <ExtractionCard key={e.id} extraction={e} onPredict={handlePredict} />
        ))}
      </div>
    </div>
  );
}

// ── All Feeds Content ────────────────────────────────────────────────

function AllFeedsContent({ feeds }: { feeds: FeedInfo[] }) {
  const [timeFilter, setTimeFilter] = useState(24 * 30);
  const [onMapOnly, setOnMapOnly] = useState(false);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);

  const feedLabelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of feeds) m[f.feed_id] = f.label;
    return m;
  }, [feeds]);

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    const since =
      timeFilter === 0
        ? new Date(0)
        : new Date(now.getTime() - timeFilter * 60 * 60 * 1000);

    const unsub = subscribeAllExtractions(
      since,
      now,
      (data) => {
        setExtractions(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [timeFilter]);

  const visibleExtractions = onMapOnly
    ? extractions.filter((e) => e.incident_id != null)
    : extractions;

  const handlePredict = async (extractionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction_id: extractionId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        alert(`Prediction failed: ${err.detail || res.status}`);
      }
    } catch (err) {
      alert(`Prediction error: ${err}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Title */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 shrink-0"
        style={{
          background: "var(--panel-input-bg, rgba(255,255,255,0.04))",
          borderBottom: "1px solid var(--panel-border, rgba(255,255,255,0.08))",
        }}
      >
        <Layers className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium" style={{ color: "var(--panel-text)" }}>
          All Feeds
        </span>
        <span className="text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
          Combined view
        </span>
      </div>

      {/* Time range filter */}
      <div
        className="flex items-center gap-1.5 px-4 py-2.5 shrink-0 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--panel-border, rgba(255,255,255,0.08))" }}
      >
        <span className="text-[10px] font-semibold uppercase mr-2" style={{ color: "var(--panel-text-muted)" }}>
          Range:
        </span>
        {TIME_FILTERS.map((tf) => (
          <button
            key={tf.label}
            onClick={() => setTimeFilter(tf.hours)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
              timeFilter === tf.hours
                ? "bg-blue-500 text-white"
                : "bg-white/5 hover:bg-white/10"
            }`}
            style={
              timeFilter !== tf.hours
                ? { color: "var(--panel-text-secondary)" }
                : {}
            }
          >
            {tf.label}
          </button>
        ))}

        <div className="w-px h-4 mx-1 bg-white/10" />

        <button
          onClick={() => setOnMapOnly((v) => !v)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
            onMapOnly
              ? "bg-green-500 text-white"
              : "bg-white/5 hover:bg-white/10"
          }`}
          style={!onMapOnly ? { color: "var(--panel-text-secondary)" } : {}}
          title="Show only extractions promoted to the map"
        >
          <Map className="w-3 h-3" />
          On Map
        </button>

        <span className="ml-auto text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
          {visibleExtractions.length} extraction{visibleExtractions.length !== 1 ? "s" : ""}
          {onMapOnly && extractions.length !== visibleExtractions.length
            ? ` of ${extractions.length}`
            : ""}
        </span>
      </div>

      {/* Extraction list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="text-center py-12 text-xs" style={{ color: "var(--panel-text-muted)" }}>
            Loading extractions...
          </div>
        )}
        {!loading && visibleExtractions.length === 0 && (
          <div className="text-center py-12 text-xs" style={{ color: "var(--panel-text-muted)" }}>
            {onMapOnly
              ? "No map-published extractions in this time range."
              : "No extractions found in the selected time range."}
          </div>
        )}
        {visibleExtractions.map((e) => (
          <div key={e.id}>
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span
                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
              >
                {feedLabelMap[e.feed_id] || e.feed_id}
              </span>
            </div>
            <ExtractionCard extraction={e} onPredict={handlePredict} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── All Feeds Sidebar Item (plays every stream at once) ─────────────

function AllFeedsSidebarItem({
  feeds,
  isActive,
  onClick,
}: {
  feeds: FeedInfo[];
  isActive: boolean;
  onClick: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const audiosRef = useRef<HTMLAudioElement[]>([]);

  const togglePlayAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playing) {
      audiosRef.current.forEach((a) => a.pause());
      audiosRef.current = [];
      setPlaying(false);
    } else {
      audiosRef.current.forEach((a) => a.pause());
      const elements = feeds.map((f) => {
        const a = new Audio(`${API_BASE}/api/admin/stream/${f.feed_id}`);
        a.addEventListener("error", () => {});
        a.play().catch(() => {});
        return a;
      });
      audiosRef.current = elements;
      setPlaying(true);
    }
  };

  useEffect(() => () => {
    audiosRef.current.forEach((a) => a.pause());
  }, []);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all cursor-pointer ${
        isActive ? "bg-blue-500/10" : "hover:bg-white/5"
      }`}
      style={{
        borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
        borderBottom: "1px solid var(--panel-border, rgba(255,255,255,0.06))",
      }}
    >
      <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? "#3b82f6" : "var(--panel-text-muted)" }} />
      <span
        className="text-[11px] font-semibold flex-1"
        style={{
          color: isActive
            ? "var(--panel-text, #e5e7eb)"
            : "var(--panel-text-muted, #6b7280)",
        }}
      >
        All Feeds
      </span>
      <button
        onClick={togglePlayAll}
        className={`shrink-0 p-1 rounded transition-all ${
          playing
            ? "bg-red-500 text-white"
            : "bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300"
        }`}
        title={playing ? "Stop all streams" : "Play ALL streams simultaneously"}
      >
        {playing ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ── Sidebar Feed Item (with inline live play button) ────────────────

function SidebarFeedItem({
  feed,
  isActive,
  hasActivity,
  onClick,
}: {
  feed: FeedInfo;
  isActive: boolean;
  hasActivity: boolean;
  onClick: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!API_BASE) { setStreamError(true); return; }
    if (!audioRef.current) {
      const a = new Audio(`${API_BASE}/api/admin/stream/${feed.feed_id}`);
      a.addEventListener("ended", () => setPlaying(false));
      a.addEventListener("error", () => { setPlaying(false); setStreamError(true); });
      audioRef.current = a;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      setStreamError(false);
      audioRef.current.play().catch(() => { setPlaying(false); setStreamError(true); });
      setPlaying(true);
    }
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all cursor-pointer ${
        isActive ? "bg-blue-500/10" : "hover:bg-white/5"
      }`}
      style={{
        borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
      }}
    >
      {hasActivity && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
      )}
      <span
        className="text-[11px] font-medium truncate flex-1"
        style={{
          color: isActive
            ? "var(--panel-text, #e5e7eb)"
            : "var(--panel-text-muted, #6b7280)",
        }}
      >
        {feed.label}
      </span>
      <button
        onClick={togglePlay}
        className={`shrink-0 p-1 rounded transition-all ${
          streamError
            ? "bg-red-500/20 text-red-400"
            : playing
              ? "bg-blue-500 text-white"
              : "bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300"
        }`}
        title={streamError ? "Stream unavailable" : playing ? "Pause live stream" : "Play live stream"}
      >
        {streamError ? <WifiOff className="w-3 h-3" /> : playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ── Main Admin Panel ────────────────────────────────────────────────

const ALL_TAB = "__all__";

export default function AdminPanel({ onBack }: Props) {
  const { connected, feeds, events } = useAdminStream();
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);

  const activeFeedIds = new Set(
    events
      .filter((e) => e.type === "transcript_received")
      .slice(-50)
      .map((e) => e.feed_id)
  );

  const activeFeed = activeTab !== ALL_TAB ? feeds.find((f) => f.feed_id === activeTab) : null;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--map-bg, #0a0a14)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{
          background: "var(--panel-bg, rgba(15,15,25,0.95))",
          borderBottom: "1px solid var(--panel-border, rgba(255,255,255,0.08))",
        }}
      >
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--panel-text-secondary)" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <img src="/logo.png" alt="PHLPulse" className="w-5 h-5" />
        <span className="text-sm font-semibold" style={{ color: "var(--panel-text)" }}>
          Admin Panel
        </span>

        <div className="flex items-center gap-1.5 ml-3">
          {connected ? (
            <Wifi className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-500" />
          )}
          <span
            className={`text-[10px] font-medium ${
              connected ? "text-green-500" : "text-red-500"
            }`}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="ml-auto">
          <AuthBar />
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: feed list */}
        <div
          className="w-56 shrink-0 flex flex-col overflow-y-auto"
          style={{
            background: "var(--panel-bg, rgba(15,15,25,0.95))",
            borderRight: "1px solid var(--panel-border, rgba(255,255,255,0.08))",
          }}
        >
          {/* All Feeds tab */}
          <AllFeedsSidebarItem
            feeds={feeds}
            isActive={activeTab === ALL_TAB}
            onClick={() => setActiveTab(ALL_TAB)}
          />

          {/* Per-feed items */}
          <div
            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
            style={{ color: "var(--panel-text-muted)" }}
          >
            Channels
          </div>
          {feeds.map((feed) => (
            <SidebarFeedItem
              key={feed.feed_id}
              feed={feed}
              isActive={feed.feed_id === activeTab}
              hasActivity={activeFeedIds.has(feed.feed_id)}
              onClick={() => setActiveTab(feed.feed_id)}
            />
          ))}
          {feeds.length === 0 && (
            <div className="px-3 py-4 text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
              No feeds available. Check API connection.
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "rgba(15,15,25,0.6)" }}>
          {activeTab === ALL_TAB ? (
            <AllFeedsContent feeds={feeds} />
          ) : activeFeed ? (
            <FeedTabContent key={activeFeed.feed_id} feed={activeFeed} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-yellow-500/50" />
                <p className="text-sm" style={{ color: "var(--panel-text-muted)" }}>
                  Select a feed to view extractions
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
