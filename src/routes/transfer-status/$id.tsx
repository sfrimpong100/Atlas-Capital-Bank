import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  KeyRound,
  RefreshCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/transfer-status/$id")({
  component: TransferStatusPage,
});

type Transfer = {
  id: string;
  sender_id: string;
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
  otp_code?: string | null;
  otp_verified?: boolean | null;
  otp_expires_at?: string | null;
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
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadTransfer();
  }, [id]);

  async function loadTransfer() {
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

  async function verifyOtp() {
    if (!transfer) return;

    if (!otp.trim()) {
      alert("Enter the OTP provided by the bank officer.");
      return;
    }

    if (!transfer.otp_code) {
      alert("No OTP has been generated for this transfer yet.");
      return;
    }

    if (
      transfer.otp_expires_at &&
      new Date(transfer.otp_expires_at).getTime() < Date.now()
    ) {
      alert("This OTP has expired. Please ask the bank officer to generate a new OTP.");
      return;
    }

    if (otp.trim() !== transfer.otp_code) {
      alert("Invalid OTP. Please check and try again.");
      return;
    }

    setVerifying(true);

    const { error } = await supabase
      .from("transactions")
      .update({
        otp_verified: true,
        transfer_stage: "otp_verified",
      })
      .eq("id", transfer.id);

    if (error) {
      alert(error.message);
      setVerifying(false);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: transfer.sender_id,
      title: "Transfer OTP Verified",
      message:
        "Your transfer OTP has been verified. Atlas Capital Bank may now approve the transfer.",
      type: "security",
    });

    setOtp("");
    setVerifying(false);
    await loadTransfer();
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
  const otpExpired =
    transfer.otp_expires_at &&
    new Date(transfer.otp_expires_at).getTime() < Date.now();

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

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTransfer}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Link to="/transactions" from="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Activity
              </Button>
            </Link>
          </div>
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

          {!completed && !rejected && (
            <div className="mt-6 rounded-2xl border border-border bg-secondary/30 p-5">
              <div className="flex items-center gap-2 text-gold">
                {transfer.otp_verified ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <KeyRound className="h-5 w-5" />
                )}
                <h3 className="font-display text-lg font-semibold">
                  OTP Verification
                </h3>
              </div>

              {transfer.otp_verified ? (
                <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-4">
                  <p className="font-medium text-success">
                    OTP verified successfully.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your transfer is now ready for final approval by Atlas Capital Bank.
                  </p>
                </div>
              ) : transfer.otp_code ? (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the OTP provided by the bank officer to authorize this
                    transfer for approval.
                  </p>

                  {otpExpired && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      This OTP has expired. Please request a new OTP from the bank officer.
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="tracking-[0.4em] font-display text-lg"
                    />

                    <Button
                      type="button"
                      onClick={verifyOtp}
                      disabled={verifying || !!otpExpired}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      {verifying ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    OTP expires:{" "}
                    {transfer.otp_expires_at
                      ? new Date(transfer.otp_expires_at).toLocaleString()
                      : "-"}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-4">
                  <p className="font-medium text-gold">OTP not generated yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Please wait for the bank officer to generate an OTP for this
                    transfer.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Info label="Recipient" value={transfer.recipient_name || "-"} />
            <Info label="Bank" value={transfer.recipient_bank_name || "-"} />
            <Info
              label="Amount"
              value={formatCurrency(Number(transfer.amount || 0), currency)}
            />
            <Info
              label="Fee"
              value={formatCurrency(
                Number(transfer.transfer_fee || 0),
                currency
              )}
            />
            <Info label="Reference" value={transfer.reference || "-"} />
            <Info label="Receipt" value={transfer.receipt_number || "-"} />
            <Info
              label="OTP Status"
              value={
                transfer.otp_verified
                  ? "Verified"
                  : transfer.otp_code
                    ? otpExpired
                      ? "Expired"
                      : "Pending Verification"
                    : "Not Generated"
              }
            />
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