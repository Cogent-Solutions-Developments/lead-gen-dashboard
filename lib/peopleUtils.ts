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
  return (
    role === "super_admin_user" ||
    role === "ceo_user" ||
    role === "sales_manager_user" ||
    role === "delegate_manager_user" ||
    role === "production_manager_user"
  );
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

export function localCalendarDateKey(value: Date = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function notificationCalendarDate(notification: {
  type?: string | null;
  occurrenceDate?: string | null;
  createdAt?: string | null;
}) {
  if (
    (notification.type === "birthday_wish" || notification.type === "member_birthday") &&
    /^\d{4}-\d{2}-\d{2}$/.test(notification.occurrenceDate || "")
  ) {
    return notification.occurrenceDate as string;
  }

  if (!notification.createdAt) return "";
  const createdAt = new Date(notification.createdAt);
  return Number.isNaN(createdAt.getTime()) ? "" : localCalendarDateKey(createdAt);
}

export function notificationsForCalendarDate<T extends {
  type?: string | null;
  occurrenceDate?: string | null;
  createdAt?: string | null;
}>(items: T[], dateKey: string) {
  return items.filter((item) => notificationCalendarDate(item) === dateKey);
}

export function millisecondsUntilNextLocalDay(value: Date = new Date()) {
  const nextDay = new Date(value);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(1, nextDay.getTime() - value.getTime());
}
