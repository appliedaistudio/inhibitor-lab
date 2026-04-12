import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import type { DashboardStats } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';
import { chartTooltipStyle, chartAxisStyle } from '@/lib/themeColors';

interface Props {
  requestsPerHour: DashboardStats['requestsPerHour'];
}

export function TimelineChart({ requestsPerHour }: Props) {
  const { theme } = useTheme();
  const tooltipStyle = chartTooltipStyle(theme);
  const axisStyle = chartAxisStyle(theme);
  const axisStyle10 = chartAxisStyle(theme, 10);

  const data = requestsPerHour.map(item => ({
    ...item,
    label: new Date(item.hour).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }} className="glass-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">Request Volume Over Time</h3>
      <p className="text-xs text-muted-foreground mb-4">Requests processed per hour across the monitoring window</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={axisStyle10} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [Number(value), 'Requests']} />
            <Area type="monotone" dataKey="count" stroke="#00d4ff" strokeWidth={2} fill="url(#volumeGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
