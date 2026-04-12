"use client";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"];

interface Props {
  /** 7 rows (Mon-Sun) x 24 cols (hours 0-23) */
  data: number[][];
  colorScale?: [string, string];
  width?: number;
  height?: number;
  className?: string;
}

export default function TimeGrid({
  data,
  colorScale = ["#1e293b", "#ef4444"],
  width = 280,
  height = 120,
  className = "",
}: Props) {
  if (data.length !== 7) return null;

  const labelW = 28;
  const labelH = 14;
  const gridW = width - labelW;
  const gridH = height - labelH;
  const cellW = gridW / 24;
  const cellH = gridH / 7;

  let max = 0;
  for (const row of data) for (const v of row) if (v > max) max = v;
  if (max === 0) max = 1;

  const lerp = (t: number) => {
    const r0 = parseInt(colorScale[0].slice(1, 3), 16);
    const g0 = parseInt(colorScale[0].slice(3, 5), 16);
    const b0 = parseInt(colorScale[0].slice(5, 7), 16);
    const r1 = parseInt(colorScale[1].slice(1, 3), 16);
    const g1 = parseInt(colorScale[1].slice(3, 5), 16);
    const b1 = parseInt(colorScale[1].slice(5, 7), 16);
    const r = Math.round(r0 + (r1 - r0) * t);
    const g = Math.round(g0 + (g1 - g0) * t);
    const b = Math.round(b0 + (b1 - b0) * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className}>
      {DAY_LABELS.map((d, row) => (
        <text
          key={d}
          x={labelW - 4}
          y={labelH + row * cellH + cellH / 2 + 3}
          textAnchor="end"
          fontSize={8}
          fill="var(--panel-text-muted)"
        >
          {d}
        </text>
      ))}
      {HOUR_LABELS.map((h, i) => (
        <text
          key={h}
          x={labelW + i * 3 * cellW + cellW * 1.5}
          y={10}
          textAnchor="middle"
          fontSize={7}
          fill="var(--panel-text-muted)"
        >
          {h}
        </text>
      ))}
      {data.map((row, rowIdx) =>
        row.map((val, colIdx) => (
          <rect
            key={`${rowIdx}-${colIdx}`}
            x={labelW + colIdx * cellW}
            y={labelH + rowIdx * cellH}
            width={cellW - 0.5}
            height={cellH - 0.5}
            rx={1}
            fill={lerp(val / max)}
            opacity={0.9}
          >
            <title>{DAY_LABELS[rowIdx]} {colIdx}:00 — {val} incident{val !== 1 ? "s" : ""}</title>
          </rect>
        ))
      )}
    </svg>
  );
}
