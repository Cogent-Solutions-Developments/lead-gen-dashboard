import { MarathonApiClient } from "./marathonApiClient";
import { MarathonPolicy, SalesUser } from "./marathonPolicy";

export type Runner = {
  id: string;
  name: string;
  initials: string;
  proposalCount: number;
};

export class SalesMarathonService {
  constructor(
    private apiClient: MarathonApiClient,
    private policy: MarathonPolicy
  ) {}

  private getInitials(value: string) {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "S";
    return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
  }

  async getLeaderboard(targetDate: Date): Promise<Runner[]> {
    const [backendUsers, events] = await Promise.all([
      this.apiClient.fetchUsers(),
      this.apiClient.fetchEvents(),
    ]);

    const salesUsers = backendUsers
      .filter((u) => this.policy.isEligibleUser(u))
      .map((u) => this.policy.normalizeUser(u));

    const userIdByKey = new Map<string, string>();
    const counts = new Map<string, number>();

    for (const user of salesUsers) {
      counts.set(user.id, 0);
      [user.id, user.username, user.fullName].forEach((value) => {
        const key = value.trim().toLowerCase();
        if (key) userIdByKey.set(key, user.id);
      });
    }

    const eventKeys = events.map((e) => e.canonicalEventKey).filter(Boolean);
    const proposalLeadGroups = await Promise.all(
      eventKeys.map((key) => this.apiClient.fetchProposalLeadsForEvent(key).catch(() => []))
    );

    const leads = proposalLeadGroups.flat();
    
    // Fetch histories in batches to avoid overwhelming the API
    const batchSize = 25;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const histories = await Promise.all(
        batch.map(async (lead) => ({
          lead,
          history: await this.apiClient.fetchWorkflowHistory(lead.id).catch(() => []),
        }))
      );

      for (const { lead, history } of histories) {
        if (this.policy.isProposalOnDate(lead, history, targetDate)) {
          const contributorId = this.policy.getContributorId(lead, history, userIdByKey);
          if (contributorId) {
            counts.set(contributorId, (counts.get(contributorId) || 0) + 1);
          }
        }
      }
    }

    return salesUsers
      .map((user) => ({
        id: user.id,
        name: user.fullName,
        initials: this.getInitials(user.fullName),
        proposalCount: counts.get(user.id) || 0,
      }))
      .sort((a, b) => {
        if (b.proposalCount !== a.proposalCount) return b.proposalCount - a.proposalCount;
        return a.name.localeCompare(b.name);
      });
  }
}
