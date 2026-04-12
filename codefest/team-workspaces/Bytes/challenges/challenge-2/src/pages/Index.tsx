import { useState } from "react";
import { OnboardingFlow, UserPreferences } from "@/components/OnboardingFlow";
import { SwipeInterface } from "@/components/SwipeInterface";
import { SavedPoliticians } from "@/components/SavedPoliticians";
import { VotingCheatSheet } from "@/components/VotingCheatSheet";
import { mockPoliticians } from "@/data/mockPoliticians";
import { UserAction, Politician } from "@/types/politician";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Vote, BookmarkCheck, ClipboardList, Settings2 } from "lucide-react";
import { DemocracyScore } from "@/components/DemocracyScore";

const Index = () => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [userActions, setUserActions] = useState<Record<string, UserAction>>({});
  const [activeTab, setActiveTab] = useState("swipe");

  const handleOnboardingComplete = (prefs: UserPreferences) => {
    setPreferences(prefs);
    setHasOnboarded(true);
  };

  const handleEditPreferences = () => {
    setHasOnboarded(false);
  };

  const handleUserAction = (politicianId: string, action: UserAction) => {
    setUserActions((prev) => ({
      ...prev,
      [politicianId]: action,
    }));
  };

  const filteredPoliticians = hasOnboarded && preferences
    ? mockPoliticians.filter((politician) => {
        const matchesPolicyArea = preferences.policyAreas.length === 0 ||
          politician.positions.some((pos) => preferences.policyAreas.includes(pos.area));
        const matchesOfficeLevel = preferences.officeLevels.length === 0 ||
          preferences.officeLevels.includes(politician.officeLevel);
        return matchesPolicyArea && matchesOfficeLevel;
      })
    : mockPoliticians;

  const supportedCount = Object.values(userActions).filter((a) => a === "support").length;

  if (!hasOnboarded) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vote className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                PoliSwipe
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground hidden sm:block">
                Discover politicians who align with your values
              </p>
              <Button variant="ghost" size="sm" onClick={handleEditPreferences} title="Edit interests">
                <Settings2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="swipe" className="flex items-center gap-2">
                <Vote className="w-4 h-4" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4" />
                Saved ({Object.keys(userActions).length})
              </TabsTrigger>
              <TabsTrigger value="cheatsheet" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Cheat Sheet {supportedCount > 0 && `(${supportedCount})`}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="swipe" className="mt-0">
            <SwipeInterface
              politicians={filteredPoliticians}
              onAction={handleUserAction}
              onEditPreferences={handleEditPreferences}
            />
          </TabsContent>

          <TabsContent value="saved" className="mt-0">
            <div className="max-w-2xl mx-auto mb-6">
              <DemocracyScore politicians={mockPoliticians} actions={userActions} />
            </div>
            <SavedPoliticians
              politicians={mockPoliticians}
              actions={userActions}
            />
          </TabsContent>

          <TabsContent value="cheatsheet" className="mt-0">
            <VotingCheatSheet
              politicians={mockPoliticians}
              actions={userActions}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-card/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              All information sourced from verified news outlets and legislative records
            </p>
            <p>
              PoliSwipe - Making political engagement accessible and informed
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
