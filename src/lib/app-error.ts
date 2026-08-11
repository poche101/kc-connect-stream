/**
 * Central error channel. Every user-facing error in the app is routed through
 * here so it is always presented in one place: a centered overlay on screen.
 */
export type AppErrorPayload = {
  title?: string;
  message: string;
};

const EVENT = "kc:app-error";

export function showError(message: unknown, title = "Something went wrong") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AppErrorPayload>(EVENT, {
      detail: { title, message: toMessage(message) },
    }),
  );
}

export function subscribeToErrors(handler: (payload: AppErrorPayload) => void) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<AppErrorPayload>).detail);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function toMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybe = error as { message?: unknown; error_description?: unknown };
    if (typeof maybe.error_description === "string") return maybe.error_description;
    if (typeof maybe.message === "string") return maybe.message;
  }
  return "An unexpected error occurred. Please try again.";
}
