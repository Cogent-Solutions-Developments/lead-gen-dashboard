import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";
import {
  fetchAdminUserPerformance as fetchBaseAdminUserPerformance,
  getAuthHeader,
  normalizeAuthRole,
  updateStoredAuthUser as updateBaseStoredAuthUser,
  type AdminEventCreateInput as BaseAdminEventCreateInput,
  type AdminEventItem as BaseAdminEventItem,
  type AdminEventUpdateInput as BaseAdminEventUpdateInput,
  type AdminUserPerformanceCluster,
  type AdminUserPerformancePeriod,
  type AdminUserPerformanceResponse as BaseAdminUserPerformanceResponse,
  type AdminUserPerformanceRunner,
  type AuthRole as BaseAuthRole,
  type AuthUser as BaseAuthUser,
} from "@/lib/auth";

export type AuthRole =
  | BaseAuthRole
  | "sales_manager_user"
  | "delegate_manager_user"
  | "production_manager_user"
  | "client_user";

export type AuthUser = Omit<BaseAuthUser, "role"> & {
  role: AuthRole;
  email?: string;
};

export type AuthUserCreateInput = {
  username: string;
  password: string;
  role: AuthRole;
  fullName?: string;
  isActive?: boolean;
};

export type AuthUserUpdateInput = {
  username?: string;
  role?: AuthRole;
  fullName?: string;
  isActive?: boolean;
};

export type AdminEventItem = BaseAdminEventItem & {
  eventType?: "conference" | "boardroom" | string | null;
  websiteUrl?: string | null;
};

export type AdminEventCreateInput = BaseAdminEventCreateInput & {
  eventType?: string;
  websiteUrl?: string;
};

export type AdminEventUpdateInput = BaseAdminEventUpdateInput & {
  eventType?: string;
  websiteUrl?: string;
};

export type AdminClientCredential = {
  id: string;
  userId: string;
  eventRegistryId: string;
  eventType: string;
  companyName: string;
  companyKey: string;
  credentialLabel?: string;
  expiresAt?: string | null;
  isActive: boolean;
  isUsable: boolean;
  revokedAt?: string | null;
  createdByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastLoginAt?: string | null;
  notes?: string;
  meta?: Record<string, unknown>;
  user?: Pick<AuthUser, "id" | "username" | "fullName" | "role" | "isActive"> & { email?: string };
  event?: AdminEventItem | null;
};

export type AdminClientCredentialCreateInput = {
  username: string;
  password?: string;
  email?: string;
  fullName?: string;
  eventId: string;
  companyName: string;
  eventType?: string;
  credentialLabel?: string;
  expiresAt?: string;
  isActive?: boolean;
  rotatePassword?: boolean;
  notes?: string;
};

export type AdminClientCredentialUpdateInput = {
  eventId?: string;
  companyName?: string;
  eventType?: string;
  credentialLabel?: string;
  expiresAt?: string;
  clearExpiresAt?: boolean;
  isActive?: boolean;
  notes?: string;
};

export type ManagerUserPerformanceActivity = {
  id?: string | null;
  pipeline: string;
  workflowStatus?: string | null;
  workflowStatusLabel?: string | null;
  updatedAt?: string | null;
  user?: {
    id?: string | null;
    name?: string | null;
    initials?: string | null;
  } | null;
  event?: {
    canonicalEventKey?: string | null;
    canonicalEventName?: string | null;
  } | null;
  lead?: {
    id?: string | null;
    name?: string | null;
    designation?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
  } | null;
};

export type AdminUserPerformanceResponse = BaseAdminUserPerformanceResponse & {
  activities?: ManagerUserPerformanceActivity[];
  activityTotal?: number;
};

export type ManagerPerformancePeriod = "daily" | "weekly" | "monthly" | "yearly";

export type ManagerPerformanceTeamUser = {
  id: string;
  username: string;
  fullName: string;
  role: "sales_user" | "delegate_user" | "production_user" | string;
  designation?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
};

