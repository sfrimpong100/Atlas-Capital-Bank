import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, RefreshCcw, Send, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsPage,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

type Notification = {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  profiles?: Profile | null;
};

function AdminNotificationsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    profile_id: "",
    title: "",
    message: "",
    type: "info",
    broadcast: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [profilesResult, notificationsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("created_at", { ascending: false }),

      supabase
        .from("notifications")
        .select(
          `
          *,
          profiles:profile_id (
            id,
            full_name,
            email
          )
        `
        )
        .order("created_at", { ascending: false }),
    ]);

    if (profilesResult.error) alert(profilesResult.error.message);
    if (notificationsResult.error) alert(notificationsResult.error.message);

    setProfiles(profilesResult.data || []);
    setNotifications(notificationsResult.data || []);
    setLoading(false);
  }

  async function sendNotification(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title || !form.message) {
      alert("Title and message are required.");
      return;
    }

    if (!form.broadcast && !form.profile_id) {
      alert("Select a customer or enable broadcast.");
      return;
    }

    setSending(true);

    if (form.broadcast) {
      const rows = profiles.map((profile) => ({
        profile_id: profile.id,
        title: form.title,
        message: form.message,
        type: form.type,
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(rows);

      if (error) {
        alert(error.message);
        setSending(false);
        return;
      }
    } else {
      const { error } = await supabase.from("notifications").insert({
        profile_id: form.profile_id,
        title: form.title,
        message: form.message,
        type: form.type,
        is_read: false,
      });

      if (error) {
        alert(error.message);
        setSending(false);
        return;
      }
    }

    setForm({
      profile_id: "",
      title: "",
      message: "",
      type: "info",
      broadcast: false,
    });

    setSending(false);
    loadData();
  }

  async function markRead(notification: Notification) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function deleteNotification(notification: Notification) {
    const ok = confirm(`Delete notification: ${notification.title}?`);
    if (!ok) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notification.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  const filtered = notifications.filter((notification) => {
    const term = query.toLowerCase();

    if (!term) return true;

    return (
      notification.title?.toLowerCase().includes(term) ||
      notification.message?.toLowerCase().includes(term) ||
      notification.type?.toLowerCase().includes(term) ||
      notification.profiles?.full_name?.toLowerCase().includes(term) ||
      notification.profiles?.email?.toLowerCase().includes(term)
    );
  });

  const unread = notifications.filter((item) => !item.is_read).length;
  const read = notifications.filter((item) => item.is_read).length;

  return (
    <AdminShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Notification Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send customer alerts, broadcast messages, and review notification history.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Total Notifications" value={notifications.length} />
          <Stat label="Unread" value={unread} />
          <Stat label="Read" value={read} />
          <Stat label="Customers" value={profiles.length} />
        </div>

        <section className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold mb-5">
            Send Notification
          </h2>

          <form onSubmit={sendNotification} className="grid gap-4 md:grid-cols-2">
            <select
              value={form.profile_id}
              onChange={(e) => setForm({ ...form, profile_id: e.target.value })}
              disabled={form.broadcast}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select customer</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name} — {profile.email}
                </option>
              ))}
            </select>

            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="info">Info</option>
              <option value="security">Security</option>
              <option value="transfer">Transfer</option>
              <option value="card">Card</option>
              <option value="beneficiary">Beneficiary</option>
              <option value="account">Account</option>
              <option value="settings">Settings</option>
            </select>

            <Input
              placeholder="Notification title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <label className="flex h-11 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
              <input
                type="checkbox"
                checked={form.broadcast}
                onChange={(e) =>
                  setForm({
                    ...form,
                    broadcast: e.target.checked,
                    profile_id: e.target.checked ? "" : form.profile_id,
                  })
                }
              />
              Broadcast to all customers
            </label>

            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Notification message"
              rows={4}
              className="md:col-span-2 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              required
            />

            <div className="md:col-span-2">
              <Button type="submit" disabled={sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send Notification"}
              </Button>
            </div>
          </form>
        </section>

        <section className="glass-strong p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Notification History
              </h2>
              <p className="text-xs text-muted-foreground">
                Recent notifications sent to customers.
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Search notifications..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-72"
              />

              <Button variant="outline" onClick={loadData}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading notifications...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notifications found.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border p-4 ${
                    notification.is_read
                      ? "border-border bg-secondary/20"
                      : "border-gold/40 bg-gold/10"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-gold" />
                        <p className="font-semibold">{notification.title}</p>
                        <StatusPill status={notification.type} />
                        {!notification.is_read && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold">
                            Unread
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {notification.message}
                      </p>

                      <p className="mt-3 text-xs text-muted-foreground">
                        To: {notification.profiles?.full_name || "Unknown"} ·{" "}
                        {notification.profiles?.email || "-"} ·{" "}
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {!notification.is_read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markRead(notification)}
                        >
                          Mark read
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteNotification(notification)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wider text-muted-foreground">
      {status}
    </span>
  );
}