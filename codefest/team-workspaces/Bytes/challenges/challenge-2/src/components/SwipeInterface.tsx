import { useState, useEffect, useRef } from "react";
import { Politician, UserAction } from "@/types/politician";
import { PoliticianCard } from "./PoliticianCard";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Info, RotateCcw, Settings2 } from "lucide-react";

interface SwipeInterfaceProps {
  politicians: Politician[];
  onAction: (politicianId: string, action: UserAction) => void;
  onEditPreferences?: () => void;
}

export const SwipeInterface = ({ politicians, onAction, onEditPreferences }: SwipeInterfaceProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "up" | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: UserAction } | null>(null);

  const currentPolitician = politicians[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
  }, [politicians]);

  useEffect(() => {
    if (swipeDirection) {
      const timer = setTimeout(() => {
        setSwipeDirection(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [swipeDirection]);

  // Auto-dismiss inline feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Touch swipe handling
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchDelta = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    touchDelta.current = { x: dx, y: dy };
    setDragOffset({ x: dx, y: dy });
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    const { x, y } = touchDelta.current;
    const threshold = 80;

    if (x > threshold) {
      handleAction("support");
    } else if (x < -threshold) {
      handleAction("oppose");
    } else if (y < -threshold) {
      handleAction("neutral");
    }

    touchStart.current = null;
    touchDelta.current = { x: 0, y: 0 };
    setDragOffset({ x: 0, y: 0 });
  };

  const handleAction = (action: UserAction) => {
    if (!currentPolitician) return;

    onAction(currentPolitician.id, action);

    const messages: Record<UserAction, string> = {
      support: `✓ Supporting ${currentPolitician.name}`,
      oppose: `✗ Opposing ${currentPolitician.name}`,
      neutral: `— Neutral on ${currentPolitician.name}`,
    };

    setFeedback({ text: messages[action], type: action });
    setSwipeDirection(action === "support" ? "right" : action === "oppose" ? "left" : "up");

    setTimeout(() => {
      if (currentIndex < politicians.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 300);
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setFeedback({ text: "↩ Went back", type: "neutral" });
    }
  };

  if (politicians.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-4">
        <h2 className="text-2xl font-bold mb-2">No politicians match your criteria</h2>
        <p className="text-muted-foreground mb-6">Try adjusting your policy areas or office levels</p>
        {onEditPreferences && (
          <Button variant="hero" onClick={onEditPreferences}>
            <Settings2 className="w-4 h-4 mr-2" />
            Edit Interests
          </Button>
        )}
      </div>
    );
  }

  if (!currentPolitician) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-4">
        <h2 className="text-2xl font-bold mb-2">All reviewed! 🎉</h2>
        <p className="text-muted-foreground mb-6">Check your saved list or cheat sheet</p>
        <div className="flex gap-3">
          <Button variant="hero" onClick={() => setCurrentIndex(0)}>
            Start Over
          </Button>
          {onEditPreferences && (
            <Button variant="outline" onClick={onEditPreferences}>
              <Settings2 className="w-4 h-4 mr-2" />
              Edit Interests
            </Button>
          )}
        </div>
      </div>
    );
  }

  const feedbackColor =
    feedback?.type === "support"
      ? "text-support"
      : feedback?.type === "oppose"
      ? "text-oppose"
      : "text-neutral";

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto px-4">
      {/* Progress */}
      <div className="w-full">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{currentIndex + 1} of {politicians.length}</span>
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={currentIndex === 0}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Undo
          </Button>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / politicians.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Inline feedback — positioned above card, never blocks buttons */}
      <div className="h-6 flex items-center justify-center">
        {feedback && (
          <span className={`text-sm font-semibold animate-fade-in ${feedbackColor}`}>
            {feedback.text}
          </span>
        )}
      </div>

      {/* Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`transition-all select-none touch-none ${
          swipeDirection
            ? "duration-300"
            : isDragging.current
            ? "duration-0"
            : "duration-300"
        } ${
          swipeDirection === "right"
            ? "translate-x-[500px] opacity-0 rotate-12"
            : swipeDirection === "left"
            ? "-translate-x-[500px] opacity-0 -rotate-12"
            : swipeDirection === "up"
            ? "-translate-y-[500px] opacity-0"
            : ""
        }`}
        style={
          !swipeDirection
            ? {
                transform: `translate(${dragOffset.x}px, ${Math.min(0, dragOffset.y)}px) rotate(${dragOffset.x * 0.05}deg)`,
                opacity: 1 - Math.abs(dragOffset.x) / 500,
              }
            : undefined
        }
      >
        {/* Swipe hint overlays */}
        {Math.abs(dragOffset.x) > 30 && (
          <div className={`absolute top-8 z-10 px-4 py-2 rounded-xl font-bold text-lg border-2 ${
            dragOffset.x > 0
              ? "left-4 text-support border-support bg-support/20 rotate-[-15deg]"
              : "right-4 text-oppose border-oppose bg-oppose/20 rotate-[15deg]"
          }`}>
            {dragOffset.x > 0 ? "SUPPORT" : "OPPOSE"}
          </div>
        )}
        {dragOffset.y < -30 && Math.abs(dragOffset.x) <= 30 && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl font-bold text-lg border-2 text-neutral border-neutral bg-neutral/20">
            NEUTRAL
          </div>
        )}
        <PoliticianCard politician={currentPolitician} />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 w-full">
        <Button
          variant="oppose"
          size="xl"
          onClick={() => handleAction("oppose")}
          className="flex-1 max-w-[140px]"
        >
          <ThumbsDown className="w-5 h-5 mr-2" />
          Oppose
        </Button>

        <Button
          variant="neutral"
          size="icon"
          onClick={() => handleAction("neutral")}
          className="h-14 w-14"
        >
          <Info className="w-5 h-5" />
        </Button>

        <Button
          variant="support"
          size="xl"
          onClick={() => handleAction("support")}
          className="flex-1 max-w-[140px]"
        >
          <ThumbsUp className="w-5 h-5 mr-2" />
          Support
        </Button>
      </div>
    </div>
  );
};
