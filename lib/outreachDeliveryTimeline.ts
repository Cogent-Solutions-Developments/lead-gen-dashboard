import type { OutreachLead } from "./automatedOutreach";

const labels: Record<string, string> = {
  preview: "Content ready", preview_queued: "Content queued", preview_generating: "Preparing content", preview_failed: "Content failed",
  generating: "Preparing content", ready: "Ready", handing_off: "Sending to Make.com",
  accepted: "Awaiting confirmation", uncertain: "Needs confirmation", failed: "Failed",
  sent: "Sent", delivered: "Delivered", opened: "Open reported", clicked: "Click reported",
  replied: "Replied", bounced: "Bounced", unsubscribed: "Unsubscribed",
};
const confirmedStates = new Set(["sent", "delivered", "opened", "clicked", "replied"]);
const stoppedStates = new Set(["stopped", "opted_out", "replied", "bounced", "excluded", "completed"]);

export function outreachDeliverySteps(lead: OutreachLead) {
  return [1, 2, 3].map(step => {
    const message = lead.messages.find(item => item.step === step);
    const tracking = message?.tracking ?? {};
    const confirmed = Boolean(message && (confirmedStates.has(message.status) || tracking.sentAt || tracking.deliveredAt || tracking.openedAt || tracking.clickedAt || tracking.repliedAt));
    const needsAttention = Boolean(message && ["failed", "uncertain", "bounced", "preview_failed"].includes(message.status));
    const scheduled = (!message || message.status.startsWith("preview")) && lead.state === "active" && step === lead.sentCount + 1 && Boolean(lead.nextDueAt);
    const state = message ? labels[message.status] || "Pending" : stoppedStates.has(lead.state) ? "Not scheduled" : lead.state === "paused" ? "Paused" : lead.state === "blocked" ? "Blocked" : scheduled ? "Scheduled" : "Waiting";
    const occurredAt = message ? tracking[`${message.status}At`] || tracking.sentAt || tracking.deliveredAt || tracking.openedAt || tracking.clickedAt || tracking.repliedAt || null : null;
    return { step, label: `${["1st", "2nd", "3rd"][step - 1]} outreach`, state, confirmed, needsAttention, date: occurredAt || (scheduled ? lead.nextDueAt : null), scheduled };
  });
}

export function outreachTimelineDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}