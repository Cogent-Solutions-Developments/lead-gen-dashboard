import type {
  ManagerPerformanceActivity,
  ManagerPerformanceResponse,
  ManagerPerformanceTeamUser,
  ManagerUserPerformance,
} from "@/lib/auth";

export function activeManagerUsers(users?: ManagerPerformanceTeamUser[] | null) {
  return (users || []).filter((user) => user.isActive !== false);
}

export function activeUserPerformance(
  performance: ManagerUserPerformance[] | undefined,
  users: ManagerPerformanceTeamUser[]
) {
  const activeIds = new Set(users.map((user) => user.id));
  return (performance || []).filter((item) => activeIds.has(item.userId));
}

export function activePerformanceSummary(data: ManagerPerformanceResponse | null) {
  const users = activeManagerUsers(data?.teamUsers);
  const performance = activeUserPerformance(data?.perUserPerformance, users);
  return { users, performance };
}

function name(displayName?: string | null, username?: string | null, fallback = "Unknown user") {
  return String(displayName || username || "").trim() || fallback;
}

export function managerActivityAttribution(activity: ManagerPerformanceActivity) {
  const executor = name(activity.commentUpdatedByUserDisplayName || activity.userDisplayName, activity.commentUpdatedByUsername || activity.username);
  if (activity.isTakeoverExecution) {
    const owner = name(activity.taskOwnerDisplayName, activity.taskOwnerUsername, "");
    if (!owner) return `Task executed by ${executor}.`;
    if (activity.taskOwnerIsActive === false) return `Task executed by ${executor} for inactive user ${owner}.`;
    return `Task executed by ${executor} on behalf of ${owner}.`;
  }
  return activity.updatedByUserIsActive === false
    ? `Updated by ${executor} (inactive at present).`
    : `Updated by ${executor}.`;
}
