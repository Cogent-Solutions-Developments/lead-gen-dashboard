import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import type { AuthRole } from "@/lib/auth";

export const TEAM_LEAD_MEMBER_HEADER = "X-Team-Member-User-Id";
export const TEAM_LEAD_TAKEOVER_REASON_HEADER = "X-Team-Takeover-Reason";
export const TEAM_LEAD_TAKEOVER_REQUIRED_EVENT = "leadgen-team-lead-takeover-required";

export type TeamLeadLifecycleStatus = "active" | "inactive" | "resigned" | "terminated";
export type TeamLeadPipeline = "sales" | "delegates" | "production";

export type TeamLeadMember = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  role: string;
  isActive: boolean;
  lifecycleStatus: TeamLeadLifecycleStatus;
  deactivatedAt: string | null;
  deactivationReason: string;
  lastActiveAt: string | null;
  access: {
    canView: boolean;
    canManage: boolean;
    takeoverRequired: boolean;
  };
};

export type TeamLeadRequestScope = {
  memberId: string;
  memberName: string;
  pipeline: TeamLeadPipeline;
  memberHeader?: string;
  takeoverReasonHeader?: string;
  lifecycleStatus: TeamLeadLifecycleStatus;
  isActive: boolean;
  canManage: boolean;
  takeoverRequired: boolean;
  takeoverReason: string;
};

export type TeamLeadActionIdentity = {
  userId: string;
  username: string;
  fullName: string;
};

export type TeamLeadAction = {
  id: string;
  actor: TeamLeadActionIdentity | null;
  owner: TeamLeadActionIdentity | null;
  action: string;
  entityType: string;
  entityId: string;
  outcome: string;
  reason: string;
  createdAt: string | null;
  completedAt: string | null;
  statusCode: number | null;
};

export type TeamLeadApiError = Error & {
  status?: number;
  code?: string;
  data?: unknown;
};

const TEAM_LEAD_MANAGER_ROLES: ReadonlySet<AuthRole> = new Set([
  "sales_manager_user",
  "delegate_manager_user",
  "production_manager_user",
]);

let activeRequestScope: TeamLeadRequestScope | null = null;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function canAccessTeamLeads(role: AuthRole | null | undefined) {
  return Boolean(role && TEAM_LEAD_MANAGER_ROLES.has(role));
}

export function teamLeadPipelineFor(value: unknown): TeamLeadPipeline {
  const normalized = text(value).toLowerCase();
  if (normalized.includes("delegate")) return "delegates";
  if (normalized.includes("production")) return "production";
  return "sales";
}

export function normalizeTeamLeadLifecycleStatus(
  value: unknown,
  isActive = true
): TeamLeadLifecycleStatus {
  const normalized = text(value).toLowerCase();
  if (
    normalized === "active" ||
    normalized === "inactive" ||
    normalized === "resigned" ||
    normalized === "terminated"
  ) {
    return normalized;
  }
  return isActive ? "active" : "inactive";
}

export function normalizeTeamLeadMember(value: unknown): TeamLeadMember {
  const source = record(value) ?? {};
  const access = record(source.access) ?? {};
  const isActive = booleanValue(source.isActive ?? source.is_active, true);
  const reportedLifecycleStatus = normalizeTeamLeadLifecycleStatus(
    source.lifecycleStatus ?? source.lifecycle_status,
    isActive
  );
  const lifecycleStatus =
    !isActive && reportedLifecycleStatus === "active" ? "inactive" : reportedLifecycleStatus;

  return {
    id: text(source.id),
    username: text(source.username),
    fullName: text(source.fullName ?? source.full_name),
    email: text(source.email),
    avatarUrl: text(source.avatarUrl ?? source.avatar_url),
    role: text(source.role),
    isActive: isActive && lifecycleStatus === "active",
    lifecycleStatus,
    deactivatedAt: text(source.deactivatedAt ?? source.deactivated_at) || null,
    deactivationReason: text(source.deactivationReason ?? source.deactivation_reason),
    lastActiveAt: text(source.lastActiveAt ?? source.last_active_at) || null,
    access: {
      canView: booleanValue(access.canView ?? access.can_view, true),
      canManage: booleanValue(access.canManage ?? access.can_manage, false),
      takeoverRequired: booleanValue(
        access.takeoverRequired ?? access.takeover_required,
        isActive && lifecycleStatus === "active"
      ),
    },
  };
}

