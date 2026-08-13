import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Radio, ShieldCheck, Gauge, Lock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loginWithIdentifier } from "@/lib/auth.functions";
import { showError } from "@/lib/app-error";
import { PasswordField } from "@/components/PasswordField";
import kingsChatLogo from '@/assets/kingschat-logo.png';
import {
  KINGSCHAT_LOGO_URL,
  buildKingsChatAuthUrl,
  isKingsChatConfigured,
} from "@/lib/kingschat";

const REMEMBER_KEY = "pantheon:last-identifier";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Pantheon" },
      {
        name: "description",
        content:
          "Sign in to Pantheon with your password or continue with KingsChat and go straight into the live meeting.",
      },
      { property: "og:title", content: "Sign in — Pantheon" },
      {
        property: "og:description",
        content: "Sign in to Pantheon and join the live meeting in seconds.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [remembered, setRemembered] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setRemembered(saved);
      setIdentifier(saved);
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/meeting", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!identifier.trim() || !password) {
      showError("Enter your email and password to continue.", "Missing details");
      return;
    }
    setLoading(true);
    try {
      const result = await loginWithIdentifier({ data: { identifier, password } });
      if (!result.ok) {
        showError(result.error, "Sign in failed");
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (error) throw error;
      window.localStorage.setItem(REMEMBER_KEY, identifier.trim());
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from("profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", userData.user.id);
      }
      navigate({ to: "/meeting", replace: true });
    } catch (error) {
      showError(error, "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  function handleKingsChat() {
    if (!isKingsChatConfigured()) {
      showError(
        "KingsChat sign-in is not configured yet. Add your KingsChat client ID as VITE_KINGSCHAT_CLIENT_ID.",
        "KingsChat client ID required",
      );
      return;
    }
    window.location.href = buildKingsChatAuthUrl();
  }

  function useAnotherAccount() {
    window.localStorage.removeItem(REMEMBER_KEY);
    setRemembered(null);
    setIdentifier("");
    setPassword("");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-stage p-12 text-stage-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-[24rem] rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <img src="/pwa-icon-192.png" alt="" className="size-11 rounded-xl" />
          <span className="font-display text-lg font-semibold tracking-[0.28em]">PANTHEON</span>
        </div>
        <div className="relative max-w-lg animate-rise-in">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            One account. One login.{" "}
            <span className="text-brand-gradient">One click into the meeting.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stage-foreground/70">
            A secure organizational meeting platform where every participant is identified,
            attendance is automatic, and joining a live broadcast takes seconds.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: Radio, text: "Live host broadcast with adaptive quality and PiP" },
              { icon: Gauge, text: "Low-data mode down to 240p on mobile networks" },
              { icon: ShieldCheck, text: "Automatic attendance and presence monitoring" },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-stage-muted">
                  <item.icon className="size-4 text-primary" />
                </span>
                <span className="text-stage-foreground/85">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-stage-foreground/45">
          Reliability → Simplicity → Low data → Security → Scale
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm animate-pop-in">
          <div className="flex flex-col items-center text-center lg:hidden">
            <img src="/pwa-icon-192.png" alt="" className="size-14 rounded-2xl" />
            <span className="mt-3 font-display text-base font-semibold tracking-[0.28em]">
              PANTHEON
            </span>
          </div>

          <div className="gradient-frame mt-8 lg:mt-0">
            <div className="rounded-[calc(var(--radius-3xl)-1.5px)] bg-card p-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight">Sign in</h2>

              {remembered ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-3 py-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-xs font-semibold text-primary">
                    {remembered.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{remembered}</span>
                  <button
                    type="button"
                    onClick={useAnotherAccount}
                    className="text-xs font-medium text-primary transition-colors hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Use your church email or KC Handle.
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="field-ring field-ring-focus space-y-2 rounded-xl border border-border bg-background p-3">
                  <Label htmlFor="identifier" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Church Email / KC Handle
                  </Label>
                  <Input
                    id="identifier"
                    autoComplete="username"
                    placeholder="user@church.org or KC123456"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="field-ring field-ring-focus space-y-2 rounded-xl border border-border bg-background p-3">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wide text-muted-foreground">
                    Password
                  </Label>
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 shrink-0 text-muted-foreground" />
                    <PasswordField
                      id="password"
                      autoComplete="current-password"
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>


                <Button
                  type="submit"
                  className="group h-11 w-full transition-transform hover:-translate-y-0.5"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      LOGIN
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2.5 transition-transform hover:-translate-y-0.5"
                onClick={handleKingsChat}
              >
               <img
  src={kingsChatLogo}
  alt="KingsChat"
  className="size-15 shrink-0 rounded-lg object-contain"
/>
                Continue with KingsChat
              </Button>

              <div className="mt-6 flex items-center justify-between text-sm">
                <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
                  Forgot password?
                </Link>
                <Link to="/register" className="font-medium text-primary hover:underline">
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
