import { Politician } from "@/types/politician";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, Calendar } from "lucide-react";
import { InhibitorBadge } from "./InhibitorBadge";

interface PoliticianCardProps {
  politician: Politician;
}

export const PoliticianCard = ({ politician }: PoliticianCardProps) => {
  return (
    <div className="relative w-full max-w-md h-[600px] bg-gradient-card rounded-3xl shadow-elevated overflow-hidden">
      {/* Header with photo */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={politician.photo}
          alt={politician.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(politician.name)}&size=400&background=334155&color=fff&bold=true&font-size=0.33`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-2xl font-bold text-card-foreground mb-1">
            {politician.name}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {politician.party}
            </Badge>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {politician.officeLevel}
            </Badge>
            <InhibitorBadge politician={politician} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4 overflow-y-auto max-h-[336px]">
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">
            Office
          </p>
          <p className="text-base text-card-foreground">{politician.office}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            Key Positions
          </p>
          <div className="space-y-3">
            {politician.positions.slice(0, 2).map((position, index) => (
              <div key={index} className="space-y-1">
                <Badge variant="outline" className="text-xs mb-1">
                  {position.area}
                </Badge>
                <p className="text-sm text-card-foreground leading-relaxed">
                  {position.stance}
                </p>
                {position.recentVote && (
                  <p className="text-xs text-support font-medium">
                    ✓ {position.recentVote}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(position.date).toLocaleDateString()}</span>
                  <a
                    href={position.sourceUrl}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {position.source}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
