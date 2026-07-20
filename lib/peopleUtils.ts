export const ACTIVITY_IDLE_MS = 5 * 60_000;

export function formatEngagedDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 min";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${Math.max(1, minutes)} min`;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

export function shouldReportActive(input: {
  visible: boolean;
  focused: boolean;
  lastInteractionAt: number;
  now: number;
  idleMs?: number;
}) {
  return input.visible && input.focused && input.now - input.lastInteractionAt < (input.idleMs ?? ACTIVITY_IDLE_MS);
}

export function canMonitorUserActivity(role: string | null | undefined) {
  return role === "super_admin_user" || role === "ceo_user";
}

export function hasRecordedUserActivity(record: {
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
}) {
  return Boolean(record.firstSeenAt || record.lastSeenAt || record.lastActiveAt);
}

export function markOneNotificationRead<T extends { id: string; isRead: boolean }>(items: T[], id: string) {
  return items.map((item) => (item.id === id ? { ...item, isRead: true } : item));
}

export function markEveryNotificationRead<T extends { isRead: boolean }>(items: T[]) {
  return items.map((item) => ({ ...item, isRead: true }));
}