export type ManagerPerformanceLeadSnapshot = {
  employeeName: string;
  title?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  companyUrl?: string | null;
  category?: string | null;
};

export type ManagerPerformanceActivity = {
  id: string;
  userId: string;
  username: string;
  userDisplayName: string;
  leadId: string;
  leadIdentityKey: string;
  canonicalEventKey: string;
  canonicalEventName: string;
  leadSnapshot: ManagerPerformanceLeadSnapshot;
  type: "workflow-status" | "manual-lead" | "content-generation" | "contact-action" | string;
  workflowStatus?: string | null;
  workflowStatusLabel?: string | null;
  comment?: string | null;
  channel?: "email" | "whatsapp" | "phone" | "linkedin" | "website" | null;
  createdAt: string;
};

export type ManagerTouchedLead = ManagerPerformanceLeadSnapshot & {
  leadId: string;
  canonicalEventKey: string;
  canonicalEventName: string;
  currentWorkflowStatus: string;
  currentWorkflowStatusLabel?: string | null;
  firstTouchedAt: string;
  lastTouchedAt: string;
  touchCount: number;
  activities: ManagerPerformanceActivity[];
};

export type ManagerPerformanceTotals = {
  activityCount: number;
  touchedLeadCount: number;
  manualLeadCount: number;
  workflowUpdateCount: number;
  contentGeneratedCount?: number;
  contactActionCount?: number;
  kpiCount: number;
};

export type ManagerUserPerformance = {
  userId: string;
  username: string;
  fullName: string;
  totals: ManagerPerformanceTotals;
  statusCounts: Record<string, number>;
  touchedLeads: ManagerTouchedLead[];
};

export type ManagerPerformanceResponse = {
  period: {
    key: ManagerPerformancePeriod;
    start: string;
    end: string;
    timezone: string;
  };
  managerScope: {
    persona: "sales" | "delegates" | "production" | string;
    managerUserId: string;
    managerName: string;
  };
  teamUsers: ManagerPerformanceTeamUser[];
  summary: {
    totalUsers: number;
    activeUsers: number;
    activityCount: number;
    touchedLeadCount: number;
    manualLeadCount: number;
    workflowUpdateCount: number;
    contentGeneratedCount?: number;
    contactActionCount?: number;
    kpiTotal: number;
  };
  perUserPerformance: ManagerUserPerformance[];
  activities: ManagerPerformanceActivity[];
  pagination?: {
    limit: number;
    offset: number;
    activityTotal: number;
    hasMore: boolean;
  };
};

export type {
  AdminUserPerformanceCluster,
  AdminUserPerformancePeriod,
  AdminUserPerformanceRunner,
};

export const AUTH_ROLES: AuthRole[] = [
  "super_admin_user",
  "sales_user",
  "sales_manager_user",
  "delegate_user",
  "delegate_manager_user",
  "production_user",
  "production_manager_user",
  "client_user",
];

const ROLE_ALIASES: Record<string, AuthRole> = {
  super_admin_user: "super_admin_user",
  super_admin: "super_admin_user",
  admin: "super_admin_user",
  sales_user: "sales_user",
  sales: "sales_user",
  sales_manager: "sales_manager_user",
  sales_manager_user: "sales_manager_user",
  delegate_user: "delegate_user",
  delegate: "delegate_user",
  delegate_manager: "delegate_manager_user",
  delegate_manager_user: "delegate_manager_user",
  production_user: "production_user",
  production: "production_user",
  production_manager: "production_manager_user",
  production_manager_user: "production_manager_user",
  client: "client_user",
  client_user: "client_user",
  event_client: "client_user",
  event_client_user: "client_user",
};

function getBaseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  return base.replace(/\/+$/, "");
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (response.ok) return data as T;

  const detail = data?.detail;
  const message =
    typeof detail === "string"
      ? detail
      : typeof data?.message === "string"
        ? data.message
        : response.statusText || "Request failed";
  const error = new Error(message) as Error & { status?: number; data?: unknown };
  error.status = response.status;
  error.data = data;
  throw error;
}

