"use client";

import { useState } from "react";
import { OutreachLeadTable } from "./OutreachLeadTable";

export function OutreachOperations() {
  const [trackingOpen, setTrackingOpen] = useState(false);
  return <details onToggle={(event) => setTrackingOpen(event.currentTarget.open)} className="rounded-xl border border-zinc-200 bg-white/70 p-5 dark:border-zinc-700 dark:bg-zinc-900">
    <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-100">Delivery tracking</summary>
    {trackingOpen && <div className="mt-5 space-y-4"><p className="text-sm text-zinc-500">Find leads by event and department. View their emails, delivery progress, and activity history in one place.</p><OutreachLeadTable /></div>}
  </details>;
}