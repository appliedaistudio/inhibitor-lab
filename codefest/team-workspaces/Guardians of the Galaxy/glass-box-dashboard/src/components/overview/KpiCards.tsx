import { useEffect, useState } from 'react';
import { Activity, Eye, Scale, ShieldCheck, ShieldX } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DashboardStats } from '@/lib/types';

interface Props {
  stats: DashboardStats;
}

function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    function step(ts: number) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target, duration]);

  return <>{value.toLocaleString()}</>;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};

export function KpiCards({ stats }: Props) {
  const cards = [
    {
      label: 'Requests Analyzed',
      value: stats.totalRequests,
      suffix: '',
      icon: Activity,
      color: '#00d4ff',
      glowClass: 'glow-accent',
    },
    {
      label: 'Risk Signals',
      value: stats.totalObservations,
      suffix: '',
      icon: Eye,
      color: '#ffb547',
      glowClass: 'glow-warning',
    },
    {
      label: 'Compliance Checks',
      value: stats.totalPredictions,
      suffix: '',
      icon: Scale,
      color: '#a855f7',
      glowClass: '',
    },
    {
      label: 'Pipeline Success',
      value: Math.round(stats.validationPassRate * 100),
      suffix: '%',
      icon: ShieldCheck,
      color: '#00e5a0',
      glowClass: 'glow-success',
    },
    {
      label: 'Probes Blocked',
      value: stats.totalAuthFailures,
      suffix: '',
      icon: ShieldX,
      color: '#ff3b5c',
      glowClass: 'glow-danger',
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-5 gap-4"
    >
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            variants={item}
            className="glass-card glass-card-hover relative p-5"
          >
            {/* Top glow accent */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${card.color}60, transparent)` }}
            />

            {/* Background pulse */}
            <div
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.07]"
              style={{ background: `radial-gradient(circle, ${card.color}, transparent)` }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                  {card.label}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${card.color}15`, border: `1px solid ${card.color}25` }}
                >
                  <Icon size={15} style={{ color: card.color }} />
                </div>
              </div>
              <p
                className="text-3xl font-bold tracking-tight"
                style={{ color: card.color, textShadow: `0 0 20px ${card.color}40` }}
              >
                <AnimatedCounter target={card.value} />
                {card.suffix}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
