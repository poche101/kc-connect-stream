import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { subscribeToErrors, toMessage, type AppErrorPayload } from "@/lib/app-error";
import { Button } from "@/components/ui/button";

/**
 * Global centered error surface. All app errors (thrown, network, auth,
 * validation) render here — dead center of the screen, above everything.
 */
export function ErrorCenter() {
  const [error, setError] = useState<AppErrorPayload | null>(null);

  useEffect(() => subscribeToErrors(setError), []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (event.message) setError({ title: "Something went wrong", message: event.message });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      setError({ title: "Something went wrong", message: toMessage(event.reason) });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setError(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [error]);

  if (!error) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={error.title ?? "Error"}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setError(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-elevated animate-in zoom-in-95 duration-150"
      >
        <button
          type="button"
          aria-label="Dismiss error"
          onClick={() => setError(null)}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">{error.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{error.message}</p>
        <Button className="mt-6 w-full" onClick={() => setError(null)}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
