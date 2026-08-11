import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { checkKcHandle } from "@/lib/auth.functions";
import { showError } from "@/lib/app-error";
import { KINGSCHAT_LOGO_URL } from "@/lib/kingschat";
import { toast } from "sonner";

const TITLES = ["Pastor", "Deacon", "Deaconess", "Brother", "Sister", "Evangelist", "Mr", "Mrs", "Dr"];

type Church = { id: string; name: string; branch: string | null };

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — KC Meeting" },
      {
        name: "description",
        content:
          "Register for KC Meeting with your church details and unique KC Handle to join live organizational meetings.",
      },
      { property: "og:title", content: "Create your account — KC Meeting" },
      {
        property: "og:description",
        content: "Register with your church details and KC Handle to join live meetings.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    firstName: "",
    lastName: "",
    phone: "",
    churchId: "",
    churchEmail: "",
    kcHandle: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    void supabase
      .from("churches")
      .select("id, name, branch")
      .eq("status", "active")
      .order("name")
      .then(({ data, error }) => {
        if (error) showError(error, "Could not load churches");
        else setChurches(data ?? []);
      });
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    const required: [string, string][] = [
      ["Title", form.title],
      ["First name", form.firstName],
      ["Last name", form.lastName],
      ["Phone number", form.phone],
      ["Church", form.churchId],
      ["Church email", form.churchEmail],
      ["KC Handle", form.kcHandle],
      ["Password", form.password],
    ];
    const missing = required.find(([, value]) => !value.trim());
    if (missing) {
      showError(`${missing[0]} is required.`, "Missing information");
      return;
    }
    if (form.password !== form.confirmPassword) {
      showError("The passwords you entered do not match.", "Password mismatch");
      return;
    }
    if (form.password.length < 8) {
      showError("Your password must be at least 8 characters long.", "Weak password");
      return;
    }

    setLoading(true);
    try {
      const { available } = await checkKcHandle({ data: { kcHandle: form.kcHandle.trim() } });
      if (!available) {
        showError("That KC Handle is already taken. Please choose another.", "KC Handle unavailable");
        return;
      }

      const church = churches.find((c) => c.id === form.churchId);
      const { error } = await supabase.auth.signUp({
        email: form.churchEmail.trim(),
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            title: form.title,
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            phone: form.phone.trim(),
            church_id: form.churchId,
            church_name: church ? [church.name, church.branch].filter(Boolean).join(" — ") : "",
            kc_handle: form.kcHandle.trim(),
          },
        },
      });
      if (error) throw error;

      toast.success("Account created. Taking you to your meeting…");
      navigate({ to: "/meeting", replace: true });
    } catch (error) {
      showError(error, "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <img src={KINGSCHAT_LOGO_URL} alt="" className="size-14 rounded-2xl" />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Create your KC Meeting account
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every participant has an organizational identity. All fields are required.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-9 grid gap-5 rounded-2xl border border-border bg-card p-7 shadow-panel sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label>Title</Label>
            <Select value={form.title} onValueChange={(v) => set("title", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select title" />
              </SelectTrigger>
              <SelectContent>
                {TITLES.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+234 800 000 0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Church</Label>
            <Select value={form.churchId} onValueChange={(v) => set("churchId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your church / branch" />
              </SelectTrigger>
              <SelectContent>
                {churches.map((church) => (
                  <SelectItem key={church.id} value={church.id}>
                    {[church.name, church.branch].filter(Boolean).join(" — ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="churchEmail">Church email</Label>
            <Input
              id="churchEmail"
              type="email"
              autoComplete="email"
              value={form.churchEmail}
              onChange={(e) => set("churchEmail", e.target.value)}
              placeholder="user@church.org"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kcHandle">KC Handle</Label>
            <Input
              id="kcHandle"
              value={form.kcHandle}
              onChange={(e) => set("kcHandle", e.target.value.toUpperCase())}
              placeholder="KC123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
            />
          </div>

          <Button type="submit" className="h-11 sm:col-span-2" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "CREATE ACCOUNT"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
