type DealBellUser = {
  role: string;
  departmentAssignments?: readonly string[];
};

const SALES_ROLES = new Set([
  "sales_user", "sales_manager_user",
  "delegate_sales_user", "delegate_sales_manager_user",
]);
const ASSIGNABLE_ROLES = new Set([
  ...SALES_ROLES, "delegate_user", "delegate_manager_user",
  "production_user", "production_manager_user",
]);

// Call with the backend-verified identity, never request-body permissions.
export function canRingDealBell(user: DealBellUser): boolean {
  return SALES_ROLES.has(user.role) || (
    ASSIGNABLE_ROLES.has(user.role) &&
    Boolean(user.departmentAssignments?.some(
      (department) => department === "sales" || department === "delegate_sales",
    ))
  );
}
