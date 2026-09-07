export function canAccessAutocall(user: { role?: string; isActive?: boolean; departmentAssignments?: string[] } | null | undefined): boolean {
  return Boolean(user && user.isActive !== false && user.role !== "client_user" &&
    (user.role === "super_admin_user" || user.departmentAssignments?.includes("autocall")));
}

export function autocallBaseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, "") !== "/autocall-db") {
    throw new Error("Autocall is not configured. Contact your administrator.");
  }
  return url;
}
