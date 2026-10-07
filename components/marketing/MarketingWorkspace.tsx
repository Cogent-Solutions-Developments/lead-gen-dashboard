"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  marketing,
  label,
  formatDate,
  type Context,
  type RequestSummary,
  type MarketingRequest,
} from "./api";
import { RequestDetail, RequestForm } from "./Requests";
import { Library } from "./Library";
import { Settings } from "./Settings";
import styles from "./marketing.module.css";

export default function MarketingWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  const eventId = params.get("event") || "";
  const tab = params.get("tab") || "requests";
  const requestId = params.get("request");
  const creating = params.get("create") === "1";
  const [context, setContext] = useState<Context | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<RequestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<MarketingRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshContext = useCallback(async () => {
    const value = await marketing<Context>("/context");
    setContext(value);
    return value;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    marketing<Context>("/context", "GET", undefined, controller.signal)
      .then(setContext)
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!requestId) return;
    const controller = new AbortController();
    marketing<MarketingRequest>(
      `/requests/${encodeURIComponent(requestId)}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((row) => {
        setSelected(row);
        setError("");
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [requestId]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({
        limit: "30",
        offset: String(offset),
      });
      if (eventId) params.set("eventId", eventId);
      if (status) params.set("status", status);
      if (tab === "my-tasks") params.set("assigned", "true");
      const result = await marketing<{
        items: RequestSummary[];
        total: number;
      }>(`/requests?${params}`, "GET", undefined, signal);
      setRows(result.items);
      setTotal(result.total);
      setLoading(false);
    },
    [eventId, status, offset, tab],
  );

  useEffect(() => {
    if (!context || !["requests", "my-tasks"].includes(tab)) return;
    const controller = new AbortController();
    const update = () =>
      load(controller.signal).catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      });
    void update();
    const timer = setInterval(update, 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [context, load, tab]);

  function open(id: string) {
    router.replace(`/marketing?request=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  function saved(row: MarketingRequest) {
    router.replace(`/marketing?request=${encodeURIComponent(row.id)}`, {
      scroll: false,
    });
    setSelected(row);

    void load().catch((err) => setError(err.message));
  }

  const tabs = [
    "requests",
    ...(context?.staff ? ["my-tasks"] : []),
    "agenda",
    "materials",
    ...(context?.manager ? ["team"] : []),
  ];
  return (
    <section className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Supernizo · Marketing</p>
          <h1>Marketing workspace</h1>
          <p>Requests, responsibilities and delivery — in one place.</p>
        </div>
        <Link
          href={
            context && context.role.startsWith("marketing_")
              ? "/profile"
              : context?.role === "ceo_user"
                ? "/dashboard"
                : "/dashboard"
          }
        >
          Back to workspace
        </Link>
      </header>
      {error && (
        <div role="alert" className={styles.error}>
          {error}{" "}
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      )}
      {!context ? (
        <p role="status">
          {error ? "Marketing could not be loaded." : "Loading marketing…"}
        </p>
      ) : (
        <>
          {context.role === "marketing_user" && (
            <p className={styles.notice}>
              Your legacy Marketing account needs a Designer, Developer or
              Marketing Manager role. An administrator can update it in user
              management.
            </p>
          )}
          <nav className={styles.tabs} aria-label="Marketing sections">
            {tabs.map((value) => (
              <button
                key={value}
                aria-current={tab === value ? "page" : undefined}
                onClick={() => {
                  router.replace(
                    `/marketing?tab=${value}${eventId ? `&event=${eventId}` : ""}`,
                    { scroll: false },
                  );

                  setOffset(0);
                }}
              >
                {value === "materials"
                  ? "Marketing Materials"
                  : value === "team"
                    ? "Team & History"
                    : label(value.replace("-", " "))}
              </button>
            ))}
          </nav>
          <div className={styles.toolbar}>
            <label>
              Event
              <select
                value={eventId}
                onChange={(e) => {
                  const next = new URLSearchParams(query);
                  if (e.target.value) next.set("event", e.target.value);
                  else next.delete("event");
                  router.replace(`/marketing?${next}`, { scroll: false });
                  setOffset(0);
                }}
              >
                <option value="">
                  {["agenda", "materials"].includes(tab)
                    ? "Select an event"
                    : "All events"}
                </option>
                {context.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            {["requests", "my-tasks"].includes(tab) && (
              <>
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setOffset(0);
                    }}
                  >
                    <option value="">All statuses</option>
                    {[
                      "in_progress",
                      "blocked",
                      "review",
                      "completed",
                      "cancelled",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={styles.primary}
                  onClick={() => {
                    router.replace(
                      `/marketing?tab=requests&create=1${eventId ? `&event=${eventId}` : ""}`,
                      { scroll: false },
                    );
                  }}
                >
                  New {context.manager ? "request or task" : "request"}
                </button>
              </>
            )}
          </div>
          {["requests", "my-tasks"].includes(tab) && (
            <div className={styles.columns}>
              <aside className={styles.panel}>
                <h2>
                  {tab === "my-tasks" ? "Assigned to me" : "Requests"}{" "}
                  <small>({total})</small>
                </h2>
                {loading && <p role="status">Loading requests…</p>}
                {!loading && !rows.length && (
                  <p>No requests match these filters.</p>
                )}
                {rows.map((row) => (
                  <button
                    className={styles.requestCard}
                    key={row.id}
                    aria-pressed={selected?.id === row.id}
                    onClick={() => void open(row.id)}
                  >
                    <strong>{row.title}</strong>
                    <span>
                      {label(row.kind)} · {label(row.priority)}
                    </span>
                    <span className={styles.badge} data-status={row.status}>
                      {label(row.status)}
                    </span>
                    <small>{formatDate(row.dueAt)}</small>
                  </button>
                ))}
                <div className={styles.actions}>
                  <button
                    disabled={offset === 0}
                    onClick={() => setOffset((v) => Math.max(0, v - 30))}
                  >
                    Previous
                  </button>
                  <button
                    disabled={offset + 30 >= total}
                    onClick={() => setOffset((v) => v + 30)}
                  >
                    Next
                  </button>
                </div>
              </aside>
              {creating ? (
                <RequestForm
                  context={context}
                  eventId={eventId}
                  onSave={saved}
                  onCancel={() =>
                    router.replace(
                      `/marketing?tab=requests${eventId ? `&event=${eventId}` : ""}`,
                      { scroll: false },
                    )
                  }
                />
              ) : selected && selected.id === requestId ? (
                <RequestDetail
                  key={selected.id}
                  request={selected}
                  context={context}
                  onSave={saved}
                />
              ) : (
                <div className={styles.empty}>
                  <h2>Follow every stage</h2>
                  <p>
                    Select a request to view owners, progress and history, or
                    create a new request.
                  </p>
                  <p>
                    Speaker flyers use task completion only. Agenda and
                    Marketing Materials uploads are managed in their separate
                    tabs.
                  </p>
                </div>
              )}
            </div>
          )}
          {(tab === "agenda" || tab === "materials") && (
            <Library
              key={`${eventId}:${tab}`}
              context={context}
              eventId={eventId}
              category={tab}
            />
          )}
          {tab === "team" && context.manager && (
            <Settings
              context={context}
              eventId={eventId}
              onRefresh={refreshContext}
            />
          )}
        </>
      )}
    </section>
  );
}
