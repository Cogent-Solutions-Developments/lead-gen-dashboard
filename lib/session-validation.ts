export type SessionValidationResult = "valid" | "invalid" | "unavailable" | "superseded";

export async function validateSessionOnReload(dependencies: {
  refresh: () => Promise<unknown>;
  isCurrent: () => boolean;
  invalidate: () => void;
}): Promise<SessionValidationResult> {
  try {
    await dependencies.refresh();
    return dependencies.isCurrent() ? "valid" : "superseded";
  } catch (error: unknown) {
    if (!dependencies.isCurrent()) return "superseded";
    // Only a definitive authentication rejection invalidates a stored login.
    // Network errors, rate limits, forbidden resources, and server errors do not.
    if (error && typeof error === "object" && "status" in error && error.status === 401) {
      dependencies.invalidate();
      return "invalid";
    }
    return "unavailable";
  }
}

// Recheck open tabs as well as initial page loads. Never overlap requests.
export function watchSessionValidation(
  check: () => Promise<void>,
  host = window,
  visibility = document,
): () => void {
  let stopped = false;
  let pending = false;
  const refresh = async () => {
    if (stopped || pending) return;
    pending = true;
    try { await check(); } catch { /* The caller owns error handling; keep retrying. */ }
    finally { pending = false; }
  };
  const onVisible = () => { if (visibility.visibilityState === "visible") void refresh(); };
  const onFocus = () => { void refresh(); };
  const timer = host.setInterval(onFocus, 15_000);
  host.addEventListener("focus", onFocus);
  host.addEventListener("online", onFocus);
  visibility.addEventListener("visibilitychange", onVisible);
  void refresh();
  return () => {
    stopped = true;
    host.clearInterval(timer);
    host.removeEventListener("focus", onFocus);
    host.removeEventListener("online", onFocus);
    visibility.removeEventListener("visibilitychange", onVisible);
  };
}
