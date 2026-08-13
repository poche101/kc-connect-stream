import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { PasswordField } from "@/components/PasswordField";
import { supabase } from "@/integrations/supabase/client";
import { checkKcHandle } from "@/lib/auth.functions";
import { showError } from "@/lib/app-error";
import { toast } from "sonner";

const TITLES = ["Brother", "Sister", "Pastor", "Deacon", "Deaconess"];

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — Pantheon" },
      {
        name: "description",
        content:
          "Register for Pantheon with your church details and unique KC Handle to join live organizational meetings.",
      },
      { property: "og:title", content: "Create your account — Pantheon" },
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
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    firstName: "",
    lastName: "",
    phone: "",
    churchName: "",
    churchEmail: "",
    kcHandle: "",
    password: "",
    confirmPassword: "",
  });

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
      ["Church", form.churchName],
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
            church_name: form.churchName.trim(),
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
    <main className="min-h-screen bg-background px-5 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <img src="/pwa-icon-192.png" alt="" className="size-14 rounded-2xl" />
          <span className="mt-3 font-display text-sm font-semibold tracking-[0.28em] text-muted-foreground">
            PANTHEON
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every participant has an organizational identity. All fields are required.
          </p>
        </div>

        <div className="gradient-frame mt-9 animate-pop-in">
          <form
            onSubmit={handleSubmit}
            className="grid gap-5 rounded-[calc(var(--radius-3xl)-1.5px)] bg-card p-7 sm:grid-cols-2"
          >
            <Field label="Title">
              <Select value={form.title} onValueChange={(v) => set("title", v)}>
                <SelectTrigger className="border-0 bg-transparent p-0 shadow-none focus:ring-0">
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
            </Field>

            <Field label="Phone number" htmlFor="phone">
              <BareInput
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+234 800 000 0000"
              />
            </Field>

            <Field label="First name" htmlFor="firstName">
              <BareInput
                id="firstName"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </Field>

            <Field label="Last name" htmlFor="lastName">
              <BareInput
                id="lastName"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Church" htmlFor="churchName">
                <BareInput
                  id="churchName"
                  value={form.churchName}
                  onChange={(e) => set("churchName", e.target.value)}
                  placeholder="Church name"
                />
              </Field>
            </div>

            <Field label="Email" htmlFor="churchEmail">
              <BareInput
                id="churchEmail"
                type="email"
                autoComplete="email"
                value={form.churchEmail}
                onChange={(e) => set("churchEmail", e.target.value)}
                placeholder="user@church.org"
              />
            </Field>

            <Field label="KC Handle" htmlFor="kcHandle">
              <BareInput
                id="kcHandle"
                value={form.kcHandle}
                onChange={(e) => set("kcHandle", e.target.value.toUpperCase())}
                placeholder="KC123456"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <PasswordField
                id="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
            </Field>

            <Field label="Confirm password" htmlFor="confirmPassword">
              <PasswordField
                id="confirmPassword"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
            </Field>

            <Button
              type="submit"
              className="h-11 transition-transform hover:-translate-y-0.5 sm:col-span-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "CREATE ACCOUNT"}
            </Button>
          </form>
        </div>

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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field-ring field-ring-focus space-y-1.5 rounded-xl border border-border bg-background p-3">
      <Label htmlFor={htmlFor} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function BareInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
    />
  );
}
