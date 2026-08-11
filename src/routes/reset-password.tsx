import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/lib/app-error";
import { KINGSCHAT_LOGO_URL } from "@/lib/kingschat";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — KC Meeting" },
      { name: "description", content: "Choose a new password for your KC Meeting account." },
      { property: "og:title", content: "Set a new password — KC Meeting" },
      { property: "og:description", content: "Choose a new KC Meeting password." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      showError("Your password must be at least 8 characters long.", "Weak password");
      return;
    }
    if (password !== confirm) {
      showError("The passwords you entered do not match.", "Password mismatch");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      navigate({ to: "/meeting", replace: true });
    } catch (error) {
      showError(error, "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <img src={KINGSCHAT_LOGO_URL} alt="" className="mx-auto size-14 rounded-2xl" />
        <h1 className="mt-5 text-center font-display text-xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "UPDATE PASSWORD"}
          </Button>
        </form>
      </div>
    </main>
  );
}
