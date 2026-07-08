import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CalendarClock,
  CreditCard,
  Download,
  Globe2,
  Landmark,
  LockKeyhole,
  MessageCircle,
  Phone,
  PiggyBank,
  Send,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Atlas Capital Bank" },
      {
        name: "description",
        content: "Private banking dashboard for global wealth management.",
      },
    ],
  }),
  component: Dashboard,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
  account_number: string;
  virtual_balance: number;
  status: "active" | "suspended";
  access_expires_at: string | null;
  created_at: string;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  profile_image_url?: string | null;
  transaction_count?: number;
  transfer_limit?: number;
  client_id?: string | null;
  account_tier?: string | null;
  account_type?: string | null;
  swift_code?: string | null;
  iban?: string | null;
  available_credit?: number | null;
  investment_balance?: number | null;
  pending_transfers?: number | null;
  last_login_at?: string | null;
  banking_country?: string | null;
  banking_currency?: string | null;
  assigned_bank?: string | null;
  assigned_beneficiary_name?: string | null;
};

type Transaction = {
  id: string;
  recipient_account_number: string;
  recipient_name?: string | null;
  recipient_bank_name?: string | null;
  recipient_country?: string | null;
  amount: number;
  description: string | null;
  reference?: string | null;
  status: string;
  created_at: string;
};

