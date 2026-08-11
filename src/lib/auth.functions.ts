import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your church email or KC Handle"),
  password: z.string().min(1, "Enter your password"),
});

/**
 * Signs a participant in with either their church email OR their KC Handle.
 * The handle is resolved to the registered email server-side, so handles never
 * expose email addresses to the browser without valid credentials.
 */
export const loginWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;

    let email = data.identifier.trim();

    if (!email.includes("@")) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("church_email")
        .ilike("kc_handle", email)
        .maybeSingle();
      if (!profile?.church_email) {
        return { ok: false as const, error: "Invalid credentials. Check your KC Handle and password." };
      }
      email = profile.church_email;
    }

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: session, error } = await client.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error || !session.session) {
      return { ok: false as const, error: "Invalid credentials. Please try again." };
    }

    return {
      ok: true as const,
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    };
  });

const handleSchema = z.object({ kcHandle: z.string().trim().min(3) });

/** Checks KC Handle availability during registration (case-insensitive). */
export const checkKcHandle = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => handleSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .ilike("kc_handle", data.kcHandle);
    return { available: (count ?? 0) === 0 };
  });
