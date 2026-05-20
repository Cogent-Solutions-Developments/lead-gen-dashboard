import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";
import type { Persona } from "@/lib/persona";

export type AuthRole =
  | "super_admin_user"
  | "sales_user"
  | "delegate_user"
  | "production_user";

export type AuthUser = {
  id: string;
  username: string;
  role: AuthRole;
  fullName?: string;
  isActive?: boolean;
  authType?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
};

export type AuthSession = {
  accessToken: string;
  tokenType: "bearer" | string;
  expiresIn: number;
  expiresAt: number;
  user: AuthUser;
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

export type AdminEventItem = {
  id: string;
  eventKey: string;
  eventName: string;
  location?: string | null;
  category?: string | null;
  date?: string | null;
  isActive: boolean;
  createdByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminEventCreateInput = {
  eventName: string;
  eventKey: string;
  location: string;
  date: string;
  isActive: boolean;
};

export type AdminEventUpdateInput = {
  eventName?: string;
  eventKey?: string;
  location?: string;
  date?: string;
  isActive?: boolean;
  syncLinkedCampaigns?: boolean;
};

export type AdminCategoryAlias = {
  id: string;
  categoryId: string;
  aliasText: string;
  normalizedAlias: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminCategoryItem = {
  id: string;
  name: string;
  slug: string;
  normalizedName: string;
  isSystem: boolean;
  isActive: boolean;
  aliases: AdminCategoryAlias[];
  aliasCount: number;
  campaignCount: number;
  leadCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminRawCategoryItem = {
  rawCategory: string;
  displayCategory: string;
  normalizedCategory: string;
  canonicalCategoryId?: string | null;
  canonicalCategoryName?: string | null;
  status: "unmapped" | "mapped" | "canonical" | "system" | string;
  campaignCount: number;
  leadCount: number;
  lastUsedAt?: string | null;
};

export type AdminCategorySummary = {
  categoryCount: number;
  activeCategoryCount: number;
  rawCategoryCount: number;
  unmappedRawCategoryCount: number;
  mappedRawCategoryCount: number;
};

export type AdminCategoryCatalog = {
  categories: AdminCategoryItem[];
  rawCategories: AdminRawCategoryItem[];
  summary: AdminCategorySummary;
};

export type AdminCategoryCreateInput = {
  name: string;
  isActive?: boolean;
};

export type AdminCategoryUpdateInput = {
  name?: string;
  isActive?: boolean;
};

export type SystemMonitorStatus = "ok" | "warning" | "critical" | string;

export type SystemMonitorCheck = {
  status: SystemMonitorStatus;
  checkedAt?: string;
  error?: string;
};

export type SystemMonitorCeleryCheck = SystemMonitorCheck & {
  workerCount?: number;
  queuesSeen?: string[];
  missingQueues?: string[];
};

export type SystemMonitorCountRow = {
  count: number;
};

export type SystemMonitorPipelineStatus = SystemMonitorCountRow & {
  pipeline: string;
  status: string;
};

export type SystemMonitorJobState = SystemMonitorCountRow & {
  state: string;
};

export type SystemMonitorProgressStaleRow = {
  campaignId: string;
  eventCode?: string | null;
  updatedAt?: string | null;
  doneTotal: number;
  targetTotal: number;
};

export type SystemMonitorQueueStatus = SystemMonitorCountRow & {
  channel: string;
  status: string;
};

export type SystemMonitorStuckChannel = SystemMonitorCountRow & {
  channel: string;
};

export type SystemMonitorOldestQueueRow = {
  id: string;
  campaignId?: string | null;
  leadId?: string | null;
  draftId?: string | null;
  channel?: string | null;
  status?: string | null;
  dueAt?: string | null;
  updatedAt?: string | null;
  attempts?: number;
  lastError?: string | null;
};

export type SystemMonitorProviderFailure = SystemMonitorCountRow & {
  provider: string;
  channel: string;
};

export type SystemMonitorProviderExample = {
  queueId: string;
  channel?: string | null;
  provider?: string | null;
  error?: string | null;
  updatedAt?: string | null;
};

export type SystemMonitorLogFile = {
  service: string;
  path: string;
  sizeBytes?: number;
  modifiedAt?: string | null;
  ageSeconds?: number | null;
};

export type SystemMonitorWarning = {
  code: string;
  severity: string;
  message: string;
  context?: Record<string, unknown>;
};

export type SystemMonitorSnapshot = {
  status: SystemMonitorStatus;
  generatedAt?: string;
  environment?: string;
  service?: string;
  actor?: string;
  monitoringLinks?: {
    grafana?: string | null;
    prometheus?: string | null;
    loki?: string | null;
  };
  checks?: {
    database?: SystemMonitorCheck;
    redis?: SystemMonitorCheck;
    celery?: SystemMonitorCeleryCheck;
  };
  runtime?: {
    pipelines?: {
      activeTotal?: number;
      byPipelineStatus?: SystemMonitorPipelineStatus[];
      error?: string;
    };
    jobs?: {
      activeTotal?: number;
      failedRecent?: number;
      byState?: SystemMonitorJobState[];
      error?: string;
    };
    progress?: {
      runningTotal?: number;
      staleRunningTotal?: number;
      batchInProgressTotal?: number;
      contentInProgressTotal?: number;
      staleRows?: SystemMonitorProgressStaleRow[];
      error?: string;
    };
    sendQueue?: {
      openTotal?: number;
      failedTotal?: number;
      stuckTotal?: number;
      byChannelStatus?: SystemMonitorQueueStatus[];
      stuckByChannel?: SystemMonitorStuckChannel[];
      oldestOpen?: SystemMonitorOldestQueueRow | null;
      error?: string;
    };
    providers?: {
      failedLast24h?: number;
      recentFailures?: SystemMonitorProviderFailure[];
      examples?: SystemMonitorProviderExample[];
      error?: string;
    };
    logs?: {
      logRoot?: string;
      files?: SystemMonitorLogFile[];
      missingServices?: string[];
    };
  };
  warnings?: SystemMonitorWarning[];
};

export type SystemOperationLogService = {
  service: string;
  source?: "file" | "docker" | string;
  path?: string;
  exists: boolean;
  sizeBytes?: number;
  modifiedAt?: string | null;
  containerId?: string | null;
  containerName?: string | null;
  status?: string | null;
};

export type SystemOperationLogServicesResponse = {
  source?: "file" | "docker" | string;
  enabled?: boolean;
  reason?: string;
  error?: string;
  services: SystemOperationLogService[];
};

export type SystemOperationLogResponse = {
  source?: "file" | "docker" | string;
  enabled?: boolean;
  service: string;
  path?: string;
  exists: boolean;
  cursor?: number;
  lines: string[];
  reason?: string;
  containerId?: string | null;
  containerName?: string | null;
  status?: string | null;
};

export type SystemOperationIncident = {
  code: string;
  severity: string;
  message: string;
  campaignId: string;
  pipeline: string;
  campaignStatus?: string | null;
  eventCode?: string | null;
  progressStatus?: string | null;
  doneTotal: number;
  targetTotal: number;
  updatedAt?: string | null;
  locks: {
    contentInProgress?: boolean;
    contentStartedAt?: string | null;
    batchInProgress?: boolean;
    batchStartedAt?: string | null;
    batchHeartbeatAt?: string | null;
  };
  recommendedActions: string[];
};

export type SystemOperationIncidentsResponse = {
  generatedAt?: string;
  incidents: SystemOperationIncident[];
};

export type SystemOperationRecoveryGuideItem = {
  code: string;
  title: string;
  resolution: string;
};

export type SystemOperationRecoveryGuideResponse = {
  items: SystemOperationRecoveryGuideItem[];
};

export type SystemOperationRecoveryActionResponse = {
  status: string;
  action: string;
  campaignId: string;
  pipeline?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changed?: Record<string, unknown>;
  task?: Record<string, unknown> | null;
};

type AuthError = Error & {
  status?: number;
  data?: unknown;
};

const STORAGE_KEY = "leadgen.auth.session";
const AUTH_CHANGE_EVENT = "leadgen-auth-change";
const USER_DISPLAY_CACHE_KEY = "leadgen.auth.user-display-names";

const ROLE_ALIASES: Record<string, AuthRole> = {
  super_admin_user: "super_admin_user",
  super_admin: "super_admin_user",
  superadmin: "super_admin_user",
  admin: "super_admin_user",
  sales_user: "sales_user",
  sales: "sales_user",
  sale_user: "sales_user",
  salate_user: "sales_user",
  delegate_user: "delegate_user",
  delegate: "delegate_user",
  delegate_usert: "delegate_user",
  delegagate_user: "delegate_user",
  delegagate_usert: "delegate_user",
  production_user: "production_user",
  production: "production_user",
  production_usert: "production_user",
};

export const AUTH_ROLES: AuthRole[] = [
  "super_admin_user",
  "sales_user",
  "delegate_user",
  "production_user",
];

export function normalizeAuthRole(role: unknown): AuthRole {
  const value = String(role || "").trim().toLowerCase();
  return ROLE_ALIASES[value] ?? "sales_user";
}

export function getRoleLabel(role: AuthRole | null | undefined) {
  if (role === "super_admin_user") return "Super Admin";
  if (role === "delegate_user") return "Delegate";
  if (role === "production_user") return "Production";
  return "Sales";
}

export function isSuperAdminRole(role: AuthRole | null | undefined) {
  return role === "super_admin_user";
}

export function personaForRole(role: AuthRole | null | undefined): Persona | null {
  if (role === "sales_user") return "sales";
  if (role === "delegate_user") return "delegates";
  if (role === "production_user") return "production";
  return null;
}

export function canRoleUsePersona(role: AuthRole | null | undefined, persona: Persona | null) {
  if (!role || !persona) return false;
  if (isSuperAdminRole(role)) return true;
  return personaForRole(role) === persona;
}

export function getAuthLandingPath(role: AuthRole | null | undefined) {
  return isSuperAdminRole(role) ? "/choose-persona" : "/dashboard";
}

function getBaseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  return base.replace(/\/+$/, "");
}

function normalizeUser(raw: unknown): AuthUser {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fullName = source.fullName ?? source.full_name;
  const isActive = source.isActive ?? source.is_active;
  const authType = source.authType ?? source.auth_type;
  const createdAt = source.createdAt ?? source.created_at;
  const updatedAt = source.updatedAt ?? source.updated_at;
  const lastLoginAt = source.lastLoginAt ?? source.last_login_at;

  return {
    id: String(source.id || ""),
    username: String(source.username || ""),
    role: normalizeAuthRole(source.role),
    fullName: fullName == null ? "" : String(fullName),
    isActive: typeof isActive === "boolean" ? isActive : undefined,
    authType: authType == null ? undefined : String(authType),
    createdAt: createdAt == null ? undefined : String(createdAt),
    updatedAt: updatedAt == null ? undefined : String(updatedAt),
    lastLoginAt: lastLoginAt == null ? null : String(lastLoginAt),
  };
}

function emitAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

function readUserDisplayCache(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(USER_DISPLAY_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeUserDisplayCache(cache: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_DISPLAY_CACHE_KEY, JSON.stringify(cache));
}

function userDisplayCacheKeys(user: Pick<AuthUser, "id" | "username">) {
  return [user.id, user.username ? `username:${user.username.toLowerCase()}` : ""].filter(Boolean);
}

export function cacheAuthUserDisplayName(user: AuthUser) {
  const fullName = user.fullName?.trim();
  if (!fullName) return;

  const cache = readUserDisplayCache();
  userDisplayCacheKeys(user).forEach((key) => {
    cache[key] = fullName;
  });
  writeUserDisplayCache(cache);
}

export function cacheAuthUsersDisplayNames(users: AuthUser[]) {
  const cache = readUserDisplayCache();
  users.forEach((user) => {
    const fullName = user.fullName?.trim();
    if (!fullName) return;

    userDisplayCacheKeys(user).forEach((key) => {
      cache[key] = fullName;
    });
  });
  writeUserDisplayCache(cache);
}

export function getCachedAuthUserDisplayName(user: Pick<AuthUser, "id" | "username"> | null | undefined) {
  if (!user) return "";

  const cache = readUserDisplayCache();
  return userDisplayCacheKeys(user)
    .map((key) => cache[key]?.trim())
    .find(Boolean) || "";
}

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.user) return null;
    if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
      clearAuthSession();
      return null;
    }
    const user = normalizeUser(parsed.user);
    const cachedFullName = getCachedAuthUserDisplayName(user);

    return {
      ...parsed,
      user: {
        ...user,
        fullName: user.fullName?.trim() || cachedFullName,
      },
    };
  } catch {
    clearAuthSession();
    return null;
  }
}

