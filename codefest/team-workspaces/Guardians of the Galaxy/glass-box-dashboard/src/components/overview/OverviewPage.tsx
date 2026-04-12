import { memo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, ChevronRight, Activity, AlertTriangle } from 'lucide-react';
import type { DashboardStats, InterventionEvent } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_COLORS } from '@/lib/themeColors';
import { KpiCards } from './KpiCards';
import { PipelineFlow } from './PipelineFlow';
import { RadialPipeline } from './RadialPipeline';
import { RiskRadar } from './RiskRadar';
import { RiskSignalChart } from './RiskSignalChart';
import { ComplianceChart } from './ComplianceChart';
import { TimelineChart } from './TimelineChart';

interface Props {
  stats: DashboardStats;
  interventions: InterventionEvent[];
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  high:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   text: '#ef4444', dot: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  text: '#f59e0b', dot: '#f59e0b' },
  low:    { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   text: '#22c55e', dot: '#22c55e' },
};

function SectionLabel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-1">
      <ChevronRight size={14} className="text-accent/50 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-semibold text-foreground/80">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export const OverviewPage = memo(function OverviewPage({ stats, interventions }: Props) {
  const { theme, isDark } = useTheme();
  const tc = THEME_COLORS[theme];
  const durationHours = Math.round(
    (stats.timeSpanEnd.getTime() - stats.timeSpanStart.getTime()) / 3_600_000
  );

  const blockedCount = interventions.filter(i => i.action === 'blocked').length;

  return (
    <div className="space-y-6">

      {/* ── Audit Summary Hero ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-2xl overflow-hidden border border-accent/15 p-5"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, rgba(10,14,26,0.6) 60%, rgba(168,85,247,0.04) 100%)'
            : 'linear-gradient(135deg, rgba(2,132,199,0.04) 0%, rgba(255,255,255,0.8) 60%, rgba(124,58,237,0.03) 100%)',
          boxShadow: isDark
            ? '0 0 40px rgba(0,212,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: isDark
            ? 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), rgba(168,85,247,0.4), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(2,132,199,0.3), rgba(124,58,237,0.3), transparent)'
          }} />

        <div className="flex items-start justify-between gap-6">
          {/* Left: headline */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)' }}>
              <ShieldCheck size={20} style={{ color: '#00e5a0' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-bold text-foreground">Audit Complete</h2>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock size={10} />
                  {durationHours}h window ·{' '}
                  {stats.timeSpanStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' — '}
                  {stats.timeSpanEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                The Inhibitor analyzed{' '}
                <span className="text-foreground font-semibold">{stats.totalRequests} AI agent requests</span>,
                detecting{' '}
                <span className="text-amber-400 font-semibold">{stats.totalObservations} risk signal{stats.totalObservations !== 1 ? 's' : ''}</span>
                {' '}and running{' '}
                <span className="text-purple-400 font-semibold">{stats.totalPredictions} compliance check{stats.totalPredictions !== 1 ? 's' : ''}</span>.{' '}
                {interventions.length > 0 ? (
                  <>
                    Of these, <span className="text-foreground font-semibold">{interventions.length} request{interventions.length !== 1 ? 's' : ''}</span> escalated
                    to active intervention
                    {blockedCount > 0 && <> — <span className="text-red-400 font-semibold">{blockedCount} blocked outright</span></>}.
                  </>
                ) : (
                  <>No requests escalated to active intervention.</>
                )}
                {stats.totalAuthFailures > 0 && (
                  <> <span className="text-red-400 font-semibold">{stats.totalAuthFailures} external probe{stats.totalAuthFailures !== 1 ? 's' : ''}</span> were turned away at the API boundary.</>
                )}
              </p>
            </div>
          </div>

          {/* Right: intervention pills */}
          {interventions.length > 0 && (
            <div className="flex flex-col gap-2 flex-shrink-0 max-w-xs">
              {interventions.map((iv, i) => {
                const sev = SEVERITY_STYLES[iv.severity] ?? SEVERITY_STYLES.low;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sev.dot }} />
                    <span className="font-semibold uppercase tracking-wider text-[9px]" style={{ color: sev.text }}>
                      {iv.severity}
                    </span>
                    <span className="text-muted-foreground truncate max-w-[180px]">{iv.reason}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-4">
          {[
            { icon: Activity,      label: 'Requests',      value: stats.totalRequests.toLocaleString(),       color: '#00d4ff' },
            { icon: AlertTriangle, label: 'Risk Signals',  value: stats.totalObservations.toLocaleString(),   color: '#f59e0b' },
            { icon: ShieldCheck,   label: 'Interventions', value: interventions.length.toString(),            color: '#a855f7' },
            { icon: ShieldCheck,   label: 'Pass Rate',     value: `${(stats.validationPassRate * 100).toFixed(0)}%`, color: '#00e5a0' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}20` }}>
                  <Icon size={13} style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <KpiCards stats={stats} />

      {/* ── Pipeline Flow (hero visual) ────────────────────────── */}
      <div>
        <SectionLabel
          title="Inhibitor Pipeline — How Every Request Is Processed"
          description="Every AI agent request passes through all 6 stages in sequence. The Inhibitor can intervene at any stage."
        />
        <div className="mt-3">
          <PipelineFlow stats={stats} />
        </div>
      </div>

      {/* ── Radial Pipeline + Risk Radar (side by side) ─────── */}
      <div>
        <SectionLabel
          title="Pipeline Flow & Risk Overview"
          description="How requests flowed through the Inhibitor's processing stages, and which risk patterns appeared most often"
        />
        <div className="grid grid-cols-2 gap-6 mt-3">
          <RadialPipeline stats={stats} />
          <RiskRadar observationKeyCounts={stats.observationKeyCounts} />
        </div>
      </div>

      {/* ── Activity Timeline ──────────────────────────────────── */}
      <div>
        <SectionLabel
          title="Request Activity Over Time"
          description="Volume of AI agent requests processed per hour — spikes may indicate automated batch jobs or unusual agent behaviour"
        />
        <div className="mt-3">
          <TimelineChart requestsPerHour={stats.requestsPerHour} />
        </div>
      </div>

      {/* ── Risk Signals + Compliance ──────────────────────────── */}
      <div>
        <SectionLabel
          title="Risk Signals & Compliance Violations"
          description="Risk Signals are behavioural patterns the Inhibitor flagged as potentially unsafe. Compliance Violations are confirmed policy breaches by domain (Financial, Privacy, Security, etc.)"
        />
        <div className="grid grid-cols-2 gap-6 mt-3">
          <RiskSignalChart observationKeyCounts={stats.observationKeyCounts} />
          <ComplianceChart predictionKeyCounts={stats.predictionKeyCounts} />
        </div>
      </div>
    </div>
  );
});