function normalizeActionIdentity(value: unknown): TeamLeadActionIdentity | null {
  const source = record(value);
  if (!source) return null;
  const userId = text(source.userId ?? source.user_id);
  const username = text(source.username);
  const fullName = text(source.fullName ?? source.full_name);
  if (!userId && !username && !fullName) return null;
  return { userId, username, fullName };
}

export function normalizeTeamLeadAction(value: unknown): TeamLeadAction {
  const source = record(value) ?? {};
  const statusCode = Number(source.statusCode ?? source.status_code);
  return {
    id: text(source.id),
    actor: normalizeActionIdentity(source.actor),
    owner: normalizeActionIdentity(source.owner),
    action: text(source.action),
    entityType: text(source.entityType ?? source.entity_type),
    entityId: text(source.entityId ?? source.entity_id),
    outcome: text(source.outcome),
    reason: text(source.reason),
    createdAt: text(source.createdAt ?? source.created_at) || null,
    completedAt: text(source.completedAt ?? source.completed_at) || null,
    statusCode: Number.isFinite(statusCode) ? statusCode : null,
  };
}

export function isInactiveTeamLeadMember(
  member: Pick<TeamLeadMember, "isActive" | "lifecycleStatus">
) {
  return (
    !member.isActive ||
    member.lifecycleStatus === "inactive" ||
    member.lifecycleStatus === "resigned" ||
    member.lifecycleStatus === "terminated"
  );
}

export function sortTeamLeadMembers<T extends Pick<TeamLeadMember, "isActive" | "lifecycleStatus" | "fullName" | "username">>(
  members: T[]
) {
  return [...members].sort((left, right) => {
    const leftInactive = isInactiveTeamLeadMember(left);
    const rightInactive = isInactiveTeamLeadMember(right);
    if (leftInactive !== rightInactive) return leftInactive ? 1 : -1;
    const leftName = left.fullName || left.username;
    const rightName = right.fullName || right.username;
    return leftName.localeCompare(rightName);
  });
}

export function teamLeadQueryKey(memberId: string, ...parts: Array<string | number | boolean | null | undefined>) {
  return ["team-leads", memberId, ...parts].map((part) => String(part ?? "")).join(":");
}

export function setTeamLeadRequestScope(scope: TeamLeadRequestScope | null) {
  activeRequestScope = scope
    ? {
        ...scope,
        memberId: scope.memberId.trim(),
        takeoverReason: scope.takeoverReason.trim(),
      }
    : null;
}

export function getTeamLeadRequestScope() {
  return activeRequestScope;
}

export function clearTeamLeadRequestScope() {
  activeRequestScope = null;
}

export function isTeamLeadDelegatedUrl(
  value: string | undefined,
  pipeline?: TeamLeadPipeline
) {
  if (!value) return false;
  let pathname = value;
  try {
    pathname = new URL(value, "https://team-leads.local").pathname;
  } catch {
    pathname = value.split("?")[0] || value;
  }

  const resourceNames = [
    "my-leads",
    "campaigns",
    "leads",
    "all/leads",
    "events",
    "workflow-statuses",
  ];
  const pipelines: TeamLeadPipeline[] = pipeline
    ? [pipeline]
    : ["sales", "delegates", "production"];

  return pipelines.some((candidate) => {
    const departmentPrefix =
      candidate === "delegates"
        ? "/api/delegates"
        : candidate === "production"
          ? "/api/productions"
          : "/api";
    return resourceNames.some((resource) => {
      const root = `${departmentPrefix}/${resource}`;
      return pathname === root || pathname.startsWith(`${root}/`);
    });
  });
}