export function setAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  const user = normalizeUser(session.user);
  cacheAuthUserDisplayName(user);

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...session,
      user,
    })
  );
  emitAuthChange();
}

export function updateStoredAuthUser(user: AuthUser) {
  const session = getStoredAuthSession();
  if (!session) return;

  const nextUser = normalizeUser(user);
  const existingFullName = session.user.fullName?.trim() || "";
  const cachedFullName =
    getCachedAuthUserDisplayName(nextUser) ||
    getCachedAuthUserDisplayName(session.user);

  setAuthSession({
    ...session,
    user: {
      ...session.user,
      ...nextUser,
      fullName: nextUser.fullName?.trim() || existingFullName || cachedFullName,
    },
  });
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitAuthChange();
}

export function onAuthSessionChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => cb();
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) cb();
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handler);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handler);
    window.removeEventListener("storage", onStorage);
  };
}

export function getAuthToken() {
  return getStoredAuthSession()?.accessToken ?? "";
}

export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function attachAuthToken(config: InternalAxiosRequestConfig) {
  const token = getAuthToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
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
  const error = new Error(message) as AuthError;
  error.status = response.status;
  error.data = data;
  throw error;
}

async function authRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const requestHeaders: Record<string, string> = {
    ...(rest.body ? { "Content-Type": "application/json" } : {}),
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

export async function loginWithPassword(username: string, password: string) {
  const data = await authRequest<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: AuthUser;
  }>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ username, password }),
  });

  const session: AuthSession = {
    accessToken: data.accessToken,
    tokenType: data.tokenType,
    expiresIn: Number(data.expiresIn || 0),
    expiresAt: Date.now() + Number(data.expiresIn || 0) * 1000,
    user: normalizeUser(data.user),
  };
  setAuthSession(session);
  return session;
}

