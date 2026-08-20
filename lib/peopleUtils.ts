export const ACTIVITY_IDLE_MS = 5 * 60_000;
export const READ_NOTIFICATION_RETENTION_MS = 24 * 60 * 60_000;

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

export function markOneNotificationRead<T extends { id: string; isRead: boolean; readAt?: string | null }>(
  items: T[],
  id: string,
  readAt = new Date().toISOString(),
) {
  return items.map((item) => (item.id === id ? { ...item, isRead: true, readAt } : item));
}

export function markEveryNotificationRead<T extends { isRead: boolean; readAt?: string | null }>(
  items: T[],
  readAt = new Date().toISOString(),
) {
  return items.map((item) => ({ ...item, isRead: true, readAt }));
}

export function shouldShowNotificationAfterRead(
  notification: { isRead?: boolean; readAt?: string | null },
  now: Date = new Date(),
) {
  if (!notification.isRead || !notification.readAt) return true;
  const readAt = Date.parse(notification.readAt);
  if (!Number.isFinite(readAt)) return true;
  return now.getTime() - readAt < READ_NOTIFICATION_RETENTION_MS;
}

export function notificationsWithinReadRetention<T extends { isRead?: boolean; readAt?: string | null }>(
  items: T[],
  now: Date = new Date(),
) {
  return items.filter((item) => shouldShowNotificationAfterRead(item, now));
}

export function millisecondsUntilNextReadNotificationExpiry(
  items: Array<{ isRead?: boolean; readAt?: string | null }>,
  now: Date = new Date(),
) {
  let nextDelay: number | null = null;
  for (const item of items) {
    if (!item.isRead || !item.readAt) continue;
    const readAt = Date.parse(item.readAt);
    if (!Number.isFinite(readAt)) continue;
    const delay = readAt + READ_NOTIFICATION_RETENTION_MS - now.getTime();
    if (delay <= 0) return 1;
    nextDelay = nextDelay == null ? delay : Math.min(nextDelay, delay);
  }
  return nextDelay == null ? null : Math.max(1, nextDelay);
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
  return items.filter((item) => {
    if (item.type === "birthday_wish" || item.type === "member_birthday") {
      return notificationCalendarDate(item) === dateKey;
    }
    // Operational notifications are durable workspace history. Only birthday
    // notifications are scoped to the current local calendar day.
    return true;
  });
}

export function millisecondsUntilNextLocalDay(value: Date = new Date()) {
  const nextDay = new Date(value);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(1, nextDay.getTime() - value.getTime());
}
