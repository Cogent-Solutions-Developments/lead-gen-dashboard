import { Check, Mail } from "lucide-react";
import { statusActivityTime, statusMailStep, type StatusLeadMailData } from "@/lib/statusOutreachActivity";
import styles from "./StatusActivityDrawer.module.css";

export function StatusLeadMail({ mail, deliveryState }: { mail: StatusLeadMailData; deliveryState: string }) {
  const awaiting = mail.messages.some(message => !message.confirmedAt && ["handing_off", "accepted"].includes(message.status));
  return <section className={`${styles.detailCard} ${styles.leadMail}`} aria-label="Status Outreach emails">
    <div className={styles.mailTitle}><h4><Mail size={15} aria-hidden="true" />Status Outreach emails</h4><span>{mail.sent} of 3 sent</span></div>
    <ol className={styles.mailSteps}>{[1, 2, 3].map(step => {
      const state = statusMailStep(mail, step, deliveryState);
      return <li key={step} data-tone={state.tone}><span className={styles.mailStepIcon} aria-hidden="true">{state.tone === "sent" ? <Check size={14} /> : <Mail size={14} />}</span><strong>{["1st", "2nd", "3rd"][step - 1]} email</strong><span>{state.label}</span>{state.at && <time dateTime={state.at}>Send confirmed<br />{statusActivityTime(state.at)}</time>}</li>;
    })}</ol>
    {awaiting ? <p className={styles.mailTiming}>Waiting for Make.com to confirm the send.</p> : mail.nextDueAt && <p className={styles.mailTiming}>Planned next send <time dateTime={mail.nextDueAt}>{statusActivityTime(mail.nextDueAt)}</time><span>Subject to delivery settings and event controls.</span></p>}
    {mail.reason && <p className={styles.mailReason}>{mail.reason}</p>}
    <p className={styles.mailFootnote}>Only confirmed sends count toward the three-email sequence.</p>
  </section>;
}
