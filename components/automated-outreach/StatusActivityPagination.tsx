"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import styles from "./StatusActivityDrawer.module.css";

export function StatusActivityPagination({ page, pageSize, total, disabled, onChange, onPageSizeChange }: {
  page: number; pageSize: number; total: number; disabled: boolean;
  onChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  const [jump, setJump] = useState("");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function navigate(next: number) { setJump(""); onChange(next); }
  const start = total ? Math.min((page - 1) * pageSize + 1, total) : 0;
  return <footer className={styles.pagination}>
    <div className={styles.pageSummary}>
      <span aria-live="polite">{disabled ? "Loading leads…" : <>{start.toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()} of <strong>{total.toLocaleString()}</strong> leads</>}</span>
      <label>Rows <select aria-label="Leads per page" value={pageSize} disabled={disabled} onChange={event => { setJump(""); onPageSizeChange(Number(event.target.value)); }}>
        {[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
      </select></label>
    </div>
    <nav aria-label="Lead list pagination" className={styles.pageControls}>
      <button type="button" className={styles.iconButton} aria-label="First page" disabled={disabled || page <= 1} onClick={() => navigate(1)}><ChevronsLeft size={16} /></button>
      <button type="button" className={styles.iconButton} aria-label="Previous page" disabled={disabled || page <= 1} onClick={() => navigate(page - 1)}><ChevronLeft size={16} /></button>
      <form className={styles.jumpForm} onSubmit={event => { event.preventDefault(); const next = Number(jump); if (Number.isInteger(next) && next >= 1 && next <= pages) { navigate(next); } }}>
        <label htmlFor="status-page-jump">Page</label>
        <input id="status-page-jump" aria-label="Go to page" type="number" inputMode="numeric" min={1} max={pages} value={jump || page} onChange={event => setJump(event.target.value)} disabled={disabled} />
        <span>of {disabled ? "—" : pages.toLocaleString()}</span>
        <button type="submit" className={styles.textButton} disabled={disabled || !jump}>Go</button>
      </form>
      <button type="button" className={styles.iconButton} aria-label="Next page" disabled={disabled || page >= pages} onClick={() => navigate(page + 1)}><ChevronRight size={16} /></button>
      <button type="button" className={styles.iconButton} aria-label="Last page" disabled={disabled || page >= pages} onClick={() => navigate(pages)}><ChevronsRight size={16} /></button>
    </nav>
  </footer>;
}
