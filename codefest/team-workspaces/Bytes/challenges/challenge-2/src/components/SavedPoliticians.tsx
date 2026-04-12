import { Politician } from "@/types/politician";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Info } from "lucide-react";

interface SavedPoliticiansProps {
  politicians: Politician[];
  actions: Record<string, "support" | "oppose" | "neutral">;
}

export const SavedPoliticians = ({ politicians, actions }: SavedPoliticiansProps) => {
  const savedPoliticians = politicians.filter((p) => actions[p.id]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "support":
        return <ThumbsUp className="w-4 h-4 text-support" />;
      case "oppose":
        return <ThumbsDown className="w-4 h-4 text-oppose" />;
      case "neutral":
        return <Info className="w-4 h-4 text-neutral" />;
      default:
        return null;
    }
  };

  const getActionBadge = (action: string) => {
    const variants = {
      support: "default",
      oppose: "destructive",
      neutral: "secondary"
    } as const;
    
    return (
      <Badge variant={variants[action as keyof typeof variants] || "secondary"} className="capitalize">
        {action}
      </Badge>
    );
  };

  if (savedPoliticians.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">No saved politicians yet</h2>
        <p className="text-muted-foreground">
          Start swiping to build your list!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Saved Politicians</h2>
        <p className="text-muted-foreground">{savedPoliticians.length} saved</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {savedPoliticians.map((politician) => (
          <Card key={politician.id} className="overflow-hidden hover:shadow-card transition-shadow">
            <div className="relative h-48">
              <img
                src={politician.photo}
                alt={politician.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                {getActionBadge(actions[politician.id])}
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-lg mb-1">{politician.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {politician.party}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {politician.office}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-semibold">
                  Key Positions:
                </p>
                {politician.positions.slice(0, 2).map((position, idx) => (
                  <div key={idx} className="text-xs">
                    <Badge variant="outline" className="text-xs mb-1">
                      {position.area}
                    </Badge>
                    <p className="text-muted-foreground line-clamp-2">
                      {position.stance}
                    </p>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" className="w-full">
                View Full Profile
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
