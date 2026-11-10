"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { OUTREACH_API } from "@/lib/automatedOutreachApi";
import { collectStatusOutreachReport, createStatusOutreachReport, type StatusOutreachReportFilters, type StatusOutreachReportSnapshot } from "@/lib/statusOutreachReport";
import styles from "./StatusActivityChart.module.css";

export type StatusReportFeedback = { text: string; error: boolean } | null;

export function StatusActivityReportDownload({ filters, disabled = false, onFeedback }: {
  filters: StatusOutreachReportFilters; disabled?: boolean;
  onFeedback: (feedback: StatusReportFeedback) => void;
}) {
  const request = useRef<AbortController | null>(null);
  const [preparing, setPreparing] = useState(false);
  useEffect(() => () => { request.current?.abort(); }, []);

  async function download() {
    if (request.current || disabled) return;
    const controller = new AbortController();
    request.current = controller;
    setPreparing(true);
    onFeedback(null);
    try {
      const snapshot = await collectStatusOutreachReport(filters, async (path, signal) =>
        (await apiClient.get<StatusOutreachReportSnapshot>(OUTREACH_API + path, { signal })).data,
      controller.signal);
      const rows = snapshot.items;
      if (!rows.length) {
        onFeedback({ text: "No leads match these filters. Try another date range, department, or event.", error: false });
        return;
      }
      const report = createStatusOutreachReport(rows, filters, new Date(snapshot.asOf));
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
      onFeedback({ text: `Downloaded ${report.count.toLocaleString()} leads.`, error: false });
    } catch (error) {
      if (!controller.signal.aborted) onFeedback({ text: (error as { status?: number })?.status === 404
        ? "The report API is unavailable. Please try again after the backend is connected."
        : error instanceof Error ? error.message : "Could not download the report. Please retry.", error: true });
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPreparing(false);
      }
    }
  }

  return <button type="button" className={`${styles.dateButton} ${styles.reportButton}`} onClick={() => void download()}
      disabled={disabled || preparing} aria-busy={preparing}>
      {preparing ? <RefreshCw size={13} className={styles.spinning} aria-hidden="true" /> : <Download size={13} aria-hidden="true" />}
      <span className={styles.reportLabel}>
        <span className={preparing ? styles.reportLabelHidden : undefined} aria-hidden={preparing}>Download report (Excel)</span>
        {preparing && <span>Preparing report…</span>}
      </span>
    </button>;
}
