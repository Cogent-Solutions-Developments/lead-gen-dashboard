import { BackendUser, BackendLead, WorkflowStatusHistoryItem } from "./marathonApiClient";

export type SalesUser = {
  id: string;
  username: string;
  fullName: string;
};

export class MarathonPolicy {
  isEligibleUser(user: BackendUser): boolean {
    const role = String(user.role || "").trim();
    const isActive = user.isActive ?? user.is_active;
    return role === "sales_user" && isActive !== false;
  }

  normalizeUser(user: BackendUser): SalesUser {
    const id = String(user.id || "").trim();
    const username = String(user.username || "").trim();
    const fullName = String(user.fullName || user.full_name || "").trim();
    return {
      id,
      username,
      fullName: fullName || username || id,
    };
  }

  isProposalOnDate(lead: BackendLead, history: WorkflowStatusHistoryItem[], targetDate: Date): boolean {
    const proposalEntry = history.find((entry) => entry.workflowStatus === "proposal-sent");
    const createdAtStr = proposalEntry?.createdAt || lead.workflowCommentUpdatedAt;
    
    if (!createdAtStr) return false;

    const createdAt = new Date(createdAtStr);
    
    // Compare dates (ignoring time)
    return (
      createdAt.getFullYear() === targetDate.getFullYear() &&
      createdAt.getMonth() === targetDate.getMonth() &&
      createdAt.getDate() === targetDate.getDate()
    );
  }

  getContributorId(
    lead: BackendLead,
    history: WorkflowStatusHistoryItem[],
    userIdByKey: Map<string, string>
  ): string | undefined {
    const proposalEntry = history.find((entry) => entry.workflowStatus === "proposal-sent");
    
    const identifiers = [
      proposalEntry?.updatedByUserId,
      proposalEntry?.updatedByUsername,
      proposalEntry?.updatedByUserDisplayName,
      lead.workflowCommentUpdatedByUserId,
      lead.workflowCommentUpdatedByUsername,
      lead.workflowCommentUpdatedByUserDisplayName,
    ];

    for (const id of identifiers) {
      const normalized = String(id || "").trim().toLowerCase();
      if (normalized && userIdByKey.has(normalized)) {
        return userIdByKey.get(normalized);
      }
    }

    return undefined;
  }
}
