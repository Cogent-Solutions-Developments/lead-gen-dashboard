"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays } from "lucide-react";
import { marketing, type Context } from "./api";
import { Library } from "./Library";
import { MarketingLanding } from "./MarketingLanding";
import { hasMarketingLanding } from "@/lib/marketing-navigation";
import styles from "./marketing.module.css";


export default function MarketingWorkspace() {
  const { user } = useAuth();
  const authScopeKey = JSON.stringify([user?.id, user?.role, ...(user?.departmentAssignments || [])]);
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  const landing = hasMarketingLanding(user);
  const requestedTab = params.get("tab");
  const tab = requestedTab === "materials" ? "materials" : requestedTab === "agenda" ? "agenda" : landing ? "home" : "agenda";
  const [result, setResult] = useState<{ scope: string; context: Context } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const context = result?.scope === authScopeKey ? result.context : null;
  const requestedEvent = params.get("event");
  const eventId = context?.events.some(event => event.id === requestedEvent)
    ? requestedEvent! : context?.events[0]?.id || "";

  useEffect(() => {
    const controller = new AbortController();
    marketing<Context>("/context", "GET", undefined, controller.signal)
      .then(context => {
        if (!controller.signal.aborted) {
          setResult({ scope: authScopeKey, context });
          setError("");
        }
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [authScopeKey, retry]);

  // Old workflow links enter home or a library without fetching workflow data.
  useEffect(() => {
    if (!context) return;
    const next = new URLSearchParams({ tab });
    if (eventId) next.set("event", eventId);
    if (next.toString() !== query) router.replace(`/marketing?${next}`, { scroll: false });
  }, [context, tab, eventId, query, router]);

  function selectEvent(event: string) {
    router.replace(`/marketing?${new URLSearchParams({ tab, event })}`, { scroll: false });
  }
  if (tab === "home") return <>
    <MarketingLanding />
    {error && <div className={styles.error} role="alert">{error}<button onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
  </>;
  const eventControl = context && (
    <div className={styles.scopeBar}>
      <label>
        <CalendarDays size={15} />
        <select
            aria-label="Event"
            value={eventId}
            disabled={!context.events.length}
            onChange={event => selectEvent(event.target.value)}
          >
            {!context.events.length && <option value="">No active events</option>}
            {context.events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
          </select>
      </label>
    </div>
  );
  const content = (
    <>
      {error && (
        <div className={styles.error} role="alert">
          {error}<button onClick={() => setRetry(value => value + 1)}>Retry</button>
        </div>
      )}
      {!context ? (
        <div className={styles.empty} role="status">Loading Marketing libraries...</div>
      ) : !eventId ? (
        <div className={styles.empty}>No active events available.</div>
      ) : (
        <Library
          key={`${authScopeKey}:${eventId}:${tab}`}
          context={context}
          eventId={eventId}
          category={tab}
          eventControl={eventControl}
        />
      )}
    </>
  );
  return <section className={styles.workspace}>
    <header className={styles.header}><div>
      <h1>{tab === "agenda" ? "Agenda" : "Materials"}</h1>
    </div></header>
    {content}
  </section>;
}
