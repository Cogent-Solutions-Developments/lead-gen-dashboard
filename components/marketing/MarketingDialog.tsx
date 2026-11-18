"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./marketing.module.css";
export function MarketingDialog({ open, title, label, busy = false, onClose, children }: {
  open: boolean; title: string; label: string; busy?: boolean; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const node = dialog.current;
    if (open && node && !node.open) node.showModal();
    else if (!open && node?.open) node.close();
    return () => { if (node?.open) node.close(); };
  }, [open]);
  return <dialog ref={dialog} className={styles.requestDialog} aria-label={label} aria-describedby={heading}
    onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className={styles.requestDialogHeader}><span id={heading}>{title}</span><button type="button" disabled={busy} onClick={onClose} aria-label="Close request"><X size={20} /></button></div>
    <div className={styles.requestDialogBody}>{children}</div>
  </dialog>;
}
