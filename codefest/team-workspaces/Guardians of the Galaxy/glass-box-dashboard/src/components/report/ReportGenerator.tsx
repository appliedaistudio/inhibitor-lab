import { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DatasetEntry } from '@/lib/types';
import { humanizeObservation, humanizePrediction, COMPLIANCE_DOMAINS } from '@/lib/humanize';
import { computeLatencyStats } from '@/lib/computeStats';

interface Props {
  dataset: DatasetEntry;
}

export function ReportGenerator({ dataset }: Props) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setDone(false);

    // Small delay to allow UI update
    await new Promise(r => setTimeout(r, 100));

    const { stats, authFailures, interventions, requests } = dataset;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    // Helper
    const addLine = () => { doc.setDrawColor(30, 41, 59); doc.line(15, y, pageW - 15, y); y += 5; };
    const checkPage = (needed: number) => { if (y + needed > 270) { doc.addPage(); y = 20; } };

    // ---- TITLE PAGE ----
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
    doc.text(
      `Monitoring Period: ${stats.timeSpanStart.toLocaleDateString()} - ${stats.timeSpanEnd.toLocaleDateString()}`,
      pageW / 2, 108, { align: 'center' }
    );

    // ---- EXECUTIVE SUMMARY ----
    doc.addPage();
    doc.setFillColor(5, 5, 8);
    doc.rect(0, 0, pageW, 297, 'F');
    y = 20;

    doc.setTextColor(0, 212, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 15, y);
    y += 10;

    const summaryData = [
      ['Requests Processed', stats.totalRequests.toString()],
      ['Total Pipeline Events', stats.totalEvents.toLocaleString()],
      ['Risk Signals Detected', stats.totalObservations.toLocaleString()],
      ['Compliance Checks Triggered', stats.totalPredictions.toLocaleString()],
      ['Validation Pass Rate', `${(stats.validationPassRate * 100).toFixed(1)}%`],
      ['Auth Failures Blocked', stats.totalAuthFailures.toString()],
      ['Avg Request Duration', `${(stats.avgRequestDuration / 1000).toFixed(1)}s`],
      ['Avg Events per Request', stats.avgEventsPerRequest.toFixed(0)],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'plain',
      styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 10, cellPadding: 4 },
      headStyles: { textColor: [0, 212, 255], fillColor: [20, 28, 46], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 20, 35] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ---- INTERVENTION EVENTS ----
    if (interventions.length > 0) {
      checkPage(60);
      doc.setTextColor(0, 212, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Intervention Events', 15, y);
      y += 8;

      const intData = interventions.map(i => [
        i.agent_id,
        i.severity.toUpperCase(),
        i.action.toUpperCase(),
        i.policy_trigger,
        i.reason,
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Agent', 'Severity', 'Action', 'Policy', 'Reason']],
        body: intData,
        theme: 'plain',
        styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 8, cellPadding: 3 },
        headStyles: { textColor: [0, 212, 255], fillColor: [20, 28, 46], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [15, 20, 35] },
        margin: { left: 15, right: 15 },
        columnStyles: { 4: { cellWidth: 50 } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ---- TOP RISK SIGNALS ----
    checkPage(80);
    doc.setTextColor(0, 212, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Risk Signals', 15, y);
    y += 8;

    const topObs = Object.entries(stats.observationKeyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([key, count]) => [humanizeObservation(key), count.toString()]);

    autoTable(doc, {
      startY: y,
      head: [['Risk Signal', 'Occurrences']],
      body: topObs,
      theme: 'plain',
      styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 9, cellPadding: 3 },
      headStyles: { textColor: [255, 181, 71], fillColor: [20, 28, 46], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 20, 35] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ---- COMPLIANCE BY DOMAIN ----
    checkPage(80);
    doc.setTextColor(0, 212, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Violations by Domain', 15, y);
    y += 8;

    const domainData = Object.entries(COMPLIANCE_DOMAINS).map(([, domain]) => {
      const total = domain.keys.reduce((sum, key) => sum + (stats.predictionKeyCounts[key] || 0), 0);
      const details = domain.keys
        .map(key => ({ label: humanizePrediction(key), count: stats.predictionKeyCounts[key] || 0 }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count)
        .map(d => `${d.label}: ${d.count}`)
        .join(', ');
      return [domain.label, total.toString(), details || 'None'];
    });

    autoTable(doc, {
      startY: y,
      head: [['Domain', 'Total', 'Breakdown']],
      body: domainData,
      theme: 'plain',
      styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 9, cellPadding: 3 },
      headStyles: { textColor: [255, 59, 92], fillColor: [20, 28, 46], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 20, 35] },
      margin: { left: 15, right: 15 },
      columnStyles: { 2: { cellWidth: 80 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ---- PERFORMANCE ----
    checkPage(60);
    doc.setTextColor(0, 212, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Metrics', 15, y);
    y += 8;

    const embStats = computeLatencyStats(stats.embeddingLatencies);
    const llmStats = computeLatencyStats(stats.llmLatencies);

    autoTable(doc, {
      startY: y,
      head: [['Service', 'Calls', 'Median', 'Mean', 'P95', 'P99', 'Max']],
      body: [
        ['Embeddings', stats.embeddingLatencies.length.toString(), `${embStats.median}ms`, `${embStats.mean}ms`, `${embStats.p95}ms`, `${embStats.p99}ms`, `${embStats.max}ms`],
        ['LLM Reasoning', stats.llmLatencies.length.toString(), `${llmStats.median}ms`, `${llmStats.mean}ms`, `${llmStats.p95}ms`, `${llmStats.p99}ms`, `${llmStats.max}ms`],
      ],
      theme: 'plain',
      styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 9, cellPadding: 3 },
      headStyles: { textColor: [0, 212, 255], fillColor: [20, 28, 46], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 20, 35] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ---- SECURITY ----
    if (authFailures.length > 0) {
      checkPage(60);
      doc.setTextColor(0, 212, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Security Events', 15, y);
      y += 8;

      const secData = authFailures.map(f => [
        f.timestamp.toLocaleString(),
        `${f.method} ${f.path}`,
        f.ip,
        f.country,
        f.userAgent.substring(0, 40),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Time', 'Request', 'IP', 'Country', 'User Agent']],
        body: secData,
        theme: 'plain',
        styles: { textColor: [226, 232, 240], fillColor: [10, 14, 26], fontSize: 8, cellPadding: 3 },
        headStyles: { textColor: [255, 59, 92], fillColor: [20, 28, 46], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [15, 20, 35] },
        margin: { left: 15, right: 15 },
      });
    }

    // ---- FOOTER on all pages ----
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(74, 85, 104);
      doc.setFontSize(8);
      doc.text(`Glass Box AI Safety Audit Report - ${dataset.name}`, 15, 290);
      doc.text(`Page ${i} of ${pageCount}`, pageW - 15, 290, { align: 'right' });
    }

    // Save
    doc.save(`glass-box-report-${dataset.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);

    setGenerating(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-[#00e5a0]/10 border border-[#00e5a0]/20 flex items-center justify-center">
          <FileText size={20} className="text-[#00e5a0]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Compliance Report</h2>
          <p className="text-sm text-muted-foreground">
            Generate a downloadable PDF audit report for stakeholders
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-8 max-w-2xl"
      >
        <h3 className="text-base font-semibold text-foreground mb-2">Report Contents</h3>
        <p className="text-sm text-muted-foreground mb-6">
          The generated PDF includes all findings from <span className="text-accent font-medium">{dataset.name}</span>:
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: 'Executive Summary', desc: 'KPIs and aggregate metrics' },
            { label: 'Intervention Events', desc: `${dataset.interventions.length} blocked/interrupted actions` },
            { label: 'Top Risk Signals', desc: `${Object.keys(dataset.stats.observationKeyCounts).length} categories analyzed` },
            { label: 'Compliance by Domain', desc: '5 regulatory domains covered' },
            { label: 'Performance Metrics', desc: 'Latency percentiles and throughput' },
            { label: 'Security Events', desc: `${dataset.authFailures.length} unauthorized probes` },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
              <CheckCircle size={14} className="text-[#00e5a0] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generate}
          disabled={generating}
          className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-[#00e5a0]/15 text-[#00e5a0] border border-[#00e5a0]/30 hover:bg-[#00e5a0]/25 transition-all hover:shadow-[0_0_30px_rgba(0,229,160,0.12)]"
        >
          {generating ? (
            <><Loader2 size={16} className="animate-spin" /> Generating Report...</>
          ) : done ? (
            <><CheckCircle size={16} /> Report Downloaded!</>
          ) : (
            <><Download size={16} /> Generate & Download PDF</>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
