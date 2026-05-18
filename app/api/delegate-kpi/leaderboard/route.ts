import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type BackendUser = {
  id?: string;
  username?: string;
  fullName?: string;
  full_name?: string;
  role?: string;
  isActive?: boolean;
  is_active?: boolean;
};

type BackendEvent = {
  canonicalEventKey?: string;
};

type BackendLead = {
  id?: string;
  workflowCommentUpdatedAt?: string | null;
  workflowCommentUpdatedByUserId?: string | null;
  workflowCommentUpdatedByUsername?: string | null;
  workflowCommentUpdatedByUserDisplayName?: string | null;
};

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
}

function getApiKey() {
  return (process.env.NEXT_PUBLIC_API_KEY || "").trim();
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "D";
  return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
}

function isToday(value?: string | null) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  return (
    parsed.getFullYear() === today.getFullYear() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getDate() === today.getDate()
  );
}

async function fetchJson<T>(url: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchConfirmedLeadsForEvent(baseUrl: string, apiKey: string, eventKey: string) {
  const leads: BackendLead[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const url = `${baseUrl}/api/delegates/events/${encodeURIComponent(eventKey)}/leads?workflowStatus=confirmed&includeManual=true&limit=${limit}&offset=${offset}`;
    const data = await fetchJson<{ items?: BackendLead[]; hasMore?: boolean }>(url, apiKey);
    leads.push(...(Array.isArray(data.items) ? data.items : []));

    if (!data.hasMore) break;
    offset += limit;
  }

  return leads;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const authorization = request.headers.get("authorization") || "";

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ detail: "Delegate KPI API is not configured." }, { status: 500 });
  }

  if (!authorization) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const authCheck = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      Authorization: authorization,
      "x-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!authCheck.ok) {
    return NextResponse.json({ detail: "Authentication required." }, { status: authCheck.status });
  }

  try {
    const usersResponse = await fetchJson<{ users?: BackendUser[] }>(`${baseUrl}/api/auth/users`, apiKey);
    const delegateUsers = (Array.isArray(usersResponse.users) ? usersResponse.users : [])
      .filter((user) => String(user.role || "").trim() === "delegate_user" && (user.isActive ?? user.is_active) !== false)
      .map((user) => {
        const id = String(user.id || "").trim();
        const username = String(user.username || "").trim();
        const fullName = String(user.fullName || user.full_name || "").trim();
        const name = fullName || username || id;
        return {
          id,
          username,
          name,
          initials: getInitials(name),
          proposalCount: 0,
        };
      })
      .filter((user) => user.id);

    const userIdByKey = new Map<string, string>();
    delegateUsers.forEach((user) => {
      [user.id, user.username, user.name].forEach((value) => {
        const key = value.trim().toLowerCase();
        if (key) userIdByKey.set(key, user.id);
      });
    });

    const counts = new Map(delegateUsers.map((user) => [user.id, 0]));
    const eventsResponse = await fetchJson<{ events?: BackendEvent[] }>(`${baseUrl}/api/delegates/events`, apiKey);
    const eventKeys = (Array.isArray(eventsResponse.events) ? eventsResponse.events : [])
      .map((event) => String(event.canonicalEventKey || "").trim())
      .filter(Boolean);

    const leadGroups = await Promise.all(
      eventKeys.map((eventKey) => fetchConfirmedLeadsForEvent(baseUrl, apiKey, eventKey).catch(() => []))
    );

    leadGroups.flat().forEach((lead) => {
      if (!isToday(lead.workflowCommentUpdatedAt)) return;
      const contributorId = [
        lead.workflowCommentUpdatedByUserId,
        lead.workflowCommentUpdatedByUsername,
        lead.workflowCommentUpdatedByUserDisplayName,
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .map((value) => userIdByKey.get(value))
        .find(Boolean);

      if (contributorId) counts.set(contributorId, (counts.get(contributorId) || 0) + 1);
    });

    const runners = delegateUsers
      .map((user) => ({ ...user, proposalCount: counts.get(user.id) || 0 }))
      .sort((a, b) => {
        if (b.proposalCount !== a.proposalCount) return b.proposalCount - a.proposalCount;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({ runners }, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Failed to load delegate KPI.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
