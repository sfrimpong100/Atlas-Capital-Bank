import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAdminAuthed, adminSignIn } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Shield,
  Users,
  Wallet,
  Trash2,
  Ban,
  CheckCircle2,
  Loader2,
  Upload,
  Pencil,
  RotateCcw,
} from "lucide-react";


export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Admin Control Center — Atlas Capital Bank" },
      {
        name: "description",
        content: "Admin dashboard for managing customers and account access.",
      },
    ],
  }),
  component: AdminPage,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
  account_number: string;
  virtual_balance: number;
  status: "active" | "suspended";
  access_expires_at: string | null;
  created_at: string;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  occupation?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  profile_image_url?: string | null;
  client_id?: string | null;
  account_tier?: string | null;
  account_type?: string | null;
  swift_code?: string | null;
  iban?: string | null;
  available_credit?: number | null;
  investment_balance?: number | null;
  pending_transfers?: number | null;
  transaction_count?: number | null;
  transfer_limit?: number | null;
  banking_country?: string | null;
  banking_currency?: string | null;
  assigned_bank?: string | null;
  assigned_beneficiary_name?: string | null;
  assigned_beneficiary_account?: string | null;
};

const BANKING_OPTIONS = {
  "United States": {
    currency: "USD",
    banks: {
      "JPMorgan Chase": [
        { name: "Michael Anderson", account: "US4829105736" },
        { name: "Emily Carter", account: "US7362910485" },
        { name: "David Miller", account: "US8291047563" },
        { name: "Jessica Moore", account: "US6184930275" },
        { name: "Ryan Cooper", account: "US3910475826" },
        { name: "Natalie Brooks", account: "US7402918563" },
      ],
      "Bank of America": [
        { name: "Daniel Thompson", account: "US6592018473" },
        { name: "Sophia Martinez", account: "US3928174650" },
        { name: "Anthony Walker", account: "US5839201746" },
        { name: "Grace Peterson", account: "US9201847365" },
        { name: "Kevin Richardson", account: "US4729105836" },
        { name: "Rachel Adams", account: "US7392018465" },
      ],
      "Wells Fargo": [
        { name: "Christopher Evans", account: "US5738291047" },
        { name: "Olivia Brooks", account: "US8492037165" },
        { name: "Brandon Scott", account: "US6482910375" },
        { name: "Lauren Phillips", account: "US9028173645" },
        { name: "Justin Reed", account: "US3174928560" },
        { name: "Hannah Collins", account: "US7849201635" },
      ],
    },
  },

  "United Kingdom": {
    currency: "GBP",
    banks: {
      "HSBC UK": [
        { name: "Oliver Bennett", account: "GB2948571029" },
        { name: "Amelia Clarke", account: "GB8402917364" },
        { name: "Thomas Edwards", account: "GB5839201746" },
        { name: "Sophie Turner", account: "GB7392018465" },
        { name: "James Carter", account: "GB6482910375" },
        { name: "Ella Morgan", account: "GB9028173645" },
      ],
      "Barclays Bank": [
        { name: "Charlotte Williams", account: "GB7583921048" },
        { name: "George Harris", account: "GB4738291056" },
        { name: "Henry Foster", account: "GB8291047563" },
        { name: "Mia Roberts", account: "GB6184930275" },
        { name: "Arthur Collins", account: "GB3910475826" },
        { name: "Lily Parker", account: "GB7402918563" },
      ],
      "Lloyds Bank": [
        { name: "Harry Wilson", account: "GB5829104738" },
        { name: "Isla Thompson", account: "GB7301948265" },
        { name: "Oscar Hughes", account: "GB4729105836" },
        { name: "Freya Campbell", account: "GB7392018465" },
        { name: "Jacob Mitchell", account: "GB6482910375" },
        { name: "Grace Bailey", account: "GB9028173645" },
      ],
    },
  },

  Germany: {
    currency: "EUR",
    banks: {
      "Deutsche Bank": [
        { name: "Lukas Schneider", account: "DE5739201846" },
        { name: "Anna Müller", account: "DE8492017365" },
        { name: "Jonas Fischer", account: "DE6482910375" },
        { name: "Lea Weber", account: "DE9028173645" },
        { name: "Maximilian Becker", account: "DE3174928560" },
        { name: "Hannah Wagner", account: "DE7849201635" },
      ],
      Commerzbank: [
        { name: "Felix Wagner", account: "DE6382910475" },
        { name: "Mia Hoffmann", account: "DE9201847365" },
        { name: "Noah Klein", account: "DE5839201746" },
        { name: "Emma Braun", account: "DE7392018465" },
        { name: "Paul Schäfer", account: "DE4729105836" },
        { name: "Lina Koch", account: "DE8291047563" },
      ],
    },
  },

  France: {
    currency: "EUR",
    banks: {
      "BNP Paribas": [
        { name: "Pierre Dubois", account: "FR6382910475" },
        { name: "Camille Laurent", account: "FR9201847365" },
        { name: "Louis Morel", account: "FR5839201746" },
        { name: "Chloé Bernard", account: "FR7392018465" },
        { name: "Antoine Girard", account: "FR4729105836" },
        { name: "Manon Lefevre", account: "FR8291047563" },
      ],
      "Société Générale": [
        { name: "Hugo Moreau", account: "FR2948571029" },
        { name: "Emma Bernard", account: "FR8402917364" },
        { name: "Nathan Petit", account: "FR6482910375" },
        { name: "Léa Rousseau", account: "FR9028173645" },
        { name: "Lucas Garnier", account: "FR3174928560" },
        { name: "Sarah Fontaine", account: "FR7849201635" },
      ],
    },
  },

  Canada: {
    currency: "CAD",
    banks: {
      "Royal Bank of Canada": [
        { name: "Noah Campbell", account: "CA4839201756" },
        { name: "Ava Mitchell", account: "CA7583910264" },
        { name: "Liam Fraser", account: "CA5839201746" },
        { name: "Emma Dawson", account: "CA7392018465" },
        { name: "Lucas Bennett", account: "CA4729105836" },
        { name: "Maya Wilson", account: "CA8291047563" },
      ],
      "TD Canada Trust": [
        { name: "William Parker", account: "CA9201847365" },
        { name: "Mia Robinson", account: "CA6382910475" },
        { name: "Ethan Clarke", account: "CA6482910375" },
        { name: "Olivia Stewart", account: "CA9028173645" },
        { name: "Benjamin Ross", account: "CA3174928560" },
        { name: "Sophia Green", account: "CA7849201635" },
      ],
    },
  },

  Australia: {
    currency: "AUD",
    banks: {
      "Commonwealth Bank": [
        { name: "Jack Wilson", account: "AU5839201746" },
        { name: "Grace Taylor", account: "AU7392018465" },
        { name: "Noah Anderson", account: "AU4729105836" },
        { name: "Ella Brown", account: "AU8291047563" },
        { name: "Liam Johnson", account: "AU6482910375" },
        { name: "Mia Walker", account: "AU9028173645" },
      ],
      "ANZ Bank": [
        { name: "Ethan Harris", account: "AU9201847365" },
        { name: "Chloe Martin", account: "AU6382910475" },
        { name: "Oliver White", account: "AU3174928560" },
        { name: "Sophie Lewis", account: "AU7849201635" },
        { name: "Lucas Young", account: "AU5839102746" },
        { name: "Amelia King", account: "AU7392104865" },
      ],
    },
  },

  Switzerland: {
    currency: "CHF",
    banks: {
      UBS: [
        { name: "Luca Meier", account: "CH5739201846" },
        { name: "Sofia Keller", account: "CH8492017365" },
        { name: "Leon Müller", account: "CH6482910375" },
        { name: "Mia Schmid", account: "CH9028173645" },
        { name: "Noah Huber", account: "CH3174928560" },
        { name: "Emma Berger", account: "CH7849201635" },
      ],
      "Credit Suisse": [
        { name: "Noah Baumann", account: "CH6382910475" },
        { name: "Emma Frei", account: "CH9201847365" },
        { name: "Elias Steiner", account: "CH5839201746" },
        { name: "Lena Roth", account: "CH7392018465" },
        { name: "Jonas Keller", account: "CH4729105836" },
        { name: "Laura Meyer", account: "CH8291047563" },
      ],
    },
  },

  Japan: {
    currency: "JPY",
    banks: {
      "MUFG Bank": [
        { name: "Haruto Tanaka", account: "JP5739201846" },
        { name: "Yui Sato", account: "JP8492017365" },
        { name: "Ren Nakamura", account: "JP6482910375" },
        { name: "Aoi Suzuki", account: "JP9028173645" },
        { name: "Daiki Yamamoto", account: "JP3174928560" },
        { name: "Mio Kobayashi", account: "JP7849201635" },
      ],
      "Mizuho Bank": [
        { name: "Ren Suzuki", account: "JP6382910475" },
        { name: "Aoi Nakamura", account: "JP9201847365" },
        { name: "Sota Ito", account: "JP5839201746" },
        { name: "Hina Watanabe", account: "JP7392018465" },
        { name: "Kaito Mori", account: "JP4729105836" },
        { name: "Yuna Hayashi", account: "JP8291047563" },
      ],
    },
  },

  Singapore: {
    currency: "SGD",
    banks: {
      DBS: [
        { name: "Ethan Lim", account: "SG5739201846" },
        { name: "Chloe Tan", account: "SG8492017365" },
        { name: "Ryan Ong", account: "SG6482910375" },
        { name: "Megan Koh", account: "SG9028173645" },
        { name: "Daniel Goh", account: "SG3174928560" },
        { name: "Sophia Teo", account: "SG7849201635" },
      ],
      OCBC: [
        { name: "Ryan Wong", account: "SG6382910475" },
        { name: "Grace Lee", account: "SG9201847365" },
        { name: "Lucas Chua", account: "SG5839201746" },
        { name: "Emma Ng", account: "SG7392018465" },
        { name: "Joshua Tay", account: "SG4729105836" },
        { name: "Olivia Chan", account: "SG8291047563" },
      ],
    },
  },

  Ghana: {
    currency: "GHS",
    banks: {
      "GCB Bank": [
        { name: "Kwame Mensah", account: "GH5739201846" },
        { name: "Ama Boateng", account: "GH8492017365" },
        { name: "Kojo Appiah", account: "GH6482910375" },
        { name: "Akua Owusu", account: "GH9028173645" },
        { name: "Yaw Asante", account: "GH3174928560" },
        { name: "Efua Agyeman", account: "GH7849201635" },
      ],
      "Ecobank Ghana": [
        { name: "Kofi Asante", account: "GH6382910475" },
        { name: "Abena Owusu", account: "GH9201847365" },
        { name: "Nana Boateng", account: "GH5839201746" },
        { name: "Esi Mensah", account: "GH7392018465" },
        { name: "Fiifi Osei", account: "GH4729105836" },
        { name: "Adwoa Darko", account: "GH8291047563" },
      ],
    },
  },
} as const;

