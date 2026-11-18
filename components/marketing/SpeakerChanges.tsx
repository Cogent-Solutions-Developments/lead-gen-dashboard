"use client";
import { useEffect, useId, useState } from "react";
import { Download, GitCompareArrows, Minus, Plus } from "lucide-react";
import { download, formatDate, marketing, type SpeakerComparison } from "./api";
import { wordDiff } from "./wordDiff";
import styles from "./marketing.module.css";
const names: Record<string, string> = { speakerName: "Speaker name", designation: "Designation", company: "Company", bio: "Bio", instructions: "Instructions", image: "Speaker image", priority: "Priority", dueAt: "Requested deadline" };
export function SpeakerChanges({ comparison, taskId, requestId }: { comparison?: SpeakerComparison | null; taskId?: string; requestId: string }) {
  const heading = useId();
  const [remote, setRemote] = useState<SpeakerComparison | null>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [unified, setUnified] = useState(false);
  const [unchanged, setUnchanged] = useState(false);
  useEffect(() => {
    if (comparison !== undefined || !taskId) return;
    const controller = new AbortController();
    marketing<SpeakerComparison | null>(`/tasks/${taskId}/comparison`, "GET", undefined, controller.signal)
      .then(value => { if (!controller.signal.aborted) setRemote(value); })
      .catch(() => { if (!controller.signal.aborted) setError("Could not load changes."); });
    return () => controller.abort();
  }, [comparison, taskId, attempt]);
  const data = comparison === undefined ? remote : comparison;
  if (error) return <div role="alert" className={styles.notice}>{error} <button type="button" onClick={() => { setError(""); setRemote(undefined); setAttempt(value => value + 1); }}>Retry changes</button></div>;
  if (taskId && data === undefined) return <p role="status">Loading changes…</p>;
  if (!data) return null;
  if (!data.available) return <p className={styles.notice}>The original comparison is unavailable for this older update. Use the current task brief.</p>;
  const count = data.fields.filter(field => field.before !== field.after).length;
  const fields = data.fields.filter(field => unchanged || field.before !== field.after);
  return <section className={styles.speakerChanges} aria-labelledby={heading}>
    <header className={styles.diffToolbar}>
      <h3 id={heading}><GitCompareArrows size={18} aria-hidden="true" />What changed <small>{count} {count === 1 ? "field" : "fields"}</small></h3>
      <div role="group" aria-label="Comparison layout"><button type="button" aria-pressed={!unified} onClick={() => setUnified(false)}>Side by side</button><button type="button" aria-pressed={unified} onClick={() => setUnified(true)}>Unified</button></div>
    </header>
    <label className={styles.check}><input type="checkbox" checked={unchanged} onChange={event => setUnchanged(event.target.checked)} />Show unchanged fields</label>
    {!count && <p className={styles.notice}>No speaker fields changed. Follow the requested operation.</p>}
    {fields.map(field => <ChangeRow key={field.field} field={field} unified={unified} requestId={requestId} />)}
  </section>;
}
function ChangeRow({ field, unified, requestId }: { field: SpeakerComparison["fields"][number]; unified: boolean; requestId: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const display = (value: string) => field.field === "dueAt" && value ? formatDate(value) : value;
  const diff = wordDiff(display(field.before), display(field.after));
  const changed = field.before !== field.after;
  async function image(id: string, side: string) {
    setError(""); setBusy(true);
    try { await download(`/api/marketing-workflow/requests/${requestId}/speaker-image/${id}`, `speaker-image-${side}`); }
    catch { setError("Image could not be downloaded. Please retry."); }
    finally { setBusy(false); }
  }
  return <article className={styles.changeRow} aria-label={`${names[field.field] || field.field} comparison`}>
    <header><strong>{names[field.field] || field.field}</strong><small>{!changed ? "Unchanged" : !field.before ? "Added" : !field.after ? "Removed" : "Modified"}</small></header>
    <div className={styles.diffColumns} data-unified={unified}>
      {(["before", "after"] as const).map(side => <div key={side} className={styles.diffSide} data-side={changed ? side : "unchanged"}>
        <div className={styles.diffSideLabel}>{side === "before" ? <Minus size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}{side === "before" ? "Before" : "Requested update"}</div>
        {!field[side] ? <p className={styles.diffEmpty}>Not provided</p> : field.field === "image" ? <button type="button" disabled={busy} onClick={() => void image(field[side], side)}><Download size={14} aria-hidden="true" />{side === "before" ? "Download previous image" : "Download updated image"}</button> : <div className={styles.diffText}>{diff[side].map((part, index) => part.changed ? side === "before" ? <del key={index}>{part.text}</del> : <ins key={index}>{part.text}</ins> : <span key={index}>{part.text}</span>)}</div>}
      </div>)}
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </article>;
}
