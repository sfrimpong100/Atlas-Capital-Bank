import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeftRight,
  Bell,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  MailOpen,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

type Notification = {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
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
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setNotifications(data || []);
    setLoading(false);
  }

  async function markRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNotifications((items) =>
      items.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      )
    );
  }

  async function markAllRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNotifications((items) =>
      items.map((item) => ({ ...item, is_read: true }))
    );

    toast.success("All notifications marked as read");
  }

  async function deleteNotification(id: string) {
    const ok = confirm("Delete this notification?");
    if (!ok) return;

    const { error } = await supabase.from("notifications").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNotifications((items) => items.filter((item) => item.id !== id));
    toast.success("Notification deleted");
  }

  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      const matchesQuery =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.message.toLowerCase().includes(query.toLowerCase()) ||
        item.type.toLowerCase().includes(query.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !item.is_read) ||
        item.type === filter;

      return matchesQuery && matchesFilter;
    });
  }, [notifications, query, filter]);

  const unread = notifications.filter((item) => !item.is_read).length;
  const security = notifications.filter((item) => item.type === "security").length;
  const transfers = notifications.filter((item) => item.type === "transfer").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-gold">
              <Bell className="h-5 w-5" />
              Banking Inbox
            </div>

            <h1 className="mt-2 font-display text-3xl font-semibold">
              Notifications
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Review transfer updates, card alerts, security messages, and account notices.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadNotifications}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button onClick={markAllRead}>
              <MailOpen className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <Stat label="Total" value={notifications.length} icon={Bell} />
          <Stat label="Unread" value={unread} icon={MailOpen} />
          <Stat label="Transfers" value={transfers} icon={ArrowLeftRight} />
          <Stat label="Security" value={security} icon={ShieldAlert} />
        </section>

        <section className="card-surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["unread", "Unread"],
                ["transfer", "Transfers"],
                ["card", "Cards"],
                ["security", "Security"],
                ["beneficiary", "Beneficiaries"],
                ["account", "Account"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === value
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

        <section className="space-y-3">
          {loading ? (
            <div className="card-surface p-10 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : filtered.length === 0 ? (
            <div className="card-surface p-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-4 font-display text-xl font-semibold">
                No notifications found
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                New account, transfer, card, and security alerts will appear here.
              </p>
            </div>
          ) : (
            filtered.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onRead={() => markRead(notification.id)}
                onDelete={() => deleteNotification(notification.id)}
              />
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}

function NotificationCard({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: () => void;
  onDelete: () => void;
}) {
  const Icon = getIcon(notification.type);

  return (
    <div
      className={`rounded-2xl border p-5 transition-colors ${
        notification.is_read
          ? "border-border bg-card"
          : "border-gold/40 bg-gold/10"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className={`h-11 w-11 rounded-xl grid place-items-center ${
              notification.is_read
                ? "bg-secondary text-muted-foreground"
                : "bg-gold/15 text-gold"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{notification.title}</h2>

              {!notification.is_read && (
                <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">
                  New
                </span>
              )}

              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {notification.type}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {notification.message}
            </p>

            <p className="mt-3 text-xs text-muted-foreground">
              {new Date(notification.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {!notification.is_read && (
            <Button size="sm" variant="outline" onClick={onRead}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Read
            </Button>
          )}

          {notification.type === "transfer" && (
            <Link to="/transactions" from="/">
              <Button size="sm" variant="outline">
                View
              </Button>
            </Link>
          )}

          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
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
    <div className="card-surface p-5">
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

function getIcon(type: string) {
  switch (type) {
    case "transfer":
      return ArrowLeftRight;
    case "card":
      return CreditCard;
    case "security":
      return LockKeyhole;
    case "beneficiary":
      return ShieldAlert;
    case "account":
      return Bell;
    default:
      return Bell;
  }
}