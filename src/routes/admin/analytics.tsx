import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  Landmark,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsPage,
});

type Profile = {
  id: string;
  status: string;
  virtual_balance?: number | null;
  investment_balance?: number | null;
  available_credit?: number | null;
  created_at?: string;
};

type Transaction = {
  id: string;
  amount: number;
  status: string;
  recipient_country?: string | null;
  recipient_bank_name?: string | null;
  created_at: string;
};

type CardRow = {
  id: string;
  frozen: boolean;
  status: string;
  created_at?: string;
};

type Beneficiary = {
  id: string;
  country?: string | null;
  status?: string | null;
  created_at?: string;
};

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function AdminAnalyticsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);

    const [profilesRes, txRes, cardsRes, beneficiariesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,status,virtual_balance,investment_balance,available_credit,created_at"),

      supabase
        .from("transactions")
        .select("id,amount,status,recipient_country,recipient_bank_name,created_at")
        .order("created_at", { ascending: false }),

      supabase.from("cards").select("id,frozen,status,created_at"),

      supabase.from("beneficiaries").select("id,country,status,created_at"),
    ]);

    if (profilesRes.error) alert(profilesRes.error.message);
    if (txRes.error) alert(txRes.error.message);
    if (cardsRes.error) alert(cardsRes.error.message);
    if (beneficiariesRes.error) alert(beneficiariesRes.error.message);

    setProfiles(profilesRes.data || []);
    setTransactions(txRes.data || []);
    setCards(cardsRes.data || []);
    setBeneficiaries(beneficiariesRes.data || []);
    setLoading(false);
  }

  const totalDeposits = profiles.reduce(
    (sum, p) => sum + Number(p.virtual_balance || 0),
    0
  );

  const totalInvestments = profiles.reduce(
    (sum, p) => sum + Number(p.investment_balance || 0),
    0
  );

  const totalCredit = profiles.reduce(
    (sum, p) => sum + Number(p.available_credit || 0),
    0
  );

  const assetsUnderManagement = totalDeposits + totalInvestments + totalCredit;

  const transferVolume = transactions.reduce(
    (sum, tx) => sum + Number(tx.amount || 0),
    0
  );

  const completedTransfers = transactions.filter((tx) =>
    ["completed", "successful"].includes(String(tx.status).toLowerCase())
  ).length;

  const pendingTransfers = transactions.filter((tx) =>
    ["pending", "review", "processing"].includes(String(tx.status).toLowerCase())
  ).length;

  const activeCustomers = profiles.filter((p) => p.status === "active").length;
  const frozenCards = cards.filter((c) => c.frozen).length;
  const activeBeneficiaries = beneficiaries.filter(
    (b) => b.status === "active" || !b.status
  ).length;

  const monthlyCustomerGrowth = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));

      const month = date.toLocaleString("en-US", { month: "short" });
      const monthIndex = date.getMonth();
      const year = date.getFullYear();

      const count = profiles.filter((profile) => {
        if (!profile.created_at) return false;
        const created = new Date(profile.created_at);
        return created.getMonth() === monthIndex && created.getFullYear() === year;
      }).length;

      return { label: month, value: count };
    });
  }, [profiles]);

  const weeklyTransferVolume = useMemo(() => {
    return Array.from({ length: 8 }, (_, index) => {
      const start = Date.now() - (7 - index) * 7 * 86400000;
      const end = start + 7 * 86400000;

      const value = transactions
        .filter((tx) => {
          const time = new Date(tx.created_at).getTime();
          return time >= start && time < end;
        })
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      return {
        label: `W${index + 1}`,
        value,
      };
    });
  }, [transactions]);

  const countryBreakdown = useMemo(() => {
    const map = new Map<string, number>();

    transactions.forEach((tx) => {
      const country = tx.recipient_country || "Unknown";
      map.set(country, (map.get(country) || 0) + Number(tx.amount || 0));
    });

    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [transactions]);

  const topBanks = useMemo(() => {
    const map = new Map<string, number>();

    transactions.forEach((tx) => {
      const bank = tx.recipient_bank_name || "Unknown Bank";
      map.set(bank, (map.get(bank) || 0) + Number(tx.amount || 0));
    });

    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [transactions]);

  const maxGrowth = Math.max(...monthlyCustomerGrowth.map((x) => x.value), 1);
  const maxVolume = Math.max(...weeklyTransferVolume.map((x) => x.value), 1);

  if (loading) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 text-gold">
            <BarChart3 className="h-5 w-5" />
            Executive Intelligence
          </div>

          <h1 className="font-display text-3xl font-semibold mt-2">
            Banking Analytics
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            Monitor customer growth, assets, transfers, cards, and beneficiary activity.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MoneyStat
            icon={Wallet}
            label="Assets Under Management"
            value={assetsUnderManagement}
          />
          <MoneyStat icon={TrendingUp} label="Total Deposits" value={totalDeposits} />
          <MoneyStat icon={ArrowLeftRight} label="Transfer Volume" value={transferVolume} />
          <Stat icon={Users} label="Active Customers" value={activeCustomers} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MoneyStat icon={BarChart3} label="Investments" value={totalInvestments} />
          <MoneyStat icon={Wallet} label="Credit Exposure" value={totalCredit} />
          <Stat icon={CreditCard} label="Cards Issued" value={cards.length} />
          <Stat icon={Landmark} label="Beneficiaries" value={activeBeneficiaries} />
        </div>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold">
              Customer Growth
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              New customers over the last six months.
            </p>

            <div className="grid grid-cols-6 gap-3 h-56 items-end">
              {monthlyCustomerGrowth.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg bg-gradient-gold"
                    style={{
                      height: `${Math.max((item.value / maxGrowth) * 100, 5)}%`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold">
              Weekly Transfer Volume
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              Outgoing transfers across the last eight weeks.
            </p>

            <div className="grid grid-cols-8 gap-3 h-56 items-end">
              {weeklyTransferVolume.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg bg-success/80"
                    style={{
                      height: `${Math.max((item.value / maxVolume) * 100, 5)}%`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold mb-4">
              Transfer Status
            </h2>

            <div className="space-y-4">
              <Metric label="Completed" value={completedTransfers} />
              <Metric label="Pending / Processing" value={pendingTransfers} />
              <Metric
                label="Other"
                value={Math.max(
                  transactions.length - completedTransfers - pendingTransfers,
                  0
                )}
              />
            </div>
          </div>

          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold mb-4">
              Card Overview
            </h2>

            <div className="space-y-4">
              <Metric label="Total Cards" value={cards.length} />
              <Metric label="Frozen Cards" value={frozenCards} />
              <Metric label="Active Cards" value={cards.length - frozenCards} />
            </div>
          </div>

          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold mb-4">
              Portfolio Split
            </h2>

            <div className="space-y-4">
              <Metric label="Cash Deposits" value={formatMoney(totalDeposits)} />
              <Metric label="Investments" value={formatMoney(totalInvestments)} />
              <Metric label="Credit" value={formatMoney(totalCredit)} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold mb-5">
              Top Transfer Countries
            </h2>

            {countryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No country data available.
              </p>
            ) : (
              <div className="space-y-3">
                {countryBreakdown.map(([country, value]) => (
                  <RankRow key={country} label={country} value={formatMoney(value)} />
                ))}
              </div>
            )}
          </div>

          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold mb-5">
              Top Beneficiary Banks
            </h2>

            {topBanks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bank data available.
              </p>
            ) : (
              <div className="space-y-3">
                {topBanks.map(([bank, value]) => (
                  <RankRow key={bank} label={bank} value={formatMoney(value)} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="glass p-5">
      <div className="flex justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-gold" />
      </div>

      <p className="mt-4 font-display text-3xl font-semibold">
        {Number(value || 0).toLocaleString()}
      </p>
    </div>
  );
}

function MoneyStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="glass p-5">
      <div className="flex justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-gold" />
      </div>

      <p className="mt-4 font-display text-3xl font-semibold">
        {formatMoney(value)}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-semibold">{value}</span>
    </div>
  );
}

function RankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-4">
      <span className="text-sm">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}