async function adminAuthRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;
  const requestHeaders: Record<string, string> = {
    ...(rest.body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(auth ? getAuthHeader() : {}),
    ...getLocalDevNgrokHeaders(),
    ...(headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...rest,
    headers: requestHeaders,
  });
  return parseResponse<T>(response);
}

function normalizeAdminRole(role: unknown): AuthRole {
  const raw = String(role || "").trim().toLowerCase();
  return ROLE_ALIASES[raw] || normalizeAuthRole(role);
}

function normalizeAdminUser(raw: unknown): AuthUser {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fullName = source.fullName ?? source.full_name;
  const designation = source.designation;
  const dateOfBirth = source.dateOfBirth ?? source.date_of_birth;
  const mobilePhone = source.mobilePhone ?? source.mobile_phone;
  const address = source.address;
  const companyJoinedDate = source.companyJoinedDate ?? source.company_joined_date;
  const bio = source.bio ?? "";
  const avatarStorageObjectId = source.avatarStorageObjectId ?? source.avatar_storage_object_id;
  const avatarUrl = source.avatarUrl ?? source.avatar_url;
  const isActive = source.isActive ?? source.is_active;
  const authType = source.authType ?? source.auth_type;
  const createdAt = source.createdAt ?? source.created_at;
  const updatedAt = source.updatedAt ?? source.updated_at;
  const lastLoginAt = source.lastLoginAt ?? source.last_login_at;

  return {
    id: String(source.id || ""),
    username: String(source.username || ""),
    role: normalizeAdminRole(source.role),
    fullName: fullName == null ? "" : String(fullName),
    designation: designation == null ? "" : String(designation),
    dateOfBirth: dateOfBirth == null ? null : String(dateOfBirth),
    mobilePhone: mobilePhone == null ? "" : String(mobilePhone),
    address: address == null ? "" : String(address),
    companyJoinedDate: companyJoinedDate == null ? null : String(companyJoinedDate),
    bio: bio == null ? "" : String(bio),
    avatarStorageObjectId: avatarStorageObjectId == null ? null : String(avatarStorageObjectId),
    avatarUrl: avatarUrl == null ? null : String(avatarUrl),
    isActive: isActive == null ? true : Boolean(isActive),
    authType: authType == null ? "" : String(authType),
    createdAt: createdAt == null ? "" : String(createdAt),
    updatedAt: updatedAt == null ? "" : String(updatedAt),
    lastLoginAt: lastLoginAt == null ? null : String(lastLoginAt),
    email: source.email == null ? "" : String(source.email),
  };
}

function normalizeAdminEvent(raw: unknown): AdminEventItem {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: String(source.id || ""),
    eventKey: String(source.eventKey || ""),
    eventName: String(source.eventName || ""),
    location: source.location == null ? null : String(source.location),
    category: source.category == null ? null : String(source.category),
    eventType: source.eventType == null ? null : String(source.eventType),
    websiteUrl: source.websiteUrl == null ? null : String(source.websiteUrl),
    date: source.date == null ? null : String(source.date),
    logoStorageObjectId: source.logoStorageObjectId == null ? null : String(source.logoStorageObjectId),
    logoUrl: source.logoUrl == null ? null : String(source.logoUrl),
    isActive: source.isActive !== false,
    createdByUserId: source.createdByUserId == null ? null : String(source.createdByUserId),
    createdAt: source.createdAt == null ? null : String(source.createdAt),
    updatedAt: source.updatedAt == null ? null : String(source.updatedAt),
  };
}

