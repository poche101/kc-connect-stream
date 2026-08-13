import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save, UserCog } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/lib/app-error";
import { initialsOf } from "@/lib/format";

const TITLES = ["Brother", "Sister", "Pastor", "Deacon", "Deaconess"];

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Pantheon" },
      {
        name: "description",
        content:
          "Update your Pantheon profile: name, title, KC Handle, church and contact details.",
      },
      { property: "og:title", content: "Your profile — Pantheon" },
      { property: "og:description", content: "Update your Pantheon participant details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const session = useSession();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    firstName: "",
    lastName: "",
    phone: "",
    churchName: "",
    kcHandle: "",
  });

  useEffect(() => {
    const profile = session.profile;
    if (!profile) return;
    setForm({
      title: profile.title ?? "",
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      phone: profile.phone ?? "",
      churchName: profile.church_name ?? "",
      kcHandle: profile.kc_handle ?? "",
    });
  }, [session.profile]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !session.userId) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.kcHandle.trim()) {
      showError("First name, last name and KC Handle are required.", "Missing details");
      return;
    }
    setSaving(true);
    try {
      // Use .upsert instead of .update to guarantee record creation/modification
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: session.userId,
          title: form.title || null,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone: form.phone.trim() || null,
          church_name: form.churchName.trim() || null,
          kc_handle: form.kcHandle.trim(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Re-sync session state if your hook provides a refetch/refresh method
      if ("refetch" in session && typeof session.refetch === "function") {
        await session.refetch();
      } else if ("refresh" in session && typeof session.refresh === "function") {
        await session.refresh();
      }

      toast.success("Your profile has been updated.");
      navigate({ to: "/meeting" });
    } catch (error) {
      showError(error, "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  if (session.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const fullName = [form.title, form.firstName, form.lastName].filter(Boolean).join(" ");

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="mb-5">
          <Link to="/meeting">
            <ArrowLeft className="size-4" />
            Back to meeting
          </Link>
        </Button>

        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-panel">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 font-display text-lg font-semibold text-primary">
            {initialsOf(fullName || "Participant")}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold tracking-tight">
              {fullName || "Your profile"}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {session.profile?.church_email ?? "No email on file"}
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto gap-1.5">
            <UserCog className="size-3.5" />
            {session.roles[0] ?? "participant"}
          </Badge>
        </div>

        <div className="gradient-frame mt-6 animate-pop-in">
          <form
            onSubmit={save}
            className="grid gap-5 rounded-[calc(var(--radius-3xl)-1.5px)] bg-card p-7 sm:grid-cols-2"
          >
          <Field label="Title">
            <Select 
              value={TITLES.includes(form.title) ? form.title : ""} 
              onValueChange={(v) => set("title", v)}
            >
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

            <Field label="KC Handle" htmlFor="kcHandle">
              <BareInput
                id="kcHandle"
                value={form.kcHandle}
                onChange={(e) => set("kcHandle", e.target.value)}
              />
            </Field>

            <Field label="Church" htmlFor="churchName">
              <BareInput
                id="churchName"
                value={form.churchName}
                onChange={(e) => set("churchName", e.target.value)}
              />
            </Field>

            <Button
              type="submit"
              className="h-11 transition-transform hover:-translate-y-0.5 sm:col-span-2"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Save className="size-4" />
                  SAVE CHANGES
                </>
              )}
            </Button>
          </form>
        </div>
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