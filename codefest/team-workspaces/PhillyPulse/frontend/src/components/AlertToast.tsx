"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Radio } from "lucide-react";
import type { Incident } from "@/lib/api";
import { getSeverity } from "@/lib/severity";

interface Props {
  incidents: Incident[];
}

export default function AlertToast({ incidents }: Props) {
  const [prevIds, setPrevIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Incident | null>(null);

  useEffect(() => {
    if (incidents.length === 0) {
      setPrevIds(new Set());
      return;
    }

    const currentIds = new Set(incidents.map((i) => i.id));

    if (prevIds.size > 0) {
      const newInc = incidents.find((i) => !prevIds.has(i.id));
      if (newInc) {
        setToast(newInc);
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          osc.type = "sine";
          gain.gain.value = 0.08;
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch {
          // Audio not available
        }
        setTimeout(() => setToast(null), 4000);
      }
    }

    setPrevIds(currentIds);
  }, [incidents]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000]"
        >
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)] min-w-[280px] backdrop-blur-xl"
            style={{ background: "var(--panel-bg)" }}
          >
            <div className="relative">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Radio className="w-3 h-3 text-red-400/60" />
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">
                  New Incident
                </span>
              </div>
              <p className="text-xs text-foreground/80 truncate">
                <span style={{ color: getSeverity(toast.severity_category).markerColor }} className="font-medium">
                  {getSeverity(toast.severity_category).label}
                </span>
                {" — "}
                {toast.location_text?.split(",")[0] || "Unknown location"}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
