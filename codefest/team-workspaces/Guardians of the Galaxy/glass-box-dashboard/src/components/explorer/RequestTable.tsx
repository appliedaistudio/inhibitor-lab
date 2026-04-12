import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { RequestLifecycle } from '@/lib/types';

interface Props {
  requests: RequestLifecycle[];
  onSelectRequest: (request: RequestLifecycle) => void;
  selectedId?: string;
  highlightId?: string;
}

type SortKey = 'startTime' | 'durationMs' | 'eventCount' | 'observations' | 'predictions';
type SortDir = 'asc' | 'desc';

export function RequestTable({ requests, onSelectRequest, selectedId, highlightId }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('startTime');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    let result = [...requests];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.apiKey.toLowerCase().includes(q) ||
        r.observations.some(o => o.key.includes(q)) ||
        r.predictions.some(p => p.key.includes(q))
      );
    }

    result.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortKey) {
        case 'startTime': aVal = a.startTime.getTime(); bVal = b.startTime.getTime(); break;
        case 'durationMs': aVal = a.durationMs; bVal = b.durationMs; break;
        case 'eventCount': aVal = a.eventCount; bVal = b.eventCount; break;
        case 'observations': aVal = a.observations.length; bVal = b.observations.length; break;
        case 'predictions': aVal = a.predictions.length; bVal = b.predictions.length; break;
        default: aVal = 0; bVal = 0;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [requests, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown size={12} className="opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-accent" />
      : <ChevronDown size={12} className="text-accent" />;
  };

  return (
    <div className="glass-card flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search requests, observations, predictions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      </div>

      {/* Table — scrollable body */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              {[
                { key: 'startTime' as SortKey, label: 'Time' },
                { key: 'durationMs' as SortKey, label: 'Duration' },
                { key: 'eventCount' as SortKey, label: 'Events' },
                { key: 'observations' as SortKey, label: 'Risk Signals' },
                { key: 'predictions' as SortKey, label: 'Compliance' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => (
              <motion.tr
                key={req.id}
                id={`req-row-${req.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => onSelectRequest(req)}
                className={`border-b border-border/50 cursor-pointer transition-colors ${
                  selectedId === req.id
                    ? 'bg-accent/10 border-accent/20'
                    : highlightId === req.id
                    ? 'bg-amber-400/5 border-amber-400/20'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="text-foreground font-mono text-xs">
                      {req.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{req.id}</p>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {(req.durationMs / 1000).toFixed(1)}s
                </td>
                <td className="px-4 py-3 text-xs text-foreground">{req.eventCount}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${req.observations.length > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    {req.observations.length}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${req.predictions.length > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {req.predictions.length}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {req.validationPassed ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <XCircle size={16} className="text-red-400" />
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground text-center flex-shrink-0">
        Showing {filtered.length} of {requests.length} requests
      </div>
    </div>
  );
}
