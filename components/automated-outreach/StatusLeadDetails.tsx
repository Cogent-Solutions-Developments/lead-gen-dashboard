"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, Clock3, History, Mail, MessageSquareText, UserRound } from "lucide-react";
import { statusLabel } from "@/lib/automatedOutreach";
import { statusActivityTime, type StatusActivityLead, type StatusActivityPage, type StatusHistoryEntry } from "@/lib/statusOutreachActivity";
import { useStatusActivity } from "@/hooks/useStatusActivity";
import styles from "./StatusActivityDrawer.module.css";
import { StatusLeadMail } from "./StatusLeadMail";

function WorkflowHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useStatusActivity<StatusActivityPage<StatusHistoryEntry>>(
    `/status-activity/leads/${encodeURIComponent(id)}/history?offset=${(page - 1) * 10}&limit=10`, 15000);
  return <section aria-label="Lead workflow history" className={styles.history}>
    <div className={styles.historyHeading}>
      <h4><History size={16} aria-hidden="true" />Status history</h4>
      {data && <span className={styles.historyCount}>{data.total.toLocaleString()} {data.total === 1 ? "update" : "updates"}</span>}
    </div>
    <p className={styles.hint}>Newest first · All lead owners</p>
    {error && <p role="alert" className={styles.error}>{error} <button type="button" onClick={reload}>Retry</button></p>}
    {!data && !error && <p role="status" className={styles.hint}>Loading history…</p>}
    {data && !data.total && <p className={styles.historyEmpty}>No workflow history has been recorded.</p>}
    <ol className={styles.timeline}>{data?.items.map(entry => <li key={entry.id}>
      <div className={styles.historyCard}>
        <p className={styles.transition}>{entry.previousStatus === entry.status ? <>Comment / workflow update<span className={styles.historyStatus}>{statusLabel(entry.status)}</span></> : <><span className={styles.fromStatus}>{entry.previousStatus ? statusLabel(entry.previousStatus) : "New"}</span><ArrowRight size={13} aria-hidden="true" /><span className={styles.historyStatus}>{statusLabel(entry.status)}</span></>}</p>
        <dl className={styles.historyMeta}>
          <div><dt>Updated by</dt><dd>{entry.actor || "Not recorded"}<time dateTime={entry.at}>{statusActivityTime(entry.at)}</time></dd></div>
          {entry.previousStatus && <div><dt>Previous update</dt><dd>{entry.previousActor || "Not recorded"}<time dateTime={entry.previousAt || undefined}>{statusActivityTime(entry.previousAt)}</time></dd></div>}
        </dl>
        {entry.comment && <blockquote><MessageSquareText size={13} aria-hidden="true" /><span>{entry.comment}</span></blockquote>}
        <p className={styles.historyOwner}><UserRound size={12} aria-hidden="true" /><span>Lead owner: {entry.owner || "Not recorded"}</span></p>
      </div>
    </li>)}</ol>
    {data && data.total > 10 && <nav aria-label="Status history pagination" className={styles.historyPages}>
      <button type="button" className={styles.button} disabled={page === 1} onClick={() => setPage(value => value - 1)}>Newer</button>
      <span>Page {page} of {Math.ceil(data.total / 10).toLocaleString()}</span>
      <button type="button" className={styles.button} disabled={page * 10 >= data.total} onClick={() => setPage(value => value + 1)}>Older</button>
    </nav>}
  </section>;
}

export function StatusLeadDetails({ lead, onClose }: { lead: StatusActivityLead; onClose: () => void }) {
  const initials = lead.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
  return <aside className={styles.detailPanel} aria-labelledby="status-lead-detail-title">
    <header className={styles.detailHeader}>
      <button type="button" className={styles.textButton} autoFocus onClick={onClose}><ArrowLeft size={15} aria-hidden="true" />Back to leads</button>
      <span className={styles.badge}>{statusLabel(lead.status)}</span>
    </header>
    <div className={styles.detailBody}>
      <section className={styles.profileSummary} aria-label="Lead profile">
        <div className={styles.profileIdentity}>
          <div className={styles.avatar} aria-hidden="true">{initials}</div>
          <div className={styles.profileText}>
            <h3 id="status-lead-detail-title">{lead.name}</h3>
            <p className={styles.profileCompany}><Building2 size={13} aria-hidden="true" /><span>{lead.company || "Company not recorded"}</span></p>
          </div>
        </div>
        <div className={styles.profileContact}>
          <div className={styles.contactAddress}><Mail size={14} aria-hidden="true" />{lead.email ? <a className={styles.email} href={`mailto:${lead.email}`}>{lead.email}</a> : <span>Email not recorded</span>}</div>
          <div className={styles.deliverySummary}><span>Outreach</span><span className={styles.deliveryPill} data-state={lead.deliveryState}><i aria-hidden="true" />{statusLabel(lead.deliveryState)}</span></div>
        </div>
      </section>

      <div className={styles.detailGrid}>
        <section className={`${styles.detailCard} ${styles.eventCard}`} aria-labelledby="lead-event-heading">
          <h4 id="lead-event-heading"><CalendarDays size={15} aria-hidden="true" />Event / campaign</h4>
          <p className={styles.eventTitle}>{lead.eventName}</p>
          <dl className={styles.ownershipGrid}>
            <div><dt>Department</dt><dd>{statusLabel(lead.department)}</dd></div>
            <div><dt>Lead owner</dt><dd>{lead.owner || "Not recorded"}</dd></div>
          </dl>
        </section>
        <section className={`${styles.detailCard} ${styles.latestUpdate}`} aria-labelledby="lead-latest-heading">
          <h4 id="lead-latest-heading"><Clock3 size={15} aria-hidden="true" />Latest status update</h4>
          <dl className={styles.updateFields}>
            <div><dt className={styles.srOnly}>Current status</dt><dd className={styles.statusValue}>{statusLabel(lead.status)}</dd></div>
            <div><dt>Updated by</dt><dd>{lead.actor || "Not recorded"}</dd></div>
            <div><dt className={styles.srOnly}>Updated at</dt><dd><time dateTime={lead.updatedAt}>{statusActivityTime(lead.updatedAt)}</time></dd></div>
          </dl>
        </section>
        <section className={styles.detailCard} aria-labelledby="lead-previous-heading">
          <h4 id="lead-previous-heading"><History size={15} aria-hidden="true" />Previous status</h4>
          {lead.previousStatus ? <dl className={styles.updateFields}>
            <div><dt className={styles.srOnly}>Previous status</dt><dd className={styles.statusValue}>{statusLabel(lead.previousStatus)}</dd></div>
            <div><dt>Updated by</dt><dd>{lead.previousActor || "Not recorded"}</dd></div>
            <div><dt className={styles.srOnly}>Updated at</dt><dd><time dateTime={lead.previousAt || undefined}>{statusActivityTime(lead.previousAt)}</time></dd></div>
          </dl> : <div className={styles.unrecorded}><span>New</span><p>No earlier status update is available.</p></div>}
        </section>
        <section className={`${styles.detailCard} ${styles.latestComment}`}>
          <h4><MessageSquareText size={15} aria-hidden="true" />Latest comment</h4>
          <p className={lead.comment ? undefined : styles.emptyComment}>{lead.comment || "No comment recorded for this status."}</p>
        </section>
      </div>
      {lead.mail && <StatusLeadMail mail={lead.mail} deliveryState={lead.deliveryState} />}
      <WorkflowHistory key={lead.id} id={lead.id} />
    </div>
  </aside>;
}
