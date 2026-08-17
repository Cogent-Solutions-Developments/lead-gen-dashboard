import type { AxiosRequestConfig, Method } from "axios";
import { apiClient } from "@/lib/apiClient";
import {
  TEAM_LEAD_MEMBER_HEADER,
  TEAM_LEAD_TAKEOVER_REASON_HEADER,
  isTeamLeadDelegatedUrl,
  normalizeTeamLeadAction,
  normalizeTeamLeadMember,
  sortTeamLeadMembers,
  type TeamLeadAction,
  type TeamLeadMember,
  type TeamLeadPipeline,
} from "@/lib/teamLeads";

export type TeamLeadManagerScope = {
  persona?: "sales" | "delegates" | "production" | string;
  pipeline?: string;
  department?: string;
  managerUserId?: string;
  managerName?: string;
};

export type TeamLeadDelegationMetadata = {
  memberHeader: string;
  takeoverReasonHeader: string;
};

export type TeamLeadMembersResponse = {
  managerScope: TeamLeadManagerScope;
  delegation: TeamLeadDelegationMetadata;
  members: TeamLeadMember[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
};

export type { TeamLeadAction } from "@/lib/teamLeads";

export type TeamLeadActionsResponse = {
  actions: TeamLeadAction[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
};

type TeamLeadRequestOptions<TData = unknown> = {
  memberId: string;
  pipeline: TeamLeadPipeline;
  takeoverReason?: string;
  method: Method;
  url: string;
  data?: TData;
  params?: Record<string, unknown>;
  responseType?: AxiosRequestConfig["responseType"];
  memberHeader?: string;
  takeoverReasonHeader?: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function number(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function teamLeadRequest<TResponse, TData = unknown>({
  memberId,
  pipeline,
  takeoverReason,
  method,
  url,
  data,
  params,
  responseType,
  memberHeader = TEAM_LEAD_MEMBER_HEADER,
  takeoverReasonHeader = TEAM_LEAD_TAKEOVER_REASON_HEADER,
}: TeamLeadRequestOptions<TData>) {
  if (!isTeamLeadDelegatedUrl(url, pipeline)) {
    throw new Error("Delegation headers can only be used with the selected department's My Leads resources.");
  }
  const headers: Record<string, string> = {
    [memberHeader]: memberId,
  };
  if (takeoverReason?.trim()) headers[takeoverReasonHeader] = takeoverReason.trim();

  const response = await apiClient.request<TResponse>({
    method,
    url,
    data,
    params,
    responseType,
    headers,
  });
  return response.data;
}

export async function listTeamLeadMembers(params: {
  search?: string;
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
} = {}): Promise<TeamLeadMembersResponse> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const { data } = await apiClient.get<Record<string, unknown>>("/api/manager/team-leads/members", {
    params: {
      includeInactive: params.includeInactive ?? true,
      search: params.search?.trim() || undefined,
      limit,
      offset,
    },
  });
  const rawPagination = record(data.pagination);
  const members = sortTeamLeadMembers(
    (Array.isArray(data.members) ? data.members : []).map(normalizeTeamLeadMember)
  );
  const total = number(rawPagination.total ?? data.total, members.length);
  const responseLimit = number(rawPagination.limit, limit);
  const responseOffset = number(rawPagination.offset, offset);

  return {
    managerScope: record(data.managerScope) as TeamLeadManagerScope,
    delegation: {
      memberHeader:
        text(record(data.delegation).memberHeader) || TEAM_LEAD_MEMBER_HEADER,
      takeoverReasonHeader:
        text(record(data.delegation).takeoverReasonHeader) || TEAM_LEAD_TAKEOVER_REASON_HEADER,
    },
    members,
    pagination: {
      limit: responseLimit,
      offset: responseOffset,
      total,
      hasMore:
        typeof rawPagination.hasMore === "boolean"
          ? rawPagination.hasMore
          : responseOffset + members.length < total,
    },
  };
}

export async function listTeamLeadActions(params: {
  memberUserId: string;
  action?: string;
  outcome?: string;
  limit?: number;
  offset?: number;
}): Promise<TeamLeadActionsResponse> {
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;
  const { data } = await apiClient.get<Record<string, unknown>>(
    "/api/manager/team-leads/actions",
    {
      params: {
      memberUserId: params.memberUserId,
      action: params.action?.trim() || undefined,
      outcome: params.outcome?.trim() || undefined,
      limit,
      offset,
    },
    }
  );
  const rawPagination = record(data.pagination);
  const rawActions = Array.isArray(data.actions)
    ? data.actions
    : Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.events)
        ? data.events
      : [];
  const actions = rawActions.map(normalizeTeamLeadAction);
  const total = number(rawPagination.total ?? data.total, actions.length);
  const responseLimit = number(rawPagination.limit, limit);
  const responseOffset = number(rawPagination.offset, offset);

  return {
    actions,
    pagination: {
      limit: responseLimit,
      offset: responseOffset,
      total,
      hasMore:
        typeof rawPagination.hasMore === "boolean"
          ? rawPagination.hasMore
          : responseOffset + actions.length < total,
    },
  };
}
