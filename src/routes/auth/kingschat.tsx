import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { signInWithKingsChat } from "@/lib/kingschat.functions";
import { readKingsChatToken } from "@/lib/kingschat";
import { showError } from "@/lib/app-error";

export const Route = createFileRoute("/auth/kingschat")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finishing KingsChat sign in — Pantheon" },
      {
        name: "description",
        content: "Completing your KingsChat sign in and taking you into the live Pantheon meeting.",
      },
      { property: "og:title", content: "Finishing KingsChat sign in — Pantheon" },
      { property: "og:description", content: "Completing your KingsChat sign in to Pantheon." },
    ],
  }),
  component: KingsChatCallback,
});

function KingsChatCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function complete() {
      const { token, error } = readKingsChatToken(window.location.href);
      if (!token) {
        if (active) setFailed(error ?? "KingsChat did not return a sign-in token.");
        return;
      }

      try {
        const result = await signInWithKingsChat({ data: { accessToken: token } });

        if (!result || !result.ok) {
          // Extract user-friendly message without triggering TypeScript 'never' narrowing
          const rawError = result?.error;
          let errorMessage = "KingsChat authentication failed. Please try again.";

          if (typeof rawError === "string") {
            errorMessage = rawError;
          } else if (rawError && typeof rawError === "object" && "message" in rawError) {
            errorMessage = String((rawError as { message: unknown }).message);
          }

          if (active) setFailed(errorMessage);
          return;
        }

        if (!result.access_token || !result.refresh_token) {
          if (active) setFailed("Invalid session response received from authentication service.");
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });

        if (sessionError) throw sessionError;

        if (active) {
          navigate({ to: "/meeting", replace: true });
        }
      } catch (cause) {
        showError(cause, "KingsChat sign in failed");
        if (active) {
          setFailed("We could not complete your KingsChat sign in.");
        }
      }
    }

    void complete();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm">
        <img src="/pwa-icon-192.png" alt="" className="mx-auto size-14 rounded-2xl" />
        {failed ? (
          <>
            <h1 className="mt-5 font-display text-xl font-semibold tracking-tight">
              KingsChat sign in failed
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{failed}</p>
            <Button className="mt-6 w-full" onClick={() => navigate({ to: "/", replace: true })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mt-6 size-6 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Finishing your KingsChat sign in…
            </p>
          </>
        )}
      </div>
    </main>
  );
}