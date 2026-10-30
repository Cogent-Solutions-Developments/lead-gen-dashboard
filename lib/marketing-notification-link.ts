/** Notification request links open a viewing context, never an editing context. */
export function marketingNotificationHref(href: string): string | null {
  if (href !== "/marketing" && !href.startsWith("/marketing?")) return null;
  const url = new URL(href, "https://internal.invalid");
  if (url.searchParams.get("request")) {
    url.searchParams.set("readOnly", "1");
    url.searchParams.delete("create");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
