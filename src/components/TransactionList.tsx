import { Link } from "@tanstack/react-router";
import { type Transaction, formatCurrency } from "@/lib/bank-store";
import { ArrowDownLeft, ArrowUpRight, ShoppingBag, Utensils, Car, Home, Zap, Music, RefreshCw, Briefcase, ArrowLeftRight } from "lucide-react";

const categoryIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  Groceries: ShoppingBag,
  Dining: Utensils,
  Transport: Car,
  Housing: Home,
  Utilities: Zap,
  Subscriptions: Music,
  Refund: RefreshCw,
  Income: Briefcase,
  Transfer: ArrowLeftRight,
  Shopping: ShoppingBag,
};

export function TransactionList({ transactions, compact = false }: { transactions: Transaction[]; compact?: boolean }) {
  if (transactions.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-10">No transactions yet.</div>;
  }

  return (
    <ul className="divide-y divide-border">
      {transactions.map((tx) => {
        const Icon = categoryIcon[tx.category] ?? ArrowLeftRight;
        const positive = tx.type === "credit";
        return (
          <li key={tx.id} className="group">
            <Link
              to="/receipt/$id"
              params={{ id: tx.id }}
              className="flex items-center gap-4 py-3.5 px-2 -mx-2 rounded-lg hover:bg-secondary/60 transition-colors"
            >
              <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${positive ? "bg-success/15 text-success" : "bg-secondary text-foreground"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{tx.description}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: compact ? undefined : "numeric" })}</span>
                  <span>·</span>
                  <span>{tx.category}</span>
                  {tx.status === "pending" && <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning-foreground text-[10px] uppercase tracking-wider">Pending</span>}
                </div>
              </div>
              <div className={`text-right shrink-0 tabular-nums font-medium ${positive ? "text-success" : "text-foreground"}`}>
                <div className="flex items-center gap-1 justify-end">
                  {positive ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  {positive ? "+" : "−"}{formatCurrency(tx.amount)}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{tx.reference}</div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
