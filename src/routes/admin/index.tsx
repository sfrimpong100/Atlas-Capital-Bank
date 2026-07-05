import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CreditCard,
  Landmark,
  Loader2,
  Shield,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type Profile = {
  id: string;
  status: "active" | "suspended";
  virtual_balance?: number | null;
  investment_balance?: number | null;
  available_credit?: number | null;
  created_at?: string;
};

type Transfer = {
  id: string;
  amount: number;
  status: string;
  recipient_name?: string | null;
  recipient_bank_name?: string | null;
  created_at: string;
};

type CardRow = {
  id: string;
  status: string;
  frozen: boolean;
};

type Beneficiary = {
  id: string;
  status?: string | null;
};

type NotificationRow = {
  id: string;
  is_read: boolean;
};

function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    try {
      const [
        profilesResult,
        transfersResult,
        cardsResult,
        beneficiariesResult,
        notificationsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id,status,virtual_balance,investment_balance,available_credit,created_at"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("transactions")
          .select("id,amount,status,recipient_name,recipient_bank_name,created_at")
          .order("created_at", { ascending: false })
          .limit(8),

        supabase.from("cards").select("id,status,frozen"),

        supabase.from("beneficiaries").select("id,status"),

        supabase.from("notifications").select("id,is_read"),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (transfersResult.error) throw transfersResult.error;
      if (cardsResult.error) throw cardsResult.error;
      if (beneficiariesResult.error) throw beneficiariesResult.error;
      if (notificationsResult.error) throw notificationsResult.error;

      setProfiles(profilesResult.data || []);
      setTransfers(transfersResult.data || []);
      setCards(cardsResult.data || []);
      setBeneficiaries(beneficiariesResult.data || []);
      setNotifications(notificationsResult.data || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  const activeCustomers = profiles.filter((p) => p.status === "active").length;
  const suspendedCustomers = profiles.filter(
    (p) => p.status === "suspended"
  ).length;

  const totalDeposits = profiles.reduce(
    (sum, item) => sum + Number(item.virtual_balance || 0),
    0
  );

  const totalInvestments = profiles.reduce(
    (sum, item) => sum + Number(item.investment_balance || 0),
    0
  );

  const totalCredit = profiles.reduce(
    (sum, item) => sum + Number(item.available_credit || 0),
    0
  );

  const assetsUnderManagement = totalDeposits + totalInvestments + totalCredit;

  const frozenCards = cards.filter((card) => card.frozen).length;

  const pendingTransfers = transfers.filter((transfer) =>
    ["pending", "review", "processing"].includes(
      String(transfer.status || "").toLowerCase()
    )
  ).length;

  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  const activeBeneficiaries = beneficiaries.filter(
    (b) => b.status === "active" || !b.status
  ).length;

  return (
    <AdminShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gold">
              <Shield className="h-4 w-4" />
              Operations Control Center
            </div>

            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              Executive Dashboard
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Monitor customers, transfers, cards, beneficiaries, and security activity.
            </p>
          </div>

          <Button variant="outline" onClick={loadDashboard} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Customers"
            value={profiles.length}
            helper={`${activeCustomers} active · ${suspendedCustomers} suspended`}
          />

          <StatMoney
            icon={Wallet}
            label="Assets Under Management"
            value={assetsUnderManagement}
            helper="Cash, investments, and credit"
          />

          <StatCard
            icon={CreditCard}
            label="Cards Issued"
            value={cards.length}
            helper={`${frozenCards} frozen`}
          />

          <StatCard
            icon={ArrowLeftRight}
            label="Pending Transfers"
            value={pendingTransfers}
            helper={`${transfers.length} recent transfers loaded`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Landmark}
            label="Beneficiaries"
            value={activeBeneficiaries}
            helper="Approved transfer recipients"
          />

          <StatCard
            icon={Bell}
            label="Unread Alerts"
            value={unreadNotifications}
            helper="Customer notifications"
          />

          <StatMoney
            icon={Wallet}
            label="Total Deposits"
            value={totalDeposits}
            helper="Available client cash"
          />

          <StatMoney
            icon={BarChart3}
            label="Investments + Credit"
            value={totalInvestments + totalCredit}
            helper="Wealth and credit exposure"
          />
        </div>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="glass-strong p-6 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  Recent Transfers
                </h2>
                <p className="text-xs text-muted-foreground">
                  Latest transaction activity across customer accounts.
                </p>
              </div>

              <Link
                to="/admin/transfers"
                from="/"
                className="text-sm text-gold hover:underline"
              >
                View all
              </Link>
            </div>

            {transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transfer activity yet.
              </p>
            ) : (
              <div className="space-y-3">
                {transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="rounded-xl border border-border bg-secondary/30 p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {transfer.recipient_name || "External Recipient"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transfer.recipient_bank_name || "External Bank"} ·{" "}
                        {new Date(transfer.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-sm">
                        ${Number(transfer.amount || 0).toLocaleString()}
                      </p>
                      <StatusPill status={transfer.status || "completed"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold mb-5">
              Operations Queue
            </h2>

            <div className="space-y-3">
              <QueueItem
                icon={ArrowLeftRight}
                label="Transfers awaiting review"
                value={pendingTransfers}
                to="/admin/transfers"
              />

              <QueueItem
                icon={Landmark}
                label="Beneficiaries active"
                value={activeBeneficiaries}
                to="/admin/beneficiaries"
              />

              <QueueItem
                icon={CreditCard}
                label="Cards currently frozen"
                value={frozenCards}
                to="/admin/cards"
              />

              <QueueItem
                icon={ShieldAlert}
                label="Unread security/customer alerts"
                value={unreadNotifications}
                to="/admin/notifications"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <QuickAction
            icon={Users}
            title="Customer Management"
            description="Create, edit, suspend, or delete customer accounts."
            to="/admin/customers"
          />

          <QuickAction
            icon={CreditCard}
            title="Card Operations"
            description="Issue, freeze, replace, and monitor bank cards."
            to="/admin/cards"
          />

          <QuickAction
            icon={Bell}
            title="Notifications"
            description="Send customer alerts and review notification history."
            to="/admin/notifications"
          />
        </section>
      </div>
    </AdminShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-gold" />
      </div>

      <div className="mt-3 font-display text-3xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function StatMoney({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-gold" />
      </div>

      <div className="mt-3 font-display text-3xl font-semibold tabular-nums">
        ${Number(value || 0).toLocaleString()}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();

  const className =
    normalized === "successful" || normalized === "completed"
      ? "bg-success/15 text-success"
      : normalized === "pending" || normalized === "processing"
        ? "bg-gold/15 text-gold"
        : normalized === "rejected" || normalized === "failed"
          ? "bg-destructive/15 text-destructive"
          : "bg-secondary text-muted-foreground";

  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${className}`}
    >
      {status}
    </span>
  );
}

function QueueItem({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  to: string;
}) {
  return (
    <Link
      to={to}
      from="/"
      className="rounded-xl border border-border bg-secondary/30 p-4 flex items-center justify-between hover:bg-secondary transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-card grid place-items-center">
          <Icon className="h-4 w-4 text-gold" />
        </div>

        <span className="text-sm">{label}</span>
      </div>

      <span className="font-display text-xl font-semibold">{value}</span>
    </Link>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      from="/"
      className="glass-strong p-6 hover:bg-secondary/30 transition-colors"
    >
      <div className="h-11 w-11 rounded-xl bg-secondary grid place-items-center mb-4">
        <Icon className="h-5 w-5 text-gold" />
      </div>

      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}