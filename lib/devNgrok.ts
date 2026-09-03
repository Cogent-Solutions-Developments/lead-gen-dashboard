const NGROK_SKIP_BROWSER_WARNING_HEADER = "ngrok-skip-browser-warning";

function isLocalDevNgrokApi() {
  // Built previews can use the same development tunnel as the dev server.
  // Scope the header to ngrok hosts, not to the frontend's build mode.
  const rawBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!rawBaseUrl) return false;

  try {
    const hostname = new URL(rawBaseUrl).hostname.toLowerCase();
    return hostname.endsWith(".ngrok-free.app") || hostname.endsWith(".ngrok.app");
  } catch {
    return false;
  }
}

export function getLocalDevNgrokHeaders(): Record<string, string> {
  if (!isLocalDevNgrokApi()) return {};
  return { [NGROK_SKIP_BROWSER_WARNING_HEADER]: "true" };
}
