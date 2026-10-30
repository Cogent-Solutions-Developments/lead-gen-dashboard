import { label, taskLabel, type Context, type History } from "./api";

const identifier = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

export function activitySummary(item: History, context: Context) {
  const person = (id: unknown) => context.users.find(user => user.id === id)?.name || "Team member";
  const event = (id: unknown) => id === "default" ? "All events" : context.events.find(entry => entry.id === id)?.name || "Selected event";
  const value = (key: string, entry: unknown): string => {
    if (entry === null || entry === "" || entry === undefined) return "Automatic";
    const field = key.replace(/_/g, "").toLowerCase();
    if (typeof entry === "object" && "before" in entry && "after" in entry) {
      return `${value(key, entry.before)} → ${value(key, entry.after)}`;
    }
    if (["userid", "assigneeid", "ownerid"].includes(field)) return person(entry);
    if (["eventid", "scope"].includes(field)) return event(entry);
    if (field === "kind" || field === "taskkind") return taskLabel(String(entry));
    if (typeof entry === "boolean") return entry ? "Enabled" : "Disabled";
    if (Array.isArray(entry)) return entry.map(part => value(key, part)).join(", ");
    if (typeof entry === "object") return "Updated";
    return identifier.test(String(entry)) ? "Updated" : String(entry);
  };
  const action = item.action.replace(/_/g, " ");
  if (action.toLowerCase().includes("social") && typeof item.detail.enabled === "boolean") {
    return {
      title: `Social publishing ${item.detail.enabled ? "enabled" : "disabled"}`,
      description: `${person(item.detail.userId || item.detail.user_id)} ${item.detail.enabled ? "can now handle" : "no longer handles"} social media tasks.`,
    };
  }
  const fields: Record<string, string> = {
    userId: "Team member", user_id: "Team member", assigneeId: "Assigned to", ownerId: "Owner",
    kind: "Work type", taskKind: "Work type", scope: "Applies to", eventId: "Event", enabled: "Responsibility",
  };
  const details = Object.entries(item.detail)
    .filter(([key]) => !["requestId", "request_id", "id", "version", "revision"].includes(key))
    .map(([key, entry]) => `${fields[key] || label(key.replace(/([a-z])([A-Z])/g, "$1 $2"))}: ${value(key, entry)}`);
  return { title: label(action), description: details.join(" · ") || "Change recorded." };
}
