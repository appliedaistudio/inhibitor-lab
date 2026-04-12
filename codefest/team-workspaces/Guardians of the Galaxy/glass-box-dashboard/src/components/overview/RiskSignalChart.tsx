import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { humanizeObservation } from '@/lib/humanize';
import { useTheme } from '@/contexts/ThemeContext';
import { chartTooltipStyle, chartAxisStyle } from '@/lib/themeColors';

interface Props {
  observationKeyCounts: Record<string, number>;
}

export function RiskSignalChart({ observationKeyCounts }: Props) {
  const { theme } = useTheme();
  const tooltipStyle = chartTooltipStyle(theme);
  const axisStyle = chartAxisStyle(theme);

  const data = Object.entries(observationKeyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([key, count]) => ({ key, label: humanizeObservation(key), count }));

  const total = Object.values(observationKeyCounts).reduce((a, b) => a + b, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="glass-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">Top Risk Signals</h3>
      <p className="text-xs text-muted-foreground mb-4">{total.toLocaleString()} risk signals detected across {Object.keys(observationKeyCounts).length} categories</p>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 180, right: 30, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" tick={axisStyle} width={175} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [Number(value).toLocaleString(), 'Occurrences']} />
            <Bar dataKey="count" fill="#ffb547" fillOpacity={0.8} radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
