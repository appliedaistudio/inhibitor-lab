import { Gauge } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid,
} from 'recharts';
import type { DashboardStats, RequestLifecycle } from '@/lib/types';
import { computeLatencyStats } from '@/lib/computeStats';
import { useTheme } from '@/contexts/ThemeContext';
import { chartTooltipStyle, chartAxisStyle, THEME_COLORS } from '@/lib/themeColors';

interface Props {
  stats: DashboardStats;
  requests: RequestLifecycle[];
}

function LatencyStatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value.toLocaleString()}<span className="text-xs text-muted-foreground ml-1">{unit}</span></p>
    </div>
  );
}

export function PerformancePage({ stats, requests }: Props) {
  const { theme } = useTheme();
  const tooltipStyle = chartTooltipStyle(theme);
  const axisStyle = chartAxisStyle(theme);
  const axisStyle10 = chartAxisStyle(theme, 10);
  const tc = THEME_COLORS[theme];

  const embStats = computeLatencyStats(stats.embeddingLatencies);
  const llmStats = computeLatencyStats(stats.llmLatencies);
  const embHistogram = buildHistogram(stats.embeddingLatencies, 50);
  const llmHistogram = buildHistogram(stats.llmLatencies, 100);
  const durationData = requests.map(r => ({
    index: parseInt(r.id.replace('req-', '')),
    duration: r.durationMs / 1000,
    events: r.eventCount,
  }));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Gauge size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Performance Analytics</h2>
          <p className="text-sm text-muted-foreground">Latency distributions and throughput across the pipeline</p>
        </div>
      </motion.div>

      {/* Embedding Latency */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Content Analysis Latency (Embeddings)</h3>
        <p className="text-xs text-muted-foreground mb-4">{stats.embeddingLatencies.length.toLocaleString()} calls to OpenAI text-embedding-3-small</p>
        <div className="grid grid-cols-6 gap-4 mb-4 p-3 bg-white/[0.03] rounded-lg">
          <LatencyStatCard label="Min" value={embStats.min} unit="ms" color="#94a3b8" />
          <LatencyStatCard label="Median" value={embStats.median} unit="ms" color="#3b82f6" />
          <LatencyStatCard label="Mean" value={embStats.mean} unit="ms" color="#3b82f6" />
          <LatencyStatCard label="P95" value={embStats.p95} unit="ms" color="#f59e0b" />
          <LatencyStatCard label="P99" value={embStats.p99} unit="ms" color="#ef4444" />
          <LatencyStatCard label="Max" value={embStats.max} unit="ms" color="#ef4444" />
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={embHistogram} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <XAxis dataKey="label" tick={axisStyle10} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [Number(v), 'Calls']} />
              <Bar dataKey="count" fill="#00d4ff" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* LLM Latency */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">AI Reasoning Latency (LLM)</h3>
        <p className="text-xs text-muted-foreground mb-4">{stats.llmLatencies.length.toLocaleString()} calls to Groq llama-3.3-70b-versatile</p>
        <div className="grid grid-cols-6 gap-4 mb-4 p-3 bg-white/[0.03] rounded-lg">
          <LatencyStatCard label="Min" value={llmStats.min} unit="ms" color="#94a3b8" />
          <LatencyStatCard label="Median" value={llmStats.median} unit="ms" color="#8b5cf6" />
          <LatencyStatCard label="Mean" value={llmStats.mean} unit="ms" color="#8b5cf6" />
          <LatencyStatCard label="P95" value={llmStats.p95} unit="ms" color="#f59e0b" />
          <LatencyStatCard label="P99" value={llmStats.p99} unit="ms" color="#ef4444" />
          <LatencyStatCard label="Max" value={llmStats.max} unit="ms" color="#ef4444" />
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={llmHistogram} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <XAxis dataKey="label" tick={axisStyle10} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [Number(v), 'Calls']} />
              <Bar dataKey="count" fill="#a855f7" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Request Duration Scatter */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Request Processing Duration</h3>
        <p className="text-xs text-muted-foreground mb-4">Total pipeline duration per request (seconds)</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.gridStroke} />
              <XAxis dataKey="index" name="Request #" tick={axisStyle} axisLine={false} tickLine={false}
                label={{ value: 'Request #', position: 'bottom', fill: tc.axisColor, fontSize: 11 }} />
              <YAxis dataKey="duration" name="Duration (s)" tick={axisStyle} axisLine={false} tickLine={false} width={50}
                label={{ value: 'Duration (s)', angle: -90, position: 'insideLeft', fill: tc.axisColor, fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown, name: unknown) => [
                String(name) === 'Duration (s)' ? `${Number(value).toFixed(1)}s` : Number(value), String(name)
              ]} />
              <Scatter data={durationData} fill="#00d4ff" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}

function buildHistogram(latencies: number[], bucketSize: number): { label: string; count: number }[] {
  if (latencies.length === 0) return [];
  const buckets: Record<number, number> = {};
  for (const l of latencies) {
    const bucket = Math.floor(l / bucketSize) * bucketSize;
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }
  return Object.entries(buckets)
    .map(([start, count]) => ({ start: parseInt(start), label: `${start}`, count }))
    .sort((a, b) => a.start - b.start)
    .slice(0, 25);
}
