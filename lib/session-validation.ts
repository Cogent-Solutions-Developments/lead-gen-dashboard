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
