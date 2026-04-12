import { memo, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { humanizeObservation } from '@/lib/humanize';
import { useTheme } from '@/contexts/ThemeContext';
import { chartAxisStyle, THEME_COLORS } from '@/lib/themeColors';

interface Props {
  observationKeyCounts: Record<string, number>;
}

export const RiskRadar = memo(function RiskRadar({ observationKeyCounts }: Props) {
  const { theme } = useTheme();
  const tc = THEME_COLORS[theme];

  const data = useMemo(() => {
    const sorted = Object.entries(observationKeyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const maxVal = sorted[0]?.[1] || 1;
    return sorted.map(([key, count]) => ({
      subject: humanizeObservation(key).split(' ').slice(0, 3).join(' '),
      fullLabel: humanizeObservation(key),
      count,
      fullMark: maxVal,
    }));
  }, [observationKeyCounts]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className="glass-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">Risk Signal Radar</h3>
      <p className="text-xs text-muted-foreground mb-2">Top 10 detected risk patterns by frequency</p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            <PolarGrid stroke={tc.gridStroke} strokeWidth={1} />
            <PolarAngleAxis dataKey="subject" tick={chartAxisStyle(theme, 9)} tickLine={false} />
            <PolarRadiusAxis tick={{ fill: tc.muted, fontSize: 9 }} axisLine={false} tickCount={4} />
            <Radar name="Risk Signals" dataKey="count" stroke="#ffb547" fill="#ffb547" fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});
