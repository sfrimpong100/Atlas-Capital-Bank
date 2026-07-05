import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Landmark,
  RefreshCcw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/beneficiaries")({
  component: AdminBeneficiariesPage,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
  account_number?: string | null;
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
  profiles?: Profile | null;
};

function AdminBeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    profile_id: "",
    beneficiary_name: "",
    account_number: "",
    bank_name: "",
    country: "",
    currency: "",
    nickname: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [profilesResult, beneficiariesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, account_number")
        .order("created_at", { ascending: false }),

      supabase
        .from("beneficiaries")
        .select(
          `
          *,
          profiles:profile_id (
            id,
            full_name,
            email,
            account_number
          )
        `
        )
        .order("created_at", { ascending: false }),
    ]);

    if (profilesResult.error) alert(profilesResult.error.message);
    if (beneficiariesResult.error) alert(beneficiariesResult.error.message);

    setProfiles(profilesResult.data || []);
    setBeneficiaries(beneficiariesResult.data || []);
    setLoading(false);
  }

  async function addBeneficiary(e: React.FormEvent) {
    e.preventDefault();

    if (
      !form.profile_id ||
      !form.beneficiary_name ||
      !form.account_number ||
      !form.bank_name ||
      !form.country ||
      !form.currency
    ) {
      alert("Please complete all required fields.");
      return;
    }

    const { error } = await supabase.from("beneficiaries").insert({
      profile_id: form.profile_id,
      beneficiary_name: form.beneficiary_name,
      account_number: form.account_number,
      bank_name: form.bank_name,
      country: form.country,
      currency: form.currency,
      nickname: form.nickname || null,
      status: "active",
    });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: form.profile_id,
      title: "Beneficiary Added",
      message: `${form.beneficiary_name} has been approved for transfers.`,
      type: "beneficiary",
    });

    setForm({
      profile_id: "",
      beneficiary_name: "",
      account_number: "",
      bank_name: "",
      country: "",
      currency: "",
      nickname: "",
    });

    loadData();
  }

  async function updateStatus(beneficiary: Beneficiary, status: string) {
    const { error } = await supabase
      .from("beneficiaries")
      .update({ status })
      .eq("id", beneficiary.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: beneficiary.profile_id,
      title:
        status === "active"
          ? "Beneficiary Approved"
          : status === "suspended"
            ? "Beneficiary Suspended"
            : "Beneficiary Updated",
      message: `${beneficiary.beneficiary_name} is now ${status}.`,
      type: "beneficiary",
    });

    loadData();
  }

  async function deleteBeneficiary(beneficiary: Beneficiary) {
    const ok = confirm(`Delete ${beneficiary.beneficiary_name}?`);
    if (!ok) return;

    const { error } = await supabase
      .from("beneficiaries")
      .delete()
      .eq("id", beneficiary.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  const filtered = beneficiaries.filter((item) => {
    const term = query.toLowerCase();

    if (!term) return true;

    return (
      item.beneficiary_name?.toLowerCase().includes(term) ||
      item.account_number?.toLowerCase().includes(term) ||
      item.bank_name?.toLowerCase().includes(term) ||
      item.country?.toLowerCase().includes(term) ||
      item.currency?.toLowerCase().includes(term) ||
      item.status?.toLowerCase().includes(term) ||
      item.profiles?.full_name?.toLowerCase().includes(term) ||
      item.profiles?.email?.toLowerCase().includes(term)
    );
  });

  const active = beneficiaries.filter(
    (b) => b.status === "active" || !b.status
  ).length;

  const suspended = beneficiaries.filter((b) => b.status === "suspended").length;
  const pending = beneficiaries.filter((b) => b.status === "pending").length;

  return (
    <AdminShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Beneficiary Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add, approve, suspend, and manage customer transfer beneficiaries.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Total Beneficiaries" value={beneficiaries.length} />
          <Stat label="Active" value={active} />
          <Stat label="Pending" value={pending} />
          <Stat label="Suspended" value={suspended} />
        </div>

        <section className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold mb-5">
            Add Beneficiary
          </h2>

          <form onSubmit={addBeneficiary} className="grid gap-4 md:grid-cols-2">
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
              placeholder="Beneficiary name"
              value={form.beneficiary_name}
              onChange={(e) =>
                setForm({ ...form, beneficiary_name: e.target.value })
              }
              required
            />

            <Input
              placeholder="Account number / IBAN"
              value={form.account_number}
              onChange={(e) =>
                setForm({ ...form, account_number: e.target.value })
              }
              required
            />

            <Input
              placeholder="Bank name"
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              required
            />

            <Input
              placeholder="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              required
            />

            <Input
              placeholder="Currency e.g. USD, EUR, GBP"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              required
            />

            <Input
              placeholder="Nickname optional"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            />

            <div className="md:col-span-2">
              <Button type="submit">
                <Landmark className="h-4 w-4 mr-2" />
                Add Beneficiary
              </Button>
            </div>
          </form>
        </section>

        <section className="glass-strong p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Beneficiary Directory
              </h2>
              <p className="text-xs text-muted-foreground">
                Approved and pending beneficiaries across customer accounts.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search beneficiaries..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-72 pl-9"
                />
              </div>

              <Button variant="outline" onClick={loadData}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading beneficiaries...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No beneficiaries found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr>
                    <th className="py-3">Customer</th>
                    <th>Beneficiary</th>
                    <th>Bank</th>
                    <th>Country</th>
                    <th>Currency</th>
                    <th>Status</th>
                    <th>Date Added</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((beneficiary) => (
                    <tr
                      key={beneficiary.id}
                      className="border-b border-border/60"
                    >
                      <td className="py-3">
                        <p className="font-medium">
                          {beneficiary.profiles?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {beneficiary.profiles?.email}
                        </p>
                      </td>

                      <td>
                        <p className="font-medium">
                          {beneficiary.beneficiary_name}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {beneficiary.account_number}
                        </p>
                        {beneficiary.nickname && (
                          <p className="text-xs text-muted-foreground">
                            {beneficiary.nickname}
                          </p>
                        )}
                      </td>

                      <td>{beneficiary.bank_name}</td>
                      <td>{beneficiary.country}</td>
                      <td>{beneficiary.currency}</td>

                      <td>
                        <StatusPill status={beneficiary.status || "active"} />
                      </td>

                      <td className="text-xs text-muted-foreground">
                        {beneficiary.created_at
                          ? new Date(beneficiary.created_at).toLocaleString()
                          : "-"}
                      </td>

                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(beneficiary, "active")}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus(beneficiary, "suspended")
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteBeneficiary(beneficiary)}
                          >
                            <Trash2 className="h-4 w-4" />
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
    normalized === "active" || normalized === "approved"
      ? "bg-success/15 text-success"
      : normalized === "pending"
        ? "bg-gold/15 text-gold"
        : normalized === "suspended" || normalized === "rejected"
          ? "bg-destructive/15 text-destructive"
          : "bg-secondary text-muted-foreground";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs ${className}`}
    >
      {status}
    </span>
  );
}