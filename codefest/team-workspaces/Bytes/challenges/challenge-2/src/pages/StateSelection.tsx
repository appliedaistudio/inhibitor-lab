import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Vote } from "lucide-react";

const StateSelection = () => {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const handleStateClick = (state: string) => {
    if (state === "PA") {
      setSelectedState(state);
      setTimeout(() => navigate("/auth"), 500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            <Vote className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PoliSwipe
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Select Your State</h2>
            <p className="text-muted-foreground">
              Currently available: Philadelphia, Pennsylvania
            </p>
          </div>

          <div className="relative w-full aspect-[4/3] max-w-2xl mx-auto">
            {/* Simplified US Map SVG */}
            <svg
              viewBox="0 0 800 600"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background */}
              <rect width="800" height="600" fill="hsl(var(--muted))" opacity="0.3" />
              
              {/* Simplified state shapes - grayed out */}
              <g opacity="0.4" fill="hsl(var(--muted-foreground))" stroke="hsl(var(--border))" strokeWidth="1">
                {/* West Coast */}
                <path d="M 50 150 L 80 250 L 120 300 L 100 350 L 50 300 Z" />
                <path d="M 80 350 L 130 420 L 100 450 L 60 400 Z" />
                
                {/* Southwest */}
                <path d="M 150 350 L 250 350 L 270 420 L 200 450 L 140 400 Z" />
                <path d="M 180 250 L 280 250 L 300 320 L 250 340 L 160 340 Z" />
                
                {/* Midwest */}
                <path d="M 300 200 L 400 180 L 420 250 L 400 300 L 310 310 Z" />
                <path d="M 350 120 L 450 130 L 460 200 L 410 220 L 360 180 Z" />
                
                {/* South */}
                <path d="M 350 350 L 480 360 L 500 420 L 450 450 L 360 430 Z" />
                <path d="M 420 280 L 550 290 L 560 350 L 490 360 L 430 330 Z" />
                
                {/* Southeast */}
                <path d="M 520 340 L 620 350 L 640 400 L 600 440 L 530 410 Z" />
                <path d="M 580 280 L 680 290 L 700 340 L 630 350 L 590 320 Z" />
              </g>

              {/* Pennsylvania - Interactive and highlighted */}
              <g
                onClick={() => handleStateClick("PA")}
                className="cursor-pointer transition-all duration-300"
                style={{
                  filter: selectedState === "PA" ? "brightness(1.2)" : "none"
                }}
              >
                <path
                  d="M 620 180 L 720 180 L 730 210 L 720 240 L 610 240 Z"
                  fill={selectedState === "PA" ? "hsl(var(--primary))" : "hsl(var(--primary))"}
                  stroke="hsl(var(--primary-foreground))"
                  strokeWidth="2"
                  opacity={selectedState === "PA" ? "1" : "0.9"}
                  className="hover:opacity-100 transition-opacity"
                />
                <text
                  x="665"
                  y="215"
                  fill="hsl(var(--primary-foreground))"
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  PA
                </text>
              </g>

              {/* Labels for unavailable states */}
              <text x="85" y="280" fill="hsl(var(--muted-foreground))" fontSize="12" opacity="0.6">Coming Soon</text>
              <text x="350" y="280" fill="hsl(var(--muted-foreground))" fontSize="12" opacity="0.6">Coming Soon</text>
              <text x="580" y="380" fill="hsl(var(--muted-foreground))" fontSize="12" opacity="0.6">Coming Soon</text>
            </svg>
          </div>

          {selectedState && (
            <div className="text-center animate-fade-in">
              <p className="text-lg font-medium text-primary">
                Philadelphia, Pennsylvania selected ✓
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StateSelection;