type BankCard = {
  id: string;
  card_name: string;
  card_type: string;
  card_tier: string;
  card_network: string;
  card_number: string;
  last4: string;
  expiry: string;
  holder_name: string;
  currency: string;
  monthly_limit: number;
  spent_this_month: number;
  frozen: boolean;
  status: string;
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function Dashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const loggedIn = await isAuthed();

        if (!loggedIn) {
          router.navigate({ to: "/" });
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          await supabase.auth.signOut();
          router.navigate({ to: "/" });
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error(profileError);
          return;
        }

        setProfile(profileData);

        const { data: txData } = await supabase
          .from("transactions")
          .select("*")
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8);

        setTransactions(txData || []);

        const { data: cardData } = await supabase
          .from("cards")
          .select("*")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        setCards(cardData || []);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  const firstName = useMemo(() => {
    if (!profile?.full_name) return "Customer";
    return profile.full_name.split(" ")[0];
  }, [profile]);

  const currency = profile?.banking_currency || "USD";

  const availableCash = Number(profile?.virtual_balance || 0);
  const investments = Number(profile?.investment_balance || 0);
  const availableCredit = Number(profile?.available_credit || 0);
  const pendingTransfers = Number(profile?.pending_transfers || 0);
  const totalAssets = availableCash + investments + availableCredit;

  const portfolioGain = investments * 0.0246;
  const totalTransfers = transactions.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const primaryCard = cards[0];

  const clientId =
    profile?.client_id ||
    `ACB-CLIENT-${profile?.account_number?.slice(-6) || "000000"}`;

  const swiftCode = profile?.swift_code || "ATCBUS33";

  const iban =
    profile?.iban ||
    `GB29ATCB${
      profile?.account_number?.replace(/\D/g, "").slice(0, 10) ||
      "0000000000"
    }`;

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[70vh] grid place-items-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading private banking dashboard...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-semibold">
            Account profile not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please contact Atlas Capital Bank support.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-6 sm:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
            <div>
              <div className="flex items-center gap-4">
                {profile.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt={profile.full_name}
                    className="h-16 w-16 rounded-2xl object-cover border border-border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-secondary grid place-items-center text-2xl font-semibold">
                    {profile.full_name?.charAt(0) || "U"}
                  </div>
                )}

                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified Private Client
                  </div>

                  <h1 className="mt-3 font-display text-3xl sm:text-5xl font-semibold tracking-tight">
                    Good to see you, {firstName}.
                  </h1>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {profile.account_tier || "Private Banking"} ·{" "}
                    {profile.banking_country || profile.country || "Global Client"} ·{" "}
                    {profile.status === "active" ? "Active Account" : "Restricted"}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <IdentityPill label="Client ID" value={clientId} />
                <IdentityPill label="Account No." value={profile.account_number} />
                <IdentityPill label="SWIFT" value={swiftCode} />
                <IdentityPill label="IBAN" value={iban} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Total Wealth Position
              </p>
              <h2 className="mt-2 font-display text-4xl font-semibold tabular-nums">
                {formatCurrency(totalAssets, currency)}
              </h2>

              <div className="mt-3 flex items-center gap-2 text-sm text-success">
                <TrendingUp className="h-4 w-4" />
                {formatCurrency(portfolioGain, currency)} estimated portfolio gain
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link to="/transfer" from="/">
                  <Button className="w-full rounded-full">
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Transfer
                  </Button>
                </Link>

                <Link to="/transactions" from="/">
                  <Button variant="outline" className="w-full rounded-full">
                    <Download className="h-4 w-4 mr-2" />
                    Statement
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Wallet} label="Available Cash" value={formatCurrency(availableCash, currency)} sub="Immediately available" />
          <MetricCard icon={BarChart3} label="Investments" value={formatCurrency(investments, currency)} sub="Managed portfolio" />
          <MetricCard icon={CalendarClock} label="Pending Transfers" value={formatCurrency(pendingTransfers, currency)} sub="Awaiting settlement" />
          <MetricCard icon={CreditCard} label="Available Credit" value={formatCurrency(availableCredit, currency)} sub="Approved facility" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {primaryCard ? (
            <PremiumCard card={primaryCard} />
          ) : (
            <div className="card-surface p-6">
              <h2 className="font-display text-xl font-semibold">
                No active card
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Request or contact the bank to issue a card.
              </p>
              <Link to="/cards" from="/">
                <Button className="mt-5">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Go to Cards
                </Button>
              </Link>
            </div>
          )}

        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <AccountTile
            title={profile.account_type || "Primary Account"}
            label="Primary account"
            number={profile.account_number}
            balance={formatCurrency(availableCash, currency)}
            icon={Landmark}
            featured
          />

          <AccountTile
            title="Investment Portfolio"
            label="Wealth management"
            number={`PORT-${profile.account_number?.slice(-6)}`}
            balance={formatCurrency(investments, currency)}
            icon={PiggyBank}
          />

          <AccountTile
            title="Credit Facility"
            label="Approved credit line"
            number={`CRD-${profile.account_number?.slice(-6)}`}
            balance={formatCurrency(availableCredit, currency)}
            icon={Wallet}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="card-surface p-5">
            <h2 className="font-display text-xl font-semibold">
              Wealth Allocation
            </h2>
            <div className="mt-5 space-y-4">
              <Allocation label="Cash" value={availableCash} total={totalAssets} currency={currency} />
              <Allocation label="Investments" value={investments} total={totalAssets} currency={currency} />
              <Allocation label="Credit" value={availableCredit} total={totalAssets} currency={currency} />
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="font-display text-xl font-semibold">
              FX Watchlist
            </h2>
            <div className="mt-5 space-y-3">
              <FxRow pair="USD / EUR" rate="0.92" change="+0.18%" />
              <FxRow pair="USD / GBP" rate="0.79" change="-0.04%" />
              <FxRow pair="USD / CHF" rate="0.88" change="+0.11%" />
              <FxRow pair="USD / GHS" rate="15.72" change="+0.24%" />
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="font-display text-xl font-semibold">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { icon: Send, label: "Send", to: "/transfer" },
                { icon: CreditCard, label: "Cards", to: "/cards" },
                { icon: Download, label: "Statement", to: "/transactions" },
                { icon: Bell, label: "Alerts", to: "/settings" },
              ].map((action) => (
                <Link key={action.label} to={action.to} from="/">
                  <button className="w-full flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-sm font-medium">
                    <action.icon className="h-4 w-4 text-accent" />
                    {action.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="card-surface p-5">
            <h2 className="font-display text-xl font-semibold">
              Security Center
            </h2>
            <div className="mt-5 space-y-3">
              <SecurityRow icon={ShieldCheck} label="Two-Factor Authentication" value="Enabled" />
              <SecurityRow icon={LockKeyhole} label="Device Trust" value="Trusted" />
              <SecurityRow icon={Bell} label="Login Alerts" value="Enabled" />
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="font-display text-xl font-semibold">
              Client Profile
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="Full name" value={profile.full_name} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Country" value={profile.banking_country || profile.country || "-"} />
              <InfoRow label="Bank" value={profile.assigned_bank || "-"} />
            </div>
          </div>

          <div className="card-git push origin mainsurface p-5">
            <h2 className="font-display text-xl font-semibold">
              Transfer
            </h2>
            <div className="mt-5 rounded-2xl border border-border bg-secondary/30 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Transfers
              </p>
              <div className="mt-2 font-display text-3xl font-semibold">
                {profile.transaction_count || 0} / {profile.transfer_limit || 2}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Transfer activity is monitored for security and account verification.
              </p>
            </div>
          </div>
        </section>

        <section className="card-surface p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Recent Activity
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest transfers and account movements.
              </p>
            </div>

            <Link
              to="/transactions"
              from="/"
              className="text-sm text-accent hover:underline font-medium"
            >
              View all →
            </Link>
          </div>

          {transactions.length > 0 ? (
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-4 py-4 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {tx.recipient_name || tx.description || "External Transfer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.recipient_bank_name || "External Bank"} ·{" "}
                      {tx.recipient_country || "International"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">
                      -{formatCurrency(Number(tx.amount), currency)}
                    </p>
                    <p className="text-xs text-success capitalize">
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No recent activity yet.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function PremiumCard({ card }: { card: BankCard }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 text-white min-h-[280px]">
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gold/20 blur-3xl" />

      <div className="relative flex justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">
            Atlas Capital Bank
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold">
            {card.card_tier}
          </h2>
        </div>

        <CreditCard className="h-7 w-7 text-gold" />
      </div>

      <div className="relative mt-10 font-mono text-2xl tracking-widest">
        •••• •••• •••• {card.last4}
      </div>

      <div className="relative mt-8 flex justify-between text-xs">
        <div>
          <p className="text-white/50 uppercase">Card Holder</p>
          <p className="mt-1 font-medium">{card.holder_name}</p>
        </div>

        <div>
          <p className="text-white/50 uppercase">Expires</p>
          <p className="mt-1 font-medium">{card.expiry}</p>
        </div>

        <div>
          <p className="text-white/50 uppercase">Network</p>
          <p className="mt-1 font-medium">{card.card_network}</p>
        </div>
      </div>
    </div>
  );
}

function IdentityPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xs truncate">{value}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card-surface p-5">
      <div className="h-10 w-10 rounded-xl bg-secondary grid place-items-center">
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <h3 className="mt-2 font-display text-2xl font-semibold tabular-nums">
        {value}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function AccountTile({
  title,
  label,
  number,
  balance,
  icon: Icon,
  featured = false,
}: {
  title: string;
  label: string;
  number: string;
  balance: string;
  icon: React.ComponentType<{ className?: string }>;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        featured
          ? "border-gold/40 bg-gradient-to-br from-gold/10 to-card"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-secondary grid place-items-center">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
          Active
        </span>
      </div>

      <p className="mt-5 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <h3 className="mt-1 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 font-mono text-xs text-muted-foreground">{number}</p>

      <div className="mt-6 font-display text-3xl font-semibold tabular-nums">
        {balance}
      </div>
    </div>
  );
}

function Allocation({
  label,
  value,
  total,
  currency,
}: {
  label: string;
  value: number;
  total: number;
  currency: string;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">
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

function FxRow({
  pair,
  rate,
  change,
}: {
  pair: string;
  rate: string;
  change: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
      <span className="text-sm">{pair}</span>
      <div className="text-right">
        <p className="font-mono text-sm">{rate}</p>
        <p className="text-xs text-success">{change}</p>
      </div>
    </div>
  );
}

function SecurityRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-success" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-xs font-medium text-success">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}