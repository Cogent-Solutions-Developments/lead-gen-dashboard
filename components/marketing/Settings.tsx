"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Globe, Megaphone, Palette, FileText, Users, AlertCircle } from "lucide-react";
import { marketing, eligible, formatDate, type Context, type History } from "./api";
import { activitySummary } from "./activity";
import styles from "./marketing.module.css";
import { MarketingSelect } from "./MarketingSelect";

const workTypes = [
  { kind: "website", title: "Website updates", description: "Update event pages and website content.", role: "developer", icon: Globe },
  { kind: "flyer", title: "Speaker flyers", description: "Design flyers for confirmed speakers.", role: "designer", icon: Palette },
  { kind: "agenda", title: "Agenda updates", description: "Prepare and update the event agenda.", role: "designer", icon: FileText },
  { kind: "social", title: "Social media", description: "Publish approved content and record post links.", role: "social media team member", icon: Megaphone },
  { kind: "leads", title: "Lead delivery", description: "Prepare and deliver requested lead lists.", role: "marketing manager", icon: Users },
];

function AssignmentRow({ work, context, scope, onRefresh }: {
  work: typeof workTypes[number]; context: Context; scope: string; onRefresh: () => Promise<Context>;
}) {
  const savedOwner = context.assignments.find(entry => entry.scope === scope && entry.kind === work.kind)?.userId || "";
  const [draftOwner, setDraftOwner] = useState<string | null>(null);
  const owner = draftOwner ?? savedOwner;
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const choices = eligible(context.users, work.kind);
  const inheritedOwner = scope !== "default" ? context.assignments.find(entry => entry.scope === "default" && entry.kind === work.kind)?.userId : null;
  const inheritedName = context.users.find(user => user.id === inheritedOwner)?.name;
  const automaticLabel = scope !== "default"
    ? inheritedName ? `Use department default · ${inheritedName}` : "Use department default"
    : `Auto assign · ${choices.length} ${choices.length === 1 ? "available person" : "available people"}`;
  const Icon = work.icon;

  async function save() {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await marketing("/assignments", "PUT", { scope, kind: work.kind, userId: owner || null });
      await onRefresh();
      setDraftOwner(null);
      setFeedback("Assignment saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={styles.assignmentRow}>
      <div className={styles.assignmentHeading}>
        <span className={styles.taskIcon}><Icon size={18} /></span>
        <div><h3>{work.title}</h3></div>
      </div>
      {!choices.length && !savedOwner ? (
        <div className={styles.assignmentMissing}>
          <AlertCircle size={16} />
          <span>No {work.role} available</span>
        </div>
      ) : (
        <div className={styles.assignmentControls}>
          <MarketingSelect label={`${work.title} owner`} value={owner} disabled={busy}
            onValueChange={value => { setDraftOwner(value); setFeedback(""); setError(""); }}
            options={[{ value: "", label: automaticLabel },
              ...(savedOwner && !choices.some(user => user.id === savedOwner) ? [{ value: savedOwner, label: "Previous owner · unavailable", disabled: true }] : []),
              ...choices.map(user => ({ value: user.id, label: user.name }))]} />
          <button type="button" className={styles.primary} disabled={busy || owner === savedOwner} onClick={() => void save()}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      )}
      {owner !== savedOwner && !busy && <small className={styles.unsaved}>Unsaved change</small>}
      {feedback && <span className={styles.saved} role="status"><Check size={14} />{feedback}</span>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </article>
  );
}

export function Settings({ context, eventId, onRefresh }: {
  context: Context; eventId: string; onRefresh: () => Promise<Context>;
}) {
  const [audit, setAudit] = useState<History[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileView, setMobileView] = useState("assignments");
  const [retry, setRetry] = useState(0);
  const scope = eventId || "default";
  const eventName = context.events.find(event => event.id === eventId)?.name || "Selected event";
  const pageSize = 5;
  const batchSize = 50;
  const offset = Math.floor(pageIndex * pageSize / batchSize) * batchSize;
  const start = pageIndex * pageSize - offset;
  const visibleActivity = audit.slice(start, start + pageSize);
  const hasOlder = start + pageSize < audit.length || audit.length === batchSize;

  useEffect(() => {
    const controller = new AbortController();
    marketing<{ items: History[] }>(`/audit?offset=${offset}`, "GET", undefined, controller.signal)
      .then(result => { setAudit(result.items); setLoading(false); setError(""); })
      .catch(err => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [context, offset, retry]);

  function page(next: number) {
    if (Math.floor(next * pageSize / batchSize) * batchSize !== offset) setLoading(true);
    setPageIndex(next);
  }

  return (
    <div className={styles.teamLayout}>
      <div className={styles.teamTabs} role="group" aria-label="Team view">
        <button aria-controls="assignment-panel" aria-pressed={mobileView === "assignments"} onClick={() => setMobileView("assignments")}>Assignments</button>
        <button aria-controls="activity-panel" aria-pressed={mobileView === "activity"} onClick={() => setMobileView("activity")}>Activity</button>
      </div>
      <section id="assignment-panel" aria-labelledby="assignment-heading" className={`${styles.panel} ${styles.teamPanel}`} data-active={mobileView === "assignments"}>
        <div className={styles.sectionHeading}>
          <div><h2 id="assignment-heading">Task owners</h2><p>Choose an owner, then Save.</p></div>
        </div>
        <div className={styles.assignmentScope}>
          <strong>{eventId ? eventName : "Department defaults · all events"}</strong>
          <p>{eventId ? "Overrides for this event. Leave automatic to use department defaults." : "Used when an event has no owner of its own."}</p>
        </div>
        {workTypes.map(work => (
          <AssignmentRow key={`${scope}:${work.kind}`} work={work} context={context} scope={scope} onRefresh={onRefresh} />
        ))}
        <details className={styles.assignmentHelp}>
          <summary>How assignments work</summary>
          <p>Automatic assignment shares work across eligible team members. For missing owners, ask an administrator to add their responsibility in user management.</p>
          <ul>{workTypes.map(work => <li key={work.kind}><strong>{work.title}:</strong> {work.description}</li>)}</ul>
        </details>
      </section>
      <section id="activity-panel" aria-labelledby="activity-heading" className={`${styles.panel} ${styles.teamActivity} ${styles.teamPanel}`} data-active={mobileView === "activity"}>
        <div className={styles.sectionHeading}><div><h2 id="activity-heading">Recent team changes</h2><p>Department activity · select a change for details.</p></div></div>
        {error ? <div className={styles.error} role="alert">{error}<button onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Retry</button></div> : loading ? <p role="status">Loading team activity…</p> : !audit.length ? (
          <div className={styles.empty}><Clock3 size={24} /><h3>{pageIndex ? "No older changes" : "No team changes yet"}</h3><p>{pageIndex ? "Use Newer to return to recent activity." : "Assignment and responsibility changes will appear here."}</p></div>
        ) : (
          <ol className={styles.teamHistory} aria-label="Team changes">
            {visibleActivity.map(item => {
              const summary = activitySummary(item, context);
              return <li key={item.id}><details><summary><strong>{summary.title}</strong><small>{item.actor} · <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></small></summary><p>{summary.description}</p></details></li>;
            })}
          </ol>
        )}
        {!error && (pageIndex > 0 || audit.length > pageSize) && <div className={styles.pagination}>
          <small aria-live="polite">Page {pageIndex + 1}</small>
          <button disabled={loading || !pageIndex} onClick={() => page(Math.max(0, pageIndex - 1))}>Newer</button>
          <button disabled={loading || !hasOlder} onClick={() => page(pageIndex + 1)}>Older</button>
        </div>}
      </section>
    </div>
  );
}
