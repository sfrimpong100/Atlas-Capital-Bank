import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import {
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  Landmark,
  PiggyBank,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/analytics")({
  component: WealthAnalyticsPage,
});

type Profile = {
  id: string;
  full_name: string;
  virtual_balance: number;
  investment_balance?: number | null;
  available_credit?: number | null;
  banking_currency?: string | null;
  account_tier?: string | null;
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function WealthAnalyticsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWealth();
  }, []);

  async function loadWealth() {
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

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, virtual_balance, investment_balance, available_credit, banking_currency, account_tier"
      )
      .eq("id", user.id)
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setProfile(data);
    setLoading(false);
  }

  const currency = profile?.banking_currency || "USD";
  const cash = Number(profile?.virtual_balance || 0);
  const investments = Number(profile?.investment_balance || 0);
  const credit = Number(profile?.available_credit || 0);
  const totalWealth = cash + investments + credit;

  const allocation = useMemo(
    () => [
      { label: "Cash", value: cash, icon: Wallet },
      { label: "Investments", value: investments, icon: TrendingUp },
      { label: "Credit Facility", value: credit, icon: CreditCard },
    ],
    [cash, investments, credit]
  );

  const portfolioGain = investments * 0.0246;
  const yearlyProjection = investments * 0.118;

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[70vh] grid place-items-center">
          <p className="text-sm text-muted-foreground">
            Loading wealth dashboard...
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-gold">
              <BarChart3 className="h-5 w-5" />
              Wealth Intelligence
            </div>

            <h1 className="mt-2 font-display text-3xl font-semibold">
              Wealth & Investments
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Portfolio overview, allocation, investment performance, and private banking insights.
            </p>
          </div>

          <Button variant="outline" onClick={loadWealth}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-6 sm:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Total Wealth Position
              </p>

              <h2 className="mt-3 font-display text-5xl font-semibold">
                {formatCurrency(totalWealth, currency)}
              </h2>

              <p className="mt-3 text-sm text-muted-foreground">
                {profile?.account_tier || "Private Banking"} portfolio for{" "}
                {profile?.full_name || "Client"}.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniStat label="Cash" value={formatCurrency(cash, currency)} />
                <MiniStat
                  label="Investments"
                  value={formatCurrency(investments, currency)}
                />
                <MiniStat
                  label="Credit"
                  value={formatCurrency(credit, currency)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Portfolio Performance
              </p>

              <h3 className="mt-3 font-display text-3xl font-semibold text-success">
                +2.46%
              </h3>

              <p className="mt-1 text-sm text-success">
                {formatCurrency(portfolioGain, currency)} estimated gain
              </p>

              <div className="mt-5 h-28 flex items-end gap-2">
                {[20, 35, 28, 45, 52, 48, 64, 72, 68, 80, 88, 96].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-md bg-gradient-gold"
                      style={{ height: `${height}%` }}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat
            icon={Wallet}
            label="Available Cash"
            value={formatCurrency(cash, currency)}
          />
          <Stat
            icon={TrendingUp}
            label="Investment Balance"
            value={formatCurrency(investments, currency)}
          />
          <Stat
            icon={CreditCard}
            label="Available Credit"
            value={formatCurrency(credit, currency)}
          />
          <Stat
            icon={PiggyBank}
            label="Projected Annual Return"
            value={formatCurrency(yearlyProjection, currency)}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="card-surface p-6 lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">
              Wealth Allocation
            </h2>

            <div className="mt-6 space-y-5">
              {allocation.map((item) => (
                <AllocationRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  total={totalWealth}
                  currency={currency}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>

          <div className="card-surface p-6">
            <h2 className="font-display text-xl font-semibold">
              Private Banking Status
            </h2>

            <div className="mt-6 space-y-4">
              <StatusRow
                icon={ShieldCheck}
                label="Client Tier"
                value={profile?.account_tier || "Private Banking"}
              />
              <StatusRow
                icon={Landmark}
                label="Advisory Access"
                value="Enabled"
              />
              <StatusRow
                icon={BriefcaseBusiness}
                label="Portfolio Review"
                value="Quarterly"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <InvestmentCard
            title="Managed Portfolio"
            subtitle="Diversified private banking allocation"
            value={formatCurrency(investments, currency)}
            gain="+2.46%"
          />
          <InvestmentCard
            title="Fixed Income"
            subtitle="Treasury bills, bonds, and income products"
            value={formatCurrency(investments * 0.35, currency)}
            gain="+1.18%"
          />
          <InvestmentCard
            title="Growth Assets"
            subtitle="Equities, funds, and long-term strategy"
            value={formatCurrency(investments * 0.65, currency)}
            gain="+3.12%"
          />
        </section>

        <section className="card-surface p-6">
          <h2 className="font-display text-xl font-semibold">
            Wealth Insights
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Insight
              title="Liquidity Position"
              text="Your available cash remains accessible for transfers, payments, and short-term obligations."
            />
            <Insight
              title="Investment Growth"
              text="Your portfolio is positioned for balanced growth across fixed income and long-term assets."
            />
            <Insight
              title="Credit Readiness"
              text="Your approved credit facility may support larger transactions and private banking opportunities."
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
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

function AllocationRow({
  label,
  value,
  total,
  currency,
  icon: Icon,
}: {
  label: string;
  value: number;
  total: number;
  currency: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-secondary grid place-items-center">
            <Icon className="h-4 w-4 text-gold" />
          </div>
          <span className="font-medium">{label}</span>
        </div>

        <span className="text-sm text-muted-foreground">
          {percentage}% · {formatCurrency(value, currency)}
        </span>
      </div>

      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-gold"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-gold" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function InvestmentCard({
  title,
  subtitle,
  value,
  gain,
}: {
  title: string;
  subtitle: string;
  value: string;
  gain: string;
}) {
  return (
    <div className="card-surface p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Investment Account
      </p>
      <h3 className="mt-2 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

      <p className="mt-6 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-success">{gain} performance</p>
    </div>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}