import { useEffect } from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { reportLovableError } from "@/lib/../lib/lovable-error-reporting";

/**
 * Global, centered error fallback. Rendered whenever an uncaught error reaches
 * a route boundary, with a retry action.
 */
export function ErrorFallback({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  useEffect(() => {
    reportLovableError(error, { boundary: "pantheon_error_fallback" });
  }, [error]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-elevated">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertOctagon className="size-7 text-destructive" />
        </div>
        <h1 className="mt-5 font-display text-xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {error.message || "An unexpected error stopped this page from loading."}
        </p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onRetry} className="sm:min-w-36">
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button variant="outline" asChild className="sm:min-w-36">
            <a href="/">
              <Home className="size-4" />
              Go home
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
