import { Shield } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <Shield size={48} className="text-accent opacity-20" />
          </div>
          <Shield size={48} className="text-accent animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Loading Inhibitor Logs</h2>
          <p className="text-sm text-muted-foreground">Parsing 17,000+ events...</p>
        </div>
        <div className="w-48 h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full animate-[loading_1.5s_ease-in-out_infinite]"
               style={{ animation: 'loading 1.5s ease-in-out infinite' }} />
        </div>
        <style>{`
          @keyframes loading {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
}
