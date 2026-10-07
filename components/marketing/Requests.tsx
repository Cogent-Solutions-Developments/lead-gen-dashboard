"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  marketing,
  download,
  eligible,
  label,
  taskLabel,
  formatDate,
  type Context,
  type MarketingRequest,
  type Task,
  type History,
} from "./api";
import styles from "./marketing.module.css";

function failure(err: unknown) {
  toast.error(err instanceof Error ? err.message : "Could not save changes");
}

export function RequestForm({
  context,
  eventId,
  request,
  onSave,
  onCancel,
}: {
  context: Context;
  eventId: string;
  request?: MarketingRequest;
  onSave: (r: MarketingRequest) => void;
  onCancel: () => void;
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
    if (!request && kind === "other" && !taskKinds.length) {
      toast.error("Select at least one delivery stage");
      return;
    }
    setBusy(true);
    const details = Object.fromEntries(
      ["speakerName", "designation", "company", "bio", "instructions"].map(
        (key) => [key, String(data.get(key) || "")],
      ),
    );
    const payload = {
      title: data.get("title"),
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
          ? { ...payload, version: request.version }
          : {
              ...payload,
              id,
              kind,
              eventId: data.get("eventId"),
              ...(kind === "other" ? { taskKinds } : {}),
            },
      );
      if (!request && kind === "speaker_update" && speakerImage) {
        const imageData = new FormData();
        imageData.set("file", speakerImage);
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
        request ? "Request updated" : "Request created and tasks assigned",
      );
    } catch (err) {
      failure(err);
    } finally {
      setBusy(false);
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
      <h2>{request ? "Edit request" : "New request"}</h2>
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
                {context.manager && (
                  <option value="other">Internal marketing task</option>
                )}
              </select>
            </label>
          </>
        )}
        {kind === "other" && !request && (
          <fieldset className={styles.full}>
            <legend>Delivery stages</legend>
            <p>Choose the work needed. Owners are assigned automatically.</p>
            <div className={styles.actions}>
              {["website", "flyer", "agenda", "social", "leads"].map((k) => (
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
        <label>
          Title
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={request?.title}
          />
        </label>
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
          {busy ? "Saving…" : "Save request"}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function HistoryList({ items }: { items: History[] }) {
  return (
    <ol className={styles.history}>
      {items.map((item) => (
        <li key={item.id}>
          <strong>{item.action}</strong>
          <span>
            {item.actor} · {formatDate(item.createdAt)}
          </span>
          {Object.entries(item.detail).map(([key, value]) => (
            <p key={key}>
              {label(key)}:{" "}
              {value &&
              typeof value === "object" &&
              "before" in value &&
              "after" in value ? (
                <span className={styles.historyChange}>
                  <del>{String(value.before ?? "Empty")}</del>
                  {" → "}
                  <strong>{String(value.after ?? "Empty")}</strong>
                </span>
              ) : Array.isArray(value) ? (
                value.map(String).join(", ")
              ) : (
                String(value ?? "—")
              )}
            </p>
          ))}
        </li>
      ))}
    </ol>
  );
}

function TaskCard({
  task,
  request,
  context,
  onSave,
}: {
  task: Task;
  request: MarketingRequest;
  context: Context;
  onSave: (r: MarketingRequest) => void;
}) {
  const [status, setStatus] = useState(
    task.status === "waiting" ? "ready" : task.status,
  );
  const [note, setNote] = useState(task.note);
  const [assignee, setAssignee] = useState(task.assigneeId || "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const closed = ["completed", "cancelled"].includes(request.status);
  async function save(reassign = false, nextStatus = status) {
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
          Maintain the PDF in the separate Agenda library, then update this
          task.
        </p>
      )}
      {task.status === "waiting" && <p>Waiting for flyer design completion.</p>}
      {task.note && <p className={styles.prewrap}>{task.note}</p>}
      {task.canUpdate &&
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
      {task.canUpdate && !closed && task.status !== "waiting" && (
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
      {context.manager && !closed && (
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
    </article>
  );
}

export function RequestDetail({
  request,
  context,
  onSave,
}: {
  request: MarketingRequest;
  context: Context;
  onSave: (r: MarketingRequest) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [section, setSection] = useState("delivery");
  const [comment, setComment] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [corrections, setCorrections] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [acceptWarning, setAcceptWarning] = useState(false);
  async function action(path: string, body: unknown, method = "POST") {
    setBusy(true);
    try {
      onSave(
        await marketing<MarketingRequest>(
          `/requests/${request.id}${path}`,
          method,
          body,
        ),
      );
      setComment("");
      toast.success("Request updated");
    } catch (err) {
      failure(err);
    } finally {
      setBusy(false);
    }
  }
  async function uploadImage() {
    if (!image) return;
    if (image.size > 10 * 1024 * 1024) {
      toast.error("Maximum file size is 10MB");
      return;
    }
    const data = new FormData();
    data.set("file", image);
    data.set("version", String(request.version));
    data.set("acceptWarning", String(acceptWarning));
    await action("/speaker-image", data);
  }
  if (editing)
    return (
      <RequestForm
        context={context}
        eventId={request.eventId}
        request={request}
        onCancel={() => setEditing(false)}
        onSave={(r) => {
          setEditing(false);
          onSave(r);
        }}
      />
    );
  return (
    <section className={styles.panel}>
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
      <div className={styles.actions}>
        {request.canEdit && (
          <button onClick={() => setEditing(true)}>Edit request fields</button>
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
      <nav className={styles.tabs} aria-label="Request sections">
        {[
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
              {request.canEdit && request.details.image && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(
                      "/speaker-image",
                      { version: request.version },
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
              {request.canEdit && (
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
            />
          ))}
          {context.manager && (
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
          <HistoryList items={[...request.history].reverse()} />
        </>
      )}
    </section>
  );
}
