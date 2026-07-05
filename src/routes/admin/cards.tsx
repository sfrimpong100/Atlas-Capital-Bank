import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Snowflake, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/admin/cards")({
  component: AdminCardsPage,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
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
  profiles?: Profile;
};

function AdminCardsPage() {
  const [cards, setCards] = useState<BankCard[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const [form, setForm] = useState({
    profile_id: "",
    card_name: "Atlas Global Card",
    card_type: "Debit",
    card_tier: "Private Banking",
    card_network: "Visa",
    monthly_limit: "10000",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [profilesResult, cardsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, banking_currency")
        .order("created_at", { ascending: false }),

      supabase
        .from("cards")
        .select("*, profiles(id, full_name, email, banking_currency)")
        .order("created_at", { ascending: false }),
    ]);

    if (profilesResult.error) alert(profilesResult.error.message);
    if (cardsResult.error) alert(cardsResult.error.message);

    setProfiles(profilesResult.data || []);
    setCards(cardsResult.data || []);
    setLoading(false);
  }

  function generateCardNumber() {
    return `4539${Math.floor(
      100000000000 + Math.random() * 900000000000
    )}`;
  }

  async function issueCard(e: React.FormEvent) {
    e.preventDefault();

    const customer = profiles.find((p) => p.id === form.profile_id);

    if (!customer) {
      alert("Select a customer.");
      return;
    }

    setIssuing(true);

    const cardNumber = generateCardNumber();

    const { error } = await supabase.from("cards").insert({
      profile_id: customer.id,
      card_name: form.card_name,
      card_type: form.card_type,
      card_tier: form.card_tier,
      card_network: form.card_network,
      card_number: cardNumber,
      last4: cardNumber.slice(-4),
      expiry: "12/29",
      cvc: "428",
      holder_name: customer.full_name,
      currency: customer.banking_currency || "USD",
      monthly_limit: Number(form.monthly_limit || 0),
      spent_this_month: 0,
      status: "active",
      frozen: false,
    });

    if (error) {
      alert(error.message);
      setIssuing(false);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: customer.id,
      title: "New Card Issued",
      message: "A new Atlas Capital Bank card has been issued to your account.",
      type: "card",
    });

    setIssuing(false);
    setForm({
      profile_id: "",
      card_name: "Atlas Global Card",
      card_type: "Debit",
      card_tier: "Private Banking",
      card_network: "Visa",
      monthly_limit: "10000",
    });

    loadData();
  }

  async function toggleFreeze(card: BankCard) {
    const nextFrozen = !card.frozen;

    const { error } = await supabase
      .from("cards")
      .update({
        frozen: nextFrozen,
        status: nextFrozen ? "frozen" : "active",
      })
      .eq("id", card.id);

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

    loadData();
  }

  async function deleteCard(card: BankCard) {
    const ok = confirm(`Delete card ending ${card.last4}?`);
    if (!ok) return;

    const { error } = await supabase.from("cards").delete().eq("id", card.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  return (
    <AdminShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Card Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Issue, freeze, unfreeze, and manage customer cards.
          </p>
        </div>

        <section className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold mb-5">
            Issue New Card
          </h2>

          <form onSubmit={issueCard} className="grid gap-4 md:grid-cols-2">
            <select
              value={form.profile_id}
              onChange={(e) =>
                setForm({ ...form, profile_id: e.target.value })
              }
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">Select customer</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name} — {profile.email}
                </option>
              ))}
            </select>

            <Input
              placeholder="Card name"
              value={form.card_name}
              onChange={(e) => setForm({ ...form, card_name: e.target.value })}
            />

            <select
              value={form.card_type}
              onChange={(e) => setForm({ ...form, card_type: e.target.value })}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Debit">Debit</option>
              <option value="Credit">Credit</option>
              <option value="Virtual">Virtual</option>
              <option value="Physical">Physical</option>
            </select>

            <select
              value={form.card_tier}
              onChange={(e) => setForm({ ...form, card_tier: e.target.value })}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Private Banking">Private Banking</option>
              <option value="Platinum">Platinum</option>
              <option value="Black Card">Black Card</option>
              <option value="Corporate">Corporate</option>
            </select>

            <select
              value={form.card_network}
              onChange={(e) =>
                setForm({ ...form, card_network: e.target.value })
              }
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="American Express">American Express</option>
            </select>

            <Input
              type="number"
              placeholder="Monthly limit"
              value={form.monthly_limit}
              onChange={(e) =>
                setForm({ ...form, monthly_limit: e.target.value })
              }
            />

            <div className="md:col-span-2">
              <Button type="submit" disabled={issuing}>
                <CreditCard className="h-4 w-4 mr-2" />
                {issuing ? "Issuing..." : "Issue Card"}
              </Button>
            </div>
          </form>
        </section>

        <section className="glass-strong p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold">
              Issued Cards
            </h2>

            <Button variant="outline" onClick={loadData}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading cards...</p>
          ) : cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cards issued yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr>
                    <th className="py-3">Customer</th>
                    <th>Card</th>
                    <th>Network</th>
                    <th>Number</th>
                    <th>Limit</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {cards.map((card) => (
                    <tr key={card.id} className="border-b border-border/60">
                      <td className="py-3">
                        <p className="font-medium">
                          {card.profiles?.full_name || card.holder_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {card.profiles?.email}
                        </p>
                      </td>

                      <td>
                        {card.card_name}
                        <p className="text-xs text-muted-foreground">
                          {card.card_tier} · {card.card_type}
                        </p>
                      </td>

                      <td>{card.card_network}</td>
                      <td className="font-mono">•••• {card.last4}</td>
                      <td>
                        {card.currency}{" "}
                        {Number(card.monthly_limit || 0).toLocaleString()}
                      </td>

                      <td>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            card.frozen
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-success/15 text-success"
                          }`}
                        >
                          {card.frozen ? "Frozen" : "Active"}
                        </span>
                      </td>

                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleFreeze(card)}
                          >
                            <Snowflake className="h-4 w-4 mr-1" />
                            {card.frozen ? "Unfreeze" : "Freeze"}
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteCard(card)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}