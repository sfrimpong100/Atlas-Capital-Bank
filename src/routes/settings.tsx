import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Fingerprint,
  KeyRound,
  Laptop,
  Lock,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Atlas Capital Bank" },
      {
        name: "description",
        content: "Manage profile, security, devices, and banking settings.",
      },
    ],
  }),
  component: SettingsPage,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  banking_currency?: string | null;
};

type SecuritySettings = {
  profile_id: string;
  two_factor_enabled: boolean;
  biometric_enabled: boolean;
  login_alerts: boolean;
  transfer_alerts: boolean;
  beneficiary_alerts: boolean;
};

type LoginHistory = {
  id: string;
  event: string;
  location: string;
  device: string;
  status: string;
  created_at: string;
};

type TrustedDevice = {
  id: string;
  device_name: string;
  browser: string;
  location: string;
  is_current: boolean;
  last_seen: string;
};

function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    country: "",
    banking_currency: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
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

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, address, country, banking_currency")
          .eq("id", user.id)
          .single();

        if (profileError) {
          alert(profileError.message);
          return;
        }

        setProfile(profileData);

        setForm({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          address: profileData.address || "",
          country: profileData.country || "",
          banking_currency: profileData.banking_currency || "",
        });

        const { data: securityData } = await supabase
          .from("security_settings")
          .select("*")
          .eq("profile_id", user.id)
          .single();

        if (securityData) {
          setSecurity(securityData);
        } else {
          const { data: createdSecurity } = await supabase
            .from("security_settings")
            .insert({ profile_id: user.id })
            .select()
            .single();

          setSecurity(createdSecurity);
        }

        const { data: historyData } = await supabase
          .from("login_history")
          .select("*")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        setLoginHistory(historyData || []);

        const { data: deviceData } = await supabase
          .from("trusted_devices")
          .select("*")
          .eq("profile_id", user.id)
          .order("last_seen", { ascending: false })
          .limit(10);

        setDevices(deviceData || []);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [router]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();

    if (!profile) return;

    setSavingProfile(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        address: form.address || null,
        country: form.country || null,
        banking_currency: form.banking_currency || null,
      })
      .eq("id", profile.id);

    setSavingProfile(false);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: profile.id,
      title: "Profile Updated",
      message: "Your account profile settings were updated successfully.",
      type: "settings",
    });

    toast.success("Profile settings updated");
  }

  async function updateSecurityField(
    key: keyof Omit<SecuritySettings, "profile_id">,
    value: boolean
  ) {
    if (!profile || !security) return;

    const nextSecurity = {
      ...security,
      [key]: value,
    };

    setSecurity(nextSecurity);

    const { error } = await supabase
      .from("security_settings")
      .update({
        [key]: value,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: profile.id,
      title: "Security Settings Updated",
      message: "Your security preferences were updated.",
      type: "security",
    });

    toast.success("Security setting updated");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    setChangingPassword(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (profile) {
      await supabase.from("notifications").insert({
        profile_id: profile.id,
        title: "Password Changed",
        message: "Your login password was changed successfully.",
        type: "security",
      });
    }

    setPasswordForm({
      newPassword: "",
      confirmPassword: "",
    });

    toast.success("Password changed successfully");
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[70vh] grid place-items-center">
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        <div>
          <div className="text-sm text-muted-foreground">Account</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">
            Security <span className="text-gradient-gold">Center</span>
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Manage profile, password, trusted devices, and security alerts.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <SettingsCard icon={User} title="Profile" description="Personal details" />
          <SettingsCard icon={Lock} title="Password" description="Secure access" />
          <SettingsCard icon={Fingerprint} title="Biometrics" description="Login protection" />
          <SettingsCard icon={Bell} title="Alerts" description="Banking notifications" />
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="glass-strong p-6">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="h-5 w-5 text-gold" />
              <h2 className="font-display text-xl font-semibold">
                Profile Settings
              </h2>
            </div>

            <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
              <Input value={profile?.email || ""} disabled placeholder="Email" />

              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Full name"
              />

              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
              />

              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Country"
              />

              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Residential address"
                className="md:col-span-2"
              />

              <select
                value={form.banking_currency}
                onChange={(e) =>
                  setForm({ ...form, banking_currency: e.target.value })
                }
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Preferred currency</option>
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GHS">GHS — Ghana Cedi</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="CHF">CHF — Swiss Franc</option>
                <option value="JPY">JPY — Japanese Yen</option>
              </select>

              <div className="md:col-span-2">
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </div>

          <div className="glass-strong p-6">
            <div className="flex items-center gap-2 mb-6">
              <KeyRound className="h-5 w-5 text-gold" />
              <h2 className="font-display text-xl font-semibold">
                Change Password
              </h2>
            </div>

            <form onSubmit={changePassword} className="space-y-4">
              <Input
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
              />

              <Input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
              />

              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </div>
        </section>

        <section className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold mb-5">
            Account Protection
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            <ToggleRow
              title="Two-Factor Authentication"
              description="Require an extra verification step when signing in."
              enabled={!!security?.two_factor_enabled}
              onChange={(value) =>
                updateSecurityField("two_factor_enabled", value)
              }
            />

            <ToggleRow
              title="Biometric Login"
              description="Allow Face ID or fingerprint login on supported devices."
              enabled={!!security?.biometric_enabled}
              onChange={(value) =>
                updateSecurityField("biometric_enabled", value)
              }
            />

            <ToggleRow
              title="Login Alerts"
              description="Receive alerts whenever your account is accessed."
              enabled={!!security?.login_alerts}
              onChange={(value) => updateSecurityField("login_alerts", value)}
            />

            <ToggleRow
              title="Transfer Alerts"
              description="Receive notifications for transfer activity."
              enabled={!!security?.transfer_alerts}
              onChange={(value) => updateSecurityField("transfer_alerts", value)}
            />

            <ToggleRow
              title="Beneficiary Alerts"
              description="Receive alerts when beneficiaries are added or updated."
              enabled={!!security?.beneficiary_alerts}
              onChange={(value) =>
                updateSecurityField("beneficiary_alerts", value)
              }
            />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="glass-strong p-6">
            <div className="flex items-center gap-2 mb-5">
              <Laptop className="h-5 w-5 text-gold" />
              <h2 className="font-display text-xl font-semibold">
                Trusted Devices
              </h2>
            </div>

            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No trusted devices recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="rounded-xl bg-secondary/40 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-gold" />
                      <div>
                        <p className="font-medium text-sm">
                          {device.device_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {device.browser} · {device.location}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {device.is_current
                        ? "Current"
                        : new Date(device.last_seen).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold mb-5">
              Login History
            </h2>

            {loginHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No login history recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {loginHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-secondary/40 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-sm">{item.event}</p>
                      <span
                        className={`text-xs ${
                          item.status === "success"
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.device} · {item.location}
                    </p>

                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="glass p-5">
      <div className="h-10 w-10 rounded-xl bg-secondary grid place-items-center mb-4">
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-xl bg-secondary/40 p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`h-6 w-11 rounded-full p-1 transition-colors ${
          enabled ? "bg-gold" : "bg-muted"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-background transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}