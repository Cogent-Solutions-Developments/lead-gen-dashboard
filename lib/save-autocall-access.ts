type AccessUser = { id: string; departmentAssignments?: string[] };

// Always persist the administrator's intent, including false. A profile response
// from an older backend may omit permissions and cannot prove a revocation.
export async function saveAutocallAccess<T extends AccessUser>(
  userId: string,
  enabled: boolean,
  dependencies: {
    save: (userId: string, enabled: boolean) => Promise<{ enabled: boolean }>;
    read: (userId: string) => Promise<T>;
  },
): Promise<T> {
  const result = await dependencies.save(userId, enabled);
  if (result.enabled !== enabled) throw new Error("The server did not confirm the requested Autocall access.");
  const user = await dependencies.read(userId);
  if (user.id !== userId || !Array.isArray(user.departmentAssignments) || user.departmentAssignments.includes("autocall") !== enabled) {
    throw new Error("Autocall access could not be verified after saving. Refresh and try again.");
  }
  return user;
}
