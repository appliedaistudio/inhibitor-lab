"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { Incident } from "@/lib/api";
import { getSeverity } from "@/lib/severity";
import {
  AlertTriangle,
  MapPin,
  Clock,
  Brain,
  Shield,
  X,
  Radio,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date}, ${time}`;
}

function WaveformPlayer({
  src,
  transcript,
}: {
  src: string;
  transcript: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  const words = transcript.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("error", () => setPlaying(false));

    fetch(src)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const ctx = new AudioContext();
        return ctx.decodeAudioData(buf);
      })
      .then((decoded) => {
        const raw = decoded.getChannelData(0);
        const bars = 60;
        const blockSize = Math.floor(raw.length / bars);
        const samples: number[] = [];
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(raw[i * blockSize + j]);
          }
          samples.push(sum / blockSize);
        }
        const max = Math.max(...samples, 0.01);
        setWaveformData(samples.map((s) => s / max));
      })
      .catch(() => {});

    return () => {
      audio.pause();
      audio.src = "";
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [src]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const barW = w / waveformData.length;
    const progress = audio.duration > 0 ? audio.currentTime / audio.duration : 0;

    for (let i = 0; i < waveformData.length; i++) {
      const barH = Math.max(2, waveformData[i] * (h - 4));
      const x = i * barW;
      const y = (h - barH) / 2;
      const isPast = i / waveformData.length <= progress;

      ctx.fillStyle = isPast ? "#3b82f6" : "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y, barW - 1, barH, 1);
      ctx.fill();
    }

    setCurrentTime(audio.currentTime);
  }, [waveformData]);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      drawWaveform();
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playing, drawWaveform]);

  useEffect(() => {
    drawWaveform();
  }, [waveformData, drawWaveform]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    drawWaveform();
  };

  const seek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
    drawWaveform();
  };

  const currentWordIdx =
    duration > 0 && words.length > 0
      ? Math.min(Math.floor((currentTime / duration) * words.length), words.length - 1)
      : -1;

  useEffect(() => {
    if (currentWordIdx < 0 || !transcriptContainerRef.current) return;
    const el = transcriptContainerRef.current.children[currentWordIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentWordIdx]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={restart}
          className="p-1.5 rounded-full transition-colors"
          style={{ color: "var(--panel-text-muted)" }}
          title="Restart"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={togglePlay}
          className={`p-2 rounded-full transition-all ${
            playing ? "bg-blue-500 text-white" : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
          }`}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <canvas
          ref={canvasRef}
          onClick={seek}
          className="flex-1 h-10 cursor-pointer rounded"
        />
        <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--panel-text-muted)" }}>
          {fmtTime(currentTime)} / {fmtTime(duration)}
        </span>
      </div>

      {words.length > 0 && (
        <div
          ref={transcriptContainerRef}
          className="max-h-20 overflow-y-auto text-xs leading-relaxed flex flex-wrap gap-x-1"
          style={{ color: "var(--panel-text-secondary)" }}
        >
          {words.map((word, idx) => (
            <span
              key={idx}
              className="transition-colors duration-150"
              style={{
                backgroundColor:
                  idx === currentWordIdx && playing ? "rgba(59,130,246,0.3)" : "transparent",
                borderRadius: idx === currentWordIdx && playing ? "2px" : "0",
                padding: idx === currentWordIdx && playing ? "0 2px" : "0",
              }}
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  incident: Incident;
  onClose: () => void;
}

export default function IncidentDetail({ incident, onClose }: Props) {
  const sev = getSeverity(incident.severity_category);
  const confidencePct = Math.round(incident.confidence * 100);
  const hasAudio = !!incident.audio_clip && !!API_BASE;

  return (
    <div
      className="rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl"
      style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)" }}
    >
      <div
        className="h-1"
        style={{ background: `linear-gradient(90deg, ${sev.markerColor}, transparent)` }}
      />

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ backgroundColor: sev.markerColor + "20", color: sev.markerColor }}
              >
                {sev.label}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                UNVERIFIED
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h3
                className="font-semibold text-sm"
                style={{ color: "var(--panel-text)" }}
              >
                {incident.location_text || "Unknown Location"}
              </h3>
              {incident.location_confidence === "context" && (
                <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                  Nearby Context
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="transition-colors p-1 -m-1"
            style={{ color: "var(--panel-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="flex items-center gap-3 text-[11px] font-mono"
          style={{ color: "var(--panel-text-secondary)" }}
        >
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(incident.reported_at)}
          </span>
          <span style={{ color: "var(--panel-border)" }}>|</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {incident.lat?.toFixed(4)}, {incident.lng?.toFixed(4)}
          </span>
        </div>

        <div className="h-px" style={{ background: "var(--panel-border)" }} />

        {incident.description && (
          <div className="rounded-lg p-3" style={{ background: "var(--panel-input-bg)" }}>
            <p className="text-[10px] text-blue-500 font-mono font-medium flex items-center gap-1 mb-2">
              SUMMARY
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--panel-text)" }}>
              {incident.description}
            </p>
          </div>
        )}

        <div className="rounded-lg p-3" style={{ background: "var(--panel-input-bg)" }}>
          <p className="text-[10px] text-blue-500 font-mono font-medium flex items-center gap-1 mb-2">
            <Radio className="w-3 h-3" /> SCANNER TRANSCRIPT
          </p>

          {hasAudio ? (
            <WaveformPlayer
              src={`${API_BASE}/api/audio/${incident.audio_clip}`}
              transcript={incident.raw_text}
            />
          ) : (
            <p
              className="text-xs leading-relaxed italic"
              style={{ color: "var(--panel-text-secondary)" }}
            >
              &ldquo;{incident.raw_text}&rdquo;
            </p>
          )}

          {!hasAudio && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px]" style={{ color: "var(--panel-text-muted)" }}>
              <Volume2 className="w-3 h-3" />
              Audio not available
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {[
            {
              label: "CONFIDENCE",
              value: `${confidencePct}%`,
              color:
                confidencePct >= 80
                  ? "#22c55e"
                  : confidencePct >= 50
                    ? "#f59e0b"
                    : "#ef4444",
            },
            { label: "SEVERITY", value: incident.s_base.toFixed(1), color: sev.markerColor },
            {
              label: "WEIGHT",
              value: incident.w_eff.toFixed(2),
              color: "var(--panel-text-secondary)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 rounded-lg p-2.5 text-center"
              style={{ background: "var(--panel-input-bg)" }}
            >
              <p
                className="text-[9px] font-mono mb-0.5"
                style={{ color: "var(--panel-text-muted)" }}
              >
                {stat.label}
              </p>
              <p className="text-sm font-bold font-mono" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {incident.inhibitor_status !== "passed" && (
          <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px]">
              INHIBITOR: {incident.inhibitor_status.toUpperCase()}
              {incident.inhibitor_reason && ` -- ${incident.inhibitor_reason}`}
            </span>
          </div>
        )}

        <div
          className="flex items-center gap-2 text-[10px] pt-1"
          style={{ color: "var(--panel-text-muted)" }}
        >
          <Brain className="w-3 h-3" />
          <span>Processed by AI pipeline with ethical guardrails</span>
          {incident.inhibitor_status === "passed" && (
            <Shield className="w-3 h-3 text-green-500/50" />
          )}
        </div>
      </div>
    </div>
  );
}
