import { ShieldAlert } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="w-full bg-warning/15 border-b border-warning/30 text-warning-foreground">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">Demo Banking Simulator — Virtual Money Only.</span>{" "}
          <span className="text-muted-foreground">No real financial transactions occur on this platform.</span>
        </span>
      </div>
    </div>
  );
}
