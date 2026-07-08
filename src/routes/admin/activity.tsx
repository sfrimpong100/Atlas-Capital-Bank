import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/admin/activity")({
  component: AdminActivityPage,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
  account_number: string;
  virtual_balance: number;
  investment_balance?: number | null;
  available_credit?: number | null;
  banking_currency?: string | null;
};

type Transaction = {
  id: string;
  sender_id: string;
  amount: number;
  status: string;
  transaction_type?: string | null;
  ledger_direction?: string | null;
  ledger_category?: string | null;
  reference?: string | null;
  description?: string | null;
  recipient_name?: string | null;
  recipient_bank_name?: string | null;
  recipient_currency?: string | null;
  balance_after?: number | null;
  created_by_admin?: boolean | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    account_number: string;
    virtual_balance?: number | null;
    banking_currency?: string | null;
  } | null;
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function AdminActivityPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    profile_id: "",
    transaction_type: "cash_deposit",
    ledger_direction: "credit",
    amount: "",
    reference: "",
    description: "",
    status: "completed",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    update_cash_balance: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [profilesRes, txRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,full_name,email,account_number,virtual_balance,investment_balance,available_credit,banking_currency"
        )
        .order("full_name", { ascending: true }),

      supabase
        .from("transactions")
        .select(
          `
          *,
          profiles:sender_id (
            full_name,
            email,
            account_number,
            virtual_balance,
            banking_currency
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (profilesRes.error) alert(profilesRes.error.message);
    if (txRes.error) alert(txRes.error.message);

    setProfiles(profilesRes.data || []);
    setTransactions(txRes.data || []);

    if (!form.profile_id && profilesRes.data && profilesRes.data.length > 0) {
      setForm((prev) => ({
        ...prev,
        profile_id: profilesRes.data[0].id,
      }));
    }

    setLoading(false);
  }

  const selectedProfile = profiles.find((p) => p.id === form.profile_id);
  const selectedCurrency = selectedProfile?.banking_currency || "USD";

  async function createTransaction(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProfile) {
      alert("Select a customer.");
      return;
    }

    const amount = Number(form.amount || 0);

    if (amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    const direction = form.ledger_direction;
    const currentBalance = Number(selectedProfile.virtual_balance || 0);

    let newBalance = currentBalance;

    if (form.update_cash_balance) {
      newBalance =
        direction === "credit"
          ? currentBalance + amount
          : currentBalance - amount;

      if (newBalance < 0) {
        alert("This debit would make the customer balance negative.");
        return;
      }
    }

    const createdAt = new Date(`${form.date}T${form.time}:00`).toISOString();

    const reference =
      form.reference ||
      `ACB-${form.transaction_type.toUpperCase()}-${Date.now()}`;

    const { error: insertError } = await supabase.from("transactions").insert({
      sender_id: selectedProfile.id,
      amount,
      status: form.status,
      transaction_type: form.transaction_type,
      transfer_type: form.transaction_type,
      ledger_direction: direction,
      ledger_category: getCategory(form.transaction_type),
      recipient_name: getDisplayName(form.transaction_type),
      recipient_bank_name: "Atlas Capital Bank",
      recipient_currency: selectedCurrency,
      reference,
      receipt_number: reference,
      description:
        form.description || getDefaultDescription(form.transaction_type),
      transfer_fee: 0,
      exchange_rate: 1,
      destination_amount: amount,
      transfer_stage:
        form.status === "completed" ? "completed" : "pending_review",
      completed_at: form.status === "completed" ? createdAt : null,
      balance_after: form.update_cash_balance ? newBalance : currentBalance,
      created_by_admin: true,
      created_at: createdAt,
    });

    if (insertError) {
      alert(insertError.message);
      return;
    }

    if (form.update_cash_balance) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          virtual_balance: newBalance,
        })
        .eq("id", selectedProfile.id);

      if (updateError) {
        alert(updateError.message);
        return;
      }
    }

    await supabase.from("notifications").insert({
      profile_id: selectedProfile.id,
      title: "Account Activity Updated",
      message: `${getDisplayName(form.transaction_type)} of ${formatCurrency(
        amount,
        selectedCurrency
      )} has been posted to your account.`,
      type: "account",
    });

    setForm((prev) => ({
      ...prev,
      amount: "",
      reference: "",
      description: "",
    }));

    await loadData();
  }

  async function deleteTransaction(tx: Transaction) {
    const shouldReverse =
      tx.created_by_admin &&
      tx.status === "completed" &&
      tx.balance_after !== null &&
      tx.balance_after !== undefined;

    const message = shouldReverse
      ? "Delete this history and reverse its balance effect?"
      : "Delete this transaction history?";

    if (!confirm(message)) return;

    setDeletingId(tx.id);

    try {
      if (shouldReverse) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, virtual_balance")
          .eq("id", tx.sender_id)
          .single();

        if (profileError) throw profileError;

        const currentBalance = Number(profile.virtual_balance || 0);
        const amount = Number(tx.amount || 0);
        const direction = tx.ledger_direction || "debit";

        const reversedBalance =
          direction === "credit"
            ? currentBalance - amount
            : currentBalance + amount;

        const { error: balanceError } = await supabase
          .from("profiles")
          .update({
            virtual_balance: reversedBalance,
          })
          .eq("id", tx.sender_id);

        if (balanceError) throw balanceError;
      }

      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", tx.id);

      if (deleteError) throw deleteError;

      await supabase.from("notifications").insert({
        profile_id: tx.sender_id,
        title: "Account Activity Removed",
        message: `A transaction history item was removed from your account activity.`,
        type: "account",
      });

      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setDeletingId("");
    }
  }

  const filtered = useMemo(() => {
    const term = query.toLowerCase();

    return transactions.filter((tx) => {
      if (!term) return true;

      return (
        tx.profiles?.full_name?.toLowerCase().includes(term) ||
        tx.profiles?.email?.toLowerCase().includes(term) ||
        tx.reference?.toLowerCase().includes(term) ||
        tx.description?.toLowerCase().includes(term) ||
        tx.transaction_type?.toLowerCase().includes(term) ||
        tx.status?.toLowerCase().includes(term)
      );
    });
  }, [transactions, query]);

  return (
    <AdminShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-gold">
              <Activity className="h-5 w-5" />
              Ledger Operations
            </div>

            <h1 className="mt-2 font-display text-3xl font-semibold">
              Activity Manager
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Add and remove manual transaction history from customer activity pages.
            </p>
          </div>

          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <section className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold mb-5">
            Add Transaction History
          </h2>

          <form onSubmit={createTransaction} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Customer
              </label>
              <select
                value={form.profile_id}
                onChange={(e) =>
                  setForm({ ...form, profile_id: e.target.value })
                }
                className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name} — {profile.email} —{" "}
                    {profile.account_number}
                  </option>
                ))}
              </select>
            </div>

            {selectedProfile && (
              <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
                <Info
                  label="Current Balance"
                  value={formatCurrency(
                    Number(selectedProfile.virtual_balance || 0),
                    selectedCurrency
                  )}
                />
                <Info label="Currency" value={selectedCurrency} />
                <Info
                  label="Account"
                  value={selectedProfile.account_number || "-"}
                />
              </div>
            )}

            <SelectField
              label="Transaction Type"
              value={form.transaction_type}
              onChange={(value) =>
                setForm({
                  ...form,
                  transaction_type: value,
                  ledger_direction: defaultDirection(value),
                })
              }
              options={[
                ["cash_deposit", "Cash Deposit"],
                ["cash_withdrawal", "Cash Withdrawal"],
                ["incoming_transfer", "Incoming Transfer"],
                ["international_transfer", "International Transfer"],
                ["salary_payment", "Salary Payment"],
                ["interest_payment", "Interest Payment"],
                ["investment_deposit", "Investment Deposit"],
                ["investment_return", "Investment Return"],
                ["card_purchase", "Card Purchase"],
                ["atm_withdrawal", "ATM Withdrawal"],
                ["bank_charge", "Bank Charge"],
                ["transfer_fee", "Transfer Fee"],
                ["refund", "Refund"],
                ["loan_disbursement", "Loan Disbursement"],
                ["loan_repayment", "Loan Repayment"],
              ]}
            />

            <SelectField
              label="Direction"
              value={form.ledger_direction}
              onChange={(value) =>
                setForm({ ...form, ledger_direction: value })
              }
              options={[
                ["credit", "Credit"],
                ["debit", "Debit"],
              ]}
            />

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Amount ({selectedCurrency})
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="mt-2"
              />
            </div>

            <SelectField
              label="Status"
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value })}
              options={[
                ["completed", "Completed"],
                ["pending", "Pending"],
                ["processing", "Processing"],
                ["failed", "Failed"],
              ]}
            />

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Date
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Time
              </label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Reference
              </label>
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
                placeholder="Optional reference"
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Statement description"
                className="mt-2"
              />
            </div>

            <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-sm">
              <input
                type="checkbox"
                checked={form.update_cash_balance}
                onChange={(e) =>
                  setForm({
                    ...form,
                    update_cash_balance: e.target.checked,
                  })
                }
              />
              Update customer available cash balance
            </label>

            <div className="md:col-span-2">
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </form>
        </section>

        <section className="glass-strong p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Recent Ledger Entries
              </h2>
              <p className="text-xs text-muted-foreground">
                Latest transfers and manually added transactions.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activity..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((tx) => {
              const currency =
                tx.recipient_currency ||
                tx.profiles?.banking_currency ||
                "USD";

              const direction = tx.ledger_direction || "debit";
              const isCredit = direction === "credit";

              return (
                <div
                  key={tx.id}
                  className="rounded-xl border border-border bg-secondary/20 p-4 grid gap-4 md:grid-cols-[1fr_1.2fr_auto_auto] md:items-center"
                >
                  <div>
                    <p className="font-semibold">
                      {tx.profiles?.full_name || "Customer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.profiles?.email}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {tx.profiles?.account_number}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium">
                      {tx.description ||
                        getDefaultDescription(tx.transaction_type || "")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ref: {tx.reference || "-"} ·{" "}
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                    {tx.created_by_admin && (
                      <p className="mt-1 text-[11px] text-gold">
                        Admin-created ledger item
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-display text-lg font-semibold ${
                        isCredit ? "text-success" : "text-destructive"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {formatCurrency(Number(tx.amount || 0), currency)}
                    </p>

                    <StatusPill status={tx.status || "completed"} />
                  </div>

                  <div className="flex md:justify-end">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletingId === tx.id}
                      onClick={() => deleteTransaction(tx)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deletingId === tx.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-medium break-words">{value}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();

  const className =
    normalized === "completed" || normalized === "successful"
      ? "bg-success/15 text-success"
      : normalized === "pending" || normalized === "processing"
        ? "bg-gold/15 text-gold"
        : normalized === "failed" || normalized === "rejected"
          ? "bg-destructive/15 text-destructive"
          : "bg-secondary text-muted-foreground";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs capitalize ${className}`}
    >
      {status}
    </span>
  );
}