type Country = keyof typeof BANKING_OPTIONS;

type Beneficiary = {
  name: string;
  account: string;
};

const initialForm = {
  full_name: "",
  email: "",
  password: "",
  virtual_balance: "",
  access_expires_at: "",
  phone: "",
  address: "",
  country: "",
  date_of_birth: "",
  occupation: "",
  id_type: "",
  id_number: "",
  client_id: "",
  account_tier: "Private Banking",
  account_type: "Global Checking Account",
  swift_code: "ATCBUS33",
  iban: "",
  available_credit: "",
  investment_balance: "",
  pending_transfers: "",
  transfer_limit: "2",
  banking_country: "",
  banking_currency: "",
  assigned_bank: "",
  assigned_beneficiary_name: "",
  assigned_beneficiary_account: "",
};

function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(() => !isAdminAuthed());
  
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    profile_id: "",
    beneficiary_name: "",
    account_number: "",
    bank_name: "",
    country: "",
    currency: "",
    nickname: "",
  });

  const selectedCountry = form.banking_country as Country | "";
  const selectedCountryData =
    selectedCountry && selectedCountry in BANKING_OPTIONS
      ? BANKING_OPTIONS[selectedCountry]
      : null;

  const bankNames = selectedCountryData
    ? Object.keys(selectedCountryData.banks)
    : [];

  const beneficiaries: Beneficiary[] =
    selectedCountryData && form.assigned_bank
      ? ([...(selectedCountryData.banks[
          form.assigned_bank as keyof typeof selectedCountryData.banks
        ] || [])] as Beneficiary[])
      : [];

