"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  KanbanSquare,
  Megaphone,
  FolderOpen,
  FileText,
  Users,
  Plus,
  Search,
  List,
  CalendarDays,
  X,
  RefreshCw,
  ArrowRight,
  Clock3,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import {
  marketing,
  type Context,
  type RequestSummary,
  type MarketingRequest,
  type Overview,
} from "./api";
import { RequestDetail, RequestForm } from "./Requests";
import { Library } from "./Library";
import { Settings } from "./Settings";
import {
  Board,
  RequestTable,
  TaskQueue,
  Calendar,
  shortDate,
  stages,
} from "./WorkViews";
import styles from "./marketing.module.css";

const monthNow = () =>
  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
export default function MarketingWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  const tab = params.get("tab") || "overview";
  const eventId = params.get("event") || "";
  const view = params.get("view") || "board";
  const requestId = params.get("request");
  const creating = params.get("create") === "1";
  const month = params.get("month") || monthNow();
  const search = params.get("search") || "";
  const status = params.get("status") || "";
  const priority = params.get("priority") || "";
  const offset = Number(params.get("offset") || 0) || 0;
  const [context, setContext] = useState<Context | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<RequestSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [myRows, setMyRows] = useState<RequestSummary[]>([]);
  const [selected, setSelected] = useState<MarketingRequest | null>(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  function navigate(changes: Record<string, string | null>) {
    const p = new URLSearchParams(query);
    Object.entries(changes).forEach(([k, v]) =>
      v === null || v === "" ? p.delete(k) : p.set(k, v),
    );
    router.replace(`/marketing?${p}`, { scroll: false });
  }
  const refreshContext = useCallback(async () => {
    const c = await marketing<Context>("/context");
    setContext(c);
    return c;
  }, []);
  useEffect(() => {
    const c = new AbortController();
    marketing<Context>("/context", "GET", undefined, c.signal)
      .then(setContext)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    marketing<Overview>(
      `/overview${eventId ? `?eventId=${eventId}` : ""}`,
      "GET",
      undefined,
      c.signal,
    )
      .then(setOverview)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [eventId, refresh]);
  useEffect(() => {
    if (!context) return;
    const c = new AbortController();
    const p = new URLSearchParams({ limit: "40", offset: String(offset) });
    if (eventId) p.set("eventId", eventId);
    if (status) p.set("status", status);
    if (priority) p.set("priority", priority);
    if (search) p.set("search", search);
    if (tab === "my-tasks") p.set("assigned", "true");
    if (tab === "social") p.set("taskKind", "social");
    if (params.get("overdue")) p.set("overdue", "true");
    if (view === "calendar") {
      const [y, m] = month.split("-").map(Number);
      p.set("dueFrom", `${month}-01`);
      p.set(
        "dueTo",
        `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`,
      );
    }
    marketing<{
      items: RequestSummary[];
      total: number;
      counts: Record<string, number>;
    }>(`/requests?${p}`, "GET", undefined, c.signal)
      .then((r) => {
        setRows(r.items);
        setTotal(r.total);
        setCounts(r.counts);
        setLoading(false);
        setError("");
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => c.abort();
  }, [
    context,
    eventId,
    status,
    priority,
    search,
    offset,
    tab,
    view,
    month,
    refresh,
    params,
  ]);
  useEffect(() => {
    if (!context?.staff) return;
    const c = new AbortController();
    marketing<{ items: RequestSummary[] }>(
      `/requests?assigned=true&active=true&limit=8${eventId ? `&eventId=${eventId}` : ""}`,
      "GET",
      undefined,
      c.signal,
    )
      .then((r) => setMyRows(r.items))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [context, eventId, refresh]);
  useEffect(() => {
    const timer = setInterval(() => setRefresh((v) => v + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!requestId) return;
    const c = new AbortController();
    marketing<MarketingRequest>(
      `/requests/${encodeURIComponent(requestId)}`,
      "GET",
      undefined,
      c.signal,
    )
      .then((r) => {
        setSelected(r);
        setDetailError("");
      })
      .catch((e) => {
        if (!c.signal.aborted) setDetailError(e.message);
      });
    return () => c.abort();
  }, [requestId]);
  useEffect(() => {
    const node = dialog.current;
    if ((creating || requestId) && context) {
      if (node && !node.open) node.showModal();
    } else if (node?.open) node.close();
  }, [creating, requestId, context]);
  const open = (id: string) => {
    setDetailError("");
    navigate({ request: id, create: null });
  };
  const close = () => navigate({ request: null, create: null });
  function saved(r: MarketingRequest) {
    setSelected(r);
    setRefresh((v) => v + 1);
    navigate({ request: r.id, create: null });
  }
  const switchTab = (key: string) =>
    navigate({
      tab: key,
      offset: null,
      request: null,
      create: null,
      status: null,
      overdue: null,
      view: null,
      search: null,
      priority: null,
    });
  return (
    <section className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            <Megaphone size={14} /> Marketing department
          </div>
          <h1>
            Marketing workspace
            <span className={styles.liveDot} />
          </h1>
          <p>Plan the work. Keep every delivery moving.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            aria-label="Refresh workspace"
            onClick={() => setRefresh((v) => v + 1)}
          >
            <RefreshCw size={16} />
          </button>
          <button
            className={styles.primary}
            onClick={() => navigate({ create: "1", request: null })}
          >
            <Plus size={16} />
            {context?.manager ? "Create task" : "New request"}
          </button>
        </div>
      </header>
      {error && (
        <div className={styles.error} role="alert">
          <AlertCircle size={17} />
          {error}
          <button
            onClick={() => {
              void refreshContext();
              setRefresh((v) => v + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {!context ? (
        <div className={styles.empty} role="status">
          Loading your workspace…
        </div>
      ) : (
        <>
          <div className={styles.scopeBar}>
            <label>
              <CalendarDays size={15} />
              <select
                aria-label="Event"
                value={eventId}
                onChange={(e) =>
                  navigate({ event: e.target.value, offset: null })
                }
              >
                <option value="">All events</option>
                {context.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <span>
              {context.manager
                ? "Manager workspace"
                : context.social
                  ? "Social media responsibility"
                  : context.staff
                    ? "Marketing team"
                    : "Department requests"}
            </span>
          </div>
          {tab === "overview" && (
            <>
              <div className={styles.welcome}>
                <div>
                  <h2>Your delivery overview</h2>
                  <p>
                    {overview?.active || 0} active requests across{" "}
                    {eventId ? "this event" : "your workspace"}. Here’s what
                    needs your attention.
                  </p>
                </div>
                <span className={styles.today}>
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className={styles.stats}>
                {[
                  {
                    name: "Active requests",
                    value: overview?.active || 0,
                    icon: KanbanSquare,
                    to: "requests",
                    tone: "blue",
                  },
                  {
                    name: "Awaiting review",
                    value: overview?.counts.review || 0,
                    icon: CheckCheck,
                    to: "requests",
                    filter: "review",
                    tone: "purple",
                  },
                  {
                    name: "Overdue",
                    value: overview?.overdue || 0,
                    icon: Clock3,
                    to: "requests",
                    late: true,
                    tone: "amber",
                  },
                  {
                    name: "Completed",
                    value: overview?.counts.completed || 0,
                    icon: CheckCheck,
                    to: "requests",
                    filter: "completed",
                    tone: "green",
                  },
                ].map(({ name, value, icon: Icon, to, filter, late, tone }) => (
                  <button
                    key={name}
                    className={styles.stat}
                    onClick={() =>
                      navigate({
                        tab: to,
                        status: filter || null,
                        overdue: late ? "1" : null,
                        offset: null,
                      })
                    }
                  >
                    <span className={styles.statIcon} data-tone={tone}>
                      <Icon size={19} />
                    </span>
                    <span>
                      <small>{name}</small>
                      <strong>{value}</strong>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
              <div className={styles.overviewGrid}>
                <section className={styles.panel}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <h2>
                        {context.staff ? "My work queue" : "Recent requests"}
                      </h2>
                      <p>
                        {context.staff
                          ? "Your next delivery steps, with clear owners and deadlines."
                          : "Track delivery from request to completion."}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        switchTab(context.staff ? "my-tasks" : "requests")
                      }
                    >
                      View all <ArrowRight size={14} />
                    </button>
                  </div>
                  {context.staff ? (
                    <TaskQueue
                      rows={myRows}
                      activeOnly
                      context={context}
                      social={false}
                      onOpen={open}
                    />
                  ) : (
                    <RequestTable
                      rows={rows.slice(0, 6)}
                      context={context}
                      onOpen={open}
                    />
                  )}
                  <div className={styles.quickLinks}>
                    <button onClick={() => switchTab("agenda")}>
                      <FileText size={20} />
                      <span>
                        <strong>Agenda library</strong>
                        <small>Released PDFs & version history</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                    <button onClick={() => switchTab("materials")}>
                      <FolderOpen size={20} />
                      <span>
                        <strong>Marketing materials</strong>
                        <small>Event assets & approved resources</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
                <section className={styles.panel}>
                  <div className={styles.sectionHeading}>
                    <h2>Recent activity</h2>
                    <span className={styles.live}>Live</span>
                  </div>
                  <ol className={styles.activity}>
                    {overview?.activity.map((a) => (
                      <li key={a.id}>
                        <span className={styles.activityDot} />
                        <button onClick={() => open(a.requestId)}>
                          <strong>{a.action}</strong>
                          <span>{a.title}</span>
                          <small>
                            {a.actor} · {shortDate(a.createdAt)}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ol>
                  {!overview?.activity.length && (
                    <div className={styles.empty}>
                      <Clock3 size={24} />
                      <p>
                        Activity will appear as your team works on requests.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          {["requests", "my-tasks", "social"].includes(tab) && (
            <>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>
                    {tab === "social"
                      ? "Social media queue"
                      : tab === "my-tasks"
                        ? "My tasks"
                        : "Request board"}
                  </h2>
                  <p>
                    {tab === "social"
                      ? "Flyer completion unlocks publishing. Record completion and links in the task."
                      : tab === "my-tasks"
                        ? "Everything assigned to you, from first action to delivery."
                        : "Track owners, deadlines and progress through every stage."}
                  </p>
                </div>
                {tab === "social" && context.manager && (
                  <button onClick={() => switchTab("team")}>
                    <Users size={16} />
                    Manage responsibility
                  </button>
                )}
              </div>
              <div className={styles.filterBar}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate({
                      search: searchInput.current?.value || null,
                      offset: null,
                    });
                  }}
                >
                  <Search size={16} />
                  <input
                    ref={searchInput}
                    key={search}
                    aria-label="Search requests"
                    placeholder="Search requests…"
                    defaultValue={search}
                  />
                  <button type="submit">Search</button>
                </form>
                <select
                  aria-label="Status"
                  value={status}
                  onChange={(e) =>
                    navigate({ status: e.target.value, offset: null })
                  }
                >
                  <option value="">All stages</option>
                  {[...stages, ["cancelled", "Cancelled"]].map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Priority"
                  value={priority}
                  onChange={(e) =>
                    navigate({ priority: e.target.value, offset: null })
                  }
                >
                  <option value="">Any priority</option>
                  {["urgent", "high", "normal", "low"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {(search || status || priority || params.get("overdue")) && (
                  <button
                    onClick={() =>
                      navigate({
                        search: null,
                        status: null,
                        priority: null,
                        overdue: null,
                        offset: null,
                      })
                    }
                  >
                    Clear filters
                  </button>
                )}
                {tab === "requests" && (
                  <div className={styles.viewSwitch} aria-label="Request view">
                    {[
                      { key: "board", icon: KanbanSquare, label: "Board" },
                      { key: "list", icon: List, label: "List" },
                      {
                        key: "calendar",
                        icon: CalendarDays,
                        label: "Calendar",
                      },
                    ].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        aria-pressed={view === key}
                        onClick={() => navigate({ view: key, offset: null })}
                      >
                        <Icon size={15} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {loading ? (
                <div className={styles.empty} role="status">
                  Loading requests…
                </div>
              ) : tab !== "requests" ? (
                <TaskQueue
                  rows={rows}
                  context={context}
                  social={tab === "social"}
                  onOpen={open}
                />
              ) : view === "calendar" ? (
                <Calendar
                  rows={rows}
                  month={month}
                  onMonth={(m) => navigate({ month: m, offset: null })}
                  onOpen={open}
                />
              ) : view === "list" ? (
                <RequestTable rows={rows} context={context} onOpen={open} />
              ) : (
                <Board
                  rows={rows}
                  context={context}
                  onOpen={open}
                  counts={counts}
                />
              )}
              <footer className={styles.pagination}>
                <span>
                  {total
                    ? `${offset + 1}–${Math.min(offset + 40, total)} of ${total} requests`
                    : "No matching requests"}
                  {view === "calendar" && total > 40
                    ? " · Use Next to see more deadlines"
                    : ""}
                </span>
                <div>
                  <button
                    disabled={!offset}
                    onClick={() =>
                      navigate({ offset: String(Math.max(0, offset - 40)) })
                    }
                  >
                    Previous
                  </button>
                  <button
                    disabled={offset + 40 >= total}
                    onClick={() => navigate({ offset: String(offset + 40) })}
                  >
                    Next
                  </button>
                </div>
              </footer>
            </>
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
      <dialog
        ref={dialog}
        className={styles.drawer}
        aria-label={creating ? "Create marketing request" : "Request details"}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className={styles.drawerHeader}>
          <span>{creating ? "New marketing work" : "Request details"}</span>
          <button onClick={close} aria-label="Close request">
            <X size={20} />
          </button>
        </div>
        {context &&
          (creating ? (
            <RequestForm
              context={context}
              eventId={eventId}
              onSave={saved}
              onCancel={close}
            />
          ) : selected?.id === requestId ? (
            <RequestDetail
              key={selected.id}
              request={selected}
              context={context}
              onSave={saved}
            />
          ) : (
            <p role="status">{detailError || "Loading request…"}</p>
          ))}
      </dialog>
    </section>
  );
}