export async function fetchCurrentAuthUser() {
  const data = await authRequest<{ user: AuthUser }>("/api/auth/me");
  const user = normalizeUser(data.user);
  updateStoredAuthUser(user);
  return user;
}

export async function listAuthUsers() {
  const data = await authRequest<{ users: AuthUser[] }>("/api/auth/users");
  const users = Array.isArray(data.users) ? data.users.map(normalizeUser) : [];
  cacheAuthUsersDisplayNames(users);
  return users;
}

export async function createAuthUser(payload: AuthUserCreateInput) {
  const data = await authRequest<{ user: AuthUser }>("/api/auth/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const user = normalizeUser(data.user);
  cacheAuthUserDisplayName(user);
  return user;
}

export async function updateAuthUser(userId: string, payload: AuthUserUpdateInput) {
  const data = await authRequest<{ user: AuthUser }>(`/api/auth/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const user = normalizeUser(data.user);
  cacheAuthUserDisplayName(user);
  return user;
}

export async function updateAuthUserPassword(userId: string, password: string) {
  const data = await authRequest<{ user: AuthUser }>(`/api/auth/users/${userId}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  return normalizeUser(data.user);
}

export async function deleteAuthUser(userId: string) {
  await authRequest<{ deleted: boolean; user: AuthUser }>(`/api/auth/users/${userId}`, {
    method: "DELETE",
  });
}

function normalizeAdminEvent(raw: unknown): AdminEventItem {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: String(source.id || ""),
    eventKey: String(source.eventKey || ""),
    eventName: String(source.eventName || ""),
    location: source.location == null ? null : String(source.location),
    category: source.category == null ? null : String(source.category),
    date: source.date == null ? null : String(source.date),
    isActive: Boolean(source.isActive),
    createdByUserId: source.createdByUserId == null ? null : String(source.createdByUserId),
    createdAt: source.createdAt == null ? null : String(source.createdAt),
    updatedAt: source.updatedAt == null ? null : String(source.updatedAt),
  };
}

function normalizeAdminCategoryAlias(raw: unknown): AdminCategoryAlias {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: String(source.id || ""),
    categoryId: String(source.categoryId || ""),
    aliasText: String(source.aliasText || ""),
    normalizedAlias: String(source.normalizedAlias || ""),
    isActive: source.isActive !== false,
    createdAt: source.createdAt == null ? null : String(source.createdAt),
    updatedAt: source.updatedAt == null ? null : String(source.updatedAt),
  };
}

