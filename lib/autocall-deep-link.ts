export type AutocallNotificationTarget = Readonly<{
  siteId: string;
  threadId: string;
  visitorId: string;
}>;

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const TARGET_KEYS = ["siteId", "visitorId", "threadId"] as const;

function validTarget(values: Record<(typeof TARGET_KEYS)[number], unknown>): AutocallNotificationTarget {
  if (!TARGET_KEYS.every((key) => typeof values[key] === "string" && STABLE_ID.test(values[key]))) {
    throw new Error("This Autocall notification link is invalid.");
  }
  return values as AutocallNotificationTarget;
}

export function autocallTargetFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): AutocallNotificationTarget {
  return validTarget({
    siteId: metadata?.siteId,
    visitorId: metadata?.visitorId,
    threadId: metadata?.threadId,
  });
}

export function autocallTargetFromSearchParams(
  params: URLSearchParams
): AutocallNotificationTarget | null {
  const values = {
    siteId: params.get("siteId"),
    visitorId: params.get("visitorId"),
    threadId: params.get("threadId"),
  };
  if (TARGET_KEYS.every((key) => values[key] === null)) return null;
  return validTarget(values);
}

export function appendAutocallTarget(url: URL, target: AutocallNotificationTarget | null): URL {
  if (!target) return url;
  for (const key of TARGET_KEYS) url.searchParams.set(key, target[key]);
  return url;
}

export function autocallNotificationHref(metadata: Record<string, unknown>): string {
  const target = autocallTargetFromMetadata(metadata);
  const params = new URLSearchParams(target);
  return `/autocall?${params.toString()}`;
}
