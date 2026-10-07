"use client";
import {
  CalendarDays,
  CheckCheck,
  Clock3,
  Flag,
  MessageSquare,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Users,
} from "lucide-react";
import { label, taskLabel, type RequestSummary, type Context } from "./api";
import styles from "./marketing.module.css";

export const stages = [
  ["queued", "To do"],
  ["in_progress", "In progress"],
  ["blocked", "Needs attention"],
  ["review", "In review"],
  ["completed", "Completed"],
];
export const statusLabel = (value: string) =>
  stages.find(([key]) => key === value)?.[1] || label(value);
export const shortDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "No deadline";
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((v) => v[0])
    .join("")
    .toUpperCase();
export function RequestCard({
  row,
  context,
  onOpen,
}: {
  row: RequestSummary;
  context: Context;
  onOpen: (id: string) => void;
}) {
  const tasks = row.tasks || [];
  const done = tasks.filter((t) => t.status === "done").length;
  const owners = [
    ...new Map(
      tasks
        .filter((t) => t.assigneeId)
        .map((t) => [t.assigneeId, t.assigneeName]),
    ).values(),
  ];
  const late = row.overdue;
  return (
    <button
      className={styles.boardCard}
      onClick={() => onOpen(row.id)}
      aria-label={`Open ${row.title}`}
    >
      <div className={styles.cardTop}>
        <span className={styles.priority} data-priority={row.priority}>
          <Flag size={11} />
          {label(row.priority)}
        </span>
        <ArrowUpRight size={15} />
      </div>
      <strong>{row.title}</strong>
      <span className={styles.cardSubtitle}>
        {label(row.kind)} ·{" "}
        {context.events.find((e) => e.id === row.eventId)?.name || "Event"}
      </span>
      <div className={styles.progressLabel}>
        <span>
          <CheckCheck size={13} /> Delivery progress
        </span>
        <span>
          {done}/{tasks.length}
        </span>
      </div>
      <div className={styles.progressTrack}>
        <span
          style={{
            width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
          }}
          data-complete={done === tasks.length}
        />
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.due} data-late={!!late}>
          <CalendarDays size={13} />
          {late ? "Overdue · " : ""}
          {shortDate(row.dueAt)}
        </span>
        <span className={styles.avatars}>
          {owners.slice(0, 3).map((name) => (
            <span key={name} title={name}>
              {initials(name)}
            </span>
          ))}
          {!owners.length && (
            <span title="No eligible owner">
              <Users size={12} />
            </span>
          )}
        </span>
      </div>
    </button>
  );
}

