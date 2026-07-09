import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  queueEmail,
  transferCompletedEmail,
} from "@/lib/email-notifications";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  Copy,
  KeyRound,
  RefreshCcw,
  Search,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/transfers")({
  component: AdminTransfersPage,
});

type Transfer = {
  id: string;
  sender_id: string;
  amount: number;
  status: string;
  transfer_stage?: string | null;
  recipient_name?: string | null;
  recipient_account_number?: string | null;
  recipient_bank_name?: string | null;
  recipient_country?: string | null;
  recipient_currency?: string | null;
  reference?: string | null;
  receipt_number?: string | null;
  transfer_fee?: number | null;
  created_at: string;
  completed_at?: string | null;
  rejected_at?: string | null;
  otp_code?: string | null;
  otp_verified?: boolean | null;
  otp_generated_at?: string | null;
  otp_expires_at?: string | null;
  profiles?: {
    full_name: string;
    email: string;
    account_number: string;
    virtual_balance: number;
    transaction_count: number;
    transfer_limit: number;
    banking_currency?: string | null;
  } | null;
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function AdminTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadTransfers();
  }, []);

  async function loadTransfers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        profiles:sender_id (
          full_name,
          email,
          account_number,
          virtual_balance,
          transaction_count,
          transfer_limit,
          banking_currency
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setTransfers(data || []);
    setLoading(false);
  }

  async function generateTransferOtp(transfer: Transfer) {
    setActionLoadingId(`${transfer.id}-otp`);

    try {
      const otp = generateOtp();
      const now = new Date();
      const expires = new Date(now.getTime() + 15 * 60 * 1000);

      const { error } = await supabase
        .from("transactions")
        .update({
          otp_code: otp,
          otp_verified: false,
          otp_generated_at: now.toISOString(),
          otp_expires_at: expires.toISOString(),
          transfer_stage: "otp_required",
        })
        .eq("id", transfer.id);

      if (error) throw error;

      await supabase.from("notifications").insert({
        profile_id: transfer.sender_id,
        title: "Transfer OTP Required",
        message:
          "An OTP has been generated for your transfer. Please enter the OTP provided by the bank officer.",
        type: "security",
      });

      await loadTransfers();
    } catch (error) {
      alert(error instanceof Error ? error.message : "OTP generation failed.");
    } finally {
      setActionLoadingId("");
    }
  }

  async function copyOtp(otp?: string | null) {
    if (!otp) return;
    await navigator.clipboard.writeText(otp);
    alert("OTP copied.");
  }

  async function updateStatus(transfer: Transfer, nextStatus: string) {
    setActionLoadingId(`${transfer.id}-${nextStatus}`);

    try {
      const now = new Date().toISOString();

      if (nextStatus === "processing") {
        const { error } = await supabase
          .from("transactions")
          .update({
            status: "processing",
            transfer_stage: transfer.otp_verified
              ? "processing"
              : "otp_required",
          })
          .eq("id", transfer.id);

        if (error) throw error;

        await supabase.from("notifications").insert({
          profile_id: transfer.sender_id,
          title: "Transfer Processing",
          message: `Your transfer to ${
            transfer.recipient_name || "recipient"
          } is now being processed by Atlas Capital Bank.`,
          type: "transfer",
        });

        await loadTransfers();
        return;
      }

      if (nextStatus === "rejected") {
        const { error } = await supabase
          .from("transactions")
          .update({
            status: "rejected",
            transfer_stage: "rejected",
            rejected_at: now,
          })
          .eq("id", transfer.id);

        if (error) throw error;

        await supabase.from("notifications").insert({
          profile_id: transfer.sender_id,
          title: "Transfer Rejected",
          message: `Your transfer to ${
            transfer.recipient_name || "recipient"
          } was rejected by Atlas Capital Bank.`,
          type: "transfer",
        });

        if (transfer.profiles?.email) {
          await queueEmail({
            profile_id: transfer.sender_id,
            recipient_email: transfer.profiles.email,
            subject: "Transfer Rejected",
            body: `
Hello ${transfer.profiles.full_name || "Customer"},

Your transfer has been rejected.

Recipient: ${transfer.recipient_name || "Recipient"}
Amount: ${formatCurrency(
              Number(transfer.amount || 0),
              transfer.recipient_currency ||
                transfer.profiles.banking_currency ||
                "USD"
            )}
Reference: ${transfer.reference || "-"}

Atlas Capital Bank
`,
            event_type: "transfer_rejected",
          });
        }

        await loadTransfers();
        return;
      }

      if (nextStatus === "completed") {
        if (!transfer.otp_verified) {
          alert(
            "This transfer cannot be approved yet. The customer must verify the OTP first."
          );
          return;
        }

        if (
          ["completed", "successful"].includes(
            String(transfer.status || "").toLowerCase()
          )
        ) {
          alert("This transfer has already been completed.");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, virtual_balance, transaction_count, transfer_limit, banking_currency"
          )
          .eq("id", transfer.sender_id)
          .single();

        if (profileError) throw profileError;

        const currentBalance = Number(profile.virtual_balance || 0);
        const amount = Number(transfer.amount || 0);
        const fee = Number(transfer.transfer_fee || 0);
        const totalDebit = amount + fee;

        if (currentBalance < totalDebit) {
          alert("Customer has insufficient balance including transfer fee.");
          return;
        }

        const { error: balanceError } = await supabase
          .from("profiles")
          .update({
            virtual_balance: currentBalance - totalDebit,
            transaction_count: Number(profile.transaction_count || 0) + 1,
          })
          .eq("id", transfer.sender_id);

        if (balanceError) throw balanceError;

        const { error: txError } = await supabase
          .from("transactions")
          .update({
            status: "completed",
            transfer_stage: "completed",
            completed_at: now,
          })
          .eq("id", transfer.id);

        if (txError) throw txError;

        await supabase.from("notifications").insert({
          profile_id: transfer.sender_id,
          title: "Transfer Completed",
          message: `Your transfer to ${
            transfer.recipient_name || "recipient"
          } has been completed successfully.`,
          type: "transfer",
        });

        if (transfer.profiles?.email) {
          await queueEmail({
            profile_id: transfer.sender_id,
            recipient_email: transfer.profiles.email,
            subject: "Transfer Completed",
            body: transferCompletedEmail({
              name: transfer.profiles.full_name || "Customer",
              amount: formatCurrency(
                amount,
                transfer.recipient_currency || profile.banking_currency || "USD"
              ),
              recipient: transfer.recipient_name || "Recipient",
              reference: transfer.reference || "",
            }),
            event_type: "transfer_completed",
          });
        }

        await loadTransfers();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setActionLoadingId("");
    }
  }

  const filtered = useMemo(() => {
    const term = query.toLowerCase();

    return transfers.filter((transfer) => {
      if (!term) return true;

      return (
        transfer.profiles?.full_name?.toLowerCase().includes(term) ||
        transfer.profiles?.email?.toLowerCase().includes(term) ||
        transfer.recipient_name?.toLowerCase().includes(term) ||
        transfer.recipient_bank_name?.toLowerCase().includes(term) ||
        transfer.status?.toLowerCase().includes(term) ||
        transfer.reference?.toLowerCase().includes(term)
      );
    });
  }, [transfers, query]);

  const pending = transfers.filter((t) =>
    ["pending", "review", "pending_review", "processing", "otp_required"].includes(
      String(t.status || t.transfer_stage).toLowerCase()
    )
  ).length;

  const completed = transfers.filter((t) =>
    ["successful", "completed"].includes(String(t.status).toLowerCase())
  ).length;

  const rejected = transfers.filter((t) =>
    ["rejected", "failed"].includes(String(t.status).toLowerCase())
  ).length;

  return (
    <AdminShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-gold">
              <ArrowLeftRight className="h-5 w-5" />
              Bank Operations
            </div>

            <h1 className="mt-2 font-display text-3xl font-semibold">
              Transfer Operations
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Generate OTPs, process, approve, and reject customer transfers.
            </p>
          </div>

          <Button variant="outline" onClick={loadTransfers} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Total Transfers" value={transfers.length} />
          <Stat label="Pending Review" value={pending} />
          <Stat label="Completed" value={completed} />
          <Stat label="Rejected/Failed" value={rejected} />
        </div>

        <section className="glass-strong p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Transfer Queue
              </h2>
              <p className="text-xs text-muted-foreground">
                OTP verification is required before approval.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transfers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-muted-foreground">
              Loading transfers...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground">
              No transfers found.
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((transfer) => {
                const normalized = String(transfer.status || "").toLowerCase();
                const isFinal = [
                  "completed",
                  "successful",
                  "rejected",
                  "failed",
                ].includes(normalized);

                const accountCurrency =
                  transfer.profiles?.banking_currency ||
                  transfer.recipient_currency ||
                  "USD";

                const transferCurrency =
                  transfer.recipient_currency || accountCurrency;

                const amount = Number(transfer.amount || 0);
                const fee = Number(transfer.transfer_fee || 0);

                const otpExpired =
                  transfer.otp_expires_at &&
                  new Date(transfer.otp_expires_at).getTime() < Date.now();

                return (
                  <div
                    key={transfer.id}
                    className="rounded-2xl border border-border bg-secondary/20 p-5"
                  >
                    <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr_0.8fr] xl:items-center">
                      <div>
                        <p className="font-semibold">
                          {transfer.profiles?.full_name || "Unknown Customer"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.profiles?.email || "No email"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground font-mono">
                          Account: {transfer.profiles?.account_number || "-"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground font-mono">
                          Balance:{" "}
                          {formatCurrency(
                            Number(transfer.profiles?.virtual_balance || 0),
                            accountCurrency
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="font-medium">
                          {transfer.recipient_name || "Recipient"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.recipient_bank_name || "Bank"} ·{" "}
                          {transfer.recipient_country || "Country"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground font-mono">
                          Acc: {transfer.recipient_account_number || "-"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Ref: {transfer.reference || "-"}
                        </p>
                      </div>

                      <div className="xl:text-right">
                        <p className="font-display text-xl font-semibold">
                          {formatCurrency(amount, transferCurrency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fee: {formatCurrency(fee, accountCurrency)}
                        </p>

                        <div className="mt-2 flex gap-2 xl:justify-end flex-wrap">
                          <StatusPill status={transfer.status || "pending"} />
                          <StatusPill
                            status={transfer.transfer_stage || "pending_review"}
                          />
                          <StatusPill
                            status={
                              transfer.otp_verified
                                ? "otp verified"
                                : transfer.otp_code
                                  ? otpExpired
                                    ? "otp expired"
                                    : "otp generated"
                                  : "no otp"
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {transfer.otp_code && !isFinal && (
                      <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            Transfer OTP
                          </p>
                          <p className="mt-1 font-display text-2xl font-semibold tracking-[0.3em] text-gold">
                            {transfer.otp_code}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Expires:{" "}
                            {transfer.otp_expires_at
                              ? new Date(
                                  transfer.otp_expires_at
                                ).toLocaleString()
                              : "-"}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyOtp(transfer.otp_code)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy OTP
                        </Button>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isFinal || !!actionLoadingId}
                        onClick={() => generateTransferOtp(transfer)}
                      >
                        <KeyRound className="h-4 w-4 mr-1" />
                        {actionLoadingId === `${transfer.id}-otp`
                          ? "Generating..."
                          : "Generate OTP"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isFinal || !!actionLoadingId}
                        onClick={() => updateStatus(transfer, "processing")}
                      >
                        <Clock3 className="h-4 w-4 mr-1" />
                        {actionLoadingId === `${transfer.id}-processing`
                          ? "Processing..."
                          : "Process"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          isFinal || !!actionLoadingId || !transfer.otp_verified
                        }
                        onClick={() => updateStatus(transfer, "completed")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {actionLoadingId === `${transfer.id}-completed`
                          ? "Approving..."
                          : "Approve"}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isFinal || !!actionLoadingId}
                        onClick={() => updateStatus(transfer, "rejected")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {actionLoadingId === `${transfer.id}-rejected`
                          ? "Rejecting..."
                          : "Reject"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-display text-3xl font-semibold">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();

  const className =
    normalized.includes("verified") ||
    normalized === "completed" ||
    normalized === "successful"
      ? "bg-success/15 text-success"
      : normalized.includes("expired") ||
          normalized === "rejected" ||
          normalized === "failed"
        ? "bg-destructive/15 text-destructive"
        : normalized.includes("otp") ||
            normalized === "pending" ||
            normalized === "pending_review" ||
            normalized === "review" ||
            normalized === "processing"
          ? "bg-gold/15 text-gold"
          : "bg-secondary text-muted-foreground";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs capitalize ${className}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}