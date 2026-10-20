import type { OutreachAudit } from "./automatedOutreach";

const activityCopy: Record<string, [string, string]> = {
  content_previews_requested: ["Email previews requested", "The content agents will prepare the remaining outreach emails for viewing. No mail is sent."],
  content_preview_ready: ["Email preview ready", "The subject and body are available under Content & delivery. Final content is refreshed before sending."],
  content_preview_failed: ["Email preview could not be prepared", "Open Content & delivery to retry, or use Runs & recovery to resume saved progress."],
  enrolled: ["Added to Status Outreach", "This lead was added to the three-email outreach sequence. Sending depends on eligibility and delivery settings."],
  admin_pause: ["Outreach paused", "An administrator paused future emails for this lead."],
  admin_resume: ["Outreach resumed", "An administrator resumed this lead’s sequence. Eligibility is checked before the next email."],
  admin_stop: ["Outreach stopped", "An administrator stopped this lead’s remaining emails."],
  admin_opt_out: ["Recipient opted out", "An administrator blocked further Status Outreach to this email address."],
  admin_retry: ["Content retry requested", "An administrator requested another attempt to generate the email content."],
  agent_recovery_queued: ["Content recovery queued", "An administrator requested recovery of a failed content run. Saved stages can be reused when the configuration still matches."],
  generation_started: ["Content generation started", "The content agents started preparing this email."],
  generation_failed: ["Content generation failed", "The email could not be prepared. Check Runs & recovery for the failure and recovery options."],
  handoff_started: ["Preparing email for Make.com", "The system started the delivery handoff. This does not confirm that an email was sent."],
  handoff_cancelled: ["Send cancelled before handoff", "The email was held because delivery conditions changed before it reached Make.com."],
  handoff_accepted: ["Accepted by Make.com", "Make.com accepted the request. Send confirmation is still pending."],
  handoff_uncertain: ["Send confirmation needed", "The handoff result is unknown. Automatic resend is blocked to prevent duplicate emails."],
  handoff_failed: ["Delivery handoff failed", "The email could not be handed to Make.com. Review the delivery details before retrying."],
  stale_message: ["Processing interrupted", "Processing did not finish in time. Review the content or delivery details before recovering."],
  mail_webhook_selected: ["Make.com webhook selected", "The system selected an active Status Outreach webhook for this email."],
  provider_sent: ["Email sent", "The delivery service confirmed that the email was sent."],
  provider_delivered: ["Email delivered", "The delivery service reported delivery to the recipient."],
  provider_opened: ["Email open reported", "The delivery service reported an email open."],
  provider_clicked: ["Link click reported", "The delivery service reported a link click."],
  provider_replied: ["Reply received", "A reply was reported. Further Status Outreach to this email address is stopped."],
  provider_bounced: ["Email bounced", "Delivery failed for this recipient. Further Status Outreach to this email address is stopped."],
  provider_unsubscribed: ["Recipient unsubscribed", "The recipient opted out. Further Status Outreach to this email address is blocked."],
  provider_failed: ["Email delivery failed", "The delivery service reported a failure. Review delivery details before any resend."],
};

export function describeOutreachActivity(item: OutreachAudit) {
  const [title, description] = activityCopy[item.action] ?? ["Outreach activity recorded", "An update was recorded for this lead. Reference details are available below."];
  return {
    title, description,
    actor: item.actor === "system" ? "Automatic process" : item.actor === "provider" ? "Delivery service" : "Administrator",
    step: typeof item.details.step === "number" && item.details.step >= 1 && item.details.step <= 3 ? item.details.step : null,
    reason: typeof item.details.reason === "string" ? item.details.reason : null,
    webhook: typeof item.details.webhookName === "string" ? item.details.webhookName : null,
  };
}

export const deliveryStateLabels: Record<string, string> = {
  active: "Active", paused: "Paused", attention: "Needs attention", failed: "Content failed",
  blocked: "Blocked", completed: "3 emails sent", stopped: "Stopped", opted_out: "Opted out",
  replied: "Replied", bounced: "Bounced", excluded: "No longer eligible",
};