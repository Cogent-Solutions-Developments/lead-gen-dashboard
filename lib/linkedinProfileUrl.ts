export function getLinkedinProfileUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;

  const candidate = /^(?:www\.)?linkedin\.com\//i.test(raw) ? `https://${raw}` : raw;
  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      (hostname !== "linkedin.com" && !hostname.endsWith(".linkedin.com")) ||
      url.username ||
      url.password ||
      url.pathname === "/"
    ) {
      return null;
    }

    url.protocol = "https:";
    return url.href;
  } catch {
    return null;
  }
}
