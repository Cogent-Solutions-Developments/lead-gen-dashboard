import { apiClient } from "@/lib/apiClient";
import { getAuthHeader } from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";

export type PeopleNotificationType = string;

export type PeopleNotification = {
  id: string;
  type: PeopleNotificationType;
  title: string;
  message: string;
  subjectUserId: string;
  occurrenceDate: string;
  metadata: {
    subjectUserId: string;
    subjectDisplayName: string;
  };
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
};

export type NotificationListResponse = {
  notifications: PeopleNotification[];
  unreadCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type ActivityHeartbeatRequest = {
  active: boolean;
  appSurface: "light";
};

export type ActivityHeartbeatResponse = {
  activity: {
    date: string;
    active: boolean;
    appSurface: "light" | "heavy" | "unknown";
    engagedSeconds: number;
    incrementedSeconds: number;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    lastActiveAt: string | null;
    heartbeatCount: number;
  };
};

export type UserActivityPeriod = "daily" | "weekly" | "monthly";
export type ManagerUserActivityPeriod = UserActivityPeriod | "yearly";

export type FrontendUsageRecord = {
  engagedSeconds: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  heartbeatCount: number;
};

export type UserActivityRecord = {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  isOnline: boolean;
  lastActiveAt: string | null;
  lastLoginAt: string | null;
  engagedSeconds: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  heartbeatCount: number;
  frontendUsage: {
    light: FrontendUsageRecord;
    heavy: FrontendUsageRecord;
  };
  lastUsedFrontend: "light" | "heavy" | null;
  unattributedEngagedSeconds: number;
};

export type UserActivityResponse = {
  period: {
    key: UserActivityPeriod;
    start: string;
    end: string;
    timezone: string;
  };
  users: UserActivityRecord[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
};

export async function listNotifications(options: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
} = {}) {
  const { data } = await apiClient.get<NotificationListResponse>("/api/me/notifications", {
    params: {
      unreadOnly: options.unreadOnly ?? false,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
    },
    signal: options.signal,
  });
  return data;
}

export async function markNotificationRead(notificationId: string, signal?: AbortSignal) {
  const { data } = await apiClient.patch<PeopleNotification>(
    `/api/me/notifications/${encodeURIComponent(notificationId)}/read`,
    undefined,
    { signal }
  );
  return data;
}

export async function markAllNotificationsRead(signal?: AbortSignal) {
  const { data } = await apiClient.post<unknown>("/api/me/notifications/read-all", undefined, { signal });
  return data;
}

export async function sendActivityHeartbeat(
  request: ActivityHeartbeatRequest,
  options: { keepalive?: boolean; signal?: AbortSignal } = {}
) {
  const authHeaders = getAuthHeader();
  if (!authHeaders.Authorization) {
    throw new Error("No authenticated session is available for activity reporting.");
  }

  if (!options.keepalive) {
    const { data } = await apiClient.post<ActivityHeartbeatResponse>("/api/me/activity/heartbeat", request, {
      signal: options.signal,
    });
    return data;
  }

  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  const apiKey = (process.env.NEXT_PUBLIC_API_KEY || "").trim();
  const response = await fetch(`${baseUrl}/api/me/activity/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(apiKey ? { "x-api-key": apiKey } : {}),
      ...getLocalDevNgrokHeaders(),
    },
    body: JSON.stringify(request),
    keepalive: true,
    signal: options.signal,
  });
  if (!response.ok) {
    const error = new Error(response.statusText || "Heartbeat request failed") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return (await response.json()) as ActivityHeartbeatResponse;
}

export async function fetchUserActivity(options: {
  date: string;
  period: UserActivityPeriod;
  userId?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}) {
  const { data } = await apiClient.get<UserActivityResponse>("/api/admin/user-activity", {
    params: {
      date: options.date,
      period: options.period,
      ...(options.userId ? { userId: options.userId } : {}),
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
    },
    signal: options.signal,
  });
  return data;
}

export async function fetchManagerUserActivity(options: {
  date: string;
  period: ManagerUserActivityPeriod;
  userId?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}) {
  const { data } = await apiClient.get<UserActivityResponse>("/api/manager/user-activity", {
    params: {
      date: options.date,
      period: options.period,
      ...(options.userId ? { userId: options.userId } : {}),
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
    },
    signal: options.signal,
  });
  return data;
}
