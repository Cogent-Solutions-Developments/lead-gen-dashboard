"use client";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ListTodo,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  marketing,
  download,
  label,
  taskLabel,
  formatDate,
  type Context,
} from "./api";
import styles from "./marketing.module.css";
import { MARKETING_TASKS_CHANGED_EVENT } from "@/lib/marketing-workflow-events";

type OwnTask = {
  id: string;
  requestId: string;
  requestVersion: number;
  title: string;
  eventId: string;
  kind: string;
  status: string;
  note: string;
  priority: string;
  dueAt: string | null;
  completedAt: string | null;
  canUpdate: boolean;
  assigneeId?: string | null;
  assigneeName?: string;
  details: Record<string, string>;
};
const statuses = ["ready", "waiting", "in_progress", "blocked", "done"];
const statusName = (status: string) =>
  status === "done" ? "Completed" : label(status);
const statusHelp: Record<string, string> = {
  ready: "Ready to start when you are.",
  in_progress: "Let your team know work is underway.",
  blocked: "Explain what you need to move forward.",
  done: "Mark this task complete when the work is ready.",
};

export function OwnTasks({
  context,
  eventId,
  social = false,
  refresh,
}: {
  context: Context;
  eventId: string;
  social?: boolean;
  refresh: number;
}) {
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    path: string;
    items: OwnTask[];
    total: number;
    error: string;
  }>({ key: "", path: "", items: [], total: 0, error: "" });
  const query = new URLSearchParams({ limit: "30", offset: String(offset) });
  if (eventId) query.set("eventId", eventId);
  if (social) query.set("taskKind", "social");
  if (status) query.set("status", status);
  if (search) query.set("search", search);
  if (social) query.set("team", "true");
  const path = `/tasks?${query}`;
  const key = `${path}:${refresh}:${reload}`;
  const loading = result.key !== key;
  useEffect(() => {
    const refreshTasks = () => setReload((value) => value + 1);
    window.addEventListener(MARKETING_TASKS_CHANGED_EVENT, refreshTasks);
    window.addEventListener("focus", refreshTasks);
    return () => {
      window.removeEventListener(MARKETING_TASKS_CHANGED_EVENT, refreshTasks);
      window.removeEventListener("focus", refreshTasks);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void marketing<{ items: OwnTask[]; total: number }>(
      path,
      "GET",
      undefined,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ ...data, key, path, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({ key, path, items: [], total: 0, error: error.message });
      });
    return () => controller.abort();
  }, [path, key]);
  return (
    <section
      className={styles.ownTasks}
      aria-label={social ? "Social media team tasks" : "My assigned tasks"}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2>{social ? "Social media team queue" : "Assigned to you"}</h2>
          <p>
            {social ? "Review the brief and update social task progress with your team." : "Review the brief, keep progress up to date, and share what comes next."}
          </p>
        </div>
        {result.path === path && !result.error && (
          <span className={styles.taskCount}>
            <ListTodo size={15} aria-hidden="true" />
            {result.total} {result.total === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>
      <div className={styles.ownTaskFilters}>
        <form
          role="search"
          className={styles.ownTaskSearch}
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchDraft.trim());
            setOffset(0);
          }}
        >
          <Search size={17} aria-hidden="true" />
          <input
            name="search"
            aria-label="Search my tasks"
            placeholder="Search by request title"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            maxLength={200}
          />
          <button type="submit">Search</button>
        </form>
        <div className={styles.ownTaskSelect}>
          <select
            aria-label="Task status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setOffset(0);
            }}
          >
            <option value="">All task statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {statusName(value)}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </div>
        {(search || status) && (
          <button onClick={() => {
            setSearch("");
            setSearchDraft("");
            setStatus("");
            setOffset(0);
          }}>Clear filters</button>
        )}
        <button
          className={styles.ownTaskRefresh}
          disabled={loading}
          onClick={() => setReload((value) => value + 1)}
        >
          <RefreshCw size={15} className={loading ? styles.taskSpinner : undefined} aria-hidden="true" />
          Refresh
        </button>
      </div>
      {result.error && !loading && (
        <p role="alert" className={styles.error}>
          {result.error}
        </p>
      )}
      {loading && <p role="status" className={styles.taskLoading}><LoaderCircle size={16} className={styles.taskSpinner} aria-hidden="true" />Loading tasks…</p>}
      {result.path === path && !result.error && (
        <>
          <div className={`${styles.tableWrap} ${styles.ownTaskSurface}`} aria-busy={loading}>
            <table
              className={`${styles.table} ${styles.ownTaskTable}`}
              aria-label={social ? "Social media tasks" : "Assigned tasks"}
            >
              <thead>
                <tr>
                  <th scope="col">Task / request</th>
                  <th scope="col">Event</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Due date</th>
                  <th scope="col">Task status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((task) => (
                  <OwnTaskRow
                    key={task.id}
                    task={task}
                    ownerName={social && task.assigneeName ? task.assigneeId === context.userId ? "You" : task.assigneeName : undefined}
                    eventName={
                      context.events.find((event) => event.id === task.eventId)
                        ?.name || "Event"
                    }
                    onSaved={() => setReload((value) => value + 1)}
                  />
                ))}
                {!result.items.length && (
                  <tr>
                    <td colSpan={6}>
                      <div className={styles.ownTaskEmpty}>
                        <CheckCheck size={28} aria-hidden="true" />
                        <strong>{search || status ? "No matching tasks" : "You’re all caught up"}</strong>
                        <p>{search || status ? "Try another search or clear your filters to see more work." : "New assignments will appear here. You can refresh to check for updates."}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className={styles.pagination}>
            <span>
              {result.total
                ? result.total === 1 ? "1 task" : `${offset + 1}–${Math.min(offset + 30, result.total)} of ${result.total} tasks`
                : "No tasks"}
            </span>
            <div>
              <button
                disabled={!offset || loading}
                onClick={() => setOffset((value) => Math.max(0, value - 30))}
              >
                <ChevronLeft size={14} aria-hidden="true" />Previous
              </button>
              <button
                disabled={offset + 30 >= result.total || loading}
                onClick={() => setOffset((value) => value + 30)}
              >
                Next<ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}

function OwnTaskRow({
  task,
  eventName,
  onSaved,
  ownerName,
}: {
  task: OwnTask;
  eventName: string;
  onSaved: () => void;
  ownerName?: string;
}) {
  const [editor, setEditor] = useState<{
    status: string;
    note: string;
    version: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [briefError, setBriefError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const editorId = useId();
  const briefId = useId();
  const briefDialog = useRef<HTMLDialogElement>(null);
  const updateButton = useRef<HTMLButtonElement>(null);
  const statusInput = useRef<HTMLSelectElement>(null);
  const editing = editor !== null;
  useEffect(() => {
    if (editing) statusInput.current?.focus();
    else if (saved) updateButton.current?.focus();
  }, [editing, saved]);
  const dirty = editor !== null && (editor.status !== task.status || editor.note !== (task.note || ""));
  function cancel() {
    setEditor(null);
    setError("");
    updateButton.current?.focus();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || busy || !dirty || (editor.status === "blocked" && !editor.note.trim())) return;
    setBusy(true);
    setError("");
    try {
      await marketing(
        `/requests/${task.requestId}/tasks/${task.id}`,
        "PATCH",
        editor,
      );
      setEditor(null);
      setSaved(true);
      onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update task. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function speakerImage() {
    if (downloading) return;
    setDownloading(true);
    setBriefError("");
    try {
      await download(
        `/api/marketing-workflow/requests/${task.requestId}/speaker-image/${task.details.image}`,
        "speaker-image",
      );
    } catch {
      setBriefError("Unable to download the speaker image. Please retry.");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <Fragment>
      <tr className={styles.ownTaskRow} data-editing={editing || undefined}>
        <td>
          <div className={styles.ownTaskIdentity}>
            <span className={styles.ownTaskIcon}><ListTodo size={18} aria-hidden="true" /></span>
            <div><strong>{taskLabel(task.kind)}</strong><small>{task.title}</small>{ownerName && <small>Assigned to {ownerName}</small>}</div>
          </div>
          <button
            type="button"
            className={styles.taskBriefTrigger}
            aria-haspopup="dialog"
            onClick={() => {
              setBriefError("");
              briefDialog.current?.showModal();
            }}
          >
            <FileText size={14} aria-hidden="true" />View task brief
          </button>
          <dialog
            ref={briefDialog}
            className={styles.taskBriefDialog}
            aria-labelledby={`${briefId}-title`}
            aria-describedby={`${briefId}-description`}
          >
            <header className={styles.taskBriefHeader}>
              <span className={styles.ownTaskIcon}><FileText size={20} aria-hidden="true" /></span>
              <div>
                <h2 id={`${briefId}-title`}>Task brief</h2>
                <p id={`${briefId}-description`}>{taskLabel(task.kind)} · {task.title}</p>
              </div>
              <button type="button" aria-label="Close task brief" onClick={() => briefDialog.current?.close()}>
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className={styles.taskBriefBody}>
              <dl className={styles.taskBriefContext}>
                <div><dt>Event</dt><dd>{eventName}</dd></div>
                <div><dt>Due date</dt><dd>{task.dueAt ? formatDate(task.dueAt) : "No deadline"}</dd></div>
              </dl>
              {Object.entries(task.details).some(([key, value]) => key !== "image" && value) ? (
                <dl className={styles.taskBriefDetails}>
                  {Object.entries(task.details)
                    .filter(([key, value]) => key !== "image" && value)
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{label(key.replace(/([a-z])([A-Z])/g, "$1 $2"))}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>
              ) : <p>No additional brief provided.</p>}
              {briefError && <p role="alert" className={styles.error}>{briefError}</p>}
            </div>
            <footer className={styles.taskBriefFooter}>
              {task.details.image && (
                <button type="button" disabled={downloading} onClick={() => void speakerImage()}>
                  <Download size={15} aria-hidden="true" />
                  {downloading ? "Downloading…" : "Download speaker image"}
                </button>
              )}
              <button type="button" className={styles.primary} onClick={() => briefDialog.current?.close()}>Done</button>
            </footer>
          </dialog>
        </td>
        <td data-label="Event">{eventName}</td>
        <td data-label="Priority">
          <span className={styles.priority} data-priority={task.priority}>
            {label(task.priority)}
          </span>
        </td>
        <td data-label="Due date">
          {task.dueAt ? <time dateTime={task.dueAt} className={styles.ownTaskDue}>
            {new Date(task.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            <small>{new Date(task.dueAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</small>
          </time> : <span className={styles.ownTaskMuted}>No deadline</span>}
        </td>
        <td data-label="Task status">
          <span className={styles.badge} data-status={task.status}>
            {statusName(task.status)}
          </span>
          {task.status === "waiting" && (
            <small>Waiting for design completion</small>
          )}
          {task.completedAt && <small>{formatDate(task.completedAt)}</small>}
          {task.note && <small className={styles.ownTaskNote}>{task.note}</small>}
        </td>
        <td data-label="Action">
          {task.canUpdate ? (
            <button
              ref={updateButton}
              className={styles.ownTaskUpdate}
              aria-expanded={editing}
              aria-controls={editing ? editorId : undefined}
              disabled={busy}
              onClick={() => {
                if (editing) {
                  statusInput.current?.focus();
                  return;
                }
                setError("");
                setSaved(false);
                setEditor({
                  status: task.status,
                  note: task.note || "",
                  version: task.requestVersion,
                });
              }}
            >
              <PencilLine size={14} aria-hidden="true" />
              Update status
            </button>
          ) : (
            <small>
              {task.status === "done"
                ? "Completed · manager can reopen"
                : ownerName && ownerName !== "You" && task.status !== "waiting"
                  ? `Updates by ${ownerName}`
                : "Status updates unavailable"}
            </small>
          )}
          {saved && <span role="status" className={styles.taskSaved}><Check size={14} aria-hidden="true" />Status updated</span>}
        </td>
      </tr>
      {(editor || error) && (
        <tr className={styles.taskEditorRow}>
          <td colSpan={6}>
            {error && !editor && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            {editor && (
              <form
                className={styles.taskStatusForm}
                id={editorId}
                onSubmit={save}
                aria-label={`Update ${taskLabel(task.kind)}`}
                aria-busy={busy}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !busy) {
                    event.preventDefault();
                    cancel();
                  }
                }}
              >
                <div className={styles.taskEditorHeading}>
                  <span className={styles.taskEditorIcon}><PencilLine size={18} aria-hidden="true" /></span>
                  <div><h3>Update task status</h3><p>{taskLabel(task.kind)}<span aria-hidden="true"> · </span>{task.title}</p></div>
                </div>
                <div className={styles.taskEditorFields}>
                  <div className={styles.taskStatusField}>
                    <label htmlFor={`${editorId}-status`}>New status</label>
                    <div className={styles.ownTaskSelect}>
                      <select
                        ref={statusInput}
                        id={`${editorId}-status`}
                        aria-label="New task status"
                        aria-describedby={`${editorId}-status-help`}
                        value={editor.status}
                        disabled={busy}
                        onChange={(event) =>
                          setEditor({ ...editor, status: event.target.value })
                        }
                      >
                        {statuses
                          .filter((value) => value !== "waiting")
                          .map((value) => (
                            <option key={value} value={value}>
                              {statusName(value)}
                            </option>
                          ))}
                      </select>
                      <ChevronDown size={16} aria-hidden="true" />
                    </div>
                    <p id={`${editorId}-status-help`} className={styles.taskFieldHelp}>{statusHelp[editor.status]}</p>
                  </div>
                  <div className={styles.taskNoteField}>
                    <label htmlFor={`${editorId}-note`}>
                      {editor.status === "blocked" ? "Blocker" : "Task note"}
                      <span>{editor.status === "blocked" ? "Required" : "Optional"}</span>
                    </label>
                    <textarea
                      id={`${editorId}-note`}
                      aria-label="Task note"
                      aria-describedby={`${editorId}-note-help`}
                      rows={4}
                      placeholder={editor.status === "blocked" ? "What’s blocking this task? Include what you need to continue…" : "Share your progress, a handoff detail, or the next step…"}
                      value={editor.note}
                      disabled={busy}
                      maxLength={5000}
                      required={editor.status === "blocked"}
                      onChange={(event) =>
                        setEditor({ ...editor, note: event.target.value })
                      }
                    />
                    <div className={styles.taskNoteMeta}>
                      <span id={`${editorId}-note-help`}>{editor.status === "blocked" ? "Add a reason so your team can help resolve the blocker." : "Add context to help your team follow the work."}</span>
                      <span>{editor.note.length.toLocaleString()} / 5,000</span>
                    </div>
                  </div>
                </div>
                {error && <p role="alert" className={`${styles.error} ${styles.taskSaveError}`}><AlertCircle size={16} aria-hidden="true" />{error}</p>}
                <div className={styles.taskEditorFooter}>
                  <span className={styles.taskEditorHint}>{busy ? "Saving your update…" : dirty ? "Changes are not saved yet." : "Choose a status or add a note to make an update."}</span>
                  <div className={styles.taskEditorActions}>
                    <button type="button" disabled={busy} onClick={cancel}>Cancel</button>
                    <button
                      type="submit"
                      className={styles.primary}
                      disabled={
                        busy || !dirty || (editor.status === "blocked" && !editor.note.trim())
                      }
                    >
                      {busy ? <LoaderCircle size={15} className={styles.taskSpinner} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                      {busy ? "Saving…" : "Save status"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}
