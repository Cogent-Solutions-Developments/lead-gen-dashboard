export type BackendUser = {
  id: string;
  username: string;
  fullName?: string;
  full_name?: string;
  role: string;
  isActive?: boolean;
  is_active?: boolean;
};

export type BackendEvent = {
  canonicalEventKey: string;
};

export type BackendLead = {
  id: string;
  workflowStatus?: string | null;
  workflowCommentUpdatedAt?: string | null;
  workflowCommentUpdatedByUserId?: string | null;
  workflowCommentUpdatedByUsername?: string | null;
  workflowCommentUpdatedByUserDisplayName?: string | null;
};

export type WorkflowStatusHistoryItem = {
  workflowStatus?: string | null;
  updatedByUserId?: string | null;
  updatedByUsername?: string | null;
  updatedByUserDisplayName?: string | null;
  createdAt?: string | null;
};

export class MarathonApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.trim().replace(/\/+$/, "");
    this.apiKey = apiKey.trim();
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: { "x-api-key": this.apiKey },
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || `Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async fetchUsers(): Promise<BackendUser[]> {
    const data = await this.fetchJson<{ users?: BackendUser[] }>(`${this.baseUrl}/api/auth/users`);
    return Array.isArray(data.users) ? data.users : [];
  }

  async fetchEvents(): Promise<BackendEvent[]> {
    const data = await this.fetchJson<{ events?: BackendEvent[] }>(`${this.baseUrl}/api/events`);
    return Array.isArray(data.events) ? data.events : [];
  }

  async fetchProposalLeadsForEvent(eventKey: string): Promise<BackendLead[]> {
    const leads: BackendLead[] = [];
    let offset = 0;
    const limit = 200;

    while (true) {
      const url = `${this.baseUrl}/api/events/${encodeURIComponent(eventKey)}/leads?workflowStatus=proposal-sent&limit=${limit}&offset=${offset}`;
      const data = await this.fetchJson<{ items?: BackendLead[]; hasMore?: boolean }>(url);
      leads.push(...(Array.isArray(data.items) ? data.items : []));

      if (!data.hasMore) break;
      offset += limit;
    }

    return leads;
  }

  async fetchWorkflowHistory(leadId: string): Promise<WorkflowStatusHistoryItem[]> {
    const url = `${this.baseUrl}/api/leads/${encodeURIComponent(leadId)}/workflow-status-history`;
    const data = await this.fetchJson<{ history?: WorkflowStatusHistoryItem[] }>(url);
    return Array.isArray(data.history) ? data.history : [];
  }

  async checkAuth(authorization: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      headers: {
        Authorization: authorization,
        "x-api-key": this.apiKey,
      },
      cache: "no-store",
    });
    return response.ok;
  }
}
