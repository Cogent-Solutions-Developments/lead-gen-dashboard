"use client";
import { useState } from "react";
import {
  Check,
  Circle,
  Clock3,
  Code2,
  Paintbrush,
  FileText,
  Megaphone,
  ShieldCheck,
  Inbox,
  ArrowUpRight,
  Search,
  Plus,
  AlertCircle,
} from "lucide-react";
import { type RequestSummary, type Context, formatDate } from "./api";
import styles from "./marketing.module.css";

type Filter = "all" | "active" | "completed";
const taskVisuals = {
  website: { name: "Website", icon: Code2 },
  flyer: { name: "Flyer", icon: Paintbrush },
  agenda: { name: "Agenda", icon: FileText },
  social: { name: "Social", icon: Megaphone },
  leads: { name: "Leads", icon: Inbox },
};
const requestState = (status: string) =>
  ({
    queued: "Received",
    in_progress: "In progress",
    blocked: "Needs attention",
    review: "Final check",
    completed: "Completed",
    cancelled: "Cancelled",
  })[status] || status;
const taskState = (status: string) =>
  ({
    done: "Done",
    ready: "Up next",
    waiting: "Waiting for design",
    in_progress: "In progress",
    blocked: "Needs attention",
  })[status] || status;

export function RequesterTracker({
  rows,
  context,
  total,
  offset,
  loading,
  filter,
  search,
  onFilter,
  onSearch,
  onPage,
  onOpen,
  onCreate,
}: {
  rows: RequestSummary[];
  context: Context;
  total: number;
  offset: number;
  loading: boolean;
  filter: Filter;
  search: string;
  onFilter: (filter: Filter) => void;
  onSearch: (value: string) => void;
  onPage: (offset: number) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <section
      aria-label="My request tracker"
      className={styles.requesterTracker}
    >
      <div className={styles.trackerToolbar}>
        <div
          role="group"
          aria-label="Filter my requests"
          className={styles.trackerFilters}
        >
          {(
            [
              ["all", "All"],
              ["active", "In progress"],
              ["completed", "Completed"],
            ] as const
          ).map(([value, name]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => onFilter(value)}
            >
              {name}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(
              String(new FormData(event.currentTarget).get("search") || ""),
            );
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input
            key={search}
            name="search"
            aria-label="Find my request"
            placeholder="Find a request"
            defaultValue={search}
            maxLength={200}
          />
          <button type="submit">Find</button>
        </form>
      </div>
      {loading ? (
        <div role="status" className={styles.empty}>
          Loading your requests…
        </div>
      ) : !rows.length ? (
        <div className={styles.trackerEmpty}>
          <Inbox size={36} aria-hidden="true" />
          <h2>
            {total
              ? "No requests on this page"
              : filter === "all" && !search
                ? "Your requests will appear here"
                : "No matching requests"}
          </h2>
          <button className={styles.primary} onClick={onCreate}>
            <Plus size={16} />
            Create request
          </button>
        </div>
      ) : (
        <div className={styles.trackerCards}>
          {rows.map((row) => (
            <TrackingCard
              key={row.id}
              row={row}
              context={context}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
      {(total > 40 || offset > 0) && (
        <div className={styles.pagination}>
          <small>
            {total
              ? `${offset + 1}–${Math.min(offset + 40, total)} of ${total}`
              : "0 requests"}
          </small>
          <button
            disabled={loading || offset === 0}
            onClick={() => onPage(Math.max(0, offset - 40))}
          >
            Previous
          </button>
          <button
            disabled={loading || offset + 40 >= total}
            onClick={() => onPage(offset + 40)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

function TrackingCard({
  row,
  context,
  onOpen,
}: {
  row: RequestSummary;
  context: Context;
  onOpen: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const stages = [
    ...row.tasks.map((task) => ({
      id: task.id,
      ...(taskVisuals[task.kind as keyof typeof taskVisuals] || {
        name: task.kind,
        icon: Circle,
      }),
      status: task.status,
      owner: task.assigneeName,
    })),
    {
      id: "approval",
      name: "Approval",
      icon: ShieldCheck,
      status:
        row.status === "completed"
          ? "done"
          : row.status === "review"
            ? "in_progress"
            : "waiting",
      owner: "Marketing Manager",
    },
  ];
  const completed = stages.filter((stage) => stage.status === "done").length;
  const active = stages.find((stage) => stage.id === selected);
  return (
    <article className={styles.trackingCard} aria-label={row.title}>
      <header className={styles.trackerCardHeading}>
        <div>
          <small>
            {context.events.find((event) => event.id === row.eventId)?.name ||
              "Event"}
          </small>
          <h2>
            <button onClick={() => onOpen(row.id)}>
              {row.title}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </h2>
        </div>
        <span className={styles.badge} data-status={row.status}>
          {row.status === "completed" ? (
            <Check size={14} />
          ) : row.status === "blocked" ? (
            <AlertCircle size={14} />
          ) : (
            <Clock3 size={14} />
          )}{" "}
          {requestState(row.status)}
        </span>
      </header>
      <div className={styles.trackerProgressLabel}>
        <small>
          {completed} of {stages.length} steps complete
        </small>
        <small>
          {row.status === "cancelled"
            ? "Request closed"
            : row.dueAt
              ? `Due ${new Date(row.dueAt).toLocaleDateString()}`
              : "No deadline"}
        </small>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`${row.title} completion`}
        aria-valuemin={0}
        aria-valuemax={stages.length}
        aria-valuenow={completed}
        aria-valuetext={`${completed} of ${stages.length} steps complete`}
      >
        <span
          style={{
            width: `${stages.length ? (completed / stages.length) * 100 : 0}%`,
          }}
          data-complete={row.status === "completed"}
        />
      </div>
      <div className={styles.trackerStages} aria-label="Request steps">
        {stages.map((stage) => {
          const Icon = stage.status === "done" ? Check : stage.icon;
          return (
            <button
              key={stage.id}
              data-status={stage.status}
              aria-pressed={selected === stage.id}
              aria-label={`${stage.name}: ${stage.id === "approval" && stage.status === "waiting" ? "Waiting" : taskState(stage.status)}`}
              onClick={() =>
                setSelected(selected === stage.id ? null : stage.id)
              }
            >
              <span className={styles.trackerStepIcon}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <span>{stage.name}</span>
            </button>
          );
        })}
      </div>
      {active && (
        <div className={styles.trackerStepDetail} role="status">
          <strong>{active.name}</strong>
          <span>
            {active.id === "approval" && active.status === "waiting"
              ? "Waiting"
              : taskState(active.status)}
          </span>
          <span>{active.owner || "Awaiting assignment"}</span>
        </div>
      )}
      <footer className={styles.trackerCardFooter}>
        <small>Updated {formatDate(row.updatedAt)}</small>
        <button onClick={() => onOpen(row.id)}>
          View request
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}
