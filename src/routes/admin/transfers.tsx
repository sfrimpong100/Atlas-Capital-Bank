import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  RefreshCcw,
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
  description?: string | null;
  transfer_fee?: number | null;
  created_at: string;
  completed_at?: string | null;
  rejected_at?: string | null;
  profiles?: {
    full_name: string;
    email: string;
    account_number: string;
    virtual_balance: number;
    transaction_count: number;
    transfer_limit: number;
  } | null;
};

function AdminTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadTransfers();
  }, []);

  async function loadTransfers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        profiles:sender_id (
          full_name,
          email,
          account_number,
          virtual_balance,
          transaction_count,
          transfer_limit
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setTransfers(data || []);
    setLoading(false);
  }

  async function updateStatus(transfer: Transfer, status: string) {
    const now = new Date().toISOString();

    if (status === "processing") {
      const { error } = await supabase
        .from("transactions")
        .update({
          status: "processing",
          transfer_stage: "processing",
          reviewed_at: now,
          admin_note: "Transfer is being processed by bank operations.",
        })
        .eq("id", transfer.id);

      if (error) {
        alert(error.message);
        return;
      }

      await supabase.from("notifications").insert({
        profile_id: transfer.sender_id,
        title: "Transfer Processing",
        message: `Your transfer to ${
          transfer.recipient_name || "recipient"
        } is now being processed by Atlas Capital Bank.`,
        type: "transfer",
      });

      loadTransfers();
      return;
    }

    if (status === "rejected") {
      const { error } = await supabase
        .from("transactions")
        .update({
          status: "rejected",
          transfer_stage: "rejected",
          rejected_at: now,
          admin_note: "Transfer rejected by bank operations.",
        })
        .eq("id", transfer.id);

      if (error) {
        alert(error.message);
        return;
      }

      await queueEmail({
        profile_id: transfer.sender_id,
        recipient_email: transfer.profiles?.email || "",
        subject: "Transfer Rejected",
        body: `
      Hello ${transfer.profiles?.full_name || "Customer"},

      Your transfer has been rejected.

      Recipient:
      ${transfer.recipient_name}

      Amount:
      ${transfer.recipient_currency || "USD"} ${Number(
        transfer.amount
      ).toLocaleString()}

      Reference:
      ${transfer.reference}

      Please contact Atlas Capital Bank if you require assistance.

      Atlas Capital Bank
      `,
        event_type: "transfer_rejected",
      });

      loadTransfers();
      return;
    }

    if (status === "completed") {
      if (
        ["completed", "successful"].includes(
          String(transfer.status || "").toLowerCase()
        )
      ) {
        alert("This transfer has already been completed.");
        return;
      }

      const { data: profile, error: profileLoadError } = await supabase
        .from("profiles")
        .select("id, virtual_balance, transaction_count, transfer_limit")
        .eq("id", transfer.sender_id)
        .single();

      if (profileLoadError) {
        alert(profileLoadError.message);
        return;
      }

      const currentBalance = Number(profile.virtual_balance || 0);
      const amount = Number(transfer.amount || 0);

      if (currentBalance < amount) {
        alert("Customer has insufficient balance to complete this transfer.");
        return;
      }

      const newBalance = currentBalance - amount;
      const newTransactionCount = Number(profile.transaction_count || 0) + 1;

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          virtual_balance: newBalance,
          transaction_count: newTransactionCount,
        })
        .eq("id", transfer.sender_id);

      if (profileUpdateError) {
        alert(profileUpdateError.message);
        return;
      }

      const { error: transactionUpdateError } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          transfer_stage: "completed",
          completed_at: now,
          admin_note: "Transfer approved and completed by bank operations.",
        })
        .eq("id", transfer.id);

      if (transactionUpdateError) {
        alert(transactionUpdateError.message);
        return;
      }

      await queueEmail({
      profile_id: transfer.sender_id,
      recipient_email: transfer.profiles?.email || "",
      subject: "Transfer Completed",
      body: transferCompletedEmail({
        name: transfer.profiles?.full_name || "Customer",
        amount: `${transfer.recipient_currency || "USD"} ${Number(
          transfer.amount
        ).toLocaleString()}`,
        recipient: transfer.recipient_name || "Recipient",
        reference: transfer.reference || "",
      }),
      event_type: "transfer_completed",
    });

      loadTransfers();
    }
  }

  const filtered = transfers.filter((transfer) => {
    const term = query.toLowerCase();

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

  const pending = transfers.filter((t) =>
    ["pending", "review", "processing"].includes(String(t.status).toLowerCase())
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
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Transfer Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, process, approve, and reject customer transfers.
          </p>
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
                All customer transfer activity.
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Search transfers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-64"
              />

              <Button variant="outline" onClick={loadTransfers}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading transfers...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transfers found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr>
                    <th className="py-3">Customer</th>
                    <th>Recipient</th>
                    <th>Bank</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Stage</th>
                    <th>Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((transfer) => {
                    const isFinal = ["completed", "successful", "rejected"].includes(
                      String(transfer.status || "").toLowerCase()
                    );

                    return (
                      <tr key={transfer.id} className="border-b border-border/60">
                        <td className="py-3">
                          <p className="font-medium">
                            {transfer.profiles?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transfer.profiles?.email}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            Bal:{" "}
                            {Number(
                              transfer.profiles?.virtual_balance || 0
                            ).toLocaleString()}
                          </p>
                        </td>

                        <td>
                          <p>{transfer.recipient_name || "-"}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {transfer.recipient_account_number || "-"}
                          </p>
                        </td>

                        <td>
                          <p>{transfer.recipient_bank_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {transfer.recipient_country || "-"}
                          </p>
                        </td>

                        <td className="font-mono">
                          {transfer.recipient_currency || "USD"}{" "}
                          {Number(transfer.amount || 0).toLocaleString()}
                        </td>

                        <td>
                          <p>{transfer.reference || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {transfer.receipt_number || ""}
                          </p>
                        </td>

                        <td>
                          <StatusPill status={transfer.status || "pending"} />
                        </td>

                        <td>
                          <StatusPill
                            status={transfer.transfer_stage || "pending_review"}
                          />
                        </td>

                        <td className="text-xs text-muted-foreground">
                          {new Date(transfer.created_at).toLocaleString()}
                        </td>

                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isFinal}
                              onClick={() => updateStatus(transfer, "processing")}
                            >
                              <ArrowLeftRight className="h-4 w-4 mr-1" />
                              Process
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isFinal}
                              onClick={() => updateStatus(transfer, "completed")}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isFinal}
                              onClick={() => updateStatus(transfer, "rejected")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
    normalized === "completed" || normalized === "successful"
      ? "bg-success/15 text-success"
      : normalized === "pending" ||
          normalized === "pending_review" ||
          normalized === "review" ||
          normalized === "processing"
        ? "bg-gold/15 text-gold"
        : normalized === "rejected" || normalized === "failed"
          ? "bg-destructive/15 text-destructive"
          : "bg-secondary text-muted-foreground";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${className}`}>
      {status}
    </span>
  );
}