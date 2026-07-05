import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CreditCard,
  Eye,
  EyeOff,
  Globe2,
  Lock,
  MonitorSmartphone,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Snowflake,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Cards — Atlas Capital Bank" },
      { name: "description", content: "Manage Atlas Capital Bank cards." },
    ],
  }),
  component: CardsPage,
});

type Profile = {
  id: string;
  full_name: string;
  banking_currency?: string | null;
};

type BankCard = {
  id: string;
  profile_id: string;
  card_name: string;
  card_type: string;
  card_tier: string;
  card_network: string;
  card_number: string;
  last4: string;
  expiry: string;
  cvc: string;
  holder_name: string;
  currency: string;
  monthly_limit: number;
  spent_this_month: number;
  status: string;
  frozen: boolean;
  created_at?: string;
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function maskCard(number: string) {
  return `•••• •••• •••• ${number.slice(-4)}`;
}

function CardsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [cards, setCards] = useState<BankCard[]>([]);
  const [activeId, setActiveId] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const [controls, setControls] = useState({
    online: true,
    international: true,
    contactless: true,
    atm: true,
  });

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    setLoading(true);

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
        router.navigate({ to: "/" });
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, banking_currency")
        .eq("id", user.id)
        .single();

      if (profileError) {
        alert(profileError.message);
        return;
      }

      setProfile(profileData);

      const { data: cardData, error: cardError } = await supabase
        .from("cards")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      if (cardError) {
        alert(cardError.message);
        return;
      }

      setCards(cardData || []);

      if (cardData && cardData.length > 0) {
        setActiveId(cardData[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  const active = cards.find((card) => card.id === activeId) || cards[0];

  const totalLimit = useMemo(
    () => cards.reduce((sum, card) => sum + Number(card.monthly_limit || 0), 0),
    [cards]
  );

  const totalSpent = useMemo(
    () =>
      cards.reduce((sum, card) => sum + Number(card.spent_this_month || 0), 0),
    [cards]
  );

  const frozenCards = cards.filter((card) => card.frozen).length;

  async function toggleFreeze(card: BankCard) {
    const nextFrozen = !card.frozen;

    const { error } = await supabase
      .from("cards")
      .update({
        frozen: nextFrozen,
        status: nextFrozen ? "frozen" : "active",
      })
      .eq("id", card.id)
      .eq("profile_id", card.profile_id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: card.profile_id,
      title: nextFrozen ? "Card Frozen" : "Card Unfrozen",
      message: `Your card ending ${card.last4} has been ${
        nextFrozen ? "frozen" : "unfrozen"
      }.`,
      type: "card",
    });

    setCards((current) =>
      current.map((item) =>
        item.id === card.id
          ? {
              ...item,
              frozen: nextFrozen,
              status: nextFrozen ? "frozen" : "active",
            }
          : item
      )
    );

    toast.success(nextFrozen ? "Card frozen" : "Card unfrozen");
  }

  async function requestNewCard() {
    if (!profile) return;

    setRequesting(true);

    try {
      const rawNumber = `4539${Math.floor(
        100000000000 + Math.random() * 900000000000
      )}`;

      const newCard = {
        profile_id: profile.id,
        card_name: "Atlas Global Card",
        card_type: "Debit",
        card_tier: "Private Banking",
        card_network: "Visa",
        card_number: rawNumber,
        last4: rawNumber.slice(-4),
        expiry: "12/29",
        cvc: "428",
        holder_name: profile.full_name,
        currency: profile.banking_currency || "USD",
        monthly_limit: 10000,
        spent_this_month: 0,
        status: "active",
        frozen: false,
      };

      const { data, error } = await supabase
        .from("cards")
        .insert(newCard)
        .select()
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      await supabase.from("notifications").insert({
        profile_id: profile.id,
        title: "New Card Issued",
        message:
          "A new Atlas Capital Bank card has been issued to your account.",
        type: "card",
      });

      setCards((current) => [data, ...current]);
      setActiveId(data.id);
      toast.success("New card issued successfully");
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[70vh] grid place-items-center">
          <p className="text-sm text-muted-foreground">Loading cards...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-muted-foreground">Wallet</div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
              Card Control Center
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Manage cards, security controls, limits, and spending.
            </p>
          </div>

          <Button
            onClick={requestNewCard}
            disabled={requesting}
            className="bg-gradient-gold text-black hover:opacity-90 h-10 rounded-full px-5 font-semibold"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {requesting ? "Issuing..." : "Request new card"}
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Cards"
            value={String(cards.length)}
            helper={`${frozenCards} frozen`}
            icon={CreditCard}
          />
          <StatCard
            label="Monthly limit"
            value={formatCurrency(totalLimit, profile?.banking_currency || "USD")}
            helper="Across all cards"
            icon={Settings2}
          />
          <StatCard
            label="Spent this month"
            value={formatCurrency(totalSpent, profile?.banking_currency || "USD")}
            helper="Card activity"
            icon={ShieldCheck}
          />
        </section>

        {cards.length === 0 ? (
          <section className="glass-strong p-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-secondary grid place-items-center mb-4">
              <CreditCard className="h-7 w-7 text-gold" />
            </div>
            <h2 className="font-display text-2xl font-semibold">
              No cards issued yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Request your first Atlas Capital Bank card.
            </p>
          </section>
        ) : (
          <section className="grid lg:grid-cols-[1fr_1fr] gap-8">
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setActiveId(card.id);
                      setShowFull(false);
                    }}
                    className={`text-left rounded-3xl transition-all ${
                      active?.id === card.id
                        ? "ring-2 ring-gold"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <PremiumCard card={card} />
                  </button>
                ))}
              </div>
            </div>

            {active && (
              <div className="space-y-6">
                <section className="glass-strong p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {active.card_tier} · {active.card_type}
                      </p>
                      <h2 className="font-display text-2xl font-semibold mt-1">
                        {active.card_name}
                      </h2>
                    </div>

                    <StatusBadge card={active} />
                  </div>

                  <div className="space-y-3 font-mono text-sm">
                    <Row
                      label="Card number"
                      value={
                        showFull
                          ? active.card_number
                          : maskCard(active.card_number)
                      }
                      action={
                        <button
                          type="button"
                          onClick={() => setShowFull((value) => !value)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showFull ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    />

                    <Row label="Expires" value={active.expiry} />
                    <Row label="CVC" value={showFull ? active.cvc : "•••"} />
                    <Row label="Holder" value={active.holder_name} />
                    <Row label="Network" value={active.card_network} />
                    <Row
                      label="Monthly limit"
                      value={formatCurrency(
                        Number(active.monthly_limit),
                        active.currency
                      )}
                    />
                  </div>

                  <SpendBar card={active} />

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={active.frozen ? "default" : "outline"}
                      onClick={() => toggleFreeze(active)}
                      className="rounded-xl h-11"
                    >
                      <Snowflake className="h-4 w-4 mr-1.5" />
                      {active.frozen ? "Unfreeze" : "Freeze"}
                    </Button>

                    <Button variant="outline" className="rounded-xl h-11">
                      <Settings2 className="h-4 w-4 mr-1.5" />
                      Limits
                    </Button>

                    <Button variant="outline" className="rounded-xl h-11">
                      <Lock className="h-4 w-4 mr-1.5" />
                      PIN
                    </Button>
                  </div>
                </section>

                <section className="glass-strong p-6">
                  <h2 className="font-display text-xl font-semibold">
                    Card Security Controls
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Toggle card usage channels instantly.
                  </p>

                  <div className="mt-5 space-y-3">
                    <ControlRow
                      icon={MonitorSmartphone}
                      label="Online payments"
                      description="Allow card payments on websites and apps."
                      active={controls.online}
                      onClick={() =>
                        setControls((v) => ({ ...v, online: !v.online }))
                      }
                    />
                    <ControlRow
                      icon={Globe2}
                      label="International use"
                      description="Allow card transactions outside your country."
                      active={controls.international}
                      onClick={() =>
                        setControls((v) => ({
                          ...v,
                          international: !v.international,
                        }))
                      }
                    />
                    <ControlRow
                      icon={Wifi}
                      label="Contactless payments"
                      description="Allow tap-to-pay transactions."
                      active={controls.contactless}
                      onClick={() =>
                        setControls((v) => ({
                          ...v,
                          contactless: !v.contactless,
                        }))
                      }
                    />
                    <ControlRow
                      icon={CreditCard}
                      label="ATM withdrawals"
                      description="Allow cash withdrawals from ATMs."
                      active={controls.atm}
                      onClick={() =>
                        setControls((v) => ({ ...v, atm: !v.atm }))
                      }
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-gold/30 bg-gold/10 p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-gold shrink-0" />
                    <div>
                      <p className="font-semibold">Lost or stolen card?</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Freeze the card immediately, then contact Atlas Capital
                        support for replacement.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function PremiumCard({ card }: { card: BankCard }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-6 text-white min-h-[230px]">
      <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">
            Atlas Capital Bank
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold">
            {card.card_tier}
          </h3>
        </div>

        <CreditCard className="h-7 w-7 text-gold" />
      </div>

      <div className="relative mt-10 font-mono text-xl tracking-widest">
        {maskCard(card.card_number)}
      </div>

      <div className="relative mt-8 flex items-end justify-between text-xs">
        <div>
          <p className="text-white/50 uppercase tracking-wider">Card Holder</p>
          <p className="font-medium">{card.holder_name}</p>
        </div>

        <div className="text-right">
          <p className="text-white/50 uppercase tracking-wider">Expires</p>
          <p className="font-medium">{card.expiry}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ card }: { card: BankCard }) {
  const frozen = card.frozen || card.status === "frozen";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
        frozen ? "bg-blue-500/20 text-blue-300" : "bg-success/20 text-success"
      }`}
    >
      {frozen ? "Frozen" : "Active"}
    </span>
  );
}

function SpendBar({ card }: { card: BankCard }) {
  const limit = Number(card.monthly_limit || 0);
  const spent = Number(card.spent_this_month || 0);
  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Monthly spend</span>
        <span className="font-medium">
          {formatCurrency(spent, card.currency)} /{" "}
          {formatCurrency(limit, card.currency)}
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

function ControlRow({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-secondary/30 p-4 flex items-center justify-between gap-4 text-left"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-card grid place-items-center">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <span
        className={`h-6 w-11 rounded-full p-1 transition-colors ${
          active ? "bg-success" : "bg-muted"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition-transform ${
            active ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
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
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function Row({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-sans">
        {label}
      </span>

      <span className="flex items-center gap-2 tabular-nums">
        {value}
        {action}
      </span>
    </div>
  );
}