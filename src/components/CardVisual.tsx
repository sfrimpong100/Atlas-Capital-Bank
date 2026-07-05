import { type VirtualCard, formatCurrency } from "@/lib/bank-store";
import { Wifi, Lock, Snowflake } from "lucide-react";

const gradients: Record<VirtualCard["tier"], string> = {
  Metal: "bg-gradient-card-metal",
  Gold: "bg-gradient-card-gold",
  Platinum: "bg-gradient-card-plat",
  Standard: "bg-gradient-card",
};

export function CardVisual({
  card,
  showFull = false,
  compact = false,
}: {
  card: VirtualCard;
  showFull?: boolean;
  compact?: boolean;
}) {
  const num = showFull ? card.number : `•••• •••• •••• ${card.last4}`;
  const isDark = card.tier === "Metal" || card.tier === "Platinum";
  const textBase = isDark ? "text-white" : "text-black/85";
  const subtle = isDark ? "text-white/60" : "text-black/60";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${gradients[card.tier]} ${textBase} ${
        compact ? "aspect-[1.586/1] p-4" : "aspect-[1.586/1] p-6"
      } shadow-card transition-transform hover:-translate-y-1`}
      style={{ minHeight: compact ? 160 : 220 }}
    >
      {/* shimmer overlays */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{
        background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 50%)"
      }} />
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      {card.frozen && (
        <div className="absolute inset-0 grid place-items-center bg-blue-500/20 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/80 text-white text-xs font-semibold uppercase tracking-wider">
            <Snowflake className="h-3.5 w-3.5" /> Frozen
          </div>
        </div>
      )}

      <div className="relative h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className={`text-[10px] uppercase tracking-[0.2em] ${subtle}`}>Lattice</div>
            <div className="font-display font-semibold text-lg leading-tight">{card.tier}</div>
          </div>
          <Wifi className="h-5 w-5 rotate-90 opacity-70" />
        </div>

        {!compact && (
          <div className="flex items-center gap-2">
            <div className="h-9 w-12 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 shadow-inner" />
            <Lock className={`h-3 w-3 ${subtle}`} />
          </div>
        )}

        <div className="font-mono tabular-nums text-base sm:text-lg tracking-[0.15em]">
          {num}
        </div>

        <div className="flex items-end justify-between text-xs">
          <div>
            <div className={`${subtle} text-[9px] uppercase tracking-wider`}>Cardholder</div>
            <div className="font-semibold tracking-wide">{card.holderName}</div>
          </div>
          <div className="text-right">
            <div className={`${subtle} text-[9px] uppercase tracking-wider`}>Expires</div>
            <div className="font-mono">{card.expiry}</div>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold ${
            isDark ? "bg-white/15" : "bg-black/15"
          }`}>
            {card.type}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="absolute bottom-3 right-5 flex items-center gap-1">
          <div className="h-7 w-7 rounded-full bg-red-500/90" />
          <div className="h-7 w-7 rounded-full bg-yellow-400/90 -ml-3" />
        </div>
      )}
    </div>
  );
}

export function CardSpendBar({ card }: { card: VirtualCard }) {
  const pct = Math.min(100, (card.monthlySpend / card.monthlyLimit) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Monthly spend</span>
        <span className="font-mono tabular-nums">
          {formatCurrency(card.monthlySpend)} / {formatCurrency(card.monthlyLimit)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-gradient-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
