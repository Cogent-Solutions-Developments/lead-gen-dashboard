"use client";
import { Fragment, useEffect, useState } from "react";
import {
  marketing,
  download,
  label,
  taskLabel,
  formatDate,
  type Context,
} from "./api";
import styles from "./marketing.module.css";

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
  details: Record<string, string>;
};
const statuses = ["ready", "waiting", "in_progress", "blocked", "done"];
const statusName = (status: string) =>
  status === "done" ? "Completed" : label(status);

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
  const path = `/tasks?${query}`;
  const key = `${path}:${refresh}:${reload}`;
  const loading = result.key !== key;
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
      aria-label={social ? "My social media tasks" : "My assigned tasks"}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2>{social ? "My social media tasks" : "My tasks"}</h2>
          <p>
            Your assigned work. Review the brief and update each task status.
          </p>
        </div>
      </div>
      <div className={`${styles.filterBar} ${styles.ownTaskFilters}`}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(
              String(new FormData(event.currentTarget).get("search") || ""),
            );
            setOffset(0);
          }}
        >
          <input
            name="search"
            aria-label="Search my tasks"
            placeholder="Search by request title"
            maxLength={200}
          />
          <button type="submit">Search</button>
        </form>
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
        <button onClick={() => setReload((value) => value + 1)}>
          Refresh tasks
        </button>
      </div>
      {result.error && !loading && (
        <p role="alert" className={styles.error}>
          {result.error}
        </p>
      )}
      {loading && <p role="status">Loading tasks…</p>}
      {result.path === path && !result.error && (
        <>
          <div className={styles.tableWrap}>
            <table
              className={`${styles.table} ${styles.ownTaskTable}`}
              aria-label="Assigned tasks"
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
                    eventName={
                      context.events.find((event) => event.id === task.eventId)
                        ?.name || "Event"
                    }
                    onSaved={() => setReload((value) => value + 1)}
                  />
                ))}
                {!result.items.length && (
                  <tr>
                    <td colSpan={6}>No assigned tasks match this view.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className={styles.pagination}>
            <span>
              {result.total
                ? `${offset + 1}–${Math.min(offset + 30, result.total)} of ${result.total} tasks`
                : "No tasks"}
            </span>
            <div>
              <button
                disabled={!offset}
                onClick={() => setOffset((value) => Math.max(0, value - 30))}
              >
                Previous
              </button>
              <button
                disabled={offset + 30 >= result.total}
                onClick={() => setOffset((value) => value + 30)}
              >
                Next
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
}: {
  task: OwnTask;
  eventName: string;
  onSaved: () => void;
}) {
  const [editor, setEditor] = useState<{
    status: string;
    note: string;
    version: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || busy) return;
    setBusy(true);
    setError("");
    try {
      await marketing(
        `/requests/${task.requestId}/tasks/${task.id}`,
        "PATCH",
        editor,
      );
      setEditor(null);
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
    try {
      await download(
        `/api/marketing-workflow/requests/${task.requestId}/speaker-image/${task.details.image}`,
        "speaker-image",
      );
    } catch {
      setError("Unable to download the speaker image. Please retry.");
    }
  }
  return (
    <Fragment>
      <tr>
        <td>
          <strong>{taskLabel(task.kind)}</strong>
          <small>{task.title}</small>
          <details>
            <summary>View task brief</summary>
            <dl>
              {Object.entries(task.details)
                .filter(([key, value]) => key !== "image" && value)
                .map(([key, value]) => (
                  <Fragment key={key}>
                    <dt>{label(key.replace(/([a-z])([A-Z])/g, "$1 $2"))}</dt>
                    <dd>{value}</dd>
                  </Fragment>
                ))}
            </dl>
            {task.details.image && (
              <button onClick={() => void speakerImage()}>
                Download speaker image
              </button>
            )}
          </details>
        </td>
        <td data-label="Event">{eventName}</td>
        <td data-label="Priority">
          <span className={styles.priority} data-priority={task.priority}>
            {label(task.priority)}
          </span>
        </td>
        <td data-label="Due date">{task.dueAt ? formatDate(task.dueAt) : "No deadline"}</td>
        <td data-label="Task status">
          <span className={styles.badge} data-status={task.status}>
            {statusName(task.status)}
          </span>
          {task.status === "waiting" && (
            <small>Waiting for design completion</small>
          )}
          {task.completedAt && <small>{formatDate(task.completedAt)}</small>}
          {task.note && <small>{task.note}</small>}
        </td>
        <td data-label="Action">
          {task.canUpdate ? (
            <button
              disabled={busy}
              onClick={() => {
                setError("");
                setEditor({
                  status: task.status,
                  note: task.note || "",
                  version: task.requestVersion,
                });
              }}
            >
              Update status
            </button>
          ) : (
            <small>
              {task.status === "done"
                ? "Completed · manager can reopen"
                : "Status updates unavailable"}
            </small>
          )}
        </td>
      </tr>
      {(editor || error) && (
        <tr>
          <td colSpan={6}>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            {editor && (
              <form
                className={styles.taskStatusForm}
                onSubmit={save}
                aria-label={`Update ${taskLabel(task.kind)}`}
              >
                <label>
                  Status
                  <select
                    aria-label="New task status"
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
                </label>
                <label>
                  {editor.status === "blocked"
                    ? "Blocker (required)"
                    : "Task note"}
                  <textarea
                    aria-label="Task note"
                    value={editor.note}
                    disabled={busy}
                    maxLength={5000}
                    required={editor.status === "blocked"}
                    onChange={(event) =>
                      setEditor({ ...editor, note: event.target.value })
                    }
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    busy || (editor.status === "blocked" && !editor.note.trim())
                  }
                >
                  {busy ? "Saving…" : "Save status"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditor(null);
                    setError("");
                  }}
                >
                  Cancel
                </button>
              </form>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}
