import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDown,
  ArrowLeftRight,
  Building2,
  Globe2,
  Lock,
  User,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/transfer")({
  component: Transfer,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
  account_number: string;
  virtual_balance: number;
  status: "active" | "suspended";
  access_expires_at: string | null;
  transaction_count: number;
  transfer_limit: number;
  banking_currency?: string | null;
};

type Beneficiary = {
  id: string;
  profile_id: string;
  beneficiary_name: string;
  account_number: string;
  bank_name: string;
  country: string;
  currency: string;
  nickname?: string | null;
  status?: string | null;
  created_at?: string;
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function Transfer() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const loggedIn = await isAuthed();

        if (!loggedIn) {
          router.navigate({ to: "/" });
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.navigate({ to: "/" });
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) {
          alert(profileError.message);
          router.navigate({ to: "/dashboard" });
          return;
        }

        setProfile(profileData);

        const { data: beneficiaryData, error: beneficiaryError } =
          await supabase
            .from("beneficiaries")
            .select("*")
            .eq("profile_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false });

        if (beneficiaryError) {
          alert(beneficiaryError.message);
          setBeneficiaries([]);
          return;
        }

        setBeneficiaries(beneficiaryData || []);

        if (beneficiaryData && beneficiaryData.length > 0) {
          setSelectedBeneficiaryId(beneficiaryData[0].id);
        }
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [router]);

  const selectedBeneficiary = beneficiaries.find(
    (item) => item.id === selectedBeneficiaryId
  );

  const currency =
    selectedBeneficiary?.currency || profile?.banking_currency || "USD";

  const amt = Number(amount || 0);
  const transferFee = amt > 0 ? 35 : 0;
  const exchangeRate = 1;
  const destinationAmount = amt * exchangeRate;
  const totalDebit = amt + transferFee;

  const isExpired =
    profile?.access_expires_at &&
    new Date(profile.access_expires_at).getTime() < Date.now();

  const hasReachedLimit =
    Number(profile?.transaction_count || 0) >=
    Number(profile?.transfer_limit || 2);

  const valid =
    !!profile &&
    profile.status === "active" &&
    !isExpired &&
    !hasReachedLimit &&
    !!selectedBeneficiary &&
    amt > 0 &&
    totalDebit <= Number(profile.virtual_balance || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!profile) return;

    if (profile.status !== "active") {
      toast.error("This account is not active.");
      return;
    }

    if (isExpired) {
      toast.error("This account access has expired. Contact administrator.");
      return;
    }

    if (hasReachedLimit) {
      toast.error("Transfer blocked. Transaction limit reached.");
      return;
    }

    if (!selectedBeneficiary) {
      toast.error("Please select a beneficiary.");
      return;
    }

    if (amt <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    if (totalDebit > Number(profile.virtual_balance || 0)) {
      toast.error("Insufficient balance including transfer fee.");
      return;
    }

    setSubmitting(true);

    try {
      const receiptNumber = `ACB-${Date.now()}`;
      const transferReference = reference || receiptNumber;

      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          sender_id: profile.id,
          recipient_account_number: selectedBeneficiary.account_number,
          recipient_name: selectedBeneficiary.beneficiary_name,
          recipient_bank_name: selectedBeneficiary.bank_name,
          recipient_country: selectedBeneficiary.country,
          recipient_currency: selectedBeneficiary.currency,
          amount: amt,
          description: note || "International bank transfer",
          reference: transferReference,
          transaction_type: "external_bank",
          transfer_type: "external_bank",
          status: "pending",
          transfer_stage: "pending_review",
          transfer_fee: transferFee,
          exchange_rate: exchangeRate,
          destination_amount: destinationAmount,
          receipt_number: receiptNumber,
        })
        .select()
        .single();

      if (transactionError) {
        console.error("Transaction insert error:", transactionError);
        throw transactionError;
      }

      await supabase.from("notifications").insert({
        profile_id: profile.id,
        title: "Transfer Submitted",
        message: `Your transfer of ${formatCurrency(
          amt,
          currency
        )} to ${
          selectedBeneficiary.beneficiary_name
        } has been received and is awaiting review by Atlas Capital Bank.`,
        type: "transfer",
      });

      toast.success("Your transfer has been submitted for review.");

      router.navigate({
        to: "/transfer-status/$id",
        params: { id: transactionData.id },
      });
    } catch (error: any) {
      console.error("TRANSFER ERROR:", error);
      alert(error?.message || "Transfer submission failed");
      toast.error(error?.message || "Transfer submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingProfile) {
    return (
      <AppShell>
        <div className="min-h-[70vh] grid place-items-center">
          <p className="text-sm text-muted-foreground">
            Loading transfer access...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-semibold">
            Account not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact administrator to complete your account setup.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 animate-fade-in">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          International Bank Transfer
        </h1>

        <p className="text-muted-foreground text-sm mt-1">
          Submit a secure transfer request to an approved beneficiary.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniCard label="From account" value={profile.account_number} />
          <MiniCard
            label="Available balance"
            value={formatCurrency(Number(profile.virtual_balance), currency)}
          />
          <MiniCard
            label="Transfers"
            value={`${profile.transaction_count || 0} / ${
              profile.transfer_limit || 2
            }`}
          />
        </div>

        {(hasReachedLimit ||
          isExpired ||
          profile.status !== "active" ||
          beneficiaries.length === 0) && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {hasReachedLimit &&
              "Transfer blocked. This account has reached its transfer limit."}
            {isExpired && "This account access has expired."}
            {profile.status !== "active" && "This account is not active."}
            {beneficiaries.length === 0 &&
              "No active beneficiary has been added to this account. Contact administrator."}
          </div>
        )}

        <form
          onSubmit={submit}
          className="mt-8 card-surface p-5 sm:p-7 space-y-6"
        >
          <section>
            <h2 className="font-display text-lg font-semibold mb-4">
              Select Beneficiary
            </h2>

            <select
              value={selectedBeneficiaryId}
              onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select beneficiary</option>

              {beneficiaries.map((beneficiary) => (
                <option key={beneficiary.id} value={beneficiary.id}>
                  {beneficiary.beneficiary_name} — {beneficiary.bank_name} —{" "}
                  {beneficiary.account_number}
                </option>
              ))}
            </select>

            {selectedBeneficiary && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ReadOnlyCard
                  icon={User}
                  label="Beneficiary Name"
                  value={selectedBeneficiary.beneficiary_name}
                />
                <ReadOnlyCard
                  icon={Building2}
                  label="Bank"
                  value={selectedBeneficiary.bank_name}
                />
                <ReadOnlyCard
                  icon={Globe2}
                  label="Country"
                  value={selectedBeneficiary.country}
                />
                <ReadOnlyCard
                  icon={ArrowLeftRight}
                  label="Account Number"
                  value={selectedBeneficiary.account_number}
                />
              </div>
            )}
          </section>

          <div className="flex justify-center -my-2">
            <div className="h-9 w-9 rounded-full bg-gradient-gold grid place-items-center shadow-glow">
              <ArrowDown className="h-4 w-4 text-primary" />
            </div>
          </div>

          <section>
            <h2 className="font-display text-lg font-semibold mb-4">
              Transfer Details
            </h2>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount ({currency})</Label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-display text-2xl">
                    {formatCurrency(0, currency).replace(/[0-9.,\s]/g, "")}
                  </span>

                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-16 pl-12 text-3xl font-display font-semibold tabular-nums tracking-tight bg-secondary/40 border-0"
                    required
                  />
                </div>

                {totalDebit > Number(profile.virtual_balance) && amt > 0 && (
                  <p className="text-xs text-destructive">
                    Insufficient balance including transfer fee.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MiniCard
                  label="Transfer fee"
                  value={amt > 0 ? formatCurrency(transferFee, currency) : "-"}
                />
                <MiniCard label="Exchange rate" value={String(exchangeRate)} />
                <MiniCard
                  label="Destination amount"
                  value={
                    amt > 0
                      ? formatCurrency(destinationAmount, currency)
                      : "-"
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Invoice, family support, business payment..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add transfer instructions or description"
                  rows={2}
                  className="bg-secondary/40 border-0 resize-none"
                />
              </div>
            </div>
          </section>

          <div className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground flex items-start gap-2 border border-border">
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
            <span>
              Transfers are submitted for review before settlement. Funds are
              only deducted after Atlas Capital Bank completes processing.
            </span>
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            <p>Transfer check:</p>
            <p>Status active: {profile.status === "active" ? "yes" : "no"}</p>
            <p>Expired: {isExpired ? "yes" : "no"}</p>
            <p>Reached limit: {hasReachedLimit ? "yes" : "no"}</p>
            <p>
              Beneficiary selected: {selectedBeneficiary ? "yes" : "no"}
            </p>
            <p>Amount valid: {amt > 0 ? "yes" : "no"}</p>
            <p>
              Enough balance including fee:{" "}
              {totalDebit <= Number(profile.virtual_balance || 0)
                ? "yes"
                : "no"}
            </p>
          </div>

          <Button
            type="submit"
            disabled={false}
            className="w-full h-12 rounded-lg font-semibold text-base bg-primary hover:bg-primary/90"
          >
            {submitting ? (
              "Submitting transfer..."
            ) : (
              <>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                {amt > 0
                  ? `Submit ${formatCurrency(amt, currency)} for review`
                  : "Submit transfer request"}
              </>
            )}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display font-semibold text-lg truncate">
        {value}
      </p>
    </div>
  );
}

function ReadOnlyCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4 text-gold" />
        {label}
      </div>
      <p className="mt-2 font-medium break-words">{value}</p>
    </div>
  );
}