function normalizeAdminClientCredential(raw: unknown): AdminClientCredential {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const user = source.user && typeof source.user === "object" ? (source.user as Record<string, unknown>) : null;
  const event = source.event && typeof source.event === "object" ? normalizeAdminEvent(source.event) : null;
  return {
    id: String(source.id || ""),
    userId: String(source.userId || ""),
    eventRegistryId: String(source.eventRegistryId || ""),
    eventType: String(source.eventType || "conference"),
    companyName: String(source.companyName || ""),
    companyKey: String(source.companyKey || ""),
    credentialLabel: String(source.credentialLabel || ""),
    expiresAt: source.expiresAt == null ? null : String(source.expiresAt),
    isActive: source.isActive !== false,
    isUsable: Boolean(source.isUsable),
    revokedAt: source.revokedAt == null ? null : String(source.revokedAt),
    createdByUserId: source.createdByUserId == null ? null : String(source.createdByUserId),
    createdAt: source.createdAt == null ? null : String(source.createdAt),
    updatedAt: source.updatedAt == null ? null : String(source.updatedAt),
    lastLoginAt: source.lastLoginAt == null ? null : String(source.lastLoginAt),
    notes: String(source.notes || ""),
    meta: source.meta && typeof source.meta === "object" ? (source.meta as Record<string, unknown>) : {},
    user: user
      ? {
          id: String(user.id || ""),
          username: String(user.username || ""),
          fullName: String(user.fullName || ""),
          email: String(user.email || ""),
          role: normalizeAdminRole(user.role),
          isActive: user.isActive !== false,
        }
      : undefined,
    event,
  };
}

export function getRoleLabel(role: AuthRole | null | undefined) {
  if (role === "super_admin_user") return "Super Admin";
  if (role === "sales_manager_user") return "Sales Manager";
  if (role === "delegate_manager_user") return "Delegate Manager";
  if (role === "production_manager_user") return "Production Manager";
  if (role === "client_user") return "Client";
  if (role === "delegate_user") return "Delegate";
  if (role === "production_user") return "Production";
  return "Sales";
}

export function isManagerRole(role: AuthRole | string | null | undefined) {
  return role === "sales_manager_user" || role === "delegate_manager_user" || role === "production_manager_user";
}

export function updateStoredAuthUser(user: AuthUser) {
  updateBaseStoredAuthUser(user as BaseAuthUser);
}

export async function listAuthUsers() {
  const data = await adminAuthRequest<{ users: AuthUser[] }>("/api/auth/users");
  return Array.isArray(data.users) ? data.users.map(normalizeAdminUser) : [];
}

