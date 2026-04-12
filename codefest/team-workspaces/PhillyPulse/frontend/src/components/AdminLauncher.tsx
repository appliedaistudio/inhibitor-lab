"use client";

import { Map, Settings, ChevronRight } from "lucide-react";

interface Props {
  onChoose: (mode: "dashboard" | "admin") => void;
}

export default function AdminLauncher({ onChoose }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--map-bg, #0a0a14)" }}
    >
      <div className="flex items-center gap-3 mb-2">
        <img src="/logo.png" alt="PHLPulse" className="w-10 h-10" />
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--panel-text, #e5e7eb)" }}
        >
          PHLPulse
        </h1>
      </div>
      <p
        className="text-sm mb-10"
        style={{ color: "var(--panel-text-muted, #6b7280)" }}
      >
        Choose your view
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        <button
          onClick={() => onChoose("dashboard")}
          className="group flex flex-col items-start gap-4 p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "var(--panel-bg, rgba(15,15,25,0.9))",
            border: "1px solid var(--panel-border, rgba(255,255,255,0.08))",
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Map className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-left">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--panel-text, #e5e7eb)" }}
            >
              Dashboard
            </h2>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--panel-text-muted, #6b7280)" }}
            >
              Live safety map, incidents, routing
            </p>
          </div>
          <ChevronRight
            className="w-4 h-4 self-end opacity-30 group-hover:opacity-70 transition-opacity"
            style={{ color: "var(--panel-text-muted)" }}
          />
        </button>

        <button
          onClick={() => onChoose("admin")}
          className="group flex flex-col items-start gap-4 p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "var(--panel-bg, rgba(15,15,25,0.9))",
            border: "1px solid rgba(168,85,247,0.2)",
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Settings className="w-6 h-6 text-purple-400" />
          </div>
          <div className="text-left">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--panel-text, #e5e7eb)" }}
            >
              Admin Panel
            </h2>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--panel-text-muted, #6b7280)" }}
            >
              Live audio, transcripts, LLM pipeline
            </p>
          </div>
          <ChevronRight
            className="w-4 h-4 self-end opacity-30 group-hover:opacity-70 transition-opacity"
            style={{ color: "var(--panel-text-muted)" }}
          />
        </button>
      </div>
    </div>
  );
}
