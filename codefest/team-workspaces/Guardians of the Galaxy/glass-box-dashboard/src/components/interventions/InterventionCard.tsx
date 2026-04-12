import { ShieldCheck, ArrowRight, Ban, Lock, UserCheck, Search } from 'lucide-react';
import type { InterventionEvent } from '@/lib/types';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_COLORS } from '@/lib/themeColors';

interface Props {
  event: InterventionEvent;
  index: number;
  onExplore?: () => void;
}

const AGENT_CONFIG: Record<string, { emoji: string; domain: string; color: string }> = {
  'finance-agent-alpha': { emoji: '💰', domain: 'Financial Operations', color: '#f59e0b' },
  'privacy-agent-beta': { emoji: '🔒', domain: 'Data Privacy', color: '#8b5cf6' },
  'ops-agent-gamma': { emoji: '⚙️', domain: 'Operations Security', color: '#ef4444' },
};

const CORRECTION_STRATEGIES: Record<string, { label: string; icon: typeof Ban; color: string }> = {
  blocked: { label: 'Gate Strategy', icon: UserCheck, color: '#f59e0b' },
  interrupted: { label: 'Reject Strategy', icon: Ban, color: '#ef4444' },
};

const POLICY_EXPLANATIONS: Record<string, string> = {
  'FIN-UNVERIFIED-LARGE-TRANSFER': 'Financial safeguard that requires human approval for transfers above a configured threshold.',
  'GDPR-PII-REDACTION': 'Privacy protection that prevents personally identifiable information from being shared externally.',
  'SEC-PROMPT-INJECTION': 'Security defense that detects and blocks attempts to override AI safety policies through crafted inputs.',
};

export function InterventionCard({ event, onExplore }: Props) {
  const { theme } = useTheme();
  const tc = THEME_COLORS[theme];
  // Guard all fields — prevent crash on malformed data
  const agentId = event.agent_id || 'unknown-agent';
  const action = event.action || 'unknown';
  const policyTrigger = event.policy_trigger || '';
  const severity = event.severity || 'medium';
  const reason = event.reason || 'No reason provided';
  const proposedAction = event.proposed_action || 'N/A';
  const correctedAction = event.corrected_action || 'N/A';
  const requestId = event.request_id || '';
  const timestamp = event.timestamp || '';

  const agent = AGENT_CONFIG[agentId] || { emoji: '🤖', domain: 'Unknown Agent', color: '#64748b' };
  const correction = action === 'blocked'
    ? (policyTrigger.startsWith('GDPR') ? { label: 'Sanitize Strategy', icon: Lock, color: '#8b5cf6' } : CORRECTION_STRATEGIES.blocked)
    : CORRECTION_STRATEGIES[action] || { label: action, icon: Ban, color: '#64748b' };
  const CorrectionIcon = correction.icon;

  return (
    <div className="glass-card glass-card-hover">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: `${agent.color}15` }}
            >
              {agent.emoji}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{agentId}</h3>
              <p className="text-xs text-muted-foreground">{agent.domain}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SeverityBadge severity={severity} />
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-border text-muted-foreground">
              {action.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Policy Trigger */}
        {policyTrigger && (
          <div className="flex items-center gap-2 mt-4">
            <code className="text-xs font-mono px-2 py-1 rounded bg-white/5 text-accent border border-accent/20">
              {policyTrigger}
            </code>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: correction.color }}>
              <CorrectionIcon size={13} />
              {correction.label}
            </div>
          </div>
        )}
      </div>

      {/* Reason */}
      <div className="px-6 py-4 border-b border-border">
        <p className="text-sm text-foreground">{reason}</p>
        {POLICY_EXPLANATIONS[policyTrigger] && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            {POLICY_EXPLANATIONS[policyTrigger]}
          </p>
        )}
      </div>

      {/* Before vs After */}
      <div className="grid grid-cols-[1fr,auto,1fr]">
        {/* Proposed (dangerous) */}
        <div className="p-5 border-r border-border" style={{ background: tc.dangerBg }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tc.danger }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: tc.danger }}>
              What AI Proposed
            </span>
          </div>
          <p className="text-sm" style={{ color: tc.dangerLight }}>{proposedAction}</p>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center px-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: tc.accentBg }}>
            <ArrowRight size={14} className="text-accent" />
          </div>
        </div>

        {/* Corrected (safe) */}
        <div className="p-5 border-l border-border" style={{ background: tc.successBg }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={14} style={{ color: tc.success }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: tc.success }}>
              What Inhibitor Did
            </span>
          </div>
          <p className="text-sm" style={{ color: tc.successLight }}>{correctedAction}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-white/[0.02] border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {timestamp ? new Date(timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
          }) : 'Unknown time'}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground/50">{requestId}</span>
          {onExplore && (
            <button
              onClick={onExplore}
              className="flex items-center gap-1.5 text-xs text-accent/70 hover:text-accent transition-colors"
            >
              <Search size={11} />
              Explore request chains
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
