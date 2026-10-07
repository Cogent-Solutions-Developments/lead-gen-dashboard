import { getAuthHeader } from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";

export type Task = {
  id: string;
  kind: string;
  assigneeId: string | null;
  assigneeName: string;
  status: string;
  note: string;
  revision: number;
  completedAt: string | null;
  canUpdate: boolean;
};
export type History = {
  id: string;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
  createdAt: string;
  requestId?: string;
};
export type RequestSummary = {
  id: string;
  title: string;
  kind: string;
  status: string;
  eventId: string;
  priority: string;
  dueAt: string | null;
  updatedAt: string;
};
export type MarketingRequest = RequestSummary & {
  requesterId: string;
  requesterName: string;
  department: string;
  details: Record<string, string>;
  version: number;
  revision: number;
  canEdit: boolean;
  tasks: Task[];
  history: History[];
};
export type Member = {
  id: string;
  name: string;
  role: string;
  social: boolean;
};
export type Context = {
  manager: boolean;
  staff: boolean;
  userId: string;
  role: string;
  events: { id: string; name: string }[];
  users: Member[];
  assignments: { scope: string; kind: string; userId: string }[];
};
export type Asset = {
  id: string;
  eventId: string;
  category: string;
  title: string;
  version: number;
  status: string;
  createdAt: string;
  releasedAt: string | null;
  downloadUrl: string;
  createdByName?: string;
  releasedByName?: string;
  fileName?: string;
};

function baseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  if (!base) throw new Error("API URL is not configured");
  return base;
}

export async function marketing<T>(
  path: string,
  method = "GET",
  payload?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const isForm = payload instanceof FormData;
  const response = await fetch(`${baseUrl()}/api/marketing-workflow${path}`, {
    method,
    signal,
    headers: {
      ...getAuthHeader(),
      ...getLocalDevNgrokHeaders(),
      ...(!isForm && payload !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      payload === undefined
        ? undefined
        : isForm
          ? payload
          : JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : data.detail?.message ||
          (response.status === 422
            ? "Check the required fields and file format."
            : "Marketing request failed."),
    );
  return data as T;
}

export async function download(path: string, filename: string) {
  const response = await fetch(`${baseUrl()}${path}`, {
    headers: { ...getAuthHeader(), ...getLocalDevNgrokHeaders() },
  });
  if (!response.ok)
    throw new Error(
      "The file is unavailable or you do not have permission to download it.",
    );
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const label = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
export const taskLabel = (kind: string) =>
  ({
    website: "Website update",
    flyer: "Speaker flyer design",
    agenda: "Agenda update",
    social: "Social media",
    leads: "Lead delivery",
  })[kind] || label(kind);
export const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "No deadline";
export function eligible(users: Member[], kind: string) {
  const role =
    kind === "website"
      ? "marketing_developer_user"
      : kind === "leads"
        ? "marketing_manager_user"
        : "marketing_designer_user";
  return users.filter((u) => (kind === "social" ? u.social : u.role === role));
}
