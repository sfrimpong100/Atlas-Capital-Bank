import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  RefreshCcw,
  Search,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Activity — Atlas Capital Bank" },
      {
        name: "description",
        content: "View your Atlas Capital Bank transaction activity.",
      },
    ],
  }),
  component: TransactionsPage,
});

type Profile = {
  id: string;
  full_name: string;
  virtual_balance: number;
  banking_currency?: string | null;
};

type Transaction = {
  id: string;
  sender_id: string | null;
  amount: number;
  status: string;
  transfer_stage?: string | null;
  transaction_type?: string | null;
  transfer_type?: string | null;
  recipient_name?: string | null;
  recipient_account_number?: string | null;
  recipient_bank_name?: string | null;
  recipient_country?: string | null;
  recipient_currency?: string | null;
  reference?: string | null;
  receipt_number?: string | null;
  description?: string | null;
  transfer_fee?: number | null;
  exchange_rate?: number | null;
  destination_amount?: number | null;
  created_at: string;
  completed_at?: string | null;
  rejected_at?: string | null;
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function TransactionsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setLoading(true);

    const loggedIn = await isAuthed();

    if (!loggedIn) {
      router.navigate({ to: "/" });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.navigate({ to: "/" });
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, virtual_balance, banking_currency")
      .eq("id", user.id)
      .single();

    setProfile(profileData || null);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setTransactions(data || []);
    setLoading(false);
  }

  const currency = profile?.banking_currency || "USD";

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const term = query.toLowerCase();

      const matchesQuery =
        !term ||
        tx.recipient_name?.toLowerCase().includes(term) ||
        tx.recipient_bank_name?.toLowerCase().includes(term) ||
        tx.recipient_country?.toLowerCase().includes(term) ||
        tx.reference?.toLowerCase().includes(term) ||
        tx.receipt_number?.toLowerCase().includes(term) ||
        tx.status?.toLowerCase().includes(term);

      const normalized = String(tx.status || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        normalized === statusFilter ||
        (statusFilter === "pending" &&
          ["pending", "review", "processing"].includes(normalized)) ||
        (statusFilter === "completed" &&
          ["completed", "successful"].includes(normalized));

      return matchesQuery && matchesStatus;
    });
  }, [transactions, query, statusFilter]);

  const totalOut = transactions.reduce(
    (sum, tx) => sum + Number(tx.amount || 0),
    0
  );

  const pending = transactions.filter((tx) =>
    ["pending", "review", "processing"].includes(
      String(tx.status).toLowerCase()
    )
  ).length;

  const completed = transactions.filter((tx) =>
    ["completed", "successful"].includes(String(tx.status).toLowerCase())
  ).length;

  const rejected = transactions.filter((tx) =>
    ["rejected", "failed"].includes(String(tx.status).toLowerCase())
  ).length;

  function exportCSV() {
    const rows = [
      [
        "Date",
        "Recipient",
        "Bank",
        "Country",
        "Amount",
        "Currency",
        "Status",
        "Reference",
        "Receipt",
      ],
      ...filtered.map((tx) => [
        new Date(tx.created_at).toLocaleString(),
        tx.recipient_name || "",
        tx.recipient_bank_name || "",
        tx.recipient_country || "",
        String(tx.amount || 0),
        tx.recipient_currency || currency,
        tx.status || "",
        tx.reference || "",
        tx.receipt_number || "",
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "atlas-capital-transactions.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-gold">
              <FileText className="h-5 w-5" />
              Account Ledger
            </div>

            <h1 className="mt-2 font-display text-3xl font-semibold">
              Transaction Activity
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Review transfers, processing activity, receipts, and account movements.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTransactions}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-4">
          <Stat label="Total Sent" value={formatCurrency(totalOut, currency)} icon={ArrowUpRight} />
          <Stat label="Pending" value={String(pending)} icon={Clock} />
          <Stat label="Completed" value={String(completed)} icon={CheckCircle2} />
          <Stat label="Rejected" value={String(rejected)} icon={XCircle} />
        </section>

        <section className="card-surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search recipient, bank, reference..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["pending", "Pending"],
                ["processing", "Processing"],
                ["completed", "Completed"],
                ["rejected", "Rejected"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card-surface overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Loading transactions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <ArrowLeftRight className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-4 font-display text-xl font-semibold">
                No transactions found
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your transfers and account activity will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((tx) => {
                const isCompleted = ["completed", "successful"].includes(
                  String(tx.status).toLowerCase()
                );

                const isPending = ["pending", "review", "processing"].includes(
                  String(tx.status).toLowerCase()
                );

                return (
                  <div
                    key={tx.id}
                    className="p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-11 w-11 rounded-xl grid place-items-center ${
                          isCompleted
                            ? "bg-success/15 text-success"
                            : isPending
                              ? "bg-gold/15 text-gold"
                              : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {isCompleted ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : isPending ? (
                          <Clock className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <p className="font-semibold">
                          {tx.recipient_name || "External Transfer"}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {tx.recipient_bank_name || "External Bank"} ·{" "}
                          {tx.recipient_country || "International"}
                        </p>

                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          Ref: {tx.reference || "-"} · Receipt:{" "}
                          {tx.receipt_number || "-"}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="font-display text-xl font-semibold">
                          -{formatCurrency(Number(tx.amount || 0), tx.recipient_currency || currency)}
                        </p>
                        <StatusPill status={tx.status || "pending"} />
                      </div>

                      <div className="flex gap-2">
                        {isCompleted ? (
                          <Link to="/receipt/$id" params={{ id: tx.id }} from="/">
                            <Button size="sm" variant="outline">
                              Receipt
                            </Button>
                          </Link>
                        ) : (
                          <Link to="/transfer-status/$id" params={{ id: tx.id }} from="/">
                            <Button size="sm" variant="outline">
                              Track
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-gold" />
      </div>

      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();

  const className =
    normalized === "completed" || normalized === "successful"
      ? "bg-success/15 text-success"
      : normalized === "pending" ||
          normalized === "review" ||
          normalized === "processing"
        ? "bg-gold/15 text-gold"
        : normalized === "rejected" || normalized === "failed"
          ? "bg-destructive/15 text-destructive"
          : "bg-secondary text-muted-foreground";

  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs capitalize ${className}`}>
      {status}
    </span>
  );
}