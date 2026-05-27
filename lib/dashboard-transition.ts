export const DASHBOARD_EXIT_EVENT = "dashboard:exit-transition";
export const DASHBOARD_EXIT_DURATION_MS = 420;
export const DASHBOARD_EXIT_NAV_DELAY_MS = 680;

export function triggerDashboardExitTransition() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_EXIT_EVENT));
}
