import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PolicyArea, OfficeLevel } from "@/types/politician";
import { Card } from "@/components/ui/card";

interface OnboardingFlowProps {
  onComplete: (preferences: UserPreferences) => void;
}

export interface UserPreferences {
  policyAreas: PolicyArea[];
  officeLevels: OfficeLevel[];
}

const policyAreas: PolicyArea[] = [
  "Healthcare",
  "Education",
  "Climate",
  "Economy",
  "Immigration",
  "Justice"
];

const officeLevels: OfficeLevel[] = [
  "Local",
  "State",
  "National"
];

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState(1);
  const [selectedPolicyAreas, setSelectedPolicyAreas] = useState<PolicyArea[]>([]);
  const [selectedOfficeLevels, setSelectedOfficeLevels] = useState<OfficeLevel[]>([]);

  const handlePolicyToggle = (area: PolicyArea) => {
    setSelectedPolicyAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const handleOfficeToggle = (level: OfficeLevel) => {
    setSelectedOfficeLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  const handleComplete = () => {
    onComplete({
      policyAreas: selectedPolicyAreas.length > 0 ? selectedPolicyAreas : policyAreas,
      officeLevels: selectedOfficeLevels.length > 0 ? selectedOfficeLevels : officeLevels,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Welcome to PoliSwipe
          </h1>
          <p className="text-muted-foreground">
            Let's personalize your experience
          </p>
        </div>

        {step === 1 && (
          <Card className="p-8 shadow-elevated">
            <h2 className="text-2xl font-bold mb-4">
              What policy areas matter most to you?
            </h2>
            <p className="text-muted-foreground mb-6">
              Select the topics you care about (or skip to see all)
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {policyAreas.map((area) => (
                <div
                  key={area}
                  className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handlePolicyToggle(area)}
                >
                  <Checkbox
                    id={area}
                    checked={selectedPolicyAreas.includes(area)}
                    onCheckedChange={() => handlePolicyToggle(area)}
                  />
                  <label
                    htmlFor={area}
                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                  >
                    {area}
                  </label>
                </div>
              ))}
            </div>

            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-8 shadow-elevated">
            <h2 className="text-2xl font-bold mb-4">
              Which levels of office interest you?
            </h2>
            <p className="text-muted-foreground mb-6">
              Choose the government levels you want to follow
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {officeLevels.map((level) => (
                <div
                  key={level}
                  className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleOfficeToggle(level)}
                >
                  <Checkbox
                    id={level}
                    checked={selectedOfficeLevels.includes(level)}
                    onCheckedChange={() => handleOfficeToggle(level)}
                  />
                  <label
                    htmlFor={level}
                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                  >
                    {level}
                  </label>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={handleComplete}
              >
                Get Started
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
