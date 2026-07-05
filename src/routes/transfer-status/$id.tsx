import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock3, XCircle } from "lucide-react";

export const Route = createFileRoute("/transfer-status/$id")({
  component: TransferStatusPage,
});

type Transfer = {
  id: string;
  amount: number;
  status: string;
  transfer_stage?: string | null;
  recipient_name?: string | null;
  recipient_bank_name?: string | null;
  recipient_currency?: string | null;
  reference?: string | null;
  receipt_number?: string | null;
  transfer_fee?: number | null;
  created_at: string;
  completed_at?: string | null;
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function TransferStatusPage() {
  const router = useRouter();
  const { id } = Route.useParams();

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransfer();
  }, [id]);

  async function loadTransfer() {
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
      .from("transactions")
      .select("*")
      .eq("id", id)
      .eq("sender_id", user.id)
      .single();

    if (error) {
      alert(error.message);
      router.navigate({ to: "/transactions" });
      return;
    }

    setTransfer(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[70vh] grid place-items-center">
          <p className="text-sm text-muted-foreground">Loading transfer...</p>
        </div>
      </AppShell>
    );
  }

  if (!transfer) return null;

  const currency = transfer.recipient_currency || "USD";
  const status = String(transfer.status || "pending").toLowerCase();

  const completed = status === "completed" || status === "successful";
  const rejected = status === "rejected" || status === "failed";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">
              Transfer Status
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track the progress of your submitted transfer.
            </p>
          </div>

          <Link to="/transactions" from="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Activity
            </Button>
          </Link>
        </div>

        <section className="card-surface p-6">
          <div className="flex items-center gap-4">
            <div
              className={`h-14 w-14 rounded-2xl grid place-items-center ${
                completed
                  ? "bg-success/15 text-success"
                  : rejected
                    ? "bg-destructive/15 text-destructive"
                    : "bg-gold/15 text-gold"
              }`}
            >
              {completed ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : rejected ? (
                <XCircle className="h-7 w-7" />
              ) : (
                <Clock3 className="h-7 w-7" />
              )}
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold capitalize">
                {transfer.status}
              </h2>
              <p className="text-sm text-muted-foreground">
                Stage: {transfer.transfer_stage || "pending_review"}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Info label="Recipient" value={transfer.recipient_name || "-"} />
            <Info label="Bank" value={transfer.recipient_bank_name || "-"} />
            <Info
              label="Amount"
              value={formatCurrency(Number(transfer.amount || 0), currency)}
            />
            <Info
              label="Fee"
              value={formatCurrency(Number(transfer.transfer_fee || 0), currency)}
            />
            <Info label="Reference" value={transfer.reference || "-"} />
            <Info label="Receipt" value={transfer.receipt_number || "-"} />
            <Info
              label="Submitted"
              value={new Date(transfer.created_at).toLocaleString()}
            />
            <Info
              label="Completed"
              value={
                transfer.completed_at
                  ? new Date(transfer.completed_at).toLocaleString()
                  : "-"
              }
            />
          </div>

          {completed && (
            <div className="mt-6">
              <Link to="/receipt/$id" params={{ id: transfer.id }} from="/">
                <Button>View Receipt</Button>
              </Link>
            </div>
          )}
        </section>
      </div>
    </AppShell>
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