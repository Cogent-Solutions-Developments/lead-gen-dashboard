/** Marketing responsibilities are additive; the account's primary role stays unchanged. */
export const MARKETING_ROLES: readonly string[] = [
  "marketing_user",
  "marketing_manager_user",
  "marketing_designer_user",
  "marketing_developer_user",
];
export const ROLE_PIPELINES: Record<string, string> = {
  sales_user: "sales",
  sales_manager_user: "sales",
  delegate_sales_user: "delegate_sales",
  delegate_sales_manager_user: "delegate_sales",
  delegate_user: "delegate",
  delegate_manager_user: "delegate",
  production_user: "production",
  production_manager_user: "production",
};
export function secondaryDepartmentsForRoles(
  roles: string[],
  existing: string[] = [],
  social = false,
) {
  if (roles[0] === "client_user") return [];
  const primaryPipeline = ROLE_PIPELINES[roles[0]];
  const departments = new Set<string>(existing.filter((value) => value === "autocall"));
  for (const role of roles.slice(1)) {
    if (MARKETING_ROLES.includes(role)) departments.add(role);
    const pipeline = ROLE_PIPELINES[role];
    if (pipeline && pipeline !== primaryPipeline) departments.add(pipeline);
  }
  if (social) departments.add("marketing_social");
  return [...departments];
}
export function incompatibleRoleSelection(roles: string[]) {
  return (
    roles
      .slice(1)
      .some(
        (role) =>
          !MARKETING_ROLES.includes(role) &&
          !(ROLE_PIPELINES[roles[0]] && ROLE_PIPELINES[role]),
      ) ||
    (roles[0] === "client_user" && roles.length > 1)
  );
}
