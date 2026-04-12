import { motion } from 'framer-motion';
import { Shield, Activity, Users, Lock, Zap, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  onSelect: (question: string) => void;
}

const SUGGESTIONS = [
  { icon: Shield, text: "What's our compliance status?", color: '#00e5a0' },
  { icon: AlertTriangle, text: 'Explain the most serious intervention', color: '#ff3b5c' },
  { icon: Users, text: 'Which agent triggered the most blocks?', color: '#ffb547' },
  { icon: Lock, text: 'Were there any GDPR violations?', color: '#a855f7' },
  { icon: Zap, text: 'How fast is the AI reasoning pipeline?', color: '#00d4ff' },
  { icon: Activity, text: 'Show me the security events', color: '#ff3b5c' },
];

export function SuggestedQuestions({ onSelect }: Props) {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3">
          <Shield size={22} className="text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">The Assistant</h3>
        <p className="text-xs text-muted-foreground">Ask about safety events, compliance, and risks</p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full">
        {SUGGESTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSelect(s.text)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                isDark
                  ? 'bg-white/[0.03] border-border hover:border-accent/25 hover:bg-white/[0.06]'
                  : 'bg-gray-50 border-gray-200 hover:border-accent/40 hover:bg-gray-100'
              }`}
            >
              <Icon size={14} style={{ color: s.color }} className="shrink-0" />
              <span className="text-xs text-foreground/80">{s.text}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
