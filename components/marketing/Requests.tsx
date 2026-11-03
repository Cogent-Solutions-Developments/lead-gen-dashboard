"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { X, CornerDownRight, ArrowUpRight } from "lucide-react";
import { OtherOperationPicker } from "./OtherOperationPicker";
import { SpeakerChanges } from "./SpeakerChanges";
import { SpeakerOperationPicker, speakerOperations } from "./SpeakerOperationPicker";
import {
  marketing,
  download,
  eligible,
  label,
  taskLabel,
  speakerOperationLabel,
  formatDate,
  canUploadLibrary,
  type Context,
  type MarketingRequest,
  type Task,
  type History,
} from "./api";
import styles from "./marketing.module.css";
import { LibraryUploadDialog } from "./LibraryUploadDialog";

function failure(err: unknown) {
  toast.error(err instanceof Error ? err.message : "Could not save changes");
}

export function RequestForm({
  context,
  eventId,
  request,
  onSave,
  onCancel,
  onBusyChange,
}: {
  context: Context;
  eventId: string;
  request?: MarketingRequest;
  onSave: (r: MarketingRequest) => void;
  onCancel: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [id] = useState(() => crypto.randomUUID());
  const [speakerImage, setSpeakerImage] = useState<File | null>(null);
  const [imageWarning, setImageWarning] = useState(false);
  const [taskKinds, setTaskKinds] = useState<string[]>([
    "website",
    "flyer",
    "social",
  ]);
  const [kind, setKind] = useState(request?.kind || "web_design");
  const [operation, setOperation] = useState("website_agenda");
  const [otherOperations, setOtherOperations] = useState<string[]>(["website"]);
  const [speakerName, setSpeakerName] = useState(request?.details.speakerName || "");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      speakerImage &&
      (speakerImage.size > 10 * 1024 * 1024 ||
        (speakerImage.size > 5 * 1024 * 1024 && !imageWarning))
    ) {
      toast.error("Check the speaker image size and upload confirmation");
      return;
    }
    const data = new FormData(e.currentTarget);
    if (!request && kind === "other" && !otherOperations.length) {
      toast.error("Select at least one type of work");
      return;
    }
    if (!request && kind === "other" && otherOperations.includes("custom") && !taskKinds.length) {
      toast.error("Select at least one delivery stage");
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    const details = Object.fromEntries(
      ["speakerName", "designation", "company", "bio", "instructions"].map(
        (key) => [key, String(data.get(key) || "")],
      ),
    );
    const payload = {
      title: request?.kind === "speaker_update" ? request.title : data.get("title"),
      details,
      priority: data.get("priority"),
      dueAt: request && String(data.get("dueAt") || "") === date
        ? request.dueAt
        : data.get("dueAt")
          ? new Date(String(data.get("dueAt"))).toISOString()
          : null,
    };
    try {
      let row = await marketing<MarketingRequest>(
        request ? `/requests/${request.id}` : "/requests",
        request ? "PATCH" : "POST",
        request
          ? { ...payload, version: request.version, ...(kind === "speaker_update" ? { followUpId: id, operation } : {}) }
          : {
              ...payload,
              id,
              kind,
              eventId: data.get("eventId"),
              ...(kind === "other" ? otherOperations.includes("custom") && context.manager ? { taskKinds } : { operations: otherOperations } : {}),
            },
      );
      if (!request && kind === "speaker_update" && speakerImage) {
        const imageData = new FormData();
        imageData.set("file", speakerImage);
        imageData.set("initialUpload", "true");
        imageData.set("version", String(row.version));
        imageData.set("acceptWarning", String(imageWarning));
        try {
          row = await marketing<MarketingRequest>(
            `/requests/${row.id}/speaker-image`,
            "POST",
            imageData,
          );
        } catch (error) {
          onSave(row);
          toast.error(
            `Request created. Speaker image was not uploaded: ${error instanceof Error ? error.message : "Upload failed"}. Retry in Request brief.`,
          );
          return;
        }
      }
      onSave(row);
      toast.success(
        request && row.id !== request.id ? "Speaker subtask added" : request ? "Request updated" : "Request created and tasks assigned",
      );
    } catch (err) {
      failure(err);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  const date = request?.dueAt
    ? new Date(
        new Date(request.dueAt).getTime() -
          new Date(request.dueAt).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
  return (
    <form className={styles.panel} onSubmit={submit}>
      <h2>{request?.kind === "speaker_update" ? "Add speaker update" : request ? "Edit request" : "New request"}</h2>
      {request?.kind === "speaker_update" && <p className={styles.parentReference}><CornerDownRight size={16} aria-hidden="true" />Subtask of <strong>{request.title}</strong></p>}
      <div className={styles.formGrid}>
        {!request && (
          <>
            <label>
              Event
              <select name="eventId" required defaultValue={eventId}>
                <option value="">Select event</option>
                {context.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Request type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="web_design">Web design</option>
                <option value="leads">Leads</option>
                {(context.manager ||
                  ["production_user", "production_manager_user"].includes(
                    context.role,
                  )) && <option value="speaker_update">Speaker update</option>}
                <option value="other">Other</option>
              </select>
            </label>
          </>
        )}
        {request?.kind === "speaker_update" && <SpeakerOperationPicker value={operation} onChange={setOperation} />}
        {kind === "other" && !request && <OtherOperationPicker value={otherOperations} onChange={setOtherOperations} manager={context.manager} />}
        {kind === "other" && !request && context.manager && otherOperations.includes("custom") && (
          <fieldset className={styles.full}>
            <legend>Delivery stages</legend>
            <p>Choose the work needed. Owners are assigned automatically.</p>
            <div className={styles.actions}>
              {["website", "flyer", "agenda", "materials", "social", "leads"].map((k) => (
                <label key={k} className={styles.check}>
                  <input
                    type="checkbox"
                    checked={taskKinds.includes(k)}
                    onChange={(e) =>
                      setTaskKinds((v) =>
                        e.target.checked ? [...v, k] : v.filter((x) => x !== k),
                      )
                    }
                  />
                  {taskLabel(k)}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {request?.kind !== "speaker_update" && <label className={styles.full}>
          Task name
          <input name="title" required maxLength={200} defaultValue={request?.title} />
        </label>}
        {request?.kind === "speaker_update" && <div className={styles.full} role="status">
          <small>New subtask</small><strong className={styles.subtaskPreview}>{speakerOperations.find(item => item.value === operation)?.name} · {speakerName || request.title}</strong>
        </div>}
        <label>
          Priority
          <select name="priority" defaultValue={request?.priority || "normal"}>
            {["low", "normal", "high", "urgent"].map((p) => (
              <option key={p} value={p}>
                {label(p)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Requested deadline
          <input type="datetime-local" name="dueAt" defaultValue={date} />
        </label>
        {kind === "speaker_update" && (
          <>
            {[
              ["speakerName", "Speaker name"],
              ["designation", "Designation"],
              ["company", "Company"],
            ].map(([key, title]) => (
              <label key={key}>
                {title} *
                <input
                  name={key}
                  required
                  maxLength={key === "speakerName" ? 200 : 300}
                  defaultValue={request?.details[key]}
                  onChange={key === "speakerName" ? event => setSpeakerName(event.target.value) : undefined}
                />
              </label>
            ))}
            <label className={styles.full}>
              Bio
              <textarea
                name="bio"
                maxLength={15000}
                defaultValue={request?.details.bio}
              />
            </label>
          </>
        )}
        <label className={styles.full}>
          Instructions
          <textarea
            name="instructions"
            maxLength={15000}
            defaultValue={request?.details.instructions}
          />
        </label>
      </div>
      {kind === "speaker_update" && !request && (
        <div className={styles.upload}>
          <label>
            Speaker image (optional)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                setSpeakerImage(e.target.files?.[0] || null);
                setImageWarning(false);
              }}
            />
          </label>
          <small>
            PNG, JPEG or WebP. Recommended 5MB or below; maximum 10MB.
          </small>
          {speakerImage && speakerImage.size > 5 * 1024 * 1024 && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={imageWarning}
                onChange={(e) => setImageWarning(e.target.checked)}
              />
              Above the recommended size. Upload anyway.
            </label>
          )}
        </div>
      )}
      <div className={styles.actions}>
        <button className={styles.primary} disabled={busy}>
          {busy ? "Saving…" : request?.kind === "speaker_update" ? "Add subtask" : "Save request"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function RequestEditDialog({ context, request, onClose, onSave }: {
  context: Context; request: MarketingRequest; onClose: () => void; onSave: (row: MarketingRequest) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return <dialog ref={dialog} className={`${styles.libraryDialog} ${styles.speakerEditDialog}`} aria-label={request.kind === "speaker_update" ? "Add speaker update" : "Edit request"}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <button className={styles.editClose} type="button" aria-label="Close edit" disabled={busy} onClick={onClose}><X size={18} /></button>
    <RequestForm context={context} eventId={request.eventId} request={request} onCancel={onClose} onSave={onSave} onBusyChange={setBusy} />
  </dialog>;
}

function HistoryValue({ value }: { value: unknown }) {
  if (value == null || value === "") return <>None</>;
  if (Array.isArray(value)) return value.length ? <>{value.map((entry,index) => <div key={index}><HistoryValue value={entry} /></div>)}</> : <>None</>;
  if (typeof value === "object") return <dl className={styles.historyFields}>{Object.entries(value).map(([key,entry]) => <div key={key}><dt>{label(key)}</dt><dd><HistoryValue value={entry} /></dd></div>)}</dl>;
  return <>{typeof value === "boolean" ? value ? "Yes" : "No" : String(value)}</>;
}

export function HistoryList({ items }: { items: History[] }) {
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages - 1);
  const start = current * pageSize;
  return <section aria-label="Request activity history">
    <ol className={styles.history}>
      {items.slice(start, start + pageSize).map(item => <li key={item.id}>
        <details className={styles.historyEntry}>
          <summary><strong>{item.action.replace(/_/g, " ")}</strong><small>{item.actor} · {formatDate(item.createdAt)}</small></summary>
          <HistoryValue value={item.detail} />
        </details>
      </li>)}
    </ol>
    {!items.length && <p>No activity yet.</p>}
    <div className={styles.historyPagination} aria-label="Activity pages">
      <small>{items.length ? `${start + 1}-${Math.min(start + pageSize, items.length)} of ${items.length}` : "0 updates"} · Page {current + 1} of {pages}</small>
      <div><button type="button" disabled={!current} onClick={() => setPage(current - 1)}>Previous</button><button type="button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Next</button></div>
    </div>
  </section>;
}

function TaskCard({
  task,
  request,
  context,
  onSave,
  readOnly = false,
}: {
  task: Task;
  request: MarketingRequest;
  context: Context;
  onSave: (r: MarketingRequest) => void;
  readOnly?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(
    task.status === "waiting" ? "ready" : task.status,
  );
  const [note, setNote] = useState(task.note);
  const [assignee, setAssignee] = useState(task.assigneeId || "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const uploadCategory = task.kind === "agenda" || task.kind === "materials" ? task.kind : null;
  const closed = ["completed", "cancelled"].includes(request.status);
  async function save(reassign = false, nextStatus = status) {
    if (readOnly || busy) return;
    setBusy(true);
    try {
      onSave(
        await marketing<MarketingRequest>(
          `/requests/${request.id}/tasks/${task.id}${reassign ? "/assignee" : ""}`,
          reassign ? "PUT" : "PATCH",
          reassign
            ? { version: request.version, userId: assignee, reason }
            : { version: request.version, status: nextStatus, note },
        ),
      );
      toast.success(reassign ? "Task reassigned" : "Task updated");
    } catch (err) {
      failure(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={styles.task}>
      <div className={styles.taskHeading}>
        <h3>{taskLabel(task.kind)}</h3>
        <span className={styles.badge} data-status={task.status}>
          {label(task.status)}
        </span>
      </div>
      <p>{task.assigneeName}</p>
      {task.kind === "flyer" && (
        <p className={styles.notice}>
          Mark complete when the flyer design is ready. No flyer upload is
          required. This unlocks Social Media.
        </p>
      )}
      {task.kind === "agenda" && (
        <p>
          Upload the PDF here to save it in the Agenda library and complete this task.
        </p>
      )}
      {task.status === "waiting" && <p>Waiting for flyer design completion.</p>}
      {task.note && <p className={styles.prewrap}>{task.note}</p>}
      {task.canUpdate && !readOnly &&
        !closed &&
        !["waiting", "done"].includes(task.status) && (
          <div className={styles.actions}>
            {task.status !== "in_progress" && (
              <button
                disabled={busy || !task.assigneeId}
                onClick={() => void save(false, "in_progress")}
              >
                Start task
              </button>
            )}
            <button
              className={styles.primary}
              disabled={busy || !task.assigneeId}
              onClick={() => void save(false, "done")}
            >
              Mark complete
            </button>
          </div>
        )}
      {task.canUpdate && !readOnly && !closed && task.status !== "waiting" && (
        <details>
          <summary>Update task</summary>
          <label>
            Task status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {["ready", "in_progress", "blocked", "done"].map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Completion details, links or blocker
            <textarea
              maxLength={5000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {uploadCategory && canUploadLibrary(context) && task.status !== "done" && <button className={styles.primary} disabled={busy || !task.assigneeId} onClick={() => setUploading(true)}>Upload & complete</button>}
          <button
            disabled={
              busy || !task.assigneeId || (status === "blocked" && !note.trim())
            }
            onClick={() => void save()}
          >
            Save task status
          </button>
        </details>
      )}
      {context.manager && !readOnly && !closed && (
        <details>
          <summary>Reassign task</summary>
          <label>
            Owner
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">Choose eligible owner</option>
              {eligible(context.users, task.kind).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={2000}
            />
          </label>
          <button
            disabled={busy || !assignee || !reason.trim()}
            onClick={() => void save(true)}
          >
            Reassign
          </button>
        </details>
      )}
      {task.completedAt && (
        <small>
          Completed {formatDate(task.completedAt)} · Revision {task.revision}
        </small>
      )}
      {uploading && uploadCategory && canUploadLibrary(context) && task.canUpdate && !closed && task.status !== "done" && !readOnly && <LibraryUploadDialog
        category={uploadCategory}
        eventId={request.eventId}
        eventName={context.events.find(event => event.id === request.eventId)?.name || "Event"}
        initialTitle={uploadCategory === "agenda" ? "Agenda" : request.title}
        task={{ requestId: request.id, taskId: task.id, version: request.version, note }}
        onClose={() => setUploading(false)}
        onUploaded={result => { setUploading(false); if (result && "id" in result.request) onSave(result.request); }}
      />}
    </article>
  );
}

export function RequestDetail({
  request,
  context,
  onSave,
  readOnly = false,
}: {
  request: MarketingRequest;
  context: Context;
  onSave: (r: MarketingRequest) => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState<MarketingRequest | null>(null);
  const [section, setSection] = useState("delivery");
  const [comment, setComment] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [corrections, setCorrections] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [acceptWarning, setAcceptWarning] = useState(false);
  const [postAction, setPostAction] = useState("none");
  const [followUpId] = useState(() => crypto.randomUUID());
  async function action(path: string, body: unknown, method = "POST") {
    if (readOnly || busy) return;
    setBusy(true);
    try {
      const updated = await marketing<MarketingRequest>(`/requests/${request.id}${path}`, method, body);
      onSave(updated);
      setComment("");
      toast.success(updated.id !== request.id ? "Speaker subtask added" : "Request updated");
    } catch (err) {
      failure(err);
    } finally {
      setBusy(false);
    }
  }
  async function uploadImage() {
    if (readOnly || !image) return;
    if (image.size > 10 * 1024 * 1024) {
      toast.error("Maximum file size is 10MB");
      return;
    }
    const data = new FormData();
    data.set("file", image);
    data.set("followUpId", followUpId);
    data.set("postAction", postAction);
    data.set("version", String(request.version));
    data.set("acceptWarning", String(acceptWarning));
    await action("/speaker-image", data);
  }
  return (
    <section className={styles.panel}>
      {editing && !readOnly && <RequestEditDialog context={context} request={editing}
        onClose={() => setEditing(null)} onSave={row => { setEditing(null); onSave(row); }} />}
      {readOnly && <p role="status" className={styles.notice}>Read-only request view. Changes are disabled when opened from a notification.</p>}
      <div className={styles.taskHeading}>
        <h2>{request.title}</h2>
        <span className={styles.badge} data-status={request.status}>
          {label(request.status)}
        </span>
      </div>
      <p>
        {request.requesterName} · {label(request.department)} · Revision{" "}
        {request.revision}
      </p>
      <p>
        {label(request.priority)} priority · {formatDate(request.dueAt)}
      </p>
      {!!request.operations?.length && <small>{request.operations.map(speakerOperationLabel).join(" + ")}</small>}
      {request.sourceRequestId && <a className={styles.parentReference} href={`/marketing?tab=overview&request=${request.sourceRequestId}${readOnly ? "&readOnly=1" : ""}`}><CornerDownRight size={16} aria-hidden="true" />Subtask of {request.parentTitle || "original request"}<ArrowUpRight size={14} aria-hidden="true" /></a>}
      {!!request.subtasks?.length && <section aria-label="Speaker update subtasks" className={styles.relatedSubtasks}>
        <h3>Speaker updates <small>{request.subtasks.length}</small></h3>
        {request.subtasks.map(child => <a key={child.id} href={`/marketing?tab=overview&request=${child.id}${readOnly ? "&readOnly=1" : ""}`}>
          <CornerDownRight size={18} aria-hidden="true" /><div><strong>{child.title}</strong><small>{child.operations.map(speakerOperationLabel).join(" + ")}</small>
          <progress aria-label={`${child.title} progress`} max={child.tasks.length + 1} value={child.tasks.filter(task => task.status === "done").length + (child.status === "completed" ? 1 : 0)} />
          <small>{child.tasks.map(task => `${taskLabel(task.kind)} ${task.status === "done" ? "✓" : "·"}`).join("  ")} · Manager {child.status === "completed" ? "✓" : "·"}</small></div>
          <span className={styles.badge} data-status={child.status}>{child.status === "review" ? "Final check" : label(child.status)}</span><ArrowUpRight size={14} aria-hidden="true" />
        </a>)}
      </section>}
      {request.speakerPostAction && request.speakerPostAction !== "none" && <p>Speaker post: {label(request.speakerPostAction)}</p>}
      <div className={styles.actions}>
        {request.canEdit && !readOnly && (
          <button onClick={() => setEditing(request)}>{request.kind === "speaker_update" ? "Add speaker update" : "Edit request fields"}</button>
        )}
        <button
          onClick={() =>
            marketing<MarketingRequest>(`/requests/${request.id}`)
              .then(onSave)
              .catch(failure)
          }
        >
          Refresh progress
        </button>
      </div>
      <nav className={`${styles.tabs} ${styles.requestSections}`} aria-label="Request sections">
        {[
          ...(request.sourceRequestId ? [["changes", "Changes"]] : []),
          ["delivery", "Delivery"],
          ["brief", "Request brief"],
          ["activity", `Activity (${request.history.length})`],
        ].map(([key, name]) => (
          <button
            key={key}
            aria-current={section === key ? "page" : undefined}
            onClick={() => setSection(key)}
          >
            {name}
          </button>
        ))}
      </nav>
      {section === "changes" && <SpeakerChanges comparison={request.comparison ?? { available: false, fields: [] }} requestId={request.id} />}
      {section === "brief" && (
        <>
          <dl className={styles.fields}>
            {Object.entries(request.details)
              .filter(([k, v]) => k !== "image" && v)
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{label(key.replace(/([A-Z])/g, " $1"))}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
          {request.kind === "speaker_update" && (
            <details>
              <summary>Speaker image</summary>
              {request.canEdit && !readOnly && <><p>Changing the image creates a new speaker subtask.</p><fieldset className={styles.full}>
          <legend>Speaker post</legend>
          <div className={styles.actions}>
            {[["none", "No post changes"], ["update", "Update post"], ["delete", "Delete post"], ["republish", "Republish post"]].map(([value, name]) => (
              <label key={value} className={styles.check}>
                <input type="radio" name="postAction" value={value} checked={postAction === value} onChange={() => setPostAction(value)} />{name}
              </label>
            ))}
          </div>
        </fieldset></>}
              {request.canEdit && !readOnly && request.details.image && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(
                      "/speaker-image",
                      { version: request.version, followUpId, postAction },
                      "DELETE",
                    )
                  }
                >
                  Remove speaker image
                </button>
              )}
              {request.details.image && (
                <button
                  onClick={() =>
                    download(
                      `/api/marketing-workflow/requests/${request.id}/speaker-image/${request.details.image}`,
                      "speaker-image",
                    ).catch(failure)
                  }
                >
                  Download speaker image
                </button>
              )}
              {request.canEdit && !readOnly && (
                <>
                  <label>
                    Add or replace speaker image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        setImage(e.target.files?.[0] || null);
                        setAcceptWarning(false);
                      }}
                    />
                  </label>
                  {image && image.size > 5 * 1024 * 1024 && (
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={acceptWarning}
                        onChange={(e) => setAcceptWarning(e.target.checked)}
                      />
                      Above the recommended 5MB. Upload anyway.
                    </label>
                  )}
                  <button
                    disabled={
                      busy ||
                      !image ||
                      (image.size > 5 * 1024 * 1024 && !acceptWarning)
                    }
                    onClick={() => void uploadImage()}
                  >
                    Upload speaker image
                  </button>
                </>
              )}
            </details>
          )}
        </>
      )}
      {section === "delivery" && (
        <>
          <h3>Delivery stages</h3>
          <div className={styles.progress} aria-label="Task progress">
            {request.tasks.map((t) => (
              <span key={t.id} data-status={t.status}>
                {taskLabel(t.kind)} · {label(t.status)}
              </span>
            ))}
            <span data-status={request.status}>
              Manager verification ·{" "}
              {request.status === "completed" ? "Complete" : "Pending"}
            </span>
          </div>
          {request.tasks.map((task) => (
            <TaskCard
              key={`${task.id}:${request.version}`}
              task={task}
              request={request}
              context={context}
              onSave={onSave}
              readOnly={readOnly}
            />
          ))}
          {context.manager && !readOnly && (
            <details open={request.status === "review"}>
              <summary>Manager verification</summary>
              <label>
                Verification notes or correction instructions
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  maxLength={5000}
                />
              </label>
              <div className={styles.actions}>
                {request.tasks.map((t) => (
                  <label className={styles.check} key={t.id}>
                    <input
                      type="checkbox"
                      checked={corrections.includes(t.kind)}
                      onChange={(e) =>
                        setCorrections((v) =>
                          e.target.checked
                            ? [...v, t.kind]
                            : v.filter((k) => k !== t.kind),
                        )
                      }
                    />
                    {taskLabel(t.kind)}
                  </label>
                ))}
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.primary}
                  disabled={
                    busy || !reviewNote.trim() || request.status !== "review"
                  }
                  onClick={() =>
                    void action("/review", {
                      version: request.version,
                      action: "approve",
                      note: reviewNote,
                      tasks: [],
                    })
                  }
                >
                  Verify & complete
                </button>
                <button
                  disabled={busy || !reviewNote.trim() || !corrections.length}
                  onClick={() =>
                    void action("/review", {
                      version: request.version,
                      action: "changes_requested",
                      note: reviewNote,
                      tasks: corrections,
                    })
                  }
                >
                  Reopen selected tasks
                </button>
                <button
                  disabled={
                    busy ||
                    !reviewNote.trim() ||
                    ["completed", "cancelled"].includes(request.status)
                  }
                  onClick={() =>
                    void action("/review", {
                      version: request.version,
                      action: "cancel",
                      note: reviewNote,
                      tasks: [],
                    })
                  }
                >
                  Cancel request
                </button>
              </div>
            </details>
          )}
        </>
      )}
      {section === "activity" && (
        <>
          {!readOnly && (
            <details className={styles.activityComment}>
              <summary>Add a comment</summary>
              <label>
                Comment
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={5000}
                />
              </label>
              <button
                disabled={busy || !comment.trim()}
                onClick={() =>
                  void action("/comments", {
                    version: request.version,
                    text: comment,
                  })
                }
              >
                Add comment
              </button>
            </details>
          )}
          <HistoryList key={request.id} items={[...request.history].reverse()} />
        </>
      )}
    </section>
  );
}
