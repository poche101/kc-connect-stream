import kingschatLogo from "@/assets/kingschat-logo.png.asset.json";

/** Public brand mark for KingsChat, served from the project CDN. */
export const KINGSCHAT_LOGO_URL = kingschatLogo.url;

/**
 * KingsChat OAuth client id — a publishable value configured through the
 * VITE_KINGSCHAT_CLIENT_ID setting (see .env). The fallback keeps the button
 * working if the setting is ever missing at build time.
 */
const FALLBACK_CLIENT_ID = "vfO1QTdSNMJxvyKaoW5kJp/7vts2JSuyI7g0PRyeKQY=";

export const KINGSCHAT_CLIENT_ID: string =
  ((import.meta.env["VITE_KINGSCHAT_CLIENT_ID"] as string | undefined) ?? "").trim() ||
  FALLBACK_CLIENT_ID;

export const KINGSCHAT_ACCOUNTS_URL = "https://accounts.kingsch.at";
export const KINGSCHAT_REDIRECT_PATH = "/auth/kingschat";

export function isKingsChatConfigured() {
  return KINGSCHAT_CLIENT_ID.length > 0;
}

/** Builds the KingsChat authorization URL for the current origin. */
export function buildKingsChatAuthUrl(redirectPath = KINGSCHAT_REDIRECT_PATH) {
  const redirectUri = `${window.location.origin}${redirectPath}`;
  const params = new URLSearchParams({
    client_id: KINGSCHAT_CLIENT_ID,
    scopes: JSON.stringify(["profile"]),
    redirect_uri: redirectUri,
    post_redirect: "true",
  });
  return `${KINGSCHAT_ACCOUNTS_URL}/?${params.toString()}`;
}

/**
 * KingsChat hands the access token back either in the query string or in the
 * URL fragment, and the key name differs between flows — read every variant.
 */
export function readKingsChatToken(url: string): { token: string | null; error: string | null } {
  const parsed = new URL(url);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const pick = (key: string) => parsed.searchParams.get(key) ?? fragment.get(key);

  const error =
    pick("error_description") ?? pick("error") ?? pick("errorMessage") ?? null;
  const token =
    pick("access_token") ?? pick("accessToken") ?? pick("token") ?? pick("code") ?? null;

  return { token, error: token ? null : error ?? null };
}
