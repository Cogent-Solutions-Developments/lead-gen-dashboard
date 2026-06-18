import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";
import type { Persona } from "@/lib/persona";

export type AuthRole =
  | "super_admin_user"
  | "sales_user"
  | "delegate_user"
  | "production_user"
  | "sales_manager_user"
  | "delegate_manager_user"
  | "production_manager_user"
  | "client_user";

export type AuthUser = {
  id: string;
  username: string;
  role: AuthRole;
  fullName?: string;
  designation?: string;
  dateOfBirth?: string | null;
  mobilePhone?: string;
  address?: string;
  companyJoinedDate?: string | null;
  bio?: string;
  avatarStorageObjectId?: string | null;
  avatarUrl?: string | null;
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
  eventType?: "conference" | "boardroom" | string | null;
  websiteUrl?: string | null;
  date?: string | null;
  logoStorageObjectId?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  createdByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminEventCreateInput = {
  eventName: string;
  eventKey: string;
  location: string;
  eventType?: string;
  websiteUrl?: string;
  date: string;
  isActive: boolean;
};

export type AdminEventUpdateInput = {
  eventName?: string;
  eventKey?: string;
  location?: string;
  eventType?: string;
  websiteUrl?: string;
  date?: string;
  isActive?: boolean;
  syncLinkedCampaigns?: boolean;
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

export type ClientDashboardLead = {
  leadIdentityKey?: string | null;
  workflowStatus?: string | null;
  workflowStatusLabel?: string | null;
  updatedAt?: string | null;
  name: string;
  designation: string;
  company: string;
};

export type ClientDashboardProgress = {
  total: number;
  items: ClientDashboardLead[];
};

export type ClientDashboardEvent = {
  credential: {
    id: string;
    companyName: string;
    eventType: string;
    expiresAt?: string | null;
  };
  event: AdminEventItem;
  latestAgenda?: {
    id: string;
    eventRegistryId: string;
    name: string;
    mime?: string | null;
    sizeBytes: number;
    downloadUrl?: string | null;
    createdAt?: string | null;
    isLatest?: boolean;
  } | null;
  delegateProgress: {
    confirmed: ClientDashboardProgress;
    inReview: ClientDashboardProgress;
  };
};

export type ClientDashboardResponse = {
  user: Pick<AuthUser, "id" | "username" | "fullName" | "role">;
  events: ClientDashboardEvent[];
  total: number;
};

export type MyProfile = AuthUser & {
  bio: string;
  avatarStorageObjectId?: string | null;
  avatarUrl?: string | null;
};

export type MyProfileUpdateInput = {
  fullName?: string;
  designation?: string;
  dateOfBirth?: string | null;
  mobilePhone?: string;
  address?: string;
  companyJoinedDate?: string | null;
  bio?: string;
};

export type AdminStorageObjectItem = {
  id: string;
  provider: string;
  bucket?: string | null;
  objectKey: string;
  originalFilename: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  checksumSha256?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  ownerUserId?: string | null;
  createdByUserId?: string | null;
  status: string;
  visibility: string;
  legacyPath?: string | null;
  meta: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
};

export type AdminStorageSummary = {
  totalObjects: number;
  activeObjects: number;
  totalBytes: number;
  providers: Record<string, { count: number; active: number; bytes: number; statuses: Record<string, number> }>;
};

export type AdminStorageObjectList = {
  objects: AdminStorageObjectItem[];
  total: number;
  limit: number;
  offset: number;
};

type DirectDownloadResponse = {
  fileName?: string;
  url?: string;
  direct?: boolean;
  provider?: string;
  expiresInSeconds?: number | null;
};

export type ProtectedObjectUrl = {
  url: string;
  direct: boolean;
  revoke: () => void;
};

const DIRECT_OBJECT_URL_CACHE = new Map<string, { url: string; expiresAt: number }>();

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

export type AdminUserPerformancePeriod = "daily" | "monthly" | "yearly";

export type AdminUserPerformanceRunner = {
  userId?: string | null;
  id?: string | null;
  username?: string | null;
  fullName?: string | null;
  full_name?: string | null;
  name?: string | null;
  role?: AuthRole | string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  total?: number;
  count?: number;
  value?: number;
  kpiCount?: number;
  kpi_count?: number;
  metricValue?: number;
  metric_value?: number;
  rank?: number;
};

export type AdminUserPerformanceCluster = {
  pipeline: "sales" | "delegate" | "production" | string;
  label: string;
  role: AuthRole | string;
  metricKey: string;
  metricLabel: string;
  accent: string;
  ownerUserId?: string | null;
  total: number;
  activeUsers: number;
  contributors: number;
  averagePerUser: number;
  topUser?: AdminUserPerformanceRunner | Record<string, unknown> | null;
  runners: AdminUserPerformanceRunner[];
};

export type AdminUserPerformanceSummary = {
  totalKpis: number;
  activeUsers: number;
  contributors: number;
  averagePerUser: number;
  topPipeline?: AdminUserPerformanceCluster | Record<string, unknown> | null;
  topUser?: AdminUserPerformanceRunner | Record<string, unknown> | null;
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

export type AdminUserPerformanceResponse = {
  period: AdminUserPerformancePeriod | string;
  date: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  generatedAt?: string | null;
  summary: AdminUserPerformanceSummary;
  clusters: AdminUserPerformanceCluster[];
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
  sales_manager: "sales_manager_user",
  sales_manager_user: "sales_manager_user",
  delegate_user: "delegate_user",
  delegate: "delegate_user",
  delegate_usert: "delegate_user",
  delegagate_user: "delegate_user",
  delegagate_usert: "delegate_user",
  delegate_manager: "delegate_manager_user",
  delegate_manager_user: "delegate_manager_user",
  production_user: "production_user",
  production: "production_user",
  production_usert: "production_user",
  production_manager: "production_manager_user",
  production_manager_user: "production_manager_user",
  client: "client_user",
  client_user: "client_user",
  event_client: "client_user",
  event_client_user: "client_user",
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

export function normalizeAuthRole(role: unknown): AuthRole {
  const value = String(role || "").trim().toLowerCase();
  return ROLE_ALIASES[value] ?? "sales_user";
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

export function isSuperAdminRole(role: AuthRole | null | undefined) {
  return role === "super_admin_user";
}

export function isClientRole(role: AuthRole | null | undefined) {
  return role === "client_user";
}

export function isManagerRole(role: AuthRole | null | undefined) {
  return role === "sales_manager_user" || role === "delegate_manager_user" || role === "production_manager_user";
}

export function personaForRole(role: AuthRole | null | undefined): Persona | null {
  if (role === "sales_user" || role === "sales_manager_user") return "sales";
  if (role === "delegate_user" || role === "delegate_manager_user") return "delegates";
  if (role === "production_user" || role === "production_manager_user") return "production";
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
    role: normalizeAuthRole(source.role),
    fullName: fullName == null ? "" : String(fullName),
    designation: designation == null ? "" : String(designation),
    dateOfBirth: dateOfBirth == null ? null : String(dateOfBirth),
    mobilePhone: mobilePhone == null ? "" : String(mobilePhone),
    address: address == null ? "" : String(address),
    companyJoinedDate: companyJoinedDate == null ? null : String(companyJoinedDate),
    bio: bio == null ? "" : String(bio),
    avatarStorageObjectId: avatarStorageObjectId == null ? null : String(avatarStorageObjectId),
    avatarUrl: avatarUrl == null ? null : String(avatarUrl),
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

function normalizeProfile(raw: unknown): MyProfile {
  const user = normalizeUser(raw);
  return {
    ...user,
    bio: user.bio || "",
    avatarStorageObjectId: user.avatarStorageObjectId ?? null,
    avatarUrl: user.avatarUrl ?? null,
  };
}

function absoluteApiUrl(pathOrUrl: string) {
  const raw = String(pathOrUrl || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${getBaseUrl()}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function triggerBrowserDownload(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "download";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function createAuthenticatedObjectUrl(pathOrUrl: string) {
  const response = await fetch(absoluteApiUrl(pathOrUrl), {
    headers: {
      ...getAuthHeader(),
      ...getLocalDevNgrokHeaders(),
    },
  });
  if (!response.ok) {
    await parseResponse<never>(response);
  }
  const blob = await response.blob();
  return window.URL.createObjectURL(blob);
}

export function clearProtectedObjectUrlCache(match?: string) {
  if (!match) {
    DIRECT_OBJECT_URL_CACHE.clear();
    return;
  }
  for (const key of DIRECT_OBJECT_URL_CACHE.keys()) {
    if (key.includes(match)) DIRECT_OBJECT_URL_CACHE.delete(key);
  }
}

export async function createProtectedObjectUrl(pathOrUrl: string, directUrlPath?: string): Promise<ProtectedObjectUrl> {
  const cacheKey = directUrlPath ? `direct:${directUrlPath}` : "";
  const cached = cacheKey ? DIRECT_OBJECT_URL_CACHE.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return {
      url: cached.url,
      direct: true,
      revoke: () => {},
    };
  }

  if (directUrlPath) {
    try {
      const direct = await authRequest<DirectDownloadResponse>(directUrlPath);
      if (direct.direct && direct.url) {
        const ttlMs = Math.max(60, Number(direct.expiresInSeconds || 3600)) * 1000;
        DIRECT_OBJECT_URL_CACHE.set(cacheKey, {
          url: direct.url,
          expiresAt: Date.now() + ttlMs,
        });
        return {
          url: direct.url,
          direct: true,
          revoke: () => {},
        };
      }
    } catch {
      // Keep legacy/local objects visible even when the signed-url helper is not available.
    }
  }

  const objectUrl = await createAuthenticatedObjectUrl(pathOrUrl);
  return {
    url: objectUrl,
    direct: false,
    revoke: () => window.URL.revokeObjectURL(objectUrl),
  };
}

export async function downloadProtectedFile(
  downloadPath: string,
  fileName: string,
  directUrlPath?: string
) {
  if (directUrlPath) {
    try {
      const direct = await authRequest<DirectDownloadResponse>(directUrlPath);
      if (direct.direct && direct.url) {
        triggerBrowserDownload(direct.url, direct.fileName || fileName);
        return;
      }
    } catch {
      // Older API builds do not expose direct download URLs; fall back to the protected file stream.
    }
  }

  const response = await fetch(absoluteApiUrl(downloadPath), {
    headers: {
      ...getAuthHeader(),
      ...getLocalDevNgrokHeaders(),
    },
  });
  if (!response.ok) {
    await parseResponse<never>(response);
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  triggerBrowserDownload(url, fileName);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 500);
}

export async function getMyProfile() {
  const data = await authRequest<{ profile: MyProfile }>("/api/me/profile");
  return normalizeProfile(data.profile);
}

export async function updateMyProfile(payload: MyProfileUpdateInput) {
  const data = await authRequest<{ profile: MyProfile }>("/api/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const profile = normalizeProfile(data.profile);
  updateStoredAuthUser(profile);
  return profile;
}

export async function uploadMyProfileAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const data = await authRequest<{ profile: MyProfile; storageObjectId: string }>("/api/me/profile/avatar", {
    method: "POST",
    body: formData,
  });
  const profile = normalizeProfile(data.profile);
  clearProtectedObjectUrlCache("/api/profile/avatar/");
  updateStoredAuthUser(profile);
  return { ...data, profile };
}

export async function deleteMyProfileAvatar() {
  const data = await authRequest<{ profile: MyProfile; deleted: boolean }>("/api/me/profile/avatar", {
    method: "DELETE",
  });
  const profile = normalizeProfile(data.profile);
  clearProtectedObjectUrlCache("/api/profile/avatar/");
  updateStoredAuthUser(profile);
  return { ...data, profile };
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
    eventType: source.eventType == null ? null : String(source.eventType),
    websiteUrl: source.websiteUrl == null ? null : String(source.websiteUrl),
    date: source.date == null ? null : String(source.date),
    logoStorageObjectId: source.logoStorageObjectId == null ? null : String(source.logoStorageObjectId),
    logoUrl: source.logoUrl == null ? null : String(source.logoUrl),
    isActive: Boolean(source.isActive),
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
          role: normalizeAuthRole(user.role),
          isActive: user.isActive !== false,
        }
      : undefined,
    event,
  };
}

function normalizeClientProgress(raw: unknown): ClientDashboardProgress {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    total: Number(source.total ?? items.length) || 0,
    items: items.map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        leadIdentityKey: row.leadIdentityKey == null ? null : String(row.leadIdentityKey),
        workflowStatus: row.workflowStatus == null ? null : String(row.workflowStatus),
        workflowStatusLabel: row.workflowStatusLabel == null ? null : String(row.workflowStatusLabel),
        updatedAt: row.updatedAt == null ? null : String(row.updatedAt),
        name: String(row.name || ""),
        designation: String(row.designation || ""),
        company: String(row.company || ""),
      };
    }),
  };
}

function normalizeClientDashboardEvent(raw: unknown): ClientDashboardEvent {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const credential = (source.credential && typeof source.credential === "object" ? source.credential : {}) as Record<string, unknown>;
  const latestAgenda = source.latestAgenda && typeof source.latestAgenda === "object"
    ? (source.latestAgenda as Record<string, unknown>)
    : null;
  const progress = (source.delegateProgress && typeof source.delegateProgress === "object"
    ? source.delegateProgress
    : {}) as Record<string, unknown>;
  return {
    credential: {
      id: String(credential.id || ""),
      companyName: String(credential.companyName || ""),
      eventType: String(credential.eventType || "conference"),
      expiresAt: credential.expiresAt == null ? null : String(credential.expiresAt),
    },
    event: normalizeAdminEvent(source.event),
    latestAgenda: latestAgenda
      ? {
          id: String(latestAgenda.id || ""),
          eventRegistryId: String(latestAgenda.eventRegistryId || ""),
          name: String(latestAgenda.name || "agenda.pdf"),
          mime: latestAgenda.mime == null ? null : String(latestAgenda.mime),
          sizeBytes: Number(latestAgenda.sizeBytes ?? 0) || 0,
          downloadUrl: latestAgenda.downloadUrl == null ? null : String(latestAgenda.downloadUrl),
          createdAt: latestAgenda.createdAt == null ? null : String(latestAgenda.createdAt),
          isLatest: latestAgenda.isLatest !== false,
        }
      : null,
    delegateProgress: {
      confirmed: normalizeClientProgress(progress.confirmed),
      inReview: normalizeClientProgress(progress.inReview),
    },
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

export async function listEventRegistry(includeInactive = false) {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await authRequest<{ events: AdminEventItem[] }>(`/api/event-registry${suffix}`);
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

export async function deleteAdminEvent(eventId: string) {
  const data = await authRequest<{ event: AdminEventItem; deleted: boolean }>(`/api/admin/events/${eventId}`, {
    method: "DELETE",
  });
  return { ...data, event: normalizeAdminEvent(data.event) };
}

export async function uploadAdminEventLogo(eventId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const data = await authRequest<{ event: AdminEventItem; storageObjectId: string; logoUrl?: string }>(
    `/api/admin/events/${eventId}/logo`,
    {
      method: "POST",
      body: formData,
    }
  );
  return { ...data, event: normalizeAdminEvent(data.event) };
}

export async function deleteAdminEventLogo(eventId: string) {
  const data = await authRequest<{ event: AdminEventItem; deleted: boolean }>(`/api/admin/events/${eventId}/logo`, {
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
  const data = await authRequest<{ credentials: AdminClientCredential[] }>(`/api/admin/client-credentials${suffix}`);
  return Array.isArray(data.credentials) ? data.credentials.map(normalizeAdminClientCredential) : [];
}

export async function createAdminClientCredential(payload: AdminClientCredentialCreateInput) {
  const data = await authRequest<{
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
  const data = await authRequest<{ credential: AdminClientCredential }>(`/api/admin/client-credentials/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeAdminClientCredential(data.credential);
}

export async function updateAdminClientCredentialPassword(id: string, password: string) {
  const data = await authRequest<{ credential: AdminClientCredential; user: AuthUser }>(
    `/api/admin/client-credentials/${id}/password`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    }
  );
  return {
    credential: normalizeAdminClientCredential(data.credential),
    user: data.user ? normalizeUser(data.user) : null,
  };
}

export async function revokeAdminClientCredential(id: string) {
  const data = await authRequest<{ credential: AdminClientCredential; revoked: boolean }>(
    `/api/admin/client-credentials/${id}`,
    {
      method: "DELETE",
    }
  );
  return { ...data, credential: normalizeAdminClientCredential(data.credential) };
}

export async function getClientDashboard() {
  const data = await authRequest<ClientDashboardResponse>("/api/client/dashboard");
  const source = (data && typeof data === "object" ? data : {}) as ClientDashboardResponse;
  return {
    ...source,
    events: Array.isArray(source.events) ? source.events.map(normalizeClientDashboardEvent) : [],
    total: Number(source.total ?? source.events?.length ?? 0) || 0,
  };
}

function normalizeAdminStorageObject(raw: unknown): AdminStorageObjectItem {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const meta = source.meta && typeof source.meta === "object" ? (source.meta as Record<string, unknown>) : {};
  return {
    id: String(source.id || ""),
    provider: String(source.provider || "local"),
    bucket: source.bucket == null ? null : String(source.bucket),
    objectKey: String(source.objectKey || ""),
    originalFilename: String(source.originalFilename || "file"),
    mimeType: source.mimeType == null ? null : String(source.mimeType),
    sizeBytes: source.sizeBytes == null ? null : Number(source.sizeBytes || 0),
    checksumSha256: source.checksumSha256 == null ? null : String(source.checksumSha256),
    entityType: source.entityType == null ? null : String(source.entityType),
    entityId: source.entityId == null ? null : String(source.entityId),
    ownerUserId: source.ownerUserId == null ? null : String(source.ownerUserId),
    createdByUserId: source.createdByUserId == null ? null : String(source.createdByUserId),
    status: String(source.status || "active"),
    visibility: String(source.visibility || "private"),
    legacyPath: source.legacyPath == null ? null : String(source.legacyPath),
    meta,
    createdAt: source.createdAt == null ? null : String(source.createdAt),
    updatedAt: source.updatedAt == null ? null : String(source.updatedAt),
    deletedAt: source.deletedAt == null ? null : String(source.deletedAt),
  };
}

function normalizeAdminStorageSummary(raw: unknown): AdminStorageSummary {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const providers = source.providers && typeof source.providers === "object"
    ? (source.providers as AdminStorageSummary["providers"])
    : {};
  return {
    totalObjects: Number(source.totalObjects ?? 0) || 0,
    activeObjects: Number(source.activeObjects ?? 0) || 0,
    totalBytes: Number(source.totalBytes ?? 0) || 0,
    providers,
  };
}

export async function getAdminStorageSummary() {
  const data = await authRequest<{ summary: AdminStorageSummary }>("/api/admin/storage/summary");
  return normalizeAdminStorageSummary(data.summary);
}

export async function listAdminStorageObjects(params?: {
  status?: string;
  entityType?: string;
  provider?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.entityType) query.set("entityType", params.entityType);
  if (params?.provider) query.set("provider", params.provider);
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await authRequest<AdminStorageObjectList>(`/api/admin/storage/objects${suffix}`);
  const objects = Array.isArray(data.objects) ? data.objects.map(normalizeAdminStorageObject) : [];
  return {
    objects,
    total: Number(data.total ?? objects.length),
    limit: Number(data.limit ?? params?.limit ?? 50),
    offset: Number(data.offset ?? params?.offset ?? 0),
  };
}

export async function deleteAdminStorageObject(objectId: string) {
  return authRequest<{ ok: boolean; storageObjectId: string; status: string; note?: string }>(
    `/api/admin/storage/objects/${encodeURIComponent(objectId)}`,
    { method: "DELETE" }
  );
}

export async function downloadAdminStorageObjectFile(objectId: string, fileName = "file") {
  await downloadProtectedFile(
    `/api/admin/storage/objects/${encodeURIComponent(objectId)}/download`,
    fileName,
    `/api/admin/storage/objects/${encodeURIComponent(objectId)}/download-url`
  );
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

export async function fetchAdminUserPerformance(options: {
  period?: AdminUserPerformancePeriod;
  date?: string;
} = {}) {
  const params = new URLSearchParams();
  if (options.period) params.set("period", options.period);
  if (options.date) params.set("date", options.date);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return authRequest<AdminUserPerformanceResponse>(`/api/admin/user-performance${suffix}`);
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
  const data = await authRequest<ManagerPerformanceResponse>(`/api/manager/performance${suffix}`);
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
  return authRequest<ManagerPerformanceResponse>(`/api/manager/performance${suffix}`);
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
