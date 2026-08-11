import kingschatLogo from "@/assets/kingschat-logo.png.asset.json";

/** Public brand mark for KingsChat, served from the project CDN. */
export const KINGSCHAT_LOGO_URL = kingschatLogo.url;

/**
 * KingsChat OAuth client id. This is a publishable value: register your app at
 * developer.kingsch.at, then expose the id as VITE_KINGSCHAT_CLIENT_ID.
 */
export const KINGSCHAT_CLIENT_ID: string =
  (import.meta.env["VITE_KINGSCHAT_CLIENT_ID"] as string | undefined) ?? "";

export const KINGSCHAT_ACCOUNTS_URL = "https://accounts.kingsch.at";

export function isKingsChatConfigured() {
  return KINGSCHAT_CLIENT_ID.length > 0;
}

/** Builds the KingsChat authorization URL for the current origin. */
export function buildKingsChatAuthUrl(redirectPath = "/auth/kingschat") {
  const redirectUri = `${window.location.origin}${redirectPath}`;
  const params = new URLSearchParams({
    client_id: KINGSCHAT_CLIENT_ID,
    scopes: JSON.stringify(["profile"]),
    redirect_uri: redirectUri,
    post_redirect: "true",
  });
  return `${KINGSCHAT_ACCOUNTS_URL}/?${params.toString()}`;
}
