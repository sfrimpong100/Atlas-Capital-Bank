import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  LogOut,
  ShieldCheck,
  Settings,
  Bell,
  CreditCard,
  BarChart3,
  X,
  CheckCheck,
  MailOpen,
} from "lucide-react";
import { signOut } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/cards", label: "Cards", icon: CreditCard },
  { to: "/transactions", label: "Activity", icon: Receipt },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { to: "/analytics", label: "Wealth", icon: BarChart3 },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/verification", label: "Verification", icon: ShieldCheck },
];

type Notification = {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { pathname } = useLocation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) {
      setNotifications(data || []);
    }
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      )
    );
  }

  async function markAllAsRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/dashboard" from="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-gold shadow-glow grid place-items-center">
              <ShieldCheck className="h-5 w-5 text-black" />
            </div>

            <div className="leading-tight">
              <div className="font-display font-semibold tracking-tight text-base">
                Atlas Capital <span className="text-gradient-gold">Bank</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Private Banking
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-secondary/60 rounded-full p-1 border border-border">
            {nav.map((n) => {
              const active = pathname.startsWith(n.to);

              return (
                <Link
                  key={n.to}
                  to={n.to}
                  from="/"
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full relative"
              onClick={() => {
                setDrawerOpen(true);
                loadNotifications();
              }}
            >
              <Bell className="h-4 w-4" />

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-destructive px-1 text-[10px] text-white grid place-items-center">
                  {unreadCount}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hidden sm:inline-flex"
              onClick={() => router.navigate({ to: "/settings" })}
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="rounded-full"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>

        <div className="md:hidden border-t border-border">
          <div className="mx-auto max-w-7xl px-2 flex items-center gap-1 overflow-x-auto">
            {nav.map((n) => {
              const active = pathname.startsWith(n.to);

              return (
                <Link
                  key={n.to}
                  to={n.to}
                  from="/"
                  className={`px-3 py-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                    active
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2009 Atlas Capital Bank</p>
          <p className="font-medium">Secure digital banking platform.</p>
        </div>
      </footer>

      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl p-5 flex flex-col">
            <div className="flex items-start justify-between border-b border-border pb-4 gap-4">
              <div className="flex-1">
                <h2 className="font-display text-xl font-semibold">
                  Notifications
                </h2>

                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread alert{unreadCount === 1 ? "" : "s"}
                </p>

                <div className="mt-3">
                  <Link
                    to="/notifications"
                    from="/"
                    onClick={() => setDrawerOpen(false)}
                  >
                    <Button className="w-full">
                      <MailOpen className="h-4 w-4 mr-2" />
                      Open Notification Center
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Read all
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrawerOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-3 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="rounded-xl border border-border p-6 text-center">
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Banking alerts will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      notification.is_read
                        ? "border-border bg-secondary/20"
                        : "border-gold/40 bg-gold/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">
                          {notification.title}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {notification.message}
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {notification.type}
                          </span>

                          <span className="text-[11px] text-muted-foreground">
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {!notification.is_read && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-gold shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}