function normalizeAdminCategory(raw: unknown): AdminCategoryItem {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const aliases = Array.isArray(source.aliases) ? source.aliases.map(normalizeAdminCategoryAlias) : [];
  return {
    id: String(source.id || ""),
    name: String(source.name || ""),
    slug: String(source.slug || ""),
    normalizedName: String(source.normalizedName || ""),
    isSystem: Boolean(source.isSystem),
    isActive: source.isActive !== false,
    aliases,
    aliasCount: Number(source.aliasCount ?? aliases.length) || 0,
    campaignCount: Number(source.campaignCount ?? 0) || 0,
    leadCount: Number(source.leadCount ?? 0) || 0,
    createdAt: source.createdAt == null ? null : String(source.createdAt),
    updatedAt: source.updatedAt == null ? null : String(source.updatedAt),
  };
}

function normalizeAdminRawCategory(raw: unknown): AdminRawCategoryItem {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    rawCategory: String(source.rawCategory || ""),
    displayCategory: String(source.displayCategory || "Competing Events"),
    normalizedCategory: String(source.normalizedCategory || ""),
    canonicalCategoryId: source.canonicalCategoryId == null ? null : String(source.canonicalCategoryId),
    canonicalCategoryName: source.canonicalCategoryName == null ? null : String(source.canonicalCategoryName),
    status: String(source.status || "unmapped"),
    campaignCount: Number(source.campaignCount ?? 0) || 0,
    leadCount: Number(source.leadCount ?? 0) || 0,
    lastUsedAt: source.lastUsedAt == null ? null : String(source.lastUsedAt),
  };
}

