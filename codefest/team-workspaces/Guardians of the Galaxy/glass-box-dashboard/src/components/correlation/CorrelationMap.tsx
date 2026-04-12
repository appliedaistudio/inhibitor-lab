import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Network } from 'lucide-react';
import type { RequestLifecycle } from '@/lib/types';
import { buildCorrelationData, type CorrelationNode, type CorrelationLink } from '@/lib/correlations';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_COLORS } from '@/lib/themeColors';

interface Props {
  requests: RequestLifecycle[];
}

interface SimNode extends CorrelationNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function CorrelationMap({ requests }: Props) {
  const { theme, isDark } = useTheme();
  const tc = THEME_COLORS[theme];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<CorrelationLink[]>([]);
  const selectedRef = useRef<string | null>(null);
  const [selected, setSelected] = useState<SimNode | null>(null);

  const WIDTH = 850;
  const HEIGHT = 520;

  // Build data on mount
  useEffect(() => {
    const data = buildCorrelationData(requests, 10);
    const obsNodes = data.nodes.filter(n => n.type === 'observation');
    const predNodes = data.nodes.filter(n => n.type === 'prediction');

    nodesRef.current = [
      ...obsNodes.map((n, i) => ({
        ...n,
        x: 180,
        y: 50 + (i / Math.max(obsNodes.length - 1, 1)) * (HEIGHT - 100),
        vx: 0, vy: 0,
      })),
      ...predNodes.map((n, i) => ({
        ...n,
        x: WIDTH - 180,
        y: 50 + (i / Math.max(predNodes.length - 1, 1)) * (HEIGHT - 100),
        vx: 0, vy: 0,
      })),
    ];
    linksRef.current = data.links;
  }, [requests]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = WIDTH * 2;
    canvas.height = HEIGHT * 2;
    ctx.scale(2, 2);

    let running = true;
    let frame = 0;

    function render() {
      if (!running) return;
      frame++;
      const nodes = nodesRef.current;
      const links = linksRef.current;
      if (nodes.length === 0) { requestAnimationFrame(render); return; }

      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const selId = selectedRef.current;

      // Light physics (first 200 frames only)
      if (frame < 200) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[i].type !== nodes[j].type) continue;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.max(Math.abs(dy), 5);
            const force = 80 / (dist * dist);
            nodes[i].vy -= (dy > 0 ? force : -force);
            nodes[j].vy += (dy > 0 ? force : -force);
          }
        }
        for (const node of nodes) {
          node.vy *= 0.9;
          node.y += node.vy;
          node.y = Math.max(25, Math.min(HEIGHT - 25, node.y));
        }
      }

      // Clear
      ctx!.clearRect(0, 0, WIDTH, HEIGHT);

      // Column labels
      ctx!.font = '600 9px Inter, sans-serif';
      ctx!.fillStyle = isDark ? '#64748b' : '#475569';
      ctx!.textAlign = 'center';
      ctx!.fillText('R I S K   S I G N A L S', 180, 18);
      ctx!.fillText('C O N S E Q U E N C E S', WIDTH - 180, 18);

      // Determine connected set
      const connectedIds = new Set<string>();
      if (selId) {
        connectedIds.add(selId);
        for (const link of links) {
          if (link.source === selId || link.target === selId) {
            connectedIds.add(link.source);
            connectedIds.add(link.target);
          }
        }
      }

      // Draw links
      const maxWeight = Math.max(...links.map(l => l.weight), 1);
      for (const link of links) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) continue;

        const isHigh = selId && (link.source === selId || link.target === selId);
        const isDimmed = selId && !isHigh;
        const width = 1 + (link.weight / maxWeight) * 3;

        const cp1x = s.x + (t.x - s.x) * 0.4;
        const cp2x = s.x + (t.x - s.x) * 0.6;

        ctx!.beginPath();
        ctx!.moveTo(s.x, s.y);
        ctx!.bezierCurveTo(cp1x, s.y, cp2x, t.y, t.x, t.y);
        ctx!.strokeStyle = isHigh
          ? (isDark ? 'rgba(0, 212, 255, 0.5)' : 'rgba(2, 132, 199, 0.5)')
          : isDimmed
          ? (isDark ? 'rgba(74, 85, 104, 0.04)' : 'rgba(100, 116, 139, 0.06)')
          : (isDark ? 'rgba(74, 85, 104, 0.12)' : 'rgba(100, 116, 139, 0.18)');
        ctx!.lineWidth = isHigh ? width + 1 : width;
        ctx!.stroke();

        if (isHigh) {
          ctx!.beginPath();
          ctx!.moveTo(s.x, s.y);
          ctx!.bezierCurveTo(cp1x, s.y, cp2x, t.y, t.x, t.y);
          ctx!.strokeStyle = 'rgba(0, 212, 255, 0.08)';
          ctx!.lineWidth = width + 8;
          ctx!.stroke();
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const isActive = selId === node.id;
        const isDimmed = selId && !connectedIds.has(node.id);
        const r = 5 + Math.min(node.count / 15, 1) * 5;

        if (isActive) {
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, r + 10, 0, Math.PI * 2);
          ctx!.fillStyle = `${node.color}15`;
          ctx!.fill();
        }

        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = isDimmed ? `${node.color}25` : `${node.color}bb`;
        ctx!.fill();

        if (isActive) {
          ctx!.strokeStyle = node.color;
          ctx!.lineWidth = 2;
          ctx!.stroke();
        }

        // Label — use theme-aware text colors
        const alpha = isDimmed ? 0.15 : 0.85;
        const labelRgb = isDark ? '226, 232, 240' : '15, 23, 42';
        const countRgb = isDark ? '148, 163, 184' : '71, 85, 105';
        ctx!.font = `${isActive ? '600' : '500'} 10px Inter, sans-serif`;
        ctx!.fillStyle = `rgba(${labelRgb}, ${alpha})`;
        ctx!.textAlign = node.type === 'observation' ? 'right' : 'left';
        const lx = node.type === 'observation' ? node.x - r - 8 : node.x + r + 8;
        ctx!.fillText(node.label.substring(0, 24), lx, node.y + 3);

        ctx!.font = '700 9px Inter, sans-serif';
        ctx!.fillStyle = `rgba(${countRgb}, ${Math.max(alpha * 0.8, 0.5)})`;
        ctx!.fillText(`${node.count}x`, lx, node.y + 15);
      }

      if (frame < 200 || selId !== selectedRef.current) {
        requestAnimationFrame(render);
      } else {
        // Idle: render once more after a delay in case of selection change
        setTimeout(() => { if (running) requestAnimationFrame(render); }, 100);
      }
    }

    render();

    return () => { running = false; };
  }, [requests, selected, theme, isDark]);

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (WIDTH / rect.width);
    const my = (e.clientY - rect.top) * (HEIGHT / rect.height);

    for (const node of nodesRef.current) {
      const r = 5 + Math.min(node.count / 15, 1) * 5 + 8;
      const dx = node.x - mx;
      const dy = node.y - my;
      if (dx * dx + dy * dy < r * r) {
        const newSel = selectedRef.current === node.id ? null : node;
        selectedRef.current = newSel?.id || null;
        setSelected(newSel);
        return;
      }
    }
    selectedRef.current = null;
    setSelected(null);
  }, []);

  // Detail panel links
  const connLinks = selected
    ? linksRef.current
        .filter(l => l.source === selected.id || l.target === selected.id)
        .sort((a, b) => b.weight - a.weight)
    : [];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center">
          <Network size={20} className="text-[#00d4ff]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Risk Correlation Map</h2>
          <p className="text-sm text-muted-foreground">
            How AI behaviors connect to real-world consequences. Click any node to explore.
          </p>
        </div>
      </motion.div>

      <div className="flex gap-4">
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-4 flex-1 min-w-0"
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', maxWidth: WIDTH, height: HEIGHT, display: 'block', cursor: 'pointer' }}
            onClick={handleClick}
          />
          <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-border">
            <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffb547' }} /> Risk Signals (What AI Did)
            </span>
            <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff3b5c' }} /> Consequences (What Follows)
            </span>
            <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="w-8 h-px" style={{ backgroundColor: '#00d4ff' }} /> Co-occurrence
            </span>
          </div>
        </motion.div>

        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-5 w-64 flex-shrink-0 self-start"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selected.color }} />
              <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                {selected.type === 'observation' ? 'Risk Signal' : 'Consequence'}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">{selected.label}</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Detected in <span style={{ color: selected.color }} className="font-bold">{selected.count}</span> requests
            </p>

            <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2">
              {selected.type === 'observation' ? 'Leads to' : 'Caused by'}
            </p>
            <div className="space-y-1.5">
              {connLinks.map(link => {
                const otherId = link.source === selected.id ? link.target : link.source;
                const other = nodesRef.current.find(n => n.id === otherId);
                if (!other) return null;
                return (
                  <div key={otherId} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                    <span className="text-[11px] text-foreground truncate max-w-[140px]">{other.label}</span>
                    <span className="text-[11px] font-mono font-bold" style={{ color: '#00d4ff' }}>
                      {link.weight}x
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
