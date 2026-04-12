import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { humanizeEvent, categorizeEvent, CATEGORY_COLORS } from '@/lib/humanize';
import { useTheme } from '@/contexts/ThemeContext';
import { chartTooltipStyle, chartAxisStyle } from '@/lib/themeColors';

interface Props {
  eventTypeCounts: Record<string, number>;
}

export function EventBreakdownChart({ eventTypeCounts }: Props) {
  const { theme } = useTheme();
  const tooltipStyle = chartTooltipStyle(theme);
  const axisStyle = chartAxisStyle(theme);

  const data = Object.entries(eventTypeCounts)
    .filter(([key]) => key !== 'event')
    .map(([event, count]) => ({
      event,
      label: humanizeEvent(event),
      count,
      color: CATEGORY_COLORS[categorizeEvent(event)],
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">Pipeline Event Distribution</h3>
      <p className="text-xs text-muted-foreground mb-4">
        How the {Object.values(eventTypeCounts).reduce((a, b) => a + b, 0).toLocaleString()} events break down by type
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 160, right: 30, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" tick={axisStyle} width={155} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [Number(value).toLocaleString(), 'Events']} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
