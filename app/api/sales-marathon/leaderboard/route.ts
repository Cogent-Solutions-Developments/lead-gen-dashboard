import { NextRequest } from "next/server";

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
  workflowStatus?: string | null;
  workflowStatusLabel?: string | null;
  workflowCommentUpdatedAt?: string | null;
  workflowCommentUpdatedByUserId?: string | null;
  workflowCommentUpdatedByUsername?: string | null;
  workflowCommentUpdatedByUserDisplayName?: string | null;
};

type WorkflowStatusHistoryItem = {
  workflowStatus?: string | null;
  workflowStatusLabel?: string | null;
  updatedByUserId?: string | null;
  updatedByUsername?: string | null;
  updatedByUserDisplayName?: string | null;
  createdAt?: string | null;
};

type SalesUser = {
  id: string;
  username: string;
  fullName: string;
};

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
}

function getApiKey() {
  return (process.env.NEXT_PUBLIC_API_KEY || "").trim();
}

function normalizeKey(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "S";
  return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
}

function normalizeSalesUser(user: BackendUser): SalesUser | null {
  const id = String(user.id || "").trim();
  const username = String(user.username || "").trim();
  const fullName = String(user.fullName || user.full_name || "").trim();
  const role = String(user.role || "").trim();
  const isActive = user.isActive ?? user.is_active;

  if (!id || role !== "sales_user" || isActive === false) return null;
  return {
    id,
    username,
    fullName: fullName || username || id,
  };
}

async function fetchJson<T>(url: string, apiKey: string) {
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

async function fetchProposalLeadsForEvent(baseUrl: string, apiKey: string, eventKey: string) {
  const leads: BackendLead[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const url = `${baseUrl}/api/events/${encodeURIComponent(eventKey)}/leads?workflowStatus=proposal-sent&limit=${limit}&offset=${offset}`;
    const data = await fetchJson<{ items?: BackendLead[]; hasMore?: boolean }>(url, apiKey);
    leads.push(...(Array.isArray(data.items) ? data.items : []));

    if (!data.hasMore) break;
    offset += limit;
  }

  return leads;
}

async function fetchWorkflowHistory(baseUrl: string, apiKey: string, leadId: string) {
  const url = `${baseUrl}/api/leads/${encodeURIComponent(leadId)}/workflow-status-history`;
  const data = await fetchJson<{ history?: WorkflowStatusHistoryItem[] }>(url, apiKey);
  return Array.isArray(data.history) ? data.history : [];
}

async function fetchHistoriesForLeads(baseUrl: string, apiKey: string, leads: BackendLead[]) {
  const histories = new Map<string, WorkflowStatusHistoryItem[]>();
  const leadIds = Array.from(new Set(leads.map((lead) => String(lead.id || "").trim()).filter(Boolean)));
  const batchSize = 25;

  for (let index = 0; index < leadIds.length; index += batchSize) {
    const batch = leadIds.slice(index, index + batchSize);
    const batchHistories = await Promise.all(
      batch.map(async (leadId) => ({
        leadId,
        history: await fetchWorkflowHistory(baseUrl, apiKey, leadId).catch(() => []),
      }))
    );

    for (const item of batchHistories) {
      histories.set(item.leadId, item.history);
    }
  }

  return histories;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const authorization = request.headers.get("authorization") || "";

  if (!baseUrl || !apiKey) {
    return jsonResponse({ detail: "Sales marathon API is not configured." }, 500);
  }

  if (!authorization) {
    return jsonResponse({ detail: "Authentication required." }, 401);
  }

  const authCheck = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      Authorization: authorization,
      "x-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!authCheck.ok) {
    return jsonResponse({ detail: "Authentication required." }, authCheck.status);
  }

  try {
    const [usersData, eventsData] = await Promise.all([
      fetchJson<{ users?: BackendUser[] }>(`${baseUrl}/api/auth/users`, apiKey),
      fetchJson<{ events?: BackendEvent[] }>(`${baseUrl}/api/events`, apiKey),
    ]);

    const salesUsers = (Array.isArray(usersData.users) ? usersData.users : [])
      .map(normalizeSalesUser)
      .filter((user): user is SalesUser => Boolean(user));

    const userIdByKey = new Map<string, string>();
    const counts = new Map<string, number>();

    for (const user of salesUsers) {
      counts.set(user.id, 0);
      [user.id, user.username, user.fullName].forEach((value) => {
        const key = normalizeKey(value);
        if (key) userIdByKey.set(key, user.id);
      });
    }

    const eventKeys = (Array.isArray(eventsData.events) ? eventsData.events : [])
      .map((event) => String(event.canonicalEventKey || "").trim())
      .filter(Boolean);

    const proposalLeadGroups = await Promise.all(
      eventKeys.map((eventKey) => fetchProposalLeadsForEvent(baseUrl, apiKey, eventKey).catch(() => []))
    );

    const leads = proposalLeadGroups.flat();
    const historiesByLeadId = await fetchHistoriesForLeads(baseUrl, apiKey, leads);

    for (const lead of leads) {
      const leadId = String(lead.id || "").trim();
      const history = leadId ? historiesByLeadId.get(leadId) || [] : [];
      const proposalEntry = history.find((entry) => entry.workflowStatus === "proposal-sent");
      const userId = [
        proposalEntry?.updatedByUserId,
        proposalEntry?.updatedByUsername,
        proposalEntry?.updatedByUserDisplayName,
        lead.workflowCommentUpdatedByUserId,
        lead.workflowCommentUpdatedByUsername,
        lead.workflowCommentUpdatedByUserDisplayName,
      ]
        .map((value) => userIdByKey.get(normalizeKey(value)))
        .find(Boolean);

      if (!userId) continue;
      counts.set(userId, (counts.get(userId) || 0) + 1);
    }

    const runners = salesUsers
      .map((user) => ({
        id: user.id,
        name: user.fullName,
        initials: getInitials(user.fullName),
        proposalCount: counts.get(user.id) || 0,
      }))
      .sort((a, b) => {
        if (b.proposalCount !== a.proposalCount) return b.proposalCount - a.proposalCount;
        return a.name.localeCompare(b.name);
      })
      .map((runner, index) => ({ ...runner, lane: index % 3 }));

    return jsonResponse({ runners }, 200);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Failed to load sales marathon.";
    return jsonResponse({ detail }, 500);
  }
}