function defaultDirection(type: string) {
  const debitTypes = [
    "cash_withdrawal",
    "international_transfer",
    "investment_deposit",
    "card_purchase",
    "atm_withdrawal",
    "bank_charge",
    "transfer_fee",
    "loan_repayment",
  ];

  return debitTypes.includes(type) ? "debit" : "credit";
}

function getCategory(type: string) {
  if (type.includes("investment")) return "investment";
  if (type.includes("loan")) return "loan";
  if (type.includes("card")) return "card";
  if (type.includes("transfer")) return "transfer";
  if (type.includes("fee") || type.includes("charge")) return "fees";
  return "account";
}

function getDisplayName(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDefaultDescription(type: string) {
  const map: Record<string, string> = {
    cash_deposit: "Cash deposit",
    cash_withdrawal: "Cash withdrawal",
    incoming_transfer: "Incoming transfer",
    international_transfer: "International bank transfer",
    salary_payment: "Salary payment",
    interest_payment: "Interest payment",
    investment_deposit: "Investment deposit",
    investment_return: "Investment return",
    card_purchase: "Card purchase",
    atm_withdrawal: "ATM withdrawal",
    bank_charge: "Bank charge",
    transfer_fee: "Transfer fee",
    refund: "Refund",
    loan_disbursement: "Loan disbursement",
    loan_repayment: "Loan repayment",
  };

  return map[type] || getDisplayName(type);
}