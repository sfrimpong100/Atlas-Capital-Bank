import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Lock,
  Fingerprint,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { signIn, isAuthed } from "@/lib/auth-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas Capital Bank — Secure Sign In" },
      {
        name: "description",
        content:
          "Secure digital banking access for Atlas Capital Bank customers.",
      },
      { property: "og:title", content: "Atlas Capital Bank" },
      {
        property: "og:description",
        content: "Secure private banking access.",
      },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const loggedIn = await isAuthed();

        if (loggedIn) {
          router.navigate({ to: "/dashboard" });
        }
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();
  }, [router]);

const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const ok = await signIn(email.trim(), password);

    if (ok) {
      router.navigate({ to: "/dashboard" });
    }
  } catch (error) {
    alert(error instanceof Error ? error.message : "Login failed");
  } finally {
    setLoading(false);
  }
};

  if (checkingSession) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            Checking secure session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-gradient-hero text-white overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-gold grid place-items-center shadow-glow">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>

          <div>
            <div className="font-display text-xl font-semibold tracking-tight">
              Atlas Capital Bank
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">
              Private Banking
            </div>
          </div>
        </div>

        <div className="relative max-w-md animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Secure client access
          </div>

          <h1 className="mt-6 font-display text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.05]">
            Private banking built for{" "}
            <span className="shimmer-text">trusted access.</span>
          </h1>

          <p className="mt-5 text-white/70 text-lg leading-relaxed">
            Sign in to manage your assigned account, view balances, and perform
            authorized transfers through Atlas Capital Bank.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
            {[
              { k: "Secure", v: "Account access" },
              { k: "Private", v: "Client dashboard" },
              { k: "24/7", v: "Online banking" },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-xl bg-white/5 border border-white/10 p-4 backdrop-blur"
              >
                <div className="font-display text-lg font-semibold">
                  {s.k}
                </div>
                <div className="text-xs text-white/60 mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-white/60 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Authorized access only. Account activities are monitored.
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex-1 flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-md animate-fade-in">
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <div className="h-10 w-10 rounded-xl bg-gradient-gold grid place-items-center shadow-glow">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>

              <div>
                <div className="font-display font-semibold">
                  Atlas Capital Bank
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Private Banking
                </div>
              </div>
            </div>

            <h2 className="font-display text-3xl font-semibold tracking-tight">
              Welcome back
            </h2>

            <p className="mt-2 text-muted-foreground text-sm">
              Sign in with the email and password issued by the administrator.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-accent hover:underline"
                  >
                    Forgot?
                  </button>
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password"
                  >
                    {showPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg font-semibold bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign in securely <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>

              <button
                type="button"
                className="w-full h-11 rounded-lg border border-border bg-secondary/40 hover:bg-secondary transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Fingerprint className="h-4 w-4 text-accent" />
                Use biometric login
              </button>
            </form>

            <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Secure authentication powered by Atlas Capital Bank.
            </div>

            <p className="mt-10 text-[11px] text-muted-foreground leading-relaxed text-center">
              Unauthorized access is prohibited. Use only credentials issued by
              the account administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}