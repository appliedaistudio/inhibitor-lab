import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { GovernanceSignal } from '@/lib/governanceData';

interface Props {
  signals: GovernanceSignal[];
  turns: number;
}

const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_RING = 5;
const INNER_R = 30;
const OUTER_R = 170;

function ringRadius(ring: number): number {
  return INNER_R + ((ring / MAX_RING) * (OUTER_R - INNER_R));
}

function polarToCart(angle: number, r: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** Build an SVG arc path for a wedge segment */
function arcPath(startAngle: number, endAngle: number, innerR: number, outerR: number): string {
  const s1 = polarToCart(startAngle, innerR);
  const s2 = polarToCart(startAngle, outerR);
  const e1 = polarToCart(endAngle, innerR);
  const e2 = polarToCart(endAngle, outerR);
  const sweep = endAngle - startAngle;
  const largeArc = sweep > 180 ? 1 : 0;

  return [
    `M ${s1.x} ${s1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${e2.x} ${e2.y}`,
    `L ${e1.x} ${e1.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${s1.x} ${s1.y}`,
    'Z',
  ].join(' ');
}

/** Truncate label to fit */
function truncLabel(label: string, maxLen: number): string {
  return label.length > maxLen ? label.slice(0, maxLen) + '...' : label;
}

export function GovernanceRadarChart({ signals, turns }: Props) {
  const topSignals = useMemo(() => signals.slice(0, 8), [signals]);
  const segmentAngle = topSignals.length > 0 ? 360 / topSignals.length : 360;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full max-w-[400px] max-h-[400px]">
      <defs>
        {/* Glow filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Concentric ring grid */}
      {Array.from({ length: MAX_RING }, (_, i) => i + 1).map(ring => (
        <circle
          key={ring}
          cx={CX}
          cy={CY}
          r={ringRadius(ring)}
          fill="none"
          stroke="rgba(0, 212, 255, 0.08)"
          strokeWidth={0.5}
        />
      ))}

      {/* Ring number labels */}
      {Array.from({ length: MAX_RING }, (_, i) => i + 1).map(ring => {
        const r = ringRadius(ring);
        return (
          <text
            key={`label-${ring}`}
            x={CX + r + 4}
            y={CY - 2}
            fill="rgba(148, 163, 184, 0.5)"
            fontSize={9}
            fontFamily="monospace"
          >
            {ring}
          </text>
        );
      })}

      {/* Radial axis lines */}
      {topSignals.map((_, i) => {
        const angle = i * segmentAngle;
        const p = polarToCart(angle, OUTER_R + 5);
        return (
          <line
            key={`axis-${i}`}
            x1={CX}
            y1={CY}
            x2={p.x}
            y2={p.y}
            stroke="rgba(0, 212, 255, 0.06)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Signal wedge areas */}
      {topSignals.map((signal, i) => {
        const startAngle = i * segmentAngle + 2;
        const endAngle = (i + 1) * segmentAngle - 2;
        const value = Math.min(signal.count, MAX_RING);
        const valueR = ringRadius(value);

        return (
          <motion.path
            key={`wedge-${signal.key}`}
            d={arcPath(startAngle, endAngle, INNER_R, valueR)}
            fill={signal.color}
            fillOpacity={0.2}
            stroke={signal.color}
            strokeWidth={1}
            strokeOpacity={0.5}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />
        );
      })}

      {/* Connecting strands between signals (the orbital web effect) */}
      {topSignals.map((signal, i) => {
        const nextIdx = (i + 1) % topSignals.length;
        const nextSignal = topSignals[nextIdx];
        const angle1 = i * segmentAngle + segmentAngle / 2;
        const angle2 = nextIdx * segmentAngle + segmentAngle / 2;
        const r1 = ringRadius(Math.min(signal.count, MAX_RING));
        const r2 = ringRadius(Math.min(nextSignal.count, MAX_RING));
        const p1 = polarToCart(angle1, r1);
        const p2 = polarToCart(angle2, r2);
        const cp1 = polarToCart((angle1 + angle2) / 2, (r1 + r2) / 2 + 20);

        return (
          <motion.path
            key={`strand-${i}`}
            d={`M ${p1.x} ${p1.y} Q ${cp1.x} ${cp1.y} ${p2.x} ${p2.y}`}
            fill="none"
            stroke={signal.color}
            strokeWidth={1.5}
            strokeOpacity={0.3}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
          />
        );
      })}

      {/* Data point dots at the peak of each wedge */}
      {topSignals.map((signal, i) => {
        const midAngle = i * segmentAngle + segmentAngle / 2;
        const value = Math.min(signal.count, MAX_RING);
        const r = ringRadius(value);
        const p = polarToCart(midAngle, r);

        return (
          <motion.circle
            key={`dot-${signal.key}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={signal.color}
            stroke="rgba(5, 5, 8, 0.8)"
            strokeWidth={2}
            filter="url(#glow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.4, type: 'spring' }}
          />
        );
      })}

      {/* Outer signal labels */}
      {topSignals.map((signal, i) => {
        const midAngle = i * segmentAngle + segmentAngle / 2;
        const labelR = OUTER_R + 22;
        const p = polarToCart(midAngle, labelR);

        // Determine text-anchor based on position
        const normalizedAngle = ((midAngle % 360) + 360) % 360;
        let anchor: 'start' | 'middle' | 'end' = 'middle';
        if (normalizedAngle > 30 && normalizedAngle < 150) anchor = 'start';
        else if (normalizedAngle > 210 && normalizedAngle < 330) anchor = 'end';

        return (
          <text
            key={`label-${signal.key}`}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="central"
            fill={signal.color}
            fontSize={10}
            fontWeight={500}
          >
            {truncLabel(signal.label, 18)}
          </text>
        );
      })}

      {/* Center label */}
      <text
        x={CX}
        y={CY - 6}
        textAnchor="middle"
        fill="rgba(148, 163, 184, 0.4)"
        fontSize={8}
        fontWeight={600}
        letterSpacing={2}
      >
        ENVIRONMENT
      </text>
      <text
        x={CX}
        y={CY + 8}
        textAnchor="middle"
        fill="rgba(148, 163, 184, 0.4)"
        fontSize={8}
        fontWeight={600}
        letterSpacing={2}
      >
        AGENT
      </text>
    </svg>
  );
}
