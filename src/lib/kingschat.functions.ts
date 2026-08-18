import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.object({ accessToken: z.string().trim().min(10).max(4096) });

const PROFILE_ENDPOINTS = [
  "https://connect.kingsch.at/developer/api/profile",
  "https://connect.kingsch.at/api/profile",
];

type KcProfile = {
  username: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
};

/** Reads the KingsChat profile that owns the given access token. */
async function fetchKingsChatProfile(accessToken: string): Promise<KcProfile | null> {
  for (const endpoint of PROFILE_ENDPOINTS) {
    let payload: unknown;
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      if (!response.ok) continue;
      payload = await response.json();
    } catch {
      continue;
    }

    const root = payload as Record<string, any> | null;
    const user = root?.["profile"]?.["user"] ?? root?.["user"] ?? root;
    const username: string | undefined = user?.["username"] ?? user?.["user_name"];
    if (!username) continue;

    const name =
      user?.["name"] ??
      [user?.["first_name"], user?.["last_name"]].filter(Boolean).join(" ") ??
      null;

    return {
      username: String(username),
      name: name ? String(name) : null,
      email: user?.["email"] ? String(user["email"]) : null,
      phone: user?.["phone_number"] ? String(user["phone_number"]) : null,
      avatar: user?.["avatar_profile_picture"] ? String(user["avatar_profile_picture"]) : null,
    };
  }
  return null;
}

/** Deterministic, server-only password for KingsChat-backed accounts. */
async function derivedPassword(username: string) {
  const { createHmac } = await import("node:crypto");
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "pantheon-kingschat";
  return `kc_${createHmac("sha256", secret).update(username.toLowerCase()).digest("base64url").slice(0, 40)}!A9`;
}

/**
 * Signs a participant in with KingsChat: verifies the KingsChat access token,
 * creates the matching Pantheon account on first use, then returns a Supabase
 * session for the browser to adopt.
 */
export const signInWithKingsChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const profile = await fetchKingsChatProfile(data.accessToken);
    if (!profile) {
      return {
        ok: false as const,
        error: "KingsChat did not confirm your identity. Please try signing in again.",
      };
    }

    const username = profile.username.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!username) {
      return { ok: false as const, error: "Your KingsChat username is not usable for sign in." };
    }

    const email = `${username}@kingschat.pantheon.app`;
    const password = await derivedPassword(username);
    const [firstName, ...rest] = (profile.name ?? profile.username).trim().split(/\s+/);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Updated table query from 'profiles' to 'users'
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("church_email", email)
      .maybeSingle();

    if (existing?.id) {
      // Re-align the derived password in case the secret rotated.
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
    } else {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          title: "Brother",
          first_name: firstName || profile.username,
          last_name: rest.join(" ") || "",
          phone: profile.phone ?? "",
          church_name: "KingsChat",
          kc_handle: profile.username,
          photo_url: profile.avatar ?? "",
        },
      });
      if (createError && !/already/i.test(createError.message)) {
        return { ok: false as const, error: "Could not create your Pantheon account." };
      }
    }

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
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

    const { data: session, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !session.session) {
      return { ok: false as const, error: "KingsChat sign in could not be completed." };
    }

    return {
      ok: true as const,
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    };
  });