import { Politician, UserAction } from "@/types/politician";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, ThumbsUp, Calendar, MapPin, CheckCircle2 } from "lucide-react";

interface VotingCheatSheetProps {
  politicians: Politician[];
  actions: Record<string, UserAction>;
}

const VOTING_SEASONS = [
  { id: "primary-2025", label: "Primary Election 2025", date: "May 20, 2025" },
  { id: "general-2025", label: "General Election 2025", date: "Nov 4, 2025" },
  { id: "primary-2026", label: "Primary Election 2026", date: "May 19, 2026" },
  { id: "general-2026", label: "General Election 2026", date: "Nov 3, 2026" },
];

export const VotingCheatSheet = ({ politicians, actions }: VotingCheatSheetProps) => {
  // Deduplicate: only include each politician once
  const seenIds = new Set<string>();
  const supportedPoliticians = politicians.filter((p) => {
    if (actions[p.id] !== "support") return false;
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  if (supportedPoliticians.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">No favorites yet</h2>
        <p className="text-muted-foreground">
          Swipe right on politicians you support to build your voting cheat sheet!
        </p>
      </div>
    );
  }

  // Group by office level
  const grouped = supportedPoliticians.reduce<Record<string, Politician[]>>((acc, p) => {
    const key = p.officeLevel;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const levelOrder = ["Local", "State", "National"] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Voting Cheat Sheet</h2>
          <p className="text-muted-foreground text-sm">
            {supportedPoliticians.length} candidate{supportedPoliticians.length !== 1 ? "s" : ""} you support
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Upcoming elections */}
      <div className="flex gap-2 overflow-x-auto pb-2 print:hidden">
        {VOTING_SEASONS.slice(0, 2).map((s) => (
          <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">{s.label}</span>
            <span className="text-muted-foreground">— {s.date}</span>
          </div>
        ))}
      </div>

      {/* Grouped candidates */}
      {levelOrder.map((level) => {
        const pols = grouped[level];
        if (!pols || pols.length === 0) return null;
        return (
          <div key={level}>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{level} Offices</h3>
              <span className="text-xs text-muted-foreground">({pols.length})</span>
            </div>
            <div className="grid gap-2">
              {pols.map((politician) => (
                <div
                  key={politician.id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                >
                  <img
                    src={politician.photo}
                    alt={politician.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(politician.name)}&size=80&background=334155&color=fff&bold=true`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{politician.name}</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-support flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{politician.office}</p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {politician.party}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground text-center print:hidden pt-4">
        Tip: Print this page to bring to your polling station
      </p>
    </div>
  );
};
