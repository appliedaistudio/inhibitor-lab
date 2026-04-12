import { useState, useMemo } from 'react';
import { GitCompare, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DatasetEntry } from '@/lib/types';
import { COMPLIANCE_DOMAINS, humanizeObservation } from '@/lib/humanize';
import { useTheme } from '@/contexts/ThemeContext';
import { chartTooltipStyle, chartAxisStyle } from '@/lib/themeColors';

interface Props {
  datasets: Map<string, DatasetEntry>;
}

function DeltaBadge({ a, b }: { a: number; b: number }) {
  if (a === b) return <Minus size={12} className="text-muted-foreground" />;
  const pct = b !== 0 ? ((a - b) / b * 100).toFixed(0) : '+100';
  const isUp = a > b;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-mono ${isUp ? 'text-[#ff3b5c]' : 'text-[#00e5a0]'}`}>
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(Number(pct))}%
    </span>
  );
}

export function ComparisonView({ datasets }: Props) {
  const entries = [...datasets.entries()];
  const [dsA, setDsA] = useState(entries[0]?.[0] || '');
  const [dsB, setDsB] = useState(entries[1]?.[0] || entries[0]?.[0] || '');

  const a = datasets.get(dsA);
  const b = datasets.get(dsB);

  if (entries.length < 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center">
            <GitCompare size={20} className="text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Dataset Comparison</h2>
            <p className="text-sm text-muted-foreground">Load at least 2 datasets to compare</p>
          </div>
        </div>
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Add another dataset using the <span className="text-accent font-mono">+</span> button in the header</p>
        </div>
      </div>
    );
  }

  const { theme } = useTheme();

  // Build comparison chart data for compliance domains
  const domainChart = useMemo(() => {
    if (!a || !b) return [];
    return Object.entries(COMPLIANCE_DOMAINS).map(([, domain]) => {
      const aTotal = domain.keys.reduce((sum, k) => sum + (a.stats.predictionKeyCounts[k] || 0), 0);
      const bTotal = domain.keys.reduce((sum, k) => sum + (b.stats.predictionKeyCounts[k] || 0), 0);
      return { domain: domain.label, [a.name]: aTotal, [b.name]: bTotal };
    });
  }, [a, b]);

  // Top observation comparison
  const obsComparison = useMemo(() => {
    if (!a || !b) return [];
    const allKeys = new Set([
      ...Object.keys(a.stats.observationKeyCounts),
      ...Object.keys(b.stats.observationKeyCounts),
    ]);
    return [...allKeys]
      .map(key => ({
        key,
        label: humanizeObservation(key),
        aCount: a.stats.observationKeyCounts[key] || 0,
        bCount: b.stats.observationKeyCounts[key] || 0,
      }))
      .sort((x, y) => (y.aCount + y.bCount) - (x.aCount + x.bCount))
      .slice(0, 10);
  }, [a, b]);

  if (!a || !b) return null;

  const metrics = [
    { label: 'Requests', a: a.stats.totalRequests, b: b.stats.totalRequests },
    { label: 'Risk Signals', a: a.stats.totalObservations, b: b.stats.totalObservations },
    { label: 'Compliance Checks', a: a.stats.totalPredictions, b: b.stats.totalPredictions },
    { label: 'Pass Rate', a: a.stats.validationPassRate * 100, b: b.stats.validationPassRate * 100, suffix: '%' },
    { label: 'Auth Failures', a: a.stats.totalAuthFailures, b: b.stats.totalAuthFailures },
    { label: 'Avg Duration', a: Math.round(a.stats.avgRequestDuration / 1000 * 10) / 10, b: Math.round(b.stats.avgRequestDuration / 1000 * 10) / 10, suffix: 's' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center">
            <GitCompare size={20} className="text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Dataset Comparison</h2>
            <p className="text-sm text-muted-foreground">Side-by-side analysis of two audit datasets</p>
          </div>
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-3">
          <select
            value={dsA}
            onChange={e => setDsA(e.target.value)}
            className="bg-[#0a0e1a] border border-[#ffb547]/30 rounded-lg px-3 py-1.5 text-xs text-[#ffb547] focus:outline-none"
          >
            {entries.map(([id, ds]) => <option key={id} value={id}>{ds.name}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">vs</span>
          <select
            value={dsB}
            onChange={e => setDsB(e.target.value)}
            className="bg-[#0a0e1a] border border-[#00d4ff]/30 rounded-lg px-3 py-1.5 text-xs text-[#00d4ff] focus:outline-none"
          >
            {entries.map(([id, ds]) => <option key={id} value={id}>{ds.name}</option>)}
          </select>
        </div>
      </motion.div>

      {/* KPI comparison grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-6 gap-3"
      >
        {metrics.map(m => (
          <div key={m.label} className="glass-card p-4 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">{m.label}</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg font-bold text-[#ffb547]">{m.a}{m.suffix || ''}</span>
              <DeltaBadge a={m.a} b={m.b} />
              <span className="text-lg font-bold text-[#00d4ff]">{m.b}{m.suffix || ''}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Compliance domain comparison chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="text-sm font-semibold text-foreground mb-1">Compliance Violations by Domain</h3>
        <p className="text-xs text-muted-foreground mb-4">Side-by-side comparison across regulatory domains</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={domainChart} barGap={4}>
              <XAxis dataKey="domain" tick={chartAxisStyle(theme)} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxisStyle(theme)} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle(theme)} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey={a.name} fill="#ffb547" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
              <Bar dataKey={b.name} fill="#00d4ff" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top observations comparison table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4">Risk Signal Comparison (Top 10)</h3>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[1fr,80px,80px,80px] gap-2 px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider">
            <span>Signal</span>
            <span className="text-right text-[#ffb547]">{a.name}</span>
            <span className="text-right text-[#00d4ff]">{b.name}</span>
            <span className="text-right">Delta</span>
          </div>
          {obsComparison.map(row => (
            <div key={row.key} className="grid grid-cols-[1fr,80px,80px,80px] gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
              <span className="text-sm text-foreground truncate">{row.label}</span>
              <span className="text-sm text-right font-mono text-[#ffb547]">{row.aCount}</span>
              <span className="text-sm text-right font-mono text-[#00d4ff]">{row.bCount}</span>
              <span className="text-right"><DeltaBadge a={row.aCount} b={row.bCount} /></span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
