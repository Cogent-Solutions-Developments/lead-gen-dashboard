export function canAccessAutocall(user: { role?: string; isActive?: boolean; departmentAssignments?: string[] } | null | undefined): boolean {
  return Boolean(user && user.isActive !== false && user.role !== "client_user" &&
    (user.role === "super_admin_user" || user.departmentAssignments?.includes("autocall")));
}

export function autocallBaseUrl(value: string, allowLocalHttp = false): URL {
  const message = "Autocall is not configured. Set AUTOCALL_PUBLIC_URL to the dashboard URL ending in /autocall-db.";
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error(message); }
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const allowedProtocol = url.protocol === "https:" || (allowLocalHttp && isLoopback && url.protocol === "http:");
  if (!allowedProtocol || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, "") !== "/autocall-db") {
    throw new Error(message);
  }
  return url;
}
