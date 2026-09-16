export type AutocallNotificationTarget = Readonly<{
  siteId: string;
  threadId: string;
  visitorId: string;
}>;

export type AutocallCallTarget = Readonly<{ callId: string }>;
export type AutocallTarget = AutocallNotificationTarget | AutocallCallTarget;

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
): AutocallTarget | null {
  const callId = params.get("callId");
  if (callId !== null) {
    if (!STABLE_ID.test(callId)) throw new Error("This Autocall call link is invalid.");
    return { callId };
  }
  const values = {
    siteId: params.get("siteId"),
    visitorId: params.get("visitorId"),
    threadId: params.get("threadId"),
  };
  if (TARGET_KEYS.every((key) => values[key] === null)) return null;
  return validTarget(values);
}

export function appendAutocallTarget(url: URL, target: AutocallTarget | null): URL {
  if (!target) return url;
  if ("callId" in target) {
    url.searchParams.set("callId", target.callId);
    return url;
  }
  for (const key of TARGET_KEYS) url.searchParams.set(key, target[key]);
  return url;
}

export function autocallNotificationHref(metadata: Record<string, unknown>): string {
  const target = autocallTargetFromMetadata(metadata);
  const params = new URLSearchParams(target);
  return `/autocall?${params.toString()}`;
}

export function autocallIncomingCallHref(metadata: Record<string, unknown>): string {
  const callId = metadata.callId;
  if (typeof callId !== "string" || !STABLE_ID.test(callId)) {
    throw new Error("This Autocall call link is invalid.");
  }
  return `/autocall?${new URLSearchParams({ callId }).toString()}`;
}
