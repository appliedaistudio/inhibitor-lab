import { useState } from 'react';
import { ShieldAlert, Ban, AlertTriangle, CheckCircle, Download, Loader2, ArrowRight, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InterventionEvent, DatasetEntry } from '@/lib/types';
import { InterventionCard } from './InterventionCard';
import { humanizeObservation, humanizePrediction, COMPLIANCE_DOMAINS } from '@/lib/humanize';
import { computeLatencyStats } from '@/lib/computeStats';

interface Props {
  interventions: InterventionEvent[];
  dataset: DatasetEntry;
  onNavigateToExplorer?: (requestId?: string) => void;
}

const AGENT_CONFIG: Record<string, { emoji: string; domain: string; color: string }> = {
  'finance-agent-alpha': { emoji: '💰', domain: 'Financial Ops', color: '#f59e0b' },
  'privacy-agent-beta':  { emoji: '🔒', domain: 'Data Privacy',  color: '#8b5cf6' },
  'ops-agent-gamma':     { emoji: '⚙️', domain: 'Ops Security',  color: '#ef4444' },
};

const ACTION_STYLES: Record<string, { label: string; bg: string; border: string; text: string; icon: typeof Ban }> = {
  blocked:     { label: 'BLOCKED',     bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  text: '#ef4444', icon: Ban },
  interrupted: { label: 'INTERRUPTED', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b', icon: AlertTriangle },
};

function generatePDF(dataset: DatasetEntry) {
  const { stats, authFailures, interventions } = dataset;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;
  const checkPage = (needed: number) => { if (y + needed > 270) { doc.addPage(); y = 20; } };

  // Title page
  doc.setFillColor(5, 5, 8);
  doc.rect(0, 0, pageW, 297, 'F');
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('GLASS BOX', pageW / 2, 50, { align: 'center' });
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('AI Safety Audit Report', pageW / 2, 62, { align: 'center' });
  doc.setTextColor(226, 232, 240);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(dataset.name, pageW / 2, 90, { align: 'center' });
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, 100, { align: 'center' });
  doc.text(`Period: ${stats.timeSpanStart.toLocaleDateString()} – ${stats.timeSpanEnd.toLocaleDateString()}`, pageW / 2, 108, { align: 'center' });

  // Executive Summary
  doc.addPage();
  doc.setFillColor(5, 5, 8);
  doc.rect(0, 0, pageW, 297, 'F');
  y = 20;
  doc.setTextColor(0, 212, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 15, y); y += 10;
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Requests Processed', stats.totalRequests.toString()],
      ['Total Pipeline Events', stats.totalEvents.toLocaleString()],
      ['Risk Signals Detected', stats.totalObservations.toLocaleString()],
      ['Compliance Checks', stats.totalPredictions.toLocaleString()],
      ['Validation Pass Rate', `${(stats.validationPassRate * 100).toFixed(1)}%`],
      ['Auth Failures Blocked', stats.totalAuthFailures.toString()],
      ['Avg Request Duration', `${(stats.avgRequestDuration / 1000).toFixed(1)}s`],
    ],
    theme: 'plain',
    styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 10, cellPadding: 4 },
    headStyles: { textColor: [0, 212, 255], fillColor: [20, 28, 46], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [15, 20, 35] },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Interventions
  if (interventions.length > 0) {
    checkPage(60);
    doc.setTextColor(0, 212, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('Intervention Events', 15, y); y += 8;
    autoTable(doc, {
      startY: y,
      head: [['Agent', 'Severity', 'Action', 'Policy', 'Reason']],
      body: interventions.map(i => [i.agent_id, i.severity.toUpperCase(), i.action.toUpperCase(), i.policy_trigger, i.reason]),
      theme: 'plain',
      styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 8, cellPadding: 3 },
      headStyles: { textColor: [0, 212, 255], fillColor: [20, 28, 46], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 20, 35] },
      margin: { left: 15, right: 15 },
      columnStyles: { 4: { cellWidth: 50 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Top Risk Signals
  checkPage(80);
  doc.setTextColor(0, 212, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Top Risk Signals', 15, y); y += 8;
  autoTable(doc, {
    startY: y,
    head: [['Risk Signal', 'Occurrences']],
    body: Object.entries(stats.observationKeyCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => [humanizeObservation(k), v.toString()]),
    theme: 'plain',
    styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 9, cellPadding: 3 },
    headStyles: { textColor: [255, 181, 71], fillColor: [20, 28, 46], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [15, 20, 35] },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Compliance by Domain
  checkPage(80);
  doc.setTextColor(0, 212, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Compliance Violations by Domain', 15, y); y += 8;
  autoTable(doc, {
    startY: y,
    head: [['Domain', 'Total', 'Breakdown']],
    body: Object.entries(COMPLIANCE_DOMAINS).map(([, domain]) => {
      const total = domain.keys.reduce((s, k) => s + (stats.predictionKeyCounts[k] || 0), 0);
      const details = domain.keys.map(k => ({ label: humanizePrediction(k), count: stats.predictionKeyCounts[k] || 0 })).filter(d => d.count > 0).map(d => `${d.label}: ${d.count}`).join(', ');
      return [domain.label, total.toString(), details || 'None'];
    }),
    theme: 'plain',
    styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 9, cellPadding: 3 },
    headStyles: { textColor: [255, 59, 92], fillColor: [20, 28, 46], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [15, 20, 35] },
    margin: { left: 15, right: 15 },
    columnStyles: { 2: { cellWidth: 80 } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Performance
  checkPage(60);
  const embStats = computeLatencyStats(stats.embeddingLatencies);
  const llmStats = computeLatencyStats(stats.llmLatencies);
  doc.setTextColor(0, 212, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Performance Metrics', 15, y); y += 8;
  autoTable(doc, {
    startY: y,
    head: [['Service', 'Calls', 'Median', 'P95', 'P99', 'Max']],
    body: [
      ['Embeddings', stats.embeddingLatencies.length.toString(), `${embStats.median}ms`, `${embStats.p95}ms`, `${embStats.p99}ms`, `${embStats.max}ms`],
      ['LLM Reasoning', stats.llmLatencies.length.toString(), `${llmStats.median}ms`, `${llmStats.p95}ms`, `${llmStats.p99}ms`, `${llmStats.max}ms`],
    ],
    theme: 'plain',
    styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 9, cellPadding: 3 },
    headStyles: { textColor: [0, 212, 255], fillColor: [20, 28, 46], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [15, 20, 35] },
    margin: { left: 15, right: 15 },
  });

  // Security
  if (authFailures.length > 0) {
    y = (doc as any).lastAutoTable.finalY + 10;
    checkPage(60);
    doc.setTextColor(0, 212, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('Security Events', 15, y); y += 8;
    autoTable(doc, {
      startY: y,
      head: [['Time', 'Request', 'IP', 'Country', 'User Agent']],
      body: authFailures.map(f => [f.timestamp.toLocaleString(), `${f.method} ${f.path}`, f.ip, f.country, f.userAgent.substring(0, 40)]),
      theme: 'plain',
      styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 8, cellPadding: 3 },
      headStyles: { textColor: [255, 59, 92], fillColor: [20, 28, 46], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 20, 35] },
      margin: { left: 15, right: 15 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(74, 85, 104); doc.setFontSize(8);
    doc.text(`Glass Box AI Safety Audit — ${dataset.name}`, 15, 290);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 15, 290, { align: 'right' });
  }

  doc.save(`glass-box-report-${dataset.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function InterventionsPage({ interventions, dataset, onNavigateToExplorer }: Props) {
  const [generating, setGenerating] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 80));
    generatePDF(dataset);
    setGenerating(false);
    setReportDone(true);
    setTimeout(() => setReportDone(false), 3000);
  };

  // Build per-agent status from interventions
  const agentMap = new Map<string, { events: InterventionEvent[] }>();
  for (const iv of interventions) {
    if (!agentMap.has(iv.agent_id)) agentMap.set(iv.agent_id, { events: [] });
    agentMap.get(iv.agent_id)!.events.push(iv);
  }

  const highCount = interventions.filter(i => i.severity === 'high').length;
  const topRiskRequestId = [...dataset.requests]
    .sort((a, b) => b.observations.length - a.observations.length)[0]?.id;
  const blockedCount = interventions.filter(i => i.action === 'blocked').length;

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ff3b5c]/10 border border-[#ff3b5c]/20 flex items-center justify-center">
            <ShieldAlert size={20} className="text-[#ff3b5c]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Intervention Events</h2>
            <p className="text-sm text-muted-foreground">
              {interventions.length} of {dataset.stats.totalRequests} requests escalated to intervention
              {' '}· {highCount} high severity · {blockedCount} blocked
            </p>
          </div>
        </div>

        {/* Report download */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleDownload}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border"
          style={{
            background: 'rgba(0,229,160,0.08)',
            borderColor: 'rgba(0,229,160,0.25)',
            color: '#00e5a0',
          }}
        >
          {generating ? (
            <><Loader2 size={13} className="animate-spin" />Generating…</>
          ) : reportDone ? (
            <><CheckCircle size={13} />Downloaded!</>
          ) : (
            <><Download size={13} />Download Audit Report</>
          )}
        </motion.button>
      </div>

      {/* ── Agent Health Status ──────────────────────────────────── */}
      {agentMap.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] mb-3 flex items-center gap-2">
            <span className="w-4 h-px bg-red-400/60 inline-block" />
            Agent Status After Audit
          </p>
          <div className="grid grid-cols-3 gap-4">
            {Array.from(agentMap.entries()).map(([agentId, { events }]) => {
              const cfg = AGENT_CONFIG[agentId] ?? { emoji: '🤖', domain: agentId, color: '#64748b' };
              const worstAction = events.find(e => e.action === 'blocked') ? 'blocked' : 'interrupted';
              const worstSev = events.find(e => e.severity === 'high') ? 'high' : events.find(e => e.severity === 'medium') ? 'medium' : 'low';
              const actionStyle = ACTION_STYLES[worstAction] ?? ACTION_STYLES.blocked;
              const ActionIcon = actionStyle.icon;
              const sevColor = worstSev === 'high' ? '#ef4444' : worstSev === 'medium' ? '#f59e0b' : '#22c55e';
              const policies = events.map(e => e.policy_trigger).filter(Boolean);

              return (
                <div
                  key={agentId}
                  className="glass-card p-4"
                  style={{ borderColor: `${cfg.color}20` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cfg.emoji}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{agentId}</p>
                        <p className="text-[10px] text-muted-foreground">{cfg.domain}</p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: actionStyle.bg, border: `1px solid ${actionStyle.border}`, color: actionStyle.text }}
                    >
                      <ActionIcon size={10} />
                      {actionStyle.label}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-muted-foreground">Severity:</span>
                    <span className="text-[10px] font-semibold uppercase" style={{ color: sevColor }}>
                      {worstSev}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{events.length} event{events.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {policies.map(p => (
                      <span key={p} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${cfg.color}10`, color: `${cfg.color}cc`, border: `1px solid ${cfg.color}20` }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Top at-risk request chains ───────────────────────────── */}
      {onNavigateToExplorer && dataset.requests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={13} className="text-amber-400" />
              <p className="text-xs font-semibold text-foreground">Highest-Risk Request Chains</p>
              <span className="text-[10px] text-muted-foreground">— requests with the most risk signals detected</span>
            </div>
            <button
              onClick={() => onNavigateToExplorer?.()}
              className="flex items-center gap-1 text-xs text-accent/70 hover:text-accent transition-colors"
            >
              Browse all {dataset.requests.length} chains <ArrowRight size={11} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[...dataset.requests]
              .sort((a, b) => b.observations.length - a.observations.length)
              .slice(0, 3)
              .map((req, i) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
                  onClick={() => onNavigateToExplorer?.(req.id)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{req.id}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                      #{i + 1} risk
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-amber-400 font-semibold">{req.observations.length} signals</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-purple-400">{req.predictions.length} checks</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {req.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{req.eventCount} events · {(req.durationMs / 1000).toFixed(1)}s
                  </p>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {interventions.length === 0 && (
        <div className="glass-card p-12 text-center">
          <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No interventions in this dataset</p>
          <p className="text-xs text-muted-foreground">All agent actions passed policy checks</p>
        </div>
      )}

      {/* ── Intervention cards ───────────────────────────────────── */}
      {interventions.length > 0 && (
        <div className="flex items-center gap-4 px-1 mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">Reading the cards:</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[#ff3b5c] flex-shrink-0" />
            <span className="text-[#ff8a9e]">Red</span> — what AI attempted
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[#00e5a0] flex-shrink-0" />
            <span className="text-[#66f0c8]">Green</span> — what Inhibitor enforced
          </div>
        </div>
      )}
      <div className="space-y-4">
        {interventions.map((event, i) => (
          <motion.div
            key={event.request_id || i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <InterventionCard event={event} index={i} onExplore={() => {
              onNavigateToExplorer?.('auto');
            }} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
