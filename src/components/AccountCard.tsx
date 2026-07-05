import { type Account, formatCurrency } from "@/lib/bank-store";
import { Wallet, PiggyBank, TrendingUp, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const icons = { Checking: Wallet, Savings: PiggyBank, Investment: TrendingUp };

export function AccountCard({ account, featured = false }: { account: Account; featured?: boolean }) {
  const [hidden, setHidden] = useState(false);
  const Icon = icons[account.type];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all hover:shadow-elegant ${
        featured
          ? "bg-gradient-card-metal text-white border-gold/30 shadow-card gold-border"
          : "card-surface"
      }`}
    >
      {featured && (
        <>
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
        </>
      )}

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl grid place-items-center ${featured ? "bg-white/10" : "bg-secondary"}`}>
            <Icon className={`h-5 w-5 ${featured ? "text-accent" : "text-foreground"}`} />
          </div>
          <div>
            <div className={`text-xs uppercase tracking-wider ${featured ? "text-white/60" : "text-muted-foreground"}`}>
              {account.type}
            </div>
            <div className="font-semibold">{account.name}</div>
          </div>
        </div>
        <button
          onClick={() => setHidden((h) => !h)}
          className={`p-1.5 rounded-full transition-colors ${featured ? "hover:bg-white/10" : "hover:bg-secondary"}`}
          aria-label="Toggle balance visibility"
        >
          {hidden ? <EyeOff className="h-4 w-4 opacity-70" /> : <Eye className="h-4 w-4 opacity-70" />}
        </button>
      </div>

      <div className="relative mt-6">
        <div className={`text-xs ${featured ? "text-white/60" : "text-muted-foreground"}`}>
          Available balance
        </div>
        <div className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
          {hidden ? "••••••" : formatCurrency(account.balance)}
        </div>
      </div>

      <div className={`relative mt-6 flex items-center justify-between text-xs font-mono ${featured ? "text-white/70" : "text-muted-foreground"}`}>
        <span>{account.number}</span>
        <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] uppercase tracking-wider font-sans font-semibold">
          Virtual
        </span>
      </div>
    </div>
  );
}
