import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/lib/app-error";
import { KINGSCHAT_LOGO_URL } from "@/lib/kingschat";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — KC Meeting" },
      {
        name: "description",
        content: "Request a password reset link for your KC Meeting account.",
      },
      { property: "og:title", content: "Reset your password — KC Meeting" },
      { property: "og:description", content: "Request a KC Meeting password reset link." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      showError("Enter the church email on your account.", "Email required");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      showError(error, "Could not send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <img src={KINGSCHAT_LOGO_URL} alt="" className="mx-auto size-14 rounded-2xl" />
        {sent ? (
          <>
            <MailCheck className="mx-auto mt-6 size-8 text-success" />
            <h1 className="mt-4 font-display text-xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a password reset link to {email}.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-xl font-semibold tracking-tight">
              Forgot your password?
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your church email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="mt-7 space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="email">Church email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@church.org"
                />
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "SEND RESET LINK"}
              </Button>
            </form>
          </>
        )}
        <Link to="/" className="mt-7 inline-block text-sm text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
