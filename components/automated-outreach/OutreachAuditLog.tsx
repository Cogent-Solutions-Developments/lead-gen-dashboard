"use client";

import { useState } from "react";
import { useOutreachResource } from "@/hooks/useOutreachResource";
import { outreachDate, type OutreachAudit } from "@/lib/automatedOutreach";
import { describeOutreachActivity } from "@/lib/outreachActivity";
import { OutreachFeedback } from "./OutreachStatus";
import { OutreachPagination } from "./OutreachPagination";

export function OutreachAuditLog({ enrollmentId }: { enrollmentId: string }) {
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ enrollmentId, offset: String(offset), limit: "20" });
  const { data, error, reload } = useOutreachResource<{ items: OutreachAudit[]; total: number }>(`/audit?${params}`);
  return <section aria-label="Lead activity history" className="space-y-4">
    <p className="text-sm text-zinc-500">Email progress and changes to this lead’s outreach, newest first.</p>
    <OutreachFeedback error={error} loading={!data && !error} reload={reload} />
    <ol className="space-y-5">
      {data?.items.map((item) => {
        const activity = describeOutreachActivity(item);
        return <li key={item.id} className="border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{activity.title}{activity.step && <span className="ml-2 text-xs font-normal text-zinc-500">Email {activity.step} of 3</span>}</h3><time dateTime={item.createdAt} className="text-xs text-zinc-500">{outreachDate(item.createdAt)}</time></div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{activity.description}</p>
          {activity.reason && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Reason: {activity.reason}</p>}
          {activity.webhook && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Webhook: {activity.webhook}</p>}
          <p className="mt-2 text-xs text-zinc-500">{activity.actor}</p>
          <details className="mt-2 text-xs text-zinc-500"><summary className="cursor-pointer">Reference details</summary><dl className="mt-2 space-y-1 break-all"><div><dt className="inline font-medium">Activity code: </dt><dd className="inline">{item.action}</dd></div><div><dt className="inline font-medium">Recorded by: </dt><dd className="inline">{item.actor}</dd></div><div><dt className="inline font-medium">Activity ID: </dt><dd className="inline">{item.id}</dd></div></dl></details>
        </li>;
      })}
    </ol>
    {data && !data.total && <p className="text-sm text-zinc-500">No activity recorded for this lead yet.</p>}
    {data && data.total > 20 && <OutreachPagination page={Math.floor(offset / 20) + 1} pageSize={20} total={data.total} onChange={(page) => setOffset((page - 1) * 20)} />}
  </section>;
}