import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCcw,
  Search,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/security")({
  component: SecurityPage,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  failed_login_attempts?: number;
  account_locked?: boolean;
  last_login_at?: string;
  created_at?: string;
};

function SecurityPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setProfiles(data || []);
    setLoading(false);
  }

  async function toggleLock(profile: Profile) {
    const locked = !profile.account_locked;

    const { error } = await supabase
      .from("profiles")
      .update({
        account_locked: locked,
      })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("notifications").insert({
      profile_id: profile.id,
      title: locked ? "Account Locked" : "Account Unlocked",
      message: locked
        ? "Your online banking access has been temporarily locked."
        : "Your online banking access has been restored.",
      type: "security",
    });

    loadProfiles();
  }

  async function resetFailedAttempts(profile: Profile) {
    const { error } = await supabase
      .from("profiles")
      .update({
        failed_login_attempts: 0,
      })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadProfiles();
  }

  const filtered = profiles.filter((profile) => {
    const term = query.toLowerCase();

    return (
      profile.full_name?.toLowerCase().includes(term) ||
      profile.email?.toLowerCase().includes(term)
    );
  });

  const locked = profiles.filter((p) => p.account_locked).length;

  const failed = profiles.filter(
    (p) => Number(p.failed_login_attempts || 0) > 0
  ).length;

  return (
    <AdminShell>
      <div className="space-y-8">

        <div>
          <div className="flex items-center gap-2 text-gold">
            <Shield className="h-5 w-5" />
            Security Operations
          </div>

          <h1 className="font-display text-3xl font-semibold mt-2">
            Security Center
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            Monitor account security, login attempts and locked accounts.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">

          <Stat
            icon={ShieldCheck}
            label="Customers"
            value={profiles.length}
          />

          <Stat
            icon={ShieldAlert}
            label="Locked Accounts"
            value={locked}
          />

          <Stat
            icon={AlertTriangle}
            label="Failed Logins"
            value={failed}
          />

          <Stat
            icon={Lock}
            label="Protected"
            value={profiles.length - locked}
          />

        </div>

        <section className="glass-strong p-6">

          <div className="flex justify-between mb-6">

            <div>
              <h2 className="font-display text-xl font-semibold">
                Customer Security
              </h2>

              <p className="text-xs text-muted-foreground">
                Review customer security status.
              </p>
            </div>

            <div className="flex gap-2">

              <div className="relative">

                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>

                <input
                  value={query}
                  onChange={(e)=>setQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 h-10 rounded-md border bg-background border-input w-72"
                />

              </div>

              <Button
                variant="outline"
                onClick={loadProfiles}
              >
                <RefreshCcw className="h-4 w-4 mr-2"/>
                Refresh
              </Button>

            </div>

          </div>

          {loading ? (

            <p>Loading...</p>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                <tr className="border-b">

                  <th className="text-left py-3">Customer</th>
                  <th className="text-left">Failed Attempts</th>
                  <th className="text-left">Last Login</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Actions</th>

                </tr>

                </thead>

                <tbody>

                {filtered.map(profile=>(

                  <tr
                    key={profile.id}
                    className="border-b"
                  >

                    <td className="py-4">

                      <div className="font-medium">
                        {profile.full_name}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {profile.email}
                      </div>

                    </td>

                    <td>

                      {profile.failed_login_attempts || 0}

                    </td>

                    <td>

                      {profile.last_login_at
                        ? new Date(profile.last_login_at).toLocaleString()
                        : "-"}

                    </td>

                    <td>

                      {profile.account_locked ? (

                        <span className="text-red-500 font-medium">
                          Locked
                        </span>

                      ) : (

                        <span className="text-green-500 font-medium">
                          Secure
                        </span>

                      )}

                    </td>

                    <td>

                      <div className="flex justify-end gap-2">

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={()=>resetFailedAttempts(profile)}
                        >
                          Reset Attempts
                        </Button>

                        <Button
                          size="sm"
                          variant={
                            profile.account_locked
                              ? "default"
                              : "destructive"
                          }
                          onClick={()=>toggleLock(profile)}
                        >

                          {profile.account_locked ? (

                            <>
                              <Unlock className="mr-2 h-4 w-4"/>
                              Unlock
                            </>

                          ) : (

                            <>
                              <Lock className="mr-2 h-4 w-4"/>
                              Lock
                            </>

                          )}

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

function Stat({
  icon: Icon,
  label,
  value,
}:{
  icon:any;
  label:string;
  value:number;
}){

  return(

    <div className="glass p-5">

      <div className="flex justify-between">

        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>

        <Icon className="h-4 w-4 text-gold"/>

      </div>

      <div className="mt-4 font-display text-3xl font-semibold">
        {value}
      </div>

    </div>

  )

}