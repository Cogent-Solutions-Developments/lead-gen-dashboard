"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  marketing,
  eligible,
  taskLabel,
  label,
  type Context,
  type History,
} from "./api";
import { HistoryList } from "./Requests";
import styles from "./marketing.module.css";

export function Settings({
  context,
  eventId,
  onRefresh,
}: {
  context: Context;
  eventId: string;
  onRefresh: () => Promise<Context>;
}) {
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<History[]>([]);
  const [offset, setOffset] = useState(0);
  const scope = eventId || "default";
  useEffect(() => {
    const controller = new AbortController();
    marketing<{ items: History[] }>(
      `/audit?offset=${offset}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((r) => setAudit(r.items))
      .catch((err) => {
        if (!controller.signal.aborted) toast.error(err.message);
      });
    return () => controller.abort();
  }, [context, offset]);
  async function save(path: string, payload: unknown) {
    setBusy(true);
    try {
      await marketing(path, "PUT", payload);
      await onRefresh();
      toast.success("Responsibility saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save responsibility",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.columns}>
      <section className={styles.panel}>
        <h2>Automatic assignment</h2>
        <p>
          {eventId
            ? "Event-specific owners take priority over department defaults."
            : "Department default owners. Leave empty to balance work across eligible users."}
        </p>
        {["website", "flyer", "agenda", "social", "leads"].map((kind) => (
          <label key={kind}>
            {taskLabel(kind)}
            <select
              disabled={busy}
              value={
                context.assignments.find(
                  (r) => r.scope === scope && r.kind === kind,
                )?.userId || ""
              }
              onChange={(e) =>
                void save("/assignments", {
                  scope,
                  kind,
                  userId: e.target.value || null,
                })
              }
            >
              <option value="">Automatic / fallback</option>
              {eligible(context.users, kind).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <h2>Social media responsibility</h2>
        <p>
          An additional responsibility that preserves the user’s primary role.
          Existing tasks retain their history when responsibilities change.
        </p>
        <div className={styles.members}>
          {context.users.map((u) => (
            <label className={styles.check} key={u.id}>
              <input
                type="checkbox"
                disabled={busy}
                checked={u.social}
                onChange={(e) =>
                  void save(`/social-responsibility/${u.id}`, {
                    enabled: e.target.checked,
                  })
                }
              />
              <span>
                {u.name}
                <small>{label(u.role.replace("_user", ""))}</small>
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className={styles.panel}>
        <h2>Department audit history</h2>
        <HistoryList items={audit} />
        <div className={styles.actions}>
          <button
            disabled={!offset}
            onClick={() => setOffset((v) => Math.max(0, v - 50))}
          >
            Previous
          </button>
          <button
            disabled={audit.length < 50}
            onClick={() => setOffset((v) => v + 50)}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