export function Board({
  rows,
  context,
  onOpen,
  counts,
}: {
  rows: RequestSummary[];
  context: Context;
  onOpen: (id: string) => void;
  counts: Record<string, number>;
}) {
  const columns = counts.cancelled
    ? [...stages, ["cancelled", "Cancelled"]]
    : stages;
  return (
    <div className={styles.board}>
      {columns.map(([key, title]) => (
        <section className={styles.boardColumn} key={key} aria-label={title}>
          <div className={styles.columnHeading}>
            <span className={styles.statusDot} data-status={key} />
            <h3>{title}</h3>
            <span>{counts[key] || 0}</span>
          </div>
          {rows
            .filter((r) => r.status === key)
            .map((row) => (
              <RequestCard
                key={row.id}
                row={row}
                context={context}
                onOpen={onOpen}
              />
            ))}
          {!rows.some((r) => r.status === key) && (
            <div className={styles.columnEmpty}>
              <Inbox size={20} />
              <span>
                {counts[key]
                  ? "More requests on another page"
                  : "No requests here"}
              </span>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

export function RequestTable({
  rows,
  context,
  onOpen,
}: {
  rows: RequestSummary[];
  context: Context;
  onOpen: (id: string) => void;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Request</th>
            <th>Stage</th>
            <th>Priority</th>
            <th>Progress</th>
            <th>Due date</th>
            <th>Owners</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <button
                  className={styles.textButton}
                  onClick={() => onOpen(row.id)}
                >
                  {row.title}
                </button>
                <small>
                  {context.events.find((e) => e.id === row.eventId)?.name} ·{" "}
                  {label(row.kind)}
                </small>
              </td>
              <td>
                <span className={styles.badge} data-status={row.status}>
                  {statusLabel(row.status)}
                </span>
              </td>
              <td>
                <span className={styles.priority} data-priority={row.priority}>
                  {label(row.priority)}
                </span>
              </td>
              <td>
                {row.tasks.filter((t) => t.status === "done").length}/
                {row.tasks.length}
              </td>
              <td>{shortDate(row.dueAt)}</td>
              <td>
                <small>
                  {[...new Set(row.tasks.map((t) => t.assigneeName))].join(
                    ", ",
                  )}
                </small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TaskQueue({
  rows,
  context,
  social,
  activeOnly = false,
  onOpen,
}: {
  rows: RequestSummary[];
  context: Context;
  social: boolean;
  activeOnly?: boolean;
  onOpen: (id: string) => void;
}) {
  const tasks = rows.flatMap((r) =>
    r.tasks
      .filter((t) => !activeOnly || t.status !== "done")
      .filter((t) =>
        social ? t.kind === "social" : t.assigneeId === context.userId,
      )
      .map((t) => ({ request: r, task: t })),
  );
  return (
    <div className={styles.queue}>
      {tasks.map(({ request, task }) => (
        <button
          key={task.id}
          className={styles.queueRow}
          onClick={() => onOpen(request.id)}
        >
          <span className={styles.taskIcon}>
            {task.status === "done" ? (
              <CheckCheck size={18} />
            ) : task.status === "waiting" ? (
              <Clock3 size={18} />
            ) : (
              <MessageSquare size={18} />
            )}
          </span>
          <span className={styles.queueMain}>
            <strong>{social ? request.title : taskLabel(task.kind)}</strong>
            <small>
              {social ? task.assigneeName : request.title} ·{" "}
              {task.status === "waiting"
                ? "Waiting for flyer design"
                : task.status === "ready"
                  ? "Ready to start"
                  : label(task.status)}
            </small>
          </span>
          <span className={styles.badge} data-status={task.status}>
            {label(task.status)}
          </span>
          <span className={styles.queueDue}>{shortDate(request.dueAt)}</span>
          <ArrowUpRight size={16} />
        </button>
      ))}
      {!tasks.length && (
        <div className={styles.empty}>
          <CheckCheck size={28} />
          <h3>
            {social
              ? "No social-media tasks in this view"
              : "No tasks assigned to you in this view"}
          </h3>
          <p>
            Tasks appear automatically when requests are created and eligible
            owners are assigned.
          </p>
        </div>
      )}
    </div>
  );
}

export function Calendar({
  rows,
  month,
  onMonth,
  onOpen,
}: {
  rows: RequestSummary[];
  month: string;
  onMonth: (value: string) => void;
  onOpen: (id: string) => void;
}) {
  const [year, m] = month.split("-").map(Number);
  const first = new Date(year, m - 1, 1);
  const size = new Date(year, m, 0).getDate();
  const start = (first.getDay() + 6) % 7;
  const move = (delta: number) => {
    const d = new Date(year, m - 1 + delta, 1);
    onMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <section className={styles.calendar}>
      <div className={styles.sectionHeading}>
        <h2>
          {first.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <div className={styles.actions}>
          <button aria-label="Previous month" onClick={() => move(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button aria-label="Next month" onClick={() => move(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className={styles.calendarGrid}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <strong key={d}>{d}</strong>
        ))}
        {Array.from({ length: Math.ceil((start + size) / 7) * 7 }, (_, i) => {
          const day = i - start + 1;
          const valid = day > 0 && day <= size;
          return (
            <div className={styles.calendarDay} key={i}>
              {valid && (
                <>
                  <time>{day}</time>
                  {rows
                    .filter(
                      (r) =>
                        r.dueAt &&
                        new Date(r.dueAt).getDate() === day &&
                        new Date(r.dueAt).getMonth() === m - 1,
                    )
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onOpen(r.id)}
                        title={r.title}
                      >
                        <span
                          className={styles.statusDot}
                          data-status={r.status}
                        />
                        {r.title}
                      </button>
                    ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
