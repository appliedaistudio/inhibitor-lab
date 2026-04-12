import { useState } from 'react';
import { X, RotateCcw, CheckCircle, Ban, Zap, ShieldCheck, Info, FileText, CircleDot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RequestLifecycle, InterventionEvent } from '@/lib/types';
import { buildGovernanceData, type GovernanceData } from '@/lib/governanceData';
import { GovernanceRadarChart } from './GovernanceRadarChart';

interface Props {
  open: boolean;
  onClose: () => void;
  request: RequestLifecycle;
  interventions: InterventionEvent[];
}

const KPI_ITEMS = [
  { key: 'turns' as const, label: 'TURNS', icon: RotateCcw, color: '#00d4ff' },
  { key: 'approved' as const, label: 'APPROVED', icon: CheckCircle, color: '#00e5a0' },
  { key: 'blocked' as const, label: 'BLOCKED', icon: Ban, color: '#ff3b5c' },
  { key: 'corrections' as const, label: 'CORRECTIONS', icon: Zap, color: '#ffb547' },
];

type TabId = 'policies' | 'signals';

export function GovernanceReviewModal({ open, onClose, request, interventions }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('policies');
  const data = buildGovernanceData(request, interventions);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div
              className="glass-card border border-accent/15"
              style={{ boxShadow: '0 0 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 212, 255, 0.06)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <ShieldCheck size={18} className="text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Governance Review</h2>
                    <p className="text-xs text-muted-foreground">{data.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-3 px-6 py-4">
                {KPI_ITEMS.map((kpi, i) => {
                  const Icon = kpi.icon;
                  const value = data[kpi.key];
                  return (
                    <motion.div
                      key={kpi.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-xl border border-border bg-white/[0.02] p-4 text-center"
                    >
                      <Icon size={16} style={{ color: kpi.color }} className="mx-auto mb-2 opacity-70" />
                      <div className="text-2xl font-bold text-foreground">{value}</div>
                      <div className="text-[10px] font-semibold text-muted-foreground tracking-[0.15em] mt-1">
                        {kpi.label}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Chart + Safety Signals */}
              <div className="px-6 py-2 flex gap-6">
                {/* Radar Chart */}
                <div className="flex-1 flex items-center justify-center">
                  <GovernanceRadarChart signals={data.signals} turns={data.turns} />
                </div>

                {/* Safety Signals Panel */}
                <div className="w-[280px] shrink-0">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.15em] mb-3">
                    Safety Signals
                  </h3>
                  <div className="space-y-2.5">
                    {data.signals.slice(0, 8).map((signal, i) => (
                      <motion.div
                        key={signal.key}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.05 }}
                        className="flex items-center gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="text-xs font-medium truncate"
                              style={{ color: signal.color }}
                            >
                              {signal.label}
                            </span>
                            {signal.type === 'prediction' && (
                              <Info size={11} className="text-muted-foreground shrink-0" />
                            )}
                          </div>
                          {/* Bar */}
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: signal.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((signal.count / 5) * 100, 100)}%` }}
                              transition={{ delay: 0.4 + i * 0.05, duration: 0.6 }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                          {signal.count}x
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 px-6 py-3 border-t border-border/50">
                {[
                  { label: 'Observation', color: '#00e5a0' },
                  { label: 'Prediction', color: '#ff3b5c' },
                  { label: 'Approved', color: '#2dd4bf' },
                  { label: 'Corrected', color: '#ffb547' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="border-t border-border">
                <div className="flex gap-0 px-6">
                  <button
                    onClick={() => setActiveTab('policies')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'policies'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText size={13} />
                    Policies
                  </button>
                  <button
                    onClick={() => setActiveTab('signals')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'signals'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CircleDot size={13} />
                    Signal Definition
                  </button>
                </div>

                {/* Tab Content */}
                <div className="px-6 py-4">
                  {activeTab === 'policies' && (
                    <PolicyPipelineView data={data} request={request} />
                  )}
                  {activeTab === 'signals' && (
                    <SignalDefinitionView data={data} />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PolicyPipelineView({ data, request }: { data: GovernanceData; request: RequestLifecycle }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={16} className="text-accent" />
        <h4 className="text-sm font-semibold text-foreground">Policy-to-Rule Pipeline</h4>
      </div>

      {/* Pipeline stages */}
      <div className="flex items-center gap-2 mb-5">
        {['Input', 'Observe', 'Predict', 'Rules', 'Validate'].map((stage, i) => (
          <div key={stage} className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              i < data.turns
                ? 'bg-accent/10 border-accent/25 text-accent'
                : 'bg-white/[0.02] border-border text-muted-foreground'
            }`}>
              {stage}
            </div>
            {i < 4 && (
              <div className="w-4 h-px bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Rule results */}
      <div className="space-y-2">
        {request.ruleResults.length > 0 ? (
          request.ruleResults.map((rule, i) => (
            <motion.div
              key={rule.ruleId}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-border"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${rule.passed ? 'bg-success' : 'bg-danger'}`} />
                <code className="text-xs font-mono text-foreground">{rule.ruleId}</code>
              </div>
              <span className={`text-xs font-medium ${rule.passed ? 'text-success' : 'text-danger'}`}>
                {rule.passed ? 'PASSED' : 'FAILED'}
              </span>
            </motion.div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No explicit rule results for this request.</p>
        )}
      </div>
    </div>
  );
}

function SignalDefinitionView({ data }: { data: GovernanceData }) {
  return (
    <div className="space-y-3">
      {data.signals.length > 0 ? (
        data.signals.map((signal, i) => (
          <motion.div
            key={signal.key}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="p-3 rounded-xl bg-white/[0.02] border border-border"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: signal.color }} />
              <span className="text-xs font-semibold text-foreground">{signal.label}</span>
              <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
                signal.type === 'observation'
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20'
              }`}>
                {signal.type === 'observation' ? 'Observation' : 'Prediction'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <code className="text-[10px] font-mono text-muted-foreground">{signal.key}</code>
              <span className="text-[10px] text-muted-foreground">
                Detected {signal.count}x across {signal.turns.length} turn(s)
              </span>
            </div>
          </motion.div>
        ))
      ) : (
        <p className="text-xs text-muted-foreground">No signals detected for this request.</p>
      )}
    </div>
  );
}
