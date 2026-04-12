"use client";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function DonutChart({
  segments,
  size = 100,
  strokeWidth = 14,
  className = "",
}: Props) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let rotation = -90;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const pct = seg.value / total;
      const dashLen = pct * circumference;
      const gap = circumference - dashLen;
      const arc = {
        ...seg,
        pct,
        dashArray: `${dashLen} ${gap}`,
        rotation,
      };
      rotation += pct * 360;
      return arc;
    });

  return (
    <div className={`relative inline-block ${className}`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={arc.dashArray}
            strokeLinecap="butt"
            transform={`rotate(${arc.rotation} ${center} ${center})`}
          >
            <title>{arc.label}: {arc.value} ({Math.round(arc.pct * 100)}%)</title>
          </circle>
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold font-mono" style={{ color: "var(--panel-text)" }}>
          {total}
        </span>
      </div>
    </div>
  );
}