const [editForm, setEditForm] = useState({
  full_name: "",
  email: "",
  phone: "",
  address: "",
  country: "",
  date_of_birth: "",
  occupation: "",
  id_type: "",
  id_number: "",
  virtual_balance: "",
  access_expires_at: "",
  client_id: "",
  account_tier: "",
  account_type: "",
  swift_code: "",
  iban: "",
  available_credit: "",
  investment_balance: "",
  pending_transfers: "",
  transfer_limit: "",
  banking_country: "",
  banking_currency: "",
  assigned_bank: "",
  assigned_beneficiary_name: "",
  assigned_beneficiary_account: "",
});

  useEffect(() => {
    if (!isAdminAuthed()) {
      setShowAdminLogin(true);
      return;
    }

    fetchProfiles();
  }, []);


  async function fetchProfiles() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        alert(error.message);
        return;
      }

      setProfiles(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function uploadProfileImage() {
    if (!profileImage) return null;

    const fileExt = profileImage.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const filePath = `customers/${fileName}`;

    const { error } = await supabase.storage
      .from("profile-images")
      .upload(filePath, profileImage);

    if (error) throw new Error(error.message);

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function handleEdgeError(error: unknown) {
    console.error("Edge Function error:", error);

    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      alert(error.message);
      return;
    }

    alert("Something went wrong.");
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const profileImageUrl = await uploadProfileImage();

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          virtual_balance: Number(form.virtual_balance || 0),
          access_expires_at: form.access_expires_at || null,
          phone: form.phone || null,
          address: form.address || null,
          country: form.country || null,
          date_of_birth: form.date_of_birth || null,
          occupation: form.occupation || null,
          id_type: form.id_type || null,
          id_number: form.id_number || null,
          profile_image_url: profileImageUrl,
          client_id: form.client_id || null,
          account_tier: form.account_tier,
          account_type: form.account_type,
          swift_code: form.swift_code || "ATCBUS33",
          iban: form.iban || null,
          available_credit: Number(form.available_credit || 0),
          investment_balance: Number(form.investment_balance || 0),
          pending_transfers: Number(form.pending_transfers || 0),
          transfer_limit: Number(form.transfer_limit || 2),
          banking_country: form.banking_country || null,
          banking_currency: form.banking_currency || null,
          assigned_bank: form.assigned_bank || null,
          assigned_beneficiary_name: form.assigned_beneficiary_name || null,
          assigned_beneficiary_account: form.assigned_beneficiary_account || null,
        },
      });

     if (error) {
    console.error("Create user Edge Function error:", error);

    let message = error.message || "Create user failed";

    if ("context" in error && error.context) {
      try {
        const body = await error.context.json();
        console.error("Edge Function response body:", body);
        message = body.error || body.message || message;
      } catch {
        // ignore
      }
    }

    alert(message);
    return;
  }

  if (
  data?.user_id &&
  form.assigned_beneficiary_name &&
  form.assigned_beneficiary_account &&
  form.assigned_bank &&
  form.banking_country &&
  form.banking_currency
) {
  const { error: beneficiaryError } = await supabase
    .from("beneficiaries")
    .insert({
      profile_id: data.user_id,
      beneficiary_name: form.assigned_beneficiary_name,
      account_number: form.assigned_beneficiary_account,
      bank_name: form.assigned_bank,
      country: form.banking_country,
      currency: form.banking_currency,
      nickname: "Generated",
      status: "active",
    });

  if (beneficiaryError) {
    alert(beneficiaryError.message);
    return;
  }
}

      setForm(initialForm);
      setProfileImage(null);
      setPreviewUrl("");
      fetchProfiles();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setCreating(false);
    }
  }

