"use client";

import { useState } from "react";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { outreachDate, statusLabel, type OutreachAudit } from "@/lib/automatedOutreach";
import { OutreachFeedback } from "./OutreachStatus";

export function OutreachAuditLog({ enrollmentId }: { enrollmentId?: string }) {
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ offset: String(offset), limit: "20" });
  if (enrollmentId) params.set("enrollmentId", enrollmentId);
  const { data, error, reload } = useOutreachResource<{ items: OutreachAudit[]; total: number }>(`/audit?${params}`);
  return (
    <section aria-label="Outreach audit trail">
      <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
      <ol className="space-y-3">
        {data?.items.map((item) => (
          <li key={item.id} className="border-l-2 border-slate-200 pl-3 text-xs">
            <p className="font-medium text-slate-700">{statusLabel(item.action)}</p>
            <p className="mt-1 text-slate-500">{outreachDate(item.createdAt)}</p>
            <p className="mt-1 break-all text-slate-400">Actor: {item.actor}</p>
            {!enrollmentId && item.enrollmentId && <p className="mt-1 break-all text-slate-400">Lead: {item.enrollmentId}</p>}
            {Object.keys(item.details).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600">Event details</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(item.details, null, 2)}</pre>
              </details>
            )}
          </li>
        ))}
      </ol>
      {data && !data.total && <p className="text-sm text-slate-500">No activity recorded yet.</p>}
      {data && data.total > 20 && (
        <div className="mt-4 flex items-center gap-3 text-xs">
          <button type="button" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button>
          <span>{offset + 1}–{Math.min(offset + 20, data.total)} of {data.total}</span>
          <button type="button" disabled={offset + 20 >= data.total} onClick={() => setOffset(offset + 20)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button>
        </div>
      )}
    </section>
  );
}
