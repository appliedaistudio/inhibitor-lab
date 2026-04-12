import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { COMPLIANCE_DOMAINS, humanizePrediction } from '@/lib/humanize';
import { useTheme } from '@/contexts/ThemeContext';
import { chartTooltipStyle, chartAxisStyle, THEME_COLORS } from '@/lib/themeColors';

interface Props {
  predictionKeyCounts: Record<string, number>;
}

export function ComplianceChart({ predictionKeyCounts }: Props) {
  const { theme } = useTheme();
  const tooltipStyle = chartTooltipStyle(theme);
  const axisStyle = chartAxisStyle(theme);
  const tc = THEME_COLORS[theme];

  const domainData = Object.entries(COMPLIANCE_DOMAINS).map(([, domain]) => {
    const total = domain.keys.reduce((sum, key) => sum + (predictionKeyCounts[key] || 0), 0);
    return {
      domain: domain.label, count: total, color: domain.color,
      details: domain.keys.map(key => ({ key, label: humanizePrediction(key), count: predictionKeyCounts[key] || 0 })).filter(d => d.count > 0).sort((a, b) => b.count - a.count),
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="glass-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">Compliance Checks by Domain</h3>
      <p className="text-xs text-muted-foreground mb-4">Prediction reasons grouped across 5 compliance domains</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={domainData} margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
            <XAxis dataKey="domain" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div style={{ background: tc.tooltipBg, border: `1px solid ${tc.tooltipBorder}`, boxShadow: tc.tooltipShadow }} className="rounded-lg p-3 max-w-xs">
                    <p className="text-sm font-medium text-foreground mb-2">{data.domain}: {data.count} total</p>
                    {data.details.map((d: { label: string; count: number }, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">{d.label}: <span className="text-foreground">{d.count}</span></p>
                    ))}
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {domainData.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