export function isModifyingTeamLeadMethod(method: string | undefined) {
  const normalized = String(method || "get").toLowerCase();
  return normalized === "post" || normalized === "put" || normalized === "patch" || normalized === "delete";
}

function emitTakeoverRequired(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TEAM_LEAD_TAKEOVER_REQUIRED_EVENT, {
      detail: { message },
    })
  );
}

function localRequestError(status: number, code: string, message: string): TeamLeadApiError {
  const error = new Error(message) as TeamLeadApiError;
  error.status = status;
  error.code = code;
  error.data = { code, message };
  return error;
}

export function attachTeamLeadRequestHeaders(config: InternalAxiosRequestConfig) {
  const scope = activeRequestScope;
  if (!scope?.memberId || !isTeamLeadDelegatedUrl(config.url, scope.pipeline)) return config;

  const headers = AxiosHeaders.from(config.headers);
  headers.set(scope.memberHeader || TEAM_LEAD_MEMBER_HEADER, scope.memberId);

  if (isModifyingTeamLeadMethod(config.method)) {
    if (scope.isActive && !scope.canManage && !scope.takeoverRequired) {
      throw localRequestError(
        403,
        "manager_pipeline_permission_denied",
        "You can view this member's leads, but you do not have permission to manage them."
      );
    }

    const validTakeoverReason =
      scope.takeoverReason.trim().length >= 3 && scope.takeoverReason.trim().length <= 500;
    if (scope.isActive && !validTakeoverReason) {
      const message = `Take control of ${scope.memberName || "this member"}'s leads before making changes.`;
      emitTakeoverRequired(message);
      throw localRequestError(409, "team_member_takeover_required", message);
    }

    if (scope.isActive && validTakeoverReason) {
      headers.set(scope.takeoverReasonHeader || TEAM_LEAD_TAKEOVER_REASON_HEADER, scope.takeoverReason);
    }
  }

  config.headers = headers;
  return config;
}

function errorStatus(error: unknown) {
  const source = record(error);
  const response = record(source?.response);
  return Number(source?.status ?? response?.status ?? 0);
}

function errorData(error: unknown) {
  const source = record(error);
  const response = record(source?.response);
  return source?.data ?? response?.data;
}

function errorCode(error: unknown) {
  const data = record(errorData(error));
  const detail = record(data?.detail);
  return text(data?.code ?? detail?.code);
}

function backendMessage(error: unknown) {
  const data = record(errorData(error));
  const detail = data?.detail;
  const detailRecord = record(detail);
  const direct =
    (typeof detail === "string" ? detail : "") ||
    text(detailRecord?.message) ||
    text(data?.message) ||
    text(record(error)?.message);

  if (direct.startsWith("{")) {
    try {
      const parsed = JSON.parse(direct) as Record<string, unknown>;
      return text(parsed.message) || text(parsed.detail) || direct;
    } catch {
      return direct;
    }
  }
  return direct;
}

export function getTeamLeadErrorMessage(error: unknown) {
  const status = errorStatus(error);
  const code = errorCode(error);
  const message = backendMessage(error);

  if (status === 403) {
    return message || "Manager role or pipeline permission was denied.";
  }
  if (status === 404) {
    return message || "This member or resource is unavailable or outside your department.";
  }
  if (status === 409) {
    const takeoverMessage = message || "This active member requires a takeover reason before changes can be made.";
    emitTakeoverRequired(takeoverMessage);
    return takeoverMessage;
  }
  if (status === 503 && code === "manager_lead_audit_unavailable") {
    return "The action was not executed because it could not be safely audited.";
  }
  return message || "The Team Leads request could not be completed.";
}