function normalizeAdminCategoryCatalog(raw: unknown): AdminCategoryCatalog {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const summary = (source.summary && typeof source.summary === "object" ? source.summary : {}) as Record<string, unknown>;
  return {
    categories: Array.isArray(source.categories) ? source.categories.map(normalizeAdminCategory) : [],
    rawCategories: Array.isArray(source.rawCategories) ? source.rawCategories.map(normalizeAdminRawCategory) : [],
    summary: {
      categoryCount: Number(summary.categoryCount ?? 0) || 0,
      activeCategoryCount: Number(summary.activeCategoryCount ?? 0) || 0,
      rawCategoryCount: Number(summary.rawCategoryCount ?? 0) || 0,
      unmappedRawCategoryCount: Number(summary.unmappedRawCategoryCount ?? 0) || 0,
      mappedRawCategoryCount: Number(summary.mappedRawCategoryCount ?? 0) || 0,
    },
  };
}

export async function listAdminEvents(includeInactive = true) {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await authRequest<{ events: AdminEventItem[] }>(`/api/admin/events${suffix}`);
  return Array.isArray(data.events) ? data.events.map(normalizeAdminEvent) : [];
}

export async function listActiveEventRegistry() {
  const data = await authRequest<{ events: AdminEventItem[] }>("/api/event-registry/active");
  return Array.isArray(data.events) ? data.events.map(normalizeAdminEvent) : [];
}

