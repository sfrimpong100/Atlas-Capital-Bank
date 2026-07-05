import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowLeftRight,
  Landmark,
  Bell,
  Shield,
  BarChart3,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminSignOut } from "@/lib/admin-auth";
import { FileCheck2 } from "lucide-react";

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/cards", label: "Cards", icon: CreditCard },
  { to: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/admin/beneficiaries", label: "Beneficiaries", icon: Landmark },
  { to: "/admin/notifications", label: "Alerts", icon: Bell },
  { to: "/admin/security", label: "Security", icon: Shield },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/kyc", label: "KYC", icon: FileCheck2 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  function signOutAdmin() {
    adminSignOut();
    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:flex border-r border-border bg-card/50 p-5 flex-col">
        <div className="mb-8">
          <h1 className="font-display text-xl font-semibold">
            Atlas Admin
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Operations Control Center
          </p>
        </div>

        <nav className="space-y-1 flex-1">
          {adminNav.map((item) => {
            const active =
              item.to === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                from="/"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Button variant="outline" onClick={signOutAdmin}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </aside>

      <main className="min-w-0">
        <div className="lg:hidden border-b border-border p-4">
          <h1 className="font-display text-lg font-semibold">
            Atlas Admin
          </h1>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}