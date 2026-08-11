import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type SessionState = {
  userId: string | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
};

const STAFF: AppRole[] = ["super_admin", "admin", "meeting_manager", "host", "moderator"];

/** Loads the signed-in user's profile and roles from the database. */
export function useSession(): SessionState & {
  isStaff: boolean;
  isAdmin: boolean;
  displayName: string;
} {
  const [state, setState] = useState<SessionState>({
    userId: null,
    profile: null,
    roles: [],
    loading: true,
  });

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (active) setState({ userId: null, profile: null, roles: [], loading: false });
        return;
      }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!active) return;
      setState({
        userId: user.id,
        profile: profile ?? null,
        roles: (roles ?? []).map((r) => r.role),
        loading: false,
      });
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const displayName = state.profile
    ? [state.profile.title, state.profile.first_name, state.profile.last_name]
        .filter(Boolean)
        .join(" ")
    : "Participant";

  return {
    ...state,
    isStaff: state.roles.some((role) => STAFF.includes(role)),
    isAdmin: state.roles.some((role) => role === "super_admin" || role === "admin"),
    displayName,
  };
}