export async function createAuthUser(payload: AuthUserCreateInput) {
  const data = await adminAuthRequest<{ user: AuthUser }>("/api/auth/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeAdminUser(data.user);
}

export async function updateAuthUser(userId: string, payload: AuthUserUpdateInput) {
  const data = await adminAuthRequest<{ user: AuthUser }>(`/api/auth/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeAdminUser(data.user);
}

export async function updateAuthUserPassword(userId: string, password: string) {
  const data = await adminAuthRequest<{ user: AuthUser }>(`/api/auth/users/${userId}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  return normalizeAdminUser(data.user);
}

export async function deleteAuthUser(userId: string) {
  await adminAuthRequest<{ deleted: boolean; user: AuthUser }>(`/api/auth/users/${userId}`, {
    method: "DELETE",
  });
}

export async function listAdminEvents(includeInactive = true) {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await adminAuthRequest<{ events: AdminEventItem[] }>(`/api/admin/events${suffix}`);
  return Array.isArray(data.events) ? data.events.map(normalizeAdminEvent) : [];
}

export async function createAdminEvent(payload: AdminEventCreateInput) {
  const data = await adminAuthRequest<{ event: AdminEventItem }>("/api/admin/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeAdminEvent(data.event);
}

export async function updateAdminEvent(eventId: string, payload: AdminEventUpdateInput) {
  const data = await adminAuthRequest<{ event: AdminEventItem }>(`/api/admin/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeAdminEvent(data.event);
}

export async function deleteAdminEvent(eventId: string) {
  const data = await adminAuthRequest<{ event: AdminEventItem; deleted: boolean }>(`/api/admin/events/${eventId}`, {
    method: "DELETE",
  });
  return { ...data, event: normalizeAdminEvent(data.event) };
}

export async function uploadAdminEventLogo(eventId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const data = await adminAuthRequest<{ event: AdminEventItem; storageObjectId: string; logoUrl?: string }>(
    `/api/admin/events/${eventId}/logo`,
    {
      method: "POST",
      body: formData,
    }
  );
  return { ...data, event: normalizeAdminEvent(data.event) };
}

export async function deleteAdminEventLogo(eventId: string) {
  const data = await adminAuthRequest<{ event: AdminEventItem; deleted: boolean }>(`/api/admin/events/${eventId}/logo`, {
    method: "DELETE",
  });
  return { ...data, event: normalizeAdminEvent(data.event) };
}

export async function listAdminClientCredentials(params?: {
  eventId?: string;
  userId?: string;
  includeInactive?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.eventId) query.set("eventId", params.eventId);
  if (params?.userId) query.set("userId", params.userId);
  if (params?.includeInactive) query.set("includeInactive", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await adminAuthRequest<{ credentials: AdminClientCredential[] }>(`/api/admin/client-credentials${suffix}`);
  return Array.isArray(data.credentials) ? data.credentials.map(normalizeAdminClientCredential) : [];
}

export async function createAdminClientCredential(payload: AdminClientCredentialCreateInput) {
  const data = await adminAuthRequest<{
    credential: AdminClientCredential;
    userCreated: boolean;
    passwordUpdated: boolean;
  }>("/api/admin/client-credentials", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return {
    ...data,
    credential: normalizeAdminClientCredential(data.credential),
  };
}

export async function updateAdminClientCredential(id: string, payload: AdminClientCredentialUpdateInput) {
  const data = await adminAuthRequest<{ credential: AdminClientCredential }>(`/api/admin/client-credentials/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeAdminClientCredential(data.credential);
}

export async function updateAdminClientCredentialPassword(id: string, password: string) {
  const data = await adminAuthRequest<{ credential: AdminClientCredential; user: AuthUser }>(
    `/api/admin/client-credentials/${id}/password`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    }
  );
  return {
    credential: normalizeAdminClientCredential(data.credential),
    user: data.user ? normalizeAdminUser(data.user) : null,
  };
}

export async function revokeAdminClientCredential(id: string) {
  const data = await adminAuthRequest<{ credential: AdminClientCredential; revoked: boolean }>(
    `/api/admin/client-credentials/${id}`,
    {
      method: "DELETE",
    }
  );
  return { ...data, credential: normalizeAdminClientCredential(data.credential) };
}

export async function fetchAdminUserPerformance(options: {
  period?: AdminUserPerformancePeriod;
  date?: string;
}) {
  return fetchBaseAdminUserPerformance(options) as Promise<AdminUserPerformanceResponse>;
}

function managerPerformancePipeline(persona?: string) {
  const normalized = String(persona || "").trim().toLowerCase();
  if (normalized === "delegates") return "delegate";
  if (normalized === "production") return "production";
  return "sales";
}

function managerPerformanceMetric(pipeline: string) {
  if (pipeline === "sales") {
    return { metricKey: "proposal-sent", metricLabel: "Proposals Sent", accent: "#2563eb", label: "Sales" };
  }
  if (pipeline === "production") {
    return { metricKey: "confirmed", metricLabel: "Confirmed", accent: "#f97316", label: "Production" };
  }
  return { metricKey: "confirmed", metricLabel: "Confirmed", accent: "#14b8a6", label: "Delegate" };
}

function managerInitials(value: string) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "U";
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

export async function fetchManagerUserPerformance(options: {
  period?: AdminUserPerformancePeriod;
  date?: string;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.period) params.set("period", options.period);
  if (options.date) params.set("date", options.date);
  if (options.limit) params.set("limit", String(options.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await adminAuthRequest<ManagerPerformanceResponse>(`/api/manager/performance${suffix}`);
  const pipeline = managerPerformancePipeline(data.managerScope?.persona);
  const metric = managerPerformanceMetric(pipeline);
  const runners = [...(data.perUserPerformance || [])]
    .map((item) => ({
      id: item.userId,
      userId: item.userId,
      username: item.username,
      fullName: item.fullName,
      name: item.fullName || item.username,
      role: data.teamUsers.find((user) => user.id === item.userId)?.role || "",
      kpiCount: Number(item.totals?.kpiCount || 0),
      total: Number(item.totals?.kpiCount || 0),
      rank: 0,
    }))
    .sort((a, b) => Number(b.kpiCount || 0) - Number(a.kpiCount || 0))
    .map((item, index) => ({ ...item, rank: index + 1 }));
  const total = Number(data.summary?.kpiTotal || 0);
  const activeUsers = Number(data.summary?.totalUsers || data.teamUsers?.length || 0);
  const contributors = Number(data.summary?.activeUsers || 0);
  const topUser = runners[0] || null;
  const cluster: AdminUserPerformanceCluster = {
    pipeline,
    label: metric.label,
    role: data.teamUsers[0]?.role || "",
    metricKey: metric.metricKey,
    metricLabel: metric.metricLabel,
    accent: metric.accent,
    ownerUserId: data.managerScope?.managerUserId,
    total,
    activeUsers,
    contributors,
    averagePerUser: activeUsers ? Number((total / activeUsers).toFixed(2)) : 0,
    topUser,
    runners,
  };
  const activities: ManagerUserPerformanceActivity[] = (data.activities || []).map((activity) => {
    const snapshot = activity.leadSnapshot || { employeeName: "" };
    const displayName =
      snapshot.employeeName?.trim() ||
      snapshot.email?.trim() ||
      snapshot.phone?.trim() ||
      snapshot.linkedinUrl?.trim() ||
      activity.leadIdentityKey ||
      "Lead details unavailable";
    const userDisplayName = activity.userDisplayName || activity.username || "Unknown user";
    return {
      id: activity.id,
      pipeline,
      workflowStatus: activity.workflowStatus,
      workflowStatusLabel: activity.workflowStatusLabel,
      updatedAt: activity.createdAt,
      user: {
        id: activity.userId,
        name: userDisplayName,
        initials: managerInitials(userDisplayName),
      },
      event: {
        canonicalEventKey: activity.canonicalEventKey,
        canonicalEventName: activity.canonicalEventName,
      },
      lead: {
        id: activity.leadId,
        name: displayName,
        designation: snapshot.title || "",
        company: snapshot.company || "",
        email: snapshot.email || "",
        phone: snapshot.phone || "",
        linkedinUrl: snapshot.linkedinUrl || "",
      },
    };
  });
  return {
    period: data.period?.key || options.period || "daily",
    date: options.date || data.period?.start?.slice(0, 10) || "",
    periodStart: data.period?.start,
    periodEnd: data.period?.end,
    generatedAt: new Date().toISOString(),
    summary: {
      totalKpis: total,
      activeUsers,
      contributors,
      averagePerUser: cluster.averagePerUser,
      topPipeline: cluster,
      topUser,
    },
    clusters: [cluster],
    activities,
    activityTotal: Number(data.pagination?.activityTotal || data.summary?.activityCount || activities.length),
  } satisfies AdminUserPerformanceResponse;
}

export async function fetchManagerPerformance(options: {
  period?: ManagerPerformancePeriod;
  date?: string;
  userId?: string;
  search?: string;
  workflowStatus?: string;
  eventKey?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.period) params.set("period", options.period);
  if (options.date) params.set("date", options.date);
  if (options.userId) params.set("userId", options.userId);
  if (options.search) params.set("search", options.search);
  if (options.workflowStatus) params.set("workflowStatus", options.workflowStatus);
  if (options.eventKey) params.set("eventKey", options.eventKey);
  if (typeof options.limit === "number") params.set("limit", String(options.limit));
  if (typeof options.offset === "number") params.set("offset", String(options.offset));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return adminAuthRequest<ManagerPerformanceResponse>(`/api/manager/performance${suffix}`);
}
