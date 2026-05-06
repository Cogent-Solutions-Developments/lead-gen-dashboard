const NGROK_SKIP_BROWSER_WARNING_HEADER = "ngrok-skip-browser-warning";

function isLocalDevNgrokApi() {
  if (process.env.NODE_ENV !== "development") return false;

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
