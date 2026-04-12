import { Hexagon, ShieldCheck, Eye, FileText, ArrowRight, Loader2, Sun, Moon, Zap, Database, Activity, Scale, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { validateCsvHeaders } from '@/lib/parseCsv';
import { validateJsonlFile } from '@/lib/parseJsonl';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  onLaunchWithFiles: (name: string, csvFile: File, jsonlFile: File) => Promise<void>;
  onLaunchSample: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function LandingPage({ onLaunchWithFiles, onLaunchSample, loading, error }: Props) {
  const { isDark, toggleTheme } = useTheme();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonlFile, setJsonlFile] = useState<File | null>(null);
  const [csvVal, setCsvVal] = useState<{ valid: boolean; error?: string } | null>(null);
  const [jsonlVal, setJsonlVal] = useState<{ valid: boolean; error?: string } | null>(null);
  const [name, setName] = useState('');

  const handleCsv = useCallback(async (f: File | null) => {
    setCsvFile(f);
    setCsvVal(f ? await validateCsvHeaders(f) : null);
  }, []);
  const handleJsonl = useCallback(async (f: File | null) => {
    setJsonlFile(f);
    setJsonlVal(f ? await validateJsonlFile(f) : null);
  }, []);

  const canLaunch = csvFile && jsonlFile && csvVal?.valid && jsonlVal?.valid && !loading;
  const resolvedName = name.trim() || csvFile?.name.replace(/\.[^.]+$/, '') || 'Dataset';

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Backgrounds */}
      <div className="fixed inset-0 cyber-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: isDark
          ? 'radial-gradient(ellipse 90% 70% at 50% 45%, rgba(0,212,255,0.06) 0%, transparent 100%)'
          : 'radial-gradient(ellipse 90% 70% at 50% 45%, rgba(2,132,199,0.04) 0%, transparent 100%)',
      }} />

      {/* ═══ Top: Logo centered + theme toggle right ═══ */}
      <div className="relative z-20 flex-shrink-0 pt-6 pb-4">
        {/* Theme toggle — absolute right */}
        <button
          onClick={toggleTheme}
          className="absolute top-5 right-8 p-2.5 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-accent/30 text-muted-foreground hover:text-accent transition-all"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Logo — centered */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: 'spring' }}
          className="flex flex-col items-center"
        >
          <div className="relative mb-3">
            <Hexagon size={64} className="text-accent" strokeWidth={1} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-accent" style={{ boxShadow: '0 0 20px var(--color-accent), 0 0 50px rgba(0,0,0,0.15)' }} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight neon-text">GlassBox Explained</h1>
          <p className="text-[10px] text-accent uppercase tracking-[0.35em] opacity-60 mt-1">AI Safety Audit Dashboard</p>
        </motion.div>
      </div>

      {/* ═══ Main: two-column, vertically centered in remaining space ═══ */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-10">
        <div className="w-full max-w-6xl grid grid-cols-2 gap-14 items-center">

        {/* LEFT — Description */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-semibold text-foreground leading-snug mb-4">
            Every AI agent action,<br />
            <span className="text-accent">made fully auditable.</span>
          </h2>

          <p className="text-base text-muted-foreground leading-relaxed mb-6 max-w-lg">
            The <span className="text-foreground font-medium">Inhibitor</span> is an AI safety layer that monitors agent behaviour in real time — catching unsafe actions before they cause harm. Glass Box surfaces every intervention, risk signal, and compliance check in one clear audit trail.
          </p>

          {/* Capability badges */}
          <div className="flex flex-wrap gap-2.5">
            {[
              { icon: ShieldCheck, color: 'var(--color-success)', label: 'Intervention Replay' },
              { icon: Eye, color: 'var(--color-warning)', label: 'Risk Signal Analysis' },
              { icon: Scale, color: 'var(--color-stage-llm)', label: 'Compliance Checks' },
              { icon: Lock, color: 'var(--color-danger)', label: 'Security Monitoring' },
              { icon: FileText, color: 'var(--color-accent)', label: 'PDF Audit Reports' },
              { icon: Activity, color: 'var(--color-info)', label: 'Performance Metrics' },
            ].map(f => {
              const Icon = f.icon;
              return (
                <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors cursor-default">
                  <Icon size={13} style={{ color: f.color }} />{f.label}
                </span>
              );
            })}
          </div>

        </motion.div>

        {/* RIGHT — Upload card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12, duration: 0.5 }}
        >
          <div
            className="glass-card rounded-2xl overflow-hidden"
            style={{
              boxShadow: isDark
                ? '0 0 80px rgba(0,212,255,0.05), 0 24px 64px rgba(0,0,0,0.35)'
                : '0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            {/* Top accent line */}
            <div className="h-[2px]" style={{
              background: 'linear-gradient(90deg, transparent 5%, var(--color-accent) 30%, var(--color-stage-llm) 70%, transparent 95%)',
              opacity: isDark ? 0.7 : 0.4,
            }} />

            <div className="p-7">
              {/* Demo CTA */}
              <button
                onClick={onLaunchSample}
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-3 border-2 bg-accent/12 border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 transition-all active:scale-[0.98]"
                style={{
                  boxShadow: isDark ? '0 0 24px rgba(0,212,255,0.08)' : '0 2px 10px rgba(2,132,199,0.1)',
                }}
              >
                {loading ? <><Loader2 size={18} className="animate-spin" />Loading sample data...</> : <><Zap size={18} />Try Instant Demo<ArrowRight size={16} /></>}
              </button>
              <p className="text-center text-[10px] text-muted-foreground/40 mt-2 mb-5">
                17,314 events &middot; 120 requests &middot; 3 interventions &middot; zero setup
              </p>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-medium">or upload your own logs</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Name */}
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Dataset name (optional)"
                className="w-full px-4 py-2.5 mb-4 bg-background/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent/40 transition-colors"
              />

              {/* File zones */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FileUploadZone label="CSV Logs" accept=".csv" description="inhibitor_logs.csv" icon="csv" file={csvFile} onFileSelect={handleCsv} validation={csvVal} />
                <FileUploadZone label="JSONL Events" accept=".jsonl,.json,.ndjson" description="inhibitor_events.jsonl" icon="json" file={jsonlFile} onFileSelect={handleJsonl} validation={jsonlVal} />
              </div>

              {/* Error */}
              {error && <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

              {/* Launch */}
              <button
                onClick={() => canLaunch && onLaunchWithFiles(resolvedName, csvFile, jsonlFile)}
                disabled={!canLaunch}
                className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  canLaunch ? 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25' : 'bg-muted/5 text-muted-foreground/30 border border-border cursor-not-allowed'
                }`}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" />Parsing...</> : <><Database size={15} />Launch Dashboard<ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        </motion.div>
        </div>
      </div>

      {/* Footer pinned to bottom */}
      <div className="relative z-10 text-center pb-4 flex-shrink-0">
        <p className="text-[9px] text-muted-foreground/25 uppercase tracking-[0.2em]">
          Philly Codefest 2026 &middot; Challenge 3: Glass Box
        </p>
      </div>
    </div>
  );
}