function startEdit(profile: Profile) {
  setEditingProfile(profile);

setEditForm({
  full_name: profile.full_name || "",
  email: profile.email || "",
  phone: profile.phone || "",
  address: profile.address || "",
  country: profile.country || "",
  date_of_birth: profile.date_of_birth || "",
  occupation: profile.occupation || "",
  id_type: profile.id_type || "",
  id_number: profile.id_number || "",
  virtual_balance: String(profile.virtual_balance || 0),
  access_expires_at: profile.access_expires_at
    ? profile.access_expires_at.slice(0, 16)
    : "",

  client_id: profile.client_id || "",

  account_tier: profile.account_tier || "Private Banking",
  account_type: profile.account_type || "Global Checking Account",
  swift_code: profile.swift_code || "ATCBUS33",
  iban: profile.iban || "",
  available_credit: String(profile.available_credit || 0),
  investment_balance: String(profile.investment_balance || 0),
  pending_transfers: String(profile.pending_transfers || 0),
  transfer_limit: String(profile.transfer_limit || 2),
  banking_country: profile.banking_country || "",
  banking_currency: profile.banking_currency || "",
  assigned_bank: profile.assigned_bank || "",
  assigned_beneficiary_name: profile.assigned_beneficiary_name || "",
  assigned_beneficiary_account: profile.assigned_beneficiary_account || "",
});
}

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();

    if (!editingProfile) return;

    setSavingEdit(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone || null,
        address: editForm.address || null,
        country: editForm.country || null,
        date_of_birth: editForm.date_of_birth || null,
        occupation: editForm.occupation || null,
        id_type: editForm.id_type || null,
        id_number: editForm.id_number || null,
        virtual_balance: Number(editForm.virtual_balance || 0),
        access_expires_at: editForm.access_expires_at || null,
        account_tier: editForm.account_tier,
        account_type: editForm.account_type,
        swift_code: editForm.swift_code || "ATCBUS33",
        iban: editForm.iban || null,
        available_credit: Number(editForm.available_credit || 0),
        investment_balance: Number(editForm.investment_balance || 0),
        pending_transfers: Number(editForm.pending_transfers || 0),
        transfer_limit: Number(editForm.transfer_limit || 2),
        banking_country: editForm.banking_country || null,
        banking_currency: editForm.banking_currency || null,
        assigned_bank: editForm.assigned_bank || null,
        assigned_beneficiary_name: editForm.assigned_beneficiary_name || null,
        assigned_beneficiary_account: editForm.assigned_beneficiary_account || null,
      })
        .eq("id", editingProfile.id);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Customer profile updated successfully.");
      setEditingProfile(null);
      fetchProfiles();
    } finally {
      setSavingEdit(false);
    }
  }

  async function resetTransferCount(profile: Profile) {
    const confirmed = confirm(`Reset transfer count for ${profile.full_name}?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .update({ transaction_count: 0 })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchProfiles();
  }

  async function toggleStatus(profile: Profile) {
    const newStatus = profile.status === "active" ? "suspended" : "active";

    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchProfiles();
  }

  async function deleteUser(profile: Profile) {
    const confirmed = confirm(
      `Are you sure you want to delete ${profile.full_name}?`
    );

    if (!confirmed) return;

    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: profile.id },
    });

    if (error) {
      handleEdgeError(error);
      return;
    }

    if (data?.error) {
      alert(data.error);
      return;
    }

    fetchProfiles();
  }

  async function addBeneficiary() {
    if (
      !beneficiaryForm.profile_id ||
      !beneficiaryForm.beneficiary_name ||
      !beneficiaryForm.account_number ||
      !beneficiaryForm.bank_name ||
      !beneficiaryForm.country ||
      !beneficiaryForm.currency
    ) {
      alert("Please complete all required fields.");
      return;
    }

    const { error } = await supabase.from("beneficiaries").insert({
      profile_id: beneficiaryForm.profile_id,
      beneficiary_name: beneficiaryForm.beneficiary_name,
      account_number: beneficiaryForm.account_number,
      bank_name: beneficiaryForm.bank_name,
      country: beneficiaryForm.country,
      currency: beneficiaryForm.currency,
      nickname: beneficiaryForm.nickname || null,
      status: "active",
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Beneficiary added successfully.");

    await supabase.from("notifications").insert({
    profile_id: beneficiaryForm.profile_id,
    title: "Beneficiary Added",
    message: `${beneficiaryForm.beneficiary_name} has been approved for transfers.`,
    type: "beneficiary",
  });

    setBeneficiaryForm({
      profile_id: "",
      beneficiary_name: "",
      account_number: "",
      bank_name: "",
      country: "",
      currency: "",
      nickname: "",
    });
  }

  const activeUsers = profiles.filter((p) => p.status === "active").length;
  const suspendedUsers = profiles.filter((p) => p.status === "suspended").length;
  const totalBalance = profiles.reduce(
    (sum, user) => sum + Number(user.virtual_balance || 0),
    0
  );
  const totalInvestments = profiles.reduce(
    (sum, user) => sum + Number(user.investment_balance || 0),
    0
  );
  const totalCredit = profiles.reduce(
    (sum, user) => sum + Number(user.available_credit || 0),
    0
  );

  if (showAdminLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-bold mb-4">Atlas Capital Admin</h1>

          <Input
            type="password"
            placeholder="Admin Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />

          <Button
            className="w-full mt-4"
            onClick={() => {
              if (adminSignIn(adminPassword)) {
                setShowAdminLogin(false);
                fetchProfiles();
              } else {
                alert("Invalid admin password");
              }
            }}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gold">
            <Shield className="h-4 w-4" />
            Banking Operations
          </div>

          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Customer Management Console
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Create, monitor, and manage international client accounts.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={Users} label="Total customers" value={profiles.length} />
          <Stat icon={CheckCircle2} label="Active" value={activeUsers} />
          <Stat icon={Ban} label="Suspended" value={suspendedUsers} />
          <StatMoney icon={Wallet} label="Cash balances" value={totalBalance} />
          <StatMoney
            icon={Wallet}
            label="Investments + credit"
            value={totalInvestments + totalCredit}
          />
        </div>

        <section className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold mb-1">
            Create New Customer Account
          </h2>

          <form onSubmit={createUser} className="space-y-8 mt-6">
            <FormSection title="Profile Photo">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-secondary border border-border grid place-items-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Upload className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>

                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setProfileImage(file);
                    setPreviewUrl(URL.createObjectURL(file));
                  }}
                />
              </div>
            </FormSection>

            <FormSection title="Personal Information">
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Full legal name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                <Input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                <Input placeholder="Residential address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Input placeholder="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
              </div>
            </FormSection>

            <FormSection title="Identification">
              <div className="grid gap-4 md:grid-cols-2">
                <select value={form.id_type} onChange={(e) => setForm({ ...form, id_type: e.target.value })} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select ID Type</option>
                  <option value="Passport">Passport</option>
                  <option value="National ID">National ID</option>
                  <option value="Driver's License">Driver&apos;s License</option>
                  <option value="Residence Permit">Residence Permit</option>
                  <option value="Tax Identification Number">Tax Identification Number</option>
                  <option value="Business Registration ID">Business Registration ID</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Military ID">Military ID</option>
                </select>

                <Input placeholder="ID number" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
              </div>
            </FormSection>

            <FormSection title="Login & Access">
              <div className="grid gap-4 md:grid-cols-2">
                <Input type="email" placeholder="Login email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <Input type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <Input type="datetime-local" value={form.access_expires_at} onChange={(e) => setForm({ ...form, access_expires_at: e.target.value })} />
                <Input type="number" placeholder="Transfer limit" value={form.transfer_limit} onChange={(e) => setForm({ ...form, transfer_limit: e.target.value })} />
              </div>
            </FormSection>

            <FormSection title="Banking & Wealth Setup">
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Client ID (optional)" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />

                <select value={form.account_tier} onChange={(e) => setForm({ ...form, account_tier: e.target.value })} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="Private Banking">Private Banking</option>
                  <option value="Premier Banking">Premier Banking</option>
                  <option value="Corporate Banking">Corporate Banking</option>
                  <option value="Wealth Management">Wealth Management</option>
                </select>

                <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="Global Checking Account">Global Checking Account</option>
                  <option value="USD Savings Account">USD Savings Account</option>
                  <option value="Premium Current Account">Premium Current Account</option>
                  <option value="Investment Portfolio">Investment Portfolio</option>
                </select>

                <Input placeholder="SWIFT Code" value={form.swift_code} onChange={(e) => setForm({ ...form, swift_code: e.target.value })} />
                <Input placeholder="IBAN (optional)" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
                <Input type="number" placeholder="Opening cash balance" value={form.virtual_balance} onChange={(e) => setForm({ ...form, virtual_balance: e.target.value })} required />
                <Input type="number" placeholder="Investment balance" value={form.investment_balance} onChange={(e) => setForm({ ...form, investment_balance: e.target.value })} />
                <Input type="number" placeholder="Available credit" value={form.available_credit} onChange={(e) => setForm({ ...form, available_credit: e.target.value })} />
                <Input type="number" placeholder="Pending transfers" value={form.pending_transfers} onChange={(e) => setForm({ ...form, pending_transfers: e.target.value })} />
              </div>
            </FormSection>

            <FormSection title="International Routing Assignment">
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  value={form.banking_country}
                  onChange={(e) => {
                    const country = e.target.value as Country;
                    const currency = country ? BANKING_OPTIONS[country].currency : "";

                    setForm({
                      ...form,
                      banking_country: country,
                      banking_currency: currency,
                      assigned_bank: "",
                      assigned_beneficiary_name: "",
                      assigned_beneficiary_account: "",
                    });
                  }}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select banking country</option>
                  {Object.keys(BANKING_OPTIONS).map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>

                <Input value={form.banking_currency} placeholder="Currency" readOnly />

                <select
                  value={form.assigned_bank}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      assigned_bank: e.target.value,
                      assigned_beneficiary_name: "",
                      assigned_beneficiary_account: "",
                    })
                  }
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                  disabled={!form.banking_country}
                >
                  <option value="">Select bank</option>
                  {bankNames.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>

                <select
                  value={form.assigned_beneficiary_account}
                  onChange={(e) => {
                    const selected = beneficiaries.find(
                      (b) => b.account === e.target.value
                    );

                    setForm({
                      ...form,
                      assigned_beneficiary_account: selected?.account || "",
                      assigned_beneficiary_name: selected?.name || "",
                    });
                  }}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                  disabled={!form.assigned_bank}
                >
                  <option value="">Select generated beneficiary</option>
                  {beneficiaries.map((beneficiary) => (
                    <option key={beneficiary.account} value={beneficiary.account}>
                      {beneficiary.name} — {beneficiary.account}
                    </option>
                  ))}
                </select>

                <Input
                  value={form.assigned_beneficiary_name}
                  placeholder="Beneficiary name"
                  readOnly
                />
              </div>
            </FormSection>

            <Button type="submit" disabled={creating} className="w-full md:w-auto">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Customer Account"
              )}
            </Button>
          </form>
        </section>

        <section className="glass-strong p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Customer Accounts
            </h2>

            <Button variant="outline" onClick={fetchProfiles}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading customers...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3">Customer</th>
                    <th>Client ID</th>
                    <th>Country</th>
                    <th>Bank</th>
                    <th>Beneficiary</th>
                    <th>Currency</th>
                    <th>Cash</th>
                    <th>Transfers</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-border/60">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {profile.profile_image_url ? (
                            <img src={profile.profile_image_url} alt={profile.full_name} className="h-10 w-10 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-secondary grid place-items-center font-semibold">
                              {profile.full_name?.charAt(0) || "U"}
                            </div>
                          )}

                          <div>
                            <p className="font-medium">{profile.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {profile.account_number}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="font-mono">{profile.client_id || "-"}</td>
                      <td>{profile.banking_country || "-"}</td>
                      <td>{profile.assigned_bank || "-"}</td>
                      <td>
                        {profile.assigned_beneficiary_name || "-"}
                        {profile.assigned_beneficiary_account && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {profile.assigned_beneficiary_account}
                          </div>
                        )}
                      </td>
                      <td>{profile.banking_currency || "-"}</td>
                      <td>${Number(profile.virtual_balance || 0).toLocaleString()}</td>
                      <td>
                        {profile.transaction_count || 0} /{" "}
                        {profile.transfer_limit || 2}
                      </td>
                      <td>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            profile.status === "active"
                              ? "bg-success/15 text-success"
                              : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {profile.status}
                        </span>
                      </td>

                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(profile)}>
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => resetTransferCount(profile)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => toggleStatus(profile)}>
                            {profile.status === "active" ? "Suspend" : "Activate"}
                          </Button>

                          <Button size="sm" variant="destructive" onClick={() => deleteUser(profile)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {profiles.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No accounts created yet.
                </p>
              )}
            </div>
          )}
        </section>

   {editingProfile && (
  <section className="glass-strong p-6">
    <h2 className="font-display text-xl font-semibold mb-6">
      Edit Customer Account: {editingProfile.full_name}
    </h2>

    <form onSubmit={saveEdit} className="space-y-8">
      <FormSection title="Personal Information">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Full legal name" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
          <Input type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
          <Input placeholder="Phone number" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          <Input placeholder="Country" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
          <Input placeholder="Residential address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
          <Input placeholder="Occupation" value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} />
        </div>
      </FormSection>

      <FormSection title="Identification">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="ID Type" value={editForm.id_type} onChange={(e) => setEditForm({ ...editForm, id_type: e.target.value })} />
          <Input placeholder="ID Number" value={editForm.id_number} onChange={(e) => setEditForm({ ...editForm, id_number: e.target.value })} />
        </div>
      </FormSection>

      <FormSection title="Access & Limits">
        <div className="grid gap-4 md:grid-cols-2">
          <Input type="datetime-local" value={editForm.access_expires_at} onChange={(e) => setEditForm({ ...editForm, access_expires_at: e.target.value })} />
          <Input type="number" placeholder="Transfer limit" value={editForm.transfer_limit} onChange={(e) => setEditForm({ ...editForm, transfer_limit: e.target.value })} />
        </div>
      </FormSection>

      <FormSection title="Banking & Wealth Setup">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Client ID" value={editForm.client_id} onChange={(e) => setEditForm({ ...editForm, client_id: e.target.value })} />
          <Input placeholder="Account Tier" value={editForm.account_tier} onChange={(e) => setEditForm({ ...editForm, account_tier: e.target.value })} />
          <Input placeholder="Account Type" value={editForm.account_type} onChange={(e) => setEditForm({ ...editForm, account_type: e.target.value })} />
          <Input placeholder="SWIFT Code" value={editForm.swift_code} onChange={(e) => setEditForm({ ...editForm, swift_code: e.target.value })} />
          <Input placeholder="IBAN" value={editForm.iban} onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })} />
          <Input type="number" placeholder="Cash balance" value={editForm.virtual_balance} onChange={(e) => setEditForm({ ...editForm, virtual_balance: e.target.value })} />
          <Input type="number" placeholder="Investment balance" value={editForm.investment_balance} onChange={(e) => setEditForm({ ...editForm, investment_balance: e.target.value })} />
          <Input type="number" placeholder="Available credit" value={editForm.available_credit} onChange={(e) => setEditForm({ ...editForm, available_credit: e.target.value })} />
          <Input type="number" placeholder="Pending transfers" value={editForm.pending_transfers} onChange={(e) => setEditForm({ ...editForm, pending_transfers: e.target.value })} />
        </div>
      </FormSection>

      <FormSection title="International Routing Assignment">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Banking Country" value={editForm.banking_country} onChange={(e) => setEditForm({ ...editForm, banking_country: e.target.value })} />
          <Input placeholder="Currency" value={editForm.banking_currency} onChange={(e) => setEditForm({ ...editForm, banking_currency: e.target.value })} />
          <Input placeholder="Assigned Bank" value={editForm.assigned_bank} onChange={(e) => setEditForm({ ...editForm, assigned_bank: e.target.value })} />
          <Input placeholder="Beneficiary Name" value={editForm.assigned_beneficiary_name} onChange={(e) => setEditForm({ ...editForm, assigned_beneficiary_name: e.target.value })} />
          <Input placeholder="Beneficiary Account" value={editForm.assigned_beneficiary_account} onChange={(e) => setEditForm({ ...editForm, assigned_beneficiary_account: e.target.value })} />
        </div>
      </FormSection>

      <div className="flex gap-3">
        <Button type="submit" disabled={savingEdit}>
          {savingEdit ? "Saving..." : "Save Changes"}
        </Button>

        <Button type="button" variant="outline" onClick={() => setEditingProfile(null)}>
          Cancel
        </Button>
      </div>
    </form>
  </section>
)} 

        <section className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold mb-4">
            Beneficiary Management
          </h2>

          <p className="text-sm text-muted-foreground mb-6">
            Add approved beneficiaries for customers. These will appear in the
            customer transfer dropdown.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={beneficiaryForm.profile_id}
              onChange={(e) =>
                setBeneficiaryForm({
                  ...beneficiaryForm,
                  profile_id: e.target.value,
                })
              }
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select Customer</option>

              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name} — {profile.email}
                </option>
              ))}
            </select>

            <Input
              placeholder="Beneficiary Name"
              value={beneficiaryForm.beneficiary_name}
              onChange={(e) =>
                setBeneficiaryForm({
                  ...beneficiaryForm,
                  beneficiary_name: e.target.value,
                })
              }
            />

            <Input
              placeholder="Account Number"
              value={beneficiaryForm.account_number}
              onChange={(e) =>
                setBeneficiaryForm({
                  ...beneficiaryForm,
                  account_number: e.target.value,
                })
              }
            />

            <Input
              placeholder="Bank Name"
              value={beneficiaryForm.bank_name}
              onChange={(e) =>
                setBeneficiaryForm({
                  ...beneficiaryForm,
                  bank_name: e.target.value,
                })
              }
            />

            <Input
              placeholder="Country"
              value={beneficiaryForm.country}
              onChange={(e) =>
                setBeneficiaryForm({
                  ...beneficiaryForm,
                  country: e.target.value,
                })
              }
            />

            <Input
              placeholder="Currency"
              value={beneficiaryForm.currency}
              onChange={(e) =>
                setBeneficiaryForm({
                  ...beneficiaryForm,
                  currency: e.target.value,
                })
              }
            />

            <Input
              placeholder="Nickname (optional)"
              value={beneficiaryForm.nickname}
              onChange={(e) =>
                setBeneficiaryForm({
                  ...beneficiaryForm,
                  nickname: e.target.value,
                })
              }
            />
          </div>

          <Button onClick={addBeneficiary} className="mt-5">
            Add Beneficiary
          </Button>
        </section>
      </div>
    </AdminShell>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-gold" />
      </div>

      <div className="mt-3 font-display text-2xl font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function StatMoney({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-gold" />
      </div>

      <div className="mt-3 font-display text-2xl font-semibold tabular-nums">
        ${Number(value || 0).toLocaleString()}
      </div>
    </div>
  );
}