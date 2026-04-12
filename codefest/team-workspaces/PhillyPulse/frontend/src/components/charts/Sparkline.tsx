"use client";

interface Props {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  filled?: boolean;
  className?: string;
}

export default function Sparkline({
  data,
  color = "#3b82f6",
  width = 120,
  height = 32,
  filled = false,
  className = "",
}: Props) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padY = 2;
  const usableH = height - padY * 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padY + usableH - ((v - min) / range) * usableH;
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
      {filled && (
        <path d={fillPath} fill={color} opacity={0.15} />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={padY + usableH - ((data[data.length - 1] - min) / range) * usableH}
        r={2}
        fill={color}
      />
    </svg>
  );
}
