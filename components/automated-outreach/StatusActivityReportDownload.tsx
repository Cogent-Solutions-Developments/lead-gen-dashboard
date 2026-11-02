"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { OUTREACH_API } from "@/lib/automatedOutreachApi";
import type { StatusActivityLead, StatusActivityPage } from "@/lib/statusOutreachActivity";
import { collectStatusOutreachReport, createStatusOutreachReport, type StatusOutreachReportFilters } from "@/lib/statusOutreachReport";
import styles from "./StatusActivityChart.module.css";

export function StatusActivityReportDownload({ filters, disabled = false }: {
  filters: StatusOutreachReportFilters; disabled?: boolean;
}) {
  const request = useRef<AbortController | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);

  async function download() {
    if (request.current || disabled) return;
    const controller = new AbortController();
    request.current = controller;
    setPreparing(true);
    setFeedback(null);
    try {
      const rows = await collectStatusOutreachReport(filters, async (path, signal) =>
        (await apiClient.get<StatusActivityPage<StatusActivityLead>>(OUTREACH_API + path, { signal })).data,
      controller.signal);
      if (!rows.length) {
        setFeedback({ text: "No leads match these filters. Try another date range, department, or event.", error: false });
        return;
      }
      const report = createStatusOutreachReport(rows, filters);
      const { exportStatusOutreachWorkbook } = await import("@/lib/statusOutreachWorkbook");
      const bytes = await exportStatusOutreachWorkbook(report);
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = report.filename;
      document.body.appendChild(link);
      try { link.click(); } finally {
        link.remove();
        // Allow the browser to start reading the download before releasing it.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setFeedback({ text: `Downloaded ${report.count.toLocaleString()} leads.`, error: false });
    } catch (error) {
      if (!controller.signal.aborted) setFeedback({ text: (error as { status?: number })?.status === 404
        ? "The report API is unavailable. Please try again after the backend is connected."
        : error instanceof Error ? error.message : "Could not download the report. Please retry.", error: true });
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPreparing(false);
      }
    }
  }

  return <div className={styles.reportDownload}>
    <button type="button" className={`${styles.dateButton} ${styles.reportButton}`} onClick={() => void download()}
      disabled={disabled || preparing} aria-busy={preparing}>
      {preparing ? <RefreshCw size={13} className={styles.spinning} aria-hidden="true" /> : <Download size={13} aria-hidden="true" />}
      {preparing ? "Preparing report…" : "Download report (Excel)"}
    </button>
    {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? styles.dateError : styles.dateHint}>{feedback.text}</p>}
  </div>;
}
