import { CircleAlert, Clock3, MailCheck, Send } from "lucide-react";
import type { StatusMailSummary as MailSummary } from "@/lib/statusOutreachActivity";
import styles from "./StatusActivityChart.module.css";

export function StatusMailSummary({ mail }: { mail: MailSummary }) {
  return <section className={styles.mailSummary} aria-label="Status Outreach mail summary">
    <div className={styles.mailHeading}><h3>Status Outreach mail</h3><p>For leads in this chart · All-time sends</p></div>
    <dl className={styles.mailMetrics}>
      <div><dt><MailCheck size={14} aria-hidden="true" />Confirmed sends</dt><dd>{mail.sent.toLocaleString()}<span>{mail.sent24h.toLocaleString()} confirmed in 24h</span></dd></div>
      <div><dt><Send size={14} aria-hidden="true" />Awaiting confirmation</dt><dd>{mail.awaitingConfirmation.toLocaleString()}<span>Emails handed to Make.com</span></dd></div>
      <div><dt><Clock3 size={14} aria-hidden="true" />Planned next sends</dt><dd>{mail.scheduledLeads.toLocaleString()}<span>Leads with a next send planned</span></dd></div>
      <div data-attention={mail.needsAttention > 0}><dt><CircleAlert size={14} aria-hidden="true" />Needs attention</dt><dd>{mail.needsAttention.toLocaleString()}<span>Leads blocked or with an issue</span></dd></div>
    </dl>
    <p className={styles.mailNote}>Planned sends follow delivery settings and event controls. {mail.pausedLeads.toLocaleString()} leads paused.</p>
  </section>;
}
