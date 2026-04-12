import { useMemo } from "react";
import { UserAction } from "@/types/politician";
import { Politician } from "@/types/politician";
import { TrendingUp, Users, Scale, Zap } from "lucide-react";

interface DemocracyScoreProps {
  politicians: Politician[];
  actions: Record<string, UserAction>;
}

const AnimatedRing = ({ value, max, color, size = 80, label }: {
  value: number;
  max: number;
  color: string;
  size?: number;
  label: string;
}) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? value / max : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
};

export const DemocracyScore = ({ politicians, actions }: DemocracyScoreProps) => {
  const stats = useMemo(() => {
    const total = Object.keys(actions).length;
    const supported = Object.values(actions).filter(a => a === "support").length;
    const opposed = Object.values(actions).filter(a => a === "oppose").length;
    const neutral = Object.values(actions).filter(a => a === "neutral").length;

    const policyAreas = new Set<string>();
    const parties = new Set<string>();
    Object.keys(actions).forEach(id => {
      const p = politicians.find(pol => pol.id === id);
      if (p) {
        p.positions.forEach(pos => policyAreas.add(pos.area));
        parties.add(p.party);
      }
    });

    // Engagement score: how actively the user is using the app
    const engagementScore = Math.min(100, Math.round((total / politicians.length) * 100));
    // Diversity: how many different parties the user has engaged with
    const diversityScore = Math.min(100, parties.size * 25);

    return { total, supported, opposed, neutral, engagementScore, diversityScore, policyAreas: policyAreas.size, parties: parties.size };
  }, [actions, politicians]);

  if (stats.total === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-sm">Your Democracy Score</h3>
      </div>

      {/* Rings */}
      <div className="flex justify-around">
        <AnimatedRing value={stats.supported} max={stats.total} color="hsl(var(--support))" label="Support" />
        <AnimatedRing value={stats.opposed} max={stats.total} color="hsl(var(--oppose))" label="Oppose" />
        <AnimatedRing value={stats.neutral} max={stats.total} color="hsl(var(--neutral))" label="Neutral" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            Engagement
          </div>
          <div className="text-lg font-bold text-primary">{stats.engagementScore}%</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Scale className="w-3 h-3" />
            Diversity
          </div>
          <div className="text-lg font-bold text-primary">{stats.diversityScore}%</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            Topics
          </div>
          <div className="text-lg font-bold text-primary">{stats.policyAreas}</div>
        </div>
      </div>
    </div>
  );
};
