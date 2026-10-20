"use client";

import { useState } from "react";
import { OutreachDeliverySettings } from "./OutreachDeliverySettings";
import { OutreachLeadTable } from "./OutreachLeadTable";
import { OutreachAuditLog } from "./OutreachAuditLog";

export function OutreachOperations() {
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  return <div className="space-y-5">
    <OutreachDeliverySettings />
    <details onToggle={(event) => setTrackingOpen(event.currentTarget.open)} className="rounded-xl border border-zinc-200 bg-white/70 p-5 dark:border-zinc-700 dark:bg-zinc-900"><summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-100">Delivery tracking</summary>{trackingOpen && <div className="mt-5"><OutreachLeadTable /></div>}</details>
    <details onToggle={(event) => setHistoryOpen(event.currentTarget.open)} className="rounded-xl border border-zinc-200 bg-white/70 p-5 dark:border-zinc-700 dark:bg-zinc-900"><summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-100">Activity history</summary>{historyOpen && <div className="mt-5"><OutreachAuditLog /></div>}</details>
  </div>;
}
