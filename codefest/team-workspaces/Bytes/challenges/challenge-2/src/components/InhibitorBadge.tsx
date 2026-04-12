import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2, Activity, Scale, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, BrainCircuit } from "lucide-react";
import { inhibitorApi, InhibitorResult } from "@/lib/api/inhibitor";
import { Politician } from "@/types/politician";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface InhibitorBadgeProps {
  politician: Politician;
}

interface ObservationData {
  value: boolean;
  index: number;
  description: string;
}

export const InhibitorBadge = ({ politician }: InhibitorBadgeProps) => {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<InhibitorResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showThoughtChain, setShowThoughtChain] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [thoughtChain, setThoughtChain] = useState<{ role: string; content: string }[]>([]);

  const runCheck = async () => {
    if (status === "loading") return;
    setStatus("loading");

    const chain = inhibitorApi.buildPoliticianThoughtChain(
      politician.name,
      politician.positions.map((p) => ({ area: p.area, stance: p.stance, source: p.source }))
    );
    setThoughtChain(chain);

    const res = await inhibitorApi.check(chain, "performance");
    setResult(res);
    setStatus("done");
    setShowDialog(true);
  };

  const passed = result?.success && result.result?.rules_inhibition.passed;
  const observations = result?.result?.llm_inhibition.observations || {};
  const predictions = result?.result?.llm_inhibition.predictions || {};
  const observationEntries = Object.entries(observations) as [string, ObservationData][];
  const predictionEntries = Object.entries(predictions);

  const formatName = (name: string) =>
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      {status === "idle" && (
        <Badge
          variant="outline"
          className="cursor-pointer text-xs hover:bg-accent transition-colors"
          onClick={runCheck}
        >
          <ShieldCheck className="w-3 h-3 mr-1" />
          Verify Content
        </Badge>
      )}

      {status === "loading" && (
        <Badge variant="outline" className="text-xs">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Analyzing...
        </Badge>
      )}

      {status === "done" && (
        <Badge
          variant={passed ? "default" : "destructive"}
          className="text-xs cursor-pointer"
          onClick={() => setShowDialog(true)}
        >
          {passed ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
          {passed ? "Verified" : "Flagged"} — View Report
        </Badge>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Inhibitor Report — {politician.name}
            </DialogTitle>
          </DialogHeader>

          {result?.error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
              <p className="text-sm text-destructive font-medium">Error: {result.error}</p>
            </div>
          )}

          {result?.success && result.result && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className={`rounded-lg p-4 flex items-center gap-3 ${passed ? "bg-green-500/10 border border-green-500/30" : "bg-orange-500/10 border border-orange-500/30"}`}>
                {passed ? (
                  <ShieldCheck className="w-8 h-8 text-green-500 flex-shrink-0" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-orange-500 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-semibold ${passed ? "text-green-400" : "text-orange-400"}`}>
                    {passed ? "Content Passed Review" : "Content Flagged"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ethical · Legal · Truthfulness — {observationEntries.length} observations
                  </p>
                </div>
              </div>

              {/* Rule Violations */}
              {!passed && result.result.rules_inhibition.violations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-destructive" />
                    Rule Violations
                  </h4>
                  <ul className="space-y-1">
                    {result.result.rules_inhibition.violations.map((v, i) => (
                      <li key={i} className="text-xs text-destructive bg-destructive/5 rounded px-2 py-1">
                        • {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Separator />

              {/* Observations — simple green/orange dots */}
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Observations
                </h4>
                <div className="space-y-2">
                  {observationEntries.map(([key, obs]) => (
                    <div key={key} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                      {obs.value ? (
                        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{formatName(key)}</span>
                          <span className={`text-[10px] font-bold ${obs.value ? "text-orange-500" : "text-green-500"}`}>
                            {obs.value ? "DETECTED" : "CLEAR"}
                          </span>
                        </div>
                        {obs.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{obs.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {observationEntries.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No observations returned.</p>
                  )}
                </div>
              </div>

              {/* Predictions */}
              {predictionEntries.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <button
                      onClick={() => setShowPredictions(!showPredictions)}
                      className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      {showPredictions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <BrainCircuit className="w-4 h-4" />
                      Predictions ({predictionEntries.length})
                    </button>
                    {showPredictions && (
                      <div className="mt-2 space-y-2">
                        {predictionEntries.map(([key, val]) => (
                          <div key={key} className="rounded-lg bg-muted/50 p-3">
                            <span className="text-xs font-semibold">{formatName(key)}</span>
                            <pre className="text-[10px] text-muted-foreground mt-1 whitespace-pre-wrap break-all">
                              {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Thought Chain (collapsible) */}
              <div>
                <button
                  onClick={() => setShowThoughtChain(!showThoughtChain)}
                  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  {showThoughtChain ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  API Request — Thought Chain
                </button>
                {showThoughtChain && (
                  <div className="mt-2 space-y-2">
                    {thoughtChain.map((item, i) => (
                      <div key={i} className={`rounded-lg p-2 text-xs ${item.role === "human" ? "bg-primary/10 border-l-2 border-primary" : "bg-muted/50 border-l-2 border-muted-foreground/30"}`}>
                        <span className="font-mono font-semibold text-[10px] uppercase tracking-wider">
                          {item.role}
                        </span>
                        <p className="mt-1 text-muted-foreground leading-relaxed">{item.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Source Attribution */}
              <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
                Powered by Inhibitor API — Applied AI Studio •
                Data sourced from Ballotpedia & verified legislative records
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
