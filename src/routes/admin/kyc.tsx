import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  FileCheck2,
  FileText,
  Lock,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShieldX,
  Unlock,
  UserCheck,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/kyc")({
  component: AdminKycPage,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  account_number?: string | null;
  status?: string | null;
  kyc_status?: string | null;
  kyc_note?: string | null;
  account_locked?: boolean | null;
  transfer_limit?: number | null;
  created_at?: string;
};

type KycDocument = {
  id: string;
  profile_id: string;
  document_type: string;
  document_url?: string | null;
  status: string;
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
};

function AdminKycPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [note, setNote] = useState("");
  const [transferLimit, setTransferLimit] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKyc();
  }, []);

  async function loadKyc() {
    setLoading(true);

    const [profilesRes, docsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,full_name,email,phone,country,account_number,status,kyc_status,kyc_note,account_locked,transfer_limit,created_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("kyc_documents")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (profilesRes.error) alert(profilesRes.error.message);
    if (docsRes.error) alert(docsRes.error.message);

    setProfiles(profilesRes.data || []);
    setDocuments(docsRes.data || []);
    setLoading(false);
  }

  function openProfile(profile: Profile) {
    setSelected(profile);
    setNote(profile.kyc_note || "");
    setTransferLimit(String(profile.transfer_limit || 2));
  }

  async function updateKyc(profile: Profile, status: string) {
    const { error } = await supabase
      .from("profiles")
      .update({
        kyc_status: status,
        kyc_note: note || null,
      })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: profile.id,
      title:
        status === "verified"
          ? "KYC Verification Approved"
          : status === "rejected"
            ? "KYC Verification Rejected"
            : "KYC Review Updated",
      message:
        status === "verified"
          ? "Your identity verification has been approved."
          : status === "rejected"
            ? note || "Your verification was rejected. Please contact support."
            : "Your verification status has been updated.",
      type: "account",
    });

    await loadKyc();
    setSelected(null);
  }

  async function toggleLock(profile: Profile) {
    const next = !profile.account_locked;

    const { error } = await supabase
      .from("profiles")
      .update({
        account_locked: next,
        status: next ? "suspended" : "active",
      })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: profile.id,
      title: next ? "Account Locked" : "Account Unlocked",
      message: next
        ? "Your account has been temporarily locked by Atlas Capital Bank."
        : "Your account access has been restored.",
      type: "security",
    });

    await loadKyc();

    if (selected?.id === profile.id) {
      setSelected({
        ...profile,
        account_locked: next,
        status: next ? "suspended" : "active",
      });
    }
  }

  async function saveTransferLimit(profile: Profile) {
    const limit = Number(transferLimit || 0);

    const { error } = await supabase
      .from("profiles")
      .update({ transfer_limit: limit })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: profile.id,
      title: "Transfer Limit Updated",
      message: `Your transfer limit has been updated to ${limit}.`,
      type: "account",
    });

    await loadKyc();
    alert("Transfer limit updated.");
  }

  async function reviewDocument(doc: KycDocument, status: string) {
    const { error } = await supabase
      .from("kyc_documents")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        admin_note: note || null,
      })
      .eq("id", doc.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadKyc();
  }

  const filtered = useMemo(() => {
    return profiles.filter((profile) => {
      const term = query.toLowerCase();

      const matchesQuery =
        !term ||
        profile.full_name?.toLowerCase().includes(term) ||
        profile.email?.toLowerCase().includes(term) ||
        profile.account_number?.toLowerCase().includes(term) ||
        profile.country?.toLowerCase().includes(term);

      const kyc = profile.kyc_status || "pending";

      const matchesStatus = statusFilter === "all" || kyc === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [profiles, query, statusFilter]);

  const stats = {
    total: profiles.length,
    pending: profiles.filter((p) => (p.kyc_status || "pending") === "pending")
      .length,
    verified: profiles.filter((p) => p.kyc_status === "verified").length,
    rejected: profiles.filter((p) => p.kyc_status === "rejected").length,
    locked: profiles.filter((p) => p.account_locked).length,
  };

  const selectedDocs = selected
    ? documents.filter((doc) => doc.profile_id === selected.id)
    : [];

  return (
    <AdminShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-gold">
              <ShieldCheck className="h-5 w-5" />
              Compliance Operations
            </div>

            <h1 className="mt-2 font-display text-3xl font-semibold">
              KYC Verification Center
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Review customer verification, documents, account locks, and transfer limits.
            </p>
          </div>

          <Button variant="outline" onClick={loadKyc}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-5">
          <Stat label="Total Customers" value={stats.total} icon={UserCheck} />
          <Stat label="Pending" value={stats.pending} icon={FileText} />
          <Stat label="Verified" value={stats.verified} icon={CheckCircle2} />
          <Stat label="Rejected" value={stats.rejected} icon={XCircle} />
          <Stat label="Locked" value={stats.locked} icon={Lock} />
        </section>

        <section className="glass-strong p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customer, email, account..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["pending", "Pending"],
                ["verified", "Verified"],
                ["rejected", "Rejected"],
                ["review", "Review"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-strong overflow-hidden">
            {loading ? (
              <div className="p-10 text-sm text-muted-foreground">
                Loading KYC records...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-sm text-muted-foreground">
                No customers found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((profile) => {
                  const docs = documents.filter(
                    (doc) => doc.profile_id === profile.id
                  );

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => openProfile(profile)}
                      className={`w-full p-5 text-left hover:bg-secondary/20 transition-colors ${
                        selected?.id === profile.id ? "bg-secondary/30" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold">{profile.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {profile.email} · {profile.country || "Unknown"}
                          </p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {profile.account_number || "No account number"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill status={profile.kyc_status || "pending"} />

                          {profile.account_locked && (
                            <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs text-destructive">
                              Locked
                            </span>
                          )}

                          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                            {docs.length} docs
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-strong p-6">
            {!selected ? (
              <div className="text-center py-16">
                <FileCheck2 className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 font-display text-xl font-semibold">
                  Select a customer
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose a customer to review KYC details.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    {selected.full_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.email}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Phone" value={selected.phone || "-"} />
                  <Info label="Country" value={selected.country || "-"} />
                  <Info label="Account" value={selected.account_number || "-"} />
                  <Info label="Status" value={selected.status || "-"} />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Compliance Note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    placeholder="Add KYC review note..."
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Button onClick={() => updateKyc(selected, "verified")}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => updateKyc(selected, "rejected")}
                  >
                    <ShieldX className="h-4 w-4 mr-2" />
                    Reject
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => updateKyc(selected, "review")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <h3 className="font-semibold mb-3">Account Controls</h3>

                  <div className="flex flex-col gap-3">
                    <Button
                      variant={selected.account_locked ? "default" : "outline"}
                      onClick={() => toggleLock(selected)}
                    >
                      {selected.account_locked ? (
                        <>
                          <Unlock className="h-4 w-4 mr-2" />
                          Unlock Account
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Lock Account
                        </>
                      )}
                    </Button>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={transferLimit}
                        onChange={(e) => setTransferLimit(e.target.value)}
                        placeholder="Transfer limit"
                      />
                      <Button onClick={() => saveTransferLimit(selected)}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Uploaded Documents</h3>

                  {selectedDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No documents uploaded.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-xl border border-border bg-secondary/30 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">
                                {doc.document_type}
                              </p>
                              <StatusPill status={doc.status} />

                              {doc.document_url && (
                                <a
                                  href={doc.document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 block text-sm text-gold hover:underline"
                                >
                                  Open document
                                </a>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reviewDocument(doc, "approved")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => reviewDocument(doc, "rejected")}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-gold" />
      </div>

      <p className="mt-3 font-display text-3xl font-semibold">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium break-words">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();

  const className =
    normalized === "verified" || normalized === "approved"
      ? "bg-success/15 text-success"
      : normalized === "rejected"
        ? "bg-destructive/15 text-destructive"
        : normalized === "review"
          ? "bg-gold/15 text-gold"
          : "bg-secondary text-muted-foreground";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs capitalize ${className}`}>
      {status}
    </span>
  );
}