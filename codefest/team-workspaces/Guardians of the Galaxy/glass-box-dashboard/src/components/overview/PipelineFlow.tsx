import { motion } from 'framer-motion';
import { Layers, Brain, Eye, Scale, CheckSquare, ShieldCheck } from 'lucide-react';
import type { DashboardStats } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_COLORS } from '@/lib/themeColors';

interface Props {
  stats: DashboardStats;
}

const STAGES = [
  {
    key: 'embedding',
    label: 'Content Analysis',
    sublabel: 'Vector embeddings',
    icon: Layers,
    color: '#00d4ff',
    events: ['embedding_start', 'embedding_complete'],
    description: 'Agent input vectorised for semantic matching against the policy knowledge base',
  },
  {
    key: 'llm',
    label: 'AI Reasoning',
    sublabel: 'LLM interpretation',
    icon: Brain,
    color: '#a855f7',
    events: ['llm_prompt_start', 'llm_prompt_complete'],
    description: 'Internal LLM interprets the agent\'s request context and intent',
  },
  {
    key: 'observation',
    label: 'Risk Detection',
    sublabel: 'Behavioural signals',
    icon: Eye,
    color: '#f59e0b',
    events: ['inhibition_observation_description_response'],
    description: 'Suspicious behavioural patterns flagged across financial, privacy, and safety dimensions',
  },
  {
    key: 'prediction',
    label: 'Compliance Check',
    sublabel: 'Policy predictions',
    icon: Scale,
    color: '#ff3b5c',
    events: ['inhibition_prediction_reason_response'],
    description: 'Policy engine predicts which regulations and rules are at risk of violation',
  },
  {
    key: 'rules',
    label: 'Rule Evaluation',
    sublabel: 'Policy enforcement',
    icon: CheckSquare,
    color: '#00e5a0',
    events: ['rules_inhibition_rule_start', 'rules_inhibition_rule_passed', 'rules_inhibition_complete'],
    description: 'Structured rules evaluated against extracted values — binding failures trigger intervention',
  },
  {
    key: 'validation',
    label: 'Final Gate',
    sublabel: 'Validation & exit',
    icon: ShieldCheck,
    color: '#4ade80',
    events: ['inhibition_final_validation', 'request_success'],
    description: 'Final safety check before the request exits the Inhibitor pipeline',
  },
] as const;

export function PipelineFlow({ stats }: Props) {
  const { theme } = useTheme();
  const tc = THEME_COLORS[theme];
  const counts = STAGES.map(stage =>
    stage.events.reduce((sum, e) => sum + (stats.eventTypeCounts[e] || 0), 0)
  );
  const maxCount = Math.max(...counts, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Inhibitor Pipeline — Stage by Stage</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every request flows through all 6 stages in sequence. Counts show total events fired across {stats.totalRequests} requests.
          </p>
        </div>
      </div>

      {/* Stage row */}
      <div className="flex items-stretch gap-0">
        {STAGES.map((stage, idx) => {
          const count = counts[idx];
          const pct = Math.round((count / maxCount) * 100);
          const Icon = stage.icon;
          const isLast = idx === STAGES.length - 1;

          return (
            <div key={stage.key} className="flex items-stretch flex-1 min-w-0">
              {/* Stage card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08, duration: 0.4 }}
                className="flex-1 min-w-0 group relative rounded-xl p-4 border transition-all duration-200 cursor-default"
                style={{
                  background: `linear-gradient(135deg, ${stage.color}06, transparent)`,
                  borderColor: `${stage.color}20`,
                }}
              >
                {/* Top glow strip */}
                <div
                  className="absolute top-0 left-4 right-4 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${stage.color}60, transparent)` }}
                />

                {/* Step number + icon */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: `${stage.color}80` }}
                  >
                    Stage {idx + 1}
                  </span>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${stage.color}15`, border: `1px solid ${stage.color}25` }}
                  >
                    <Icon size={13} style={{ color: stage.color }} />
                  </div>
                </div>

                {/* Stage name */}
                <p className="text-xs font-semibold text-foreground leading-tight">{stage.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 mb-3">{stage.sublabel}</p>

                {/* Count */}
                <p
                  className="text-2xl font-bold tracking-tight mb-2"
                  style={{ color: stage.color, textShadow: theme === 'dark' ? `0 0 20px ${stage.color}30` : 'none' }}
                >
                  {count.toLocaleString()}
                </p>

                {/* Progress bar */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: `${stage.color}15` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3 + idx * 0.08, duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${stage.color}80, ${stage.color})` }}
                  />
                </div>

                {/* Tooltip on hover */}
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 rounded-lg text-[11px] text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border"
                  style={{
                    background: tc.tooltipBg,
                    borderColor: `${stage.color}30`,
                    boxShadow: tc.tooltipShadow,
                  }}
                >
                  {stage.description}
                </div>
              </motion.div>

              {/* Arrow connector */}
              {!isLast && (
                <div className="flex items-center flex-shrink-0 px-1.5">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 + idx * 0.08 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="w-4 h-px" style={{ background: `linear-gradient(90deg, ${stage.color}40, ${STAGES[idx + 1].color}40)` }} />
                    <div
                      className="w-0 h-0"
                      style={{
                        borderTop: '3px solid transparent',
                        borderBottom: '3px solid transparent',
                        borderLeft: `5px solid ${STAGES[idx + 1].color}50`,
                      }}
                    />
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: per-request averages */}
      <div className="mt-4 pt-4 border-t border-border flex items-center gap-6 text-[10px] text-muted-foreground">
        <span className="text-muted-foreground/50 uppercase tracking-wider">Per request avg:</span>
        {[
          { label: 'Embeddings', value: (counts[0] / 2 / stats.totalRequests).toFixed(1) },
          { label: 'LLM calls', value: (counts[1] / 2 / stats.totalRequests).toFixed(1) },
          { label: 'Risk signals', value: (counts[2] / stats.totalRequests).toFixed(1) },
          { label: 'Compliance checks', value: (counts[3] / stats.totalRequests).toFixed(1) },
          { label: 'Rules evaluated', value: ((stats.eventTypeCounts['rules_inhibition_rule_start'] || 0) / stats.totalRequests).toFixed(1) },
        ].map(item => (
          <span key={item.label}>
            <span className="text-foreground font-semibold">{item.value}</span>
            {' '}{item.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