export async function createAdminEvent(payload: AdminEventCreateInput) {
  const data = await authRequest<{ event: AdminEventItem }>("/api/admin/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeAdminEvent(data.event);
}

export async function updateAdminEvent(eventId: string, payload: AdminEventUpdateInput) {
  const data = await authRequest<{ event: AdminEventItem }>(`/api/admin/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeAdminEvent(data.event);
}

export async function listAdminCategories() {
  const data = await authRequest<AdminCategoryCatalog>("/api/admin/categories");
  return normalizeAdminCategoryCatalog(data);
}

export async function createAdminCategory(payload: AdminCategoryCreateInput) {
  const data = await authRequest<{ category: AdminCategoryItem }>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeAdminCategory(data.category);
}

export async function updateAdminCategory(categoryId: string, payload: AdminCategoryUpdateInput) {
  const data = await authRequest<{ category: AdminCategoryItem }>(`/api/admin/categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeAdminCategory(data.category);
}

export async function upsertAdminCategoryAlias(categoryId: string, aliasText: string) {
  const data = await authRequest<{ alias: AdminCategoryAlias }>(`/api/admin/categories/${categoryId}/aliases`, {
    method: "POST",
    body: JSON.stringify({ aliasText }),
  });
  return normalizeAdminCategoryAlias(data.alias);
}

export async function deleteAdminCategoryAlias(aliasId: string) {
  const data = await authRequest<{ alias: AdminCategoryAlias; deleted: boolean }>(
    `/api/admin/categories/aliases/${aliasId}`,
    { method: "DELETE" }
  );
  return normalizeAdminCategoryAlias(data.alias);
}

export async function downloadAdminCategoryExport() {
  const response = await fetch(`${getBaseUrl()}/api/admin/categories/export`, {
    headers: {
      ...getAuthHeader(),
      ...getLocalDevNgrokHeaders(),
    },
  });
  if (!response.ok) {
    await parseResponse<never>(response);
    return;
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || "campaign-category-mapping.xlsx";
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchSystemMonitorSnapshot() {
  return authRequest<SystemMonitorSnapshot>("/api/admin/system-monitor");
}

export async function listSystemOperationLogServices() {
  return authRequest<SystemOperationLogServicesResponse>("/api/admin/system-operations/logs/services?source=docker");
}

export async function fetchSystemOperationLog(
  service: string,
  options: { tail?: number; after?: number | null; source?: "docker" | "file" } = {}
) {
  const params = new URLSearchParams();
  params.set("source", options.source ?? "docker");
  params.set("tail", String(options.tail ?? 200));
  if (typeof options.after === "number") params.set("after", String(options.after));
  return authRequest<SystemOperationLogResponse>(
    `/api/admin/system-operations/logs/${encodeURIComponent(service)}?${params.toString()}`
  );
}

export function buildSystemOperationDockerLogStreamUrl(service: string, tail = 200) {
  const params = new URLSearchParams({
    source: "docker",
    tail: String(tail),
  });
  return `${getBaseUrl()}/api/admin/system-operations/logs/${encodeURIComponent(service)}/stream?${params.toString()}`;
}

export async function listSystemOperationIncidents(limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  return authRequest<SystemOperationIncidentsResponse>(`/api/admin/system-operations/incidents?${params.toString()}`);
}

export async function fetchSystemOperationRecoveryGuide() {
  return authRequest<SystemOperationRecoveryGuideResponse>("/api/admin/system-operations/recovery-guide");
}

export async function runSystemOperationRecoveryAction(
  campaignId: string,
  action: string,
  payload: { reason: string; dryRun: boolean }
) {
  return authRequest<SystemOperationRecoveryActionResponse>(
    `/api/admin/system-operations/campaigns/${encodeURIComponent(campaignId)}/recovery/${encodeURIComponent(action)}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}
