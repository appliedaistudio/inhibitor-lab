"use client";

interface Props {
  /** Incident count for each hour 0-23 */
  data: number[];
  size?: number;
  className?: string;
}

export default function HourClock({
  data,
  size = 100,
  className = "",
}: Props) {
  if (data.length !== 24) return null;

  const max = Math.max(...data, 1);
  const center = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.45;
  const arcAngle = (2 * Math.PI) / 24;

  const polarToCart = (angle: number, r: number) => ({
    x: center + r * Math.cos(angle - Math.PI / 2),
    y: center + r * Math.sin(angle - Math.PI / 2),
  });

  const arcs = data.map((count, hour) => {
    const startAngle = hour * arcAngle;
    const endAngle = startAngle + arcAngle - 0.02;
    const intensity = count / max;
    const r = innerR + (outerR - innerR) * Math.max(0.15, intensity);

    const p1 = polarToCart(startAngle, innerR);
    const p2 = polarToCart(startAngle, r);
    const p3 = polarToCart(endAngle, r);
    const p4 = polarToCart(endAngle, innerR);

    const g = Math.round(255 * (1 - intensity * 0.7));
    const red = Math.round(180 + 75 * intensity);
    const color = intensity > 0.5
      ? `rgb(${red}, ${Math.round(g * 0.4)}, ${Math.round(g * 0.3)})`
      : `rgb(${Math.round(50 + 100 * intensity)}, ${Math.round(60 + 80 * intensity)}, ${Math.round(100 + 50 * intensity)})`;

    return (
      <path
        key={hour}
        d={`M${p1.x},${p1.y} L${p2.x},${p2.y} A${r},${r} 0 0,1 ${p3.x},${p3.y} L${p4.x},${p4.y} A${innerR},${innerR} 0 0,0 ${p1.x},${p1.y}`}
        fill={color}
        opacity={0.85}
      >
        <title>{hour}:00 — {count} incident{count !== 1 ? "s" : ""}</title>
      </path>
    );
  });

  const hourMarks = [0, 6, 12, 18].map((h) => {
    const angle = h * arcAngle;
    const p = polarToCart(angle, outerR + 1);
    const labels = ["12a", "6a", "12p", "6p"];
    return (
      <text
        key={h}
        x={p.x}
        y={p.y + 3}
        textAnchor="middle"
        fontSize={7}
        fill="var(--panel-text-muted)"
      >
        {labels[h / 6]}
      </text>
    );
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={className}>
      {arcs}
      {hourMarks}
    </svg>
  );
}
