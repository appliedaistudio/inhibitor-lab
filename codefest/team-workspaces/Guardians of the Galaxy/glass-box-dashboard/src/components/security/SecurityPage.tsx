import { Lock, Globe, AlertTriangle, Terminal, Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AuthFailure } from '@/lib/types';

interface Props {
  authFailures: AuthFailure[];
}

const THREAT_TYPES: Record<string, { label: string; color: string }> = {
  '/.env': { label: 'Credential Harvesting', color: '#ef4444' },
  '//.env': { label: 'Credential Harvesting', color: '#ef4444' },
  '/robots.txt': { label: 'Reconnaissance', color: '#f59e0b' },
  '/': { label: 'Service Probing', color: '#3b82f6' },
};

const COUNTRY_FLAGS: Record<string, string> = {
  NL: '🇳🇱',
  US: '🇺🇸',
  GB: '🇬🇧',
  DE: '🇩🇪',
  CN: '🇨🇳',
  RU: '🇷🇺',
};

const COUNTRY_NAMES: Record<string, string> = {
  NL: 'Netherlands',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  CN: 'China',
  RU: 'Russia',
};

export function SecurityPage({ authFailures }: Props) {
  // Country breakdown
  const countryCounts: Record<string, number> = {};
  for (const f of authFailures) {
    countryCounts[f.country] = (countryCounts[f.country] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Lock size={20} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Security Events</h2>
          <p className="text-sm text-muted-foreground">
            {authFailures.length} unauthorized access attempts detected and blocked
          </p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        {/* Geographic Origins */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={15} className="text-accent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Origins</span>
          </div>
          <div className="space-y-2">
            {Object.entries(countryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([code, count]) => (
                <div key={code} className="flex items-center justify-between">
                  <span className="text-sm">
                    {COUNTRY_FLAGS[code] || '🌐'} {COUNTRY_NAMES[code] || code}
                  </span>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Threat Types */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Threat Types</span>
          </div>
          <div className="space-y-2">
            {Object.entries(
              authFailures.reduce((acc, f) => {
                const threat = THREAT_TYPES[f.path]?.label || 'Unknown';
                acc[threat] = (acc[threat] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{type}</span>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Targets */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crosshair size={15} className="text-red-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Targets</span>
          </div>
          <div className="space-y-2">
            {Object.entries(
              authFailures.reduce((acc, f) => {
                acc[f.host] = (acc[f.host] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
              .sort((a, b) => b[1] - a[1])
              .map(([host, count]) => (
                <div key={host} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">{host}</span>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </motion.div>

      {/* Individual Alert Cards */}
      <div className="space-y-3">
        {authFailures.map((failure, i) => {
          const threat = THREAT_TYPES[failure.path] || { label: 'Unknown', color: '#64748b' };
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="glass-card glass-card-hover p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Terminal size={18} className="text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full border"
                        style={{
                          color: threat.color,
                          borderColor: `${threat.color}40`,
                          backgroundColor: `${threat.color}15`,
                        }}
                      >
                        {threat.label}
                      </span>
                      <code className="text-xs font-mono text-muted-foreground">
                        {failure.method} {failure.path}
                      </code>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        {COUNTRY_FLAGS[failure.country] || '🌐'} {failure.ip}
                      </span>
                      <span className="truncate max-w-[300px]">{failure.userAgent}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {failure.timestamp.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
