"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownWideNarrow, ArrowUpRight, RefreshCw, Search, X } from "lucide-react";
import { statusLabel } from "@/lib/automatedOutreach";
import { statusActivityPath, statusActivityTime, type StatusActivityLead, type StatusActivityPage } from "@/lib/statusOutreachActivity";
import { useStatusActivity } from "@/hooks/useStatusActivity";
import { StatusActivityPagination } from "./StatusActivityPagination";
import { StatusLeadDetails } from "./StatusLeadDetails";
import styles from "./StatusActivityDrawer.module.css";

export function StatusActivityDrawer({ status, department, eventKey, eventName, onClose }: {
  status: { key: string; label: string }; department: string; eventKey: string; eventName: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = statusActivityPath(department, eventKey, { status: status.key, search, offset: String((page - 1) * pageSize), limit: String(pageSize) });
  const { data, error, reload, refreshing } = useStatusActivity<StatusActivityPage<StatusActivityLead>>(`/status-activity/leads?${query}`, 15000);
  const selected = data?.items.find(lead => lead.id === selectedId);
  // Status changes can remove the final page while this view is open.
  if (data && page > Math.max(1, Math.ceil(data.total / pageSize))) setPage(Math.max(1, Math.ceil(data.total / pageSize)));
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  useEffect(() => { list.current?.scrollTo({ top: 0 }); }, [page, pageSize, search]);
  function closeDetails() {
    setSelectedId(null);
    requestAnimationFrame(() => opener.current?.focus());
  }
  function selectLead(lead: StatusActivityLead, button: HTMLButtonElement) {
    opener.current = button;
    setSelectedId(lead.id);
  }
  function changePage(next: number) { setSelectedId(null); setPage(next); }
  function clearSearch() { setDraft(""); setSearch(""); changePage(1); }
  return createPortal(<dialog ref={dialog} aria-labelledby="status-cluster-title" className={styles.dialog}
    onCancel={event => { event.preventDefault(); if (selected) closeDetails(); else onClose(); }}>
    <div className={`${styles.workspace} ${selected ? styles.hasDetails : ""}`}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Status Outreach / Lead activity</p>
            <div className={styles.title}><h2 id="status-cluster-title">{status.label}</h2><span className={styles.count}>{data ? `${data.total.toLocaleString()} ${search ? "matching " : ""}lead${data.total === 1 ? "" : "s"}` : "Loading…"}</span></div>
            <p className={styles.scope}>{department ? statusLabel(department) : "All departments"}<span aria-hidden="true"> / </span>{eventName}</p>
          </div>
          <button type="button" autoFocus className={styles.closeButton} aria-label="Close status details" onClick={onClose}><X size={18} aria-hidden="true" /><span>Close</span></button>
        </div>
        <div className={styles.toolbar}>
          <form className={styles.search} aria-label="Search status leads" onSubmit={event => { event.preventDefault(); setSearch(draft.trim()); changePage(1); }}>
            <Search size={16} aria-hidden="true" />
            <input aria-label="Search leads by name, company or email" type="search" maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Search name, company or email" />
            <button type="submit" className={styles.button}>Search</button>
          </form>
          <div className={styles.listInfo}><span><ArrowDownWideNarrow size={14} aria-hidden="true" />Newest updates first</span><button type="button" className={styles.button} onClick={reload} disabled={refreshing}><RefreshCw size={14} aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh"}</button></div>
        </div>
        <div className={styles.contextRow}><p>Updates every 15s · Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>{search && <button type="button" className={styles.searchChip} onClick={clearSearch}>Search: {search}<X size={12} aria-hidden="true" /><span className={styles.srOnly}>Clear search</span></button>}<p className={styles.detailHint}>Select a lead for full details and history</p></div>
      </header>
      <div className={styles.content}>
        <div className={styles.listPanel}>
          {error && <p role="alert" className={styles.error}>{data ? "Showing the last successful update. " : ""}{error} <button type="button" onClick={reload}>Retry</button></p>}
          <div ref={list} className={styles.listScroll} aria-label="Status leads" aria-busy={!data && !error}>
            {!data && !error && <p role="status" className={styles.empty}>Loading leads and their latest updates…</p>}
            {data && !data.items.length && <div className={styles.empty}><h3>{search ? "No matching leads" : "No leads in this status"}</h3><p>{search ? "Try a different name, company or email." : "The list updates as lead statuses change."}</p>{search && <button type="button" className={styles.button} onClick={clearSearch}>Clear search</button>}</div>}
            {data && data.items.length > 0 && <>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Leads in {status.label}, newest workflow updates first</caption>
                <thead><tr><th scope="col">Lead / company</th><th scope="col">Event / owner</th><th scope="col">Latest update</th><th scope="col" className={styles.secondaryColumn}>Previous status</th><th scope="col" className={styles.secondaryColumn}>Latest comment</th><th scope="col"><span className={styles.srOnly}>Details</span></th></tr></thead>
                <tbody>{data.items.map(lead => <tr key={lead.id} className={lead.id === selectedId ? styles.selectedRow : undefined}>
                  <td><button type="button" className={styles.leadName} aria-pressed={lead.id === selectedId} onClick={event => selectLead(lead, event.currentTarget)}>{lead.name}</button><span className={styles.cellSub}>{lead.company || "Company not recorded"}</span><span className={styles.cellSub}>{lead.email || "Email not recorded"}</span></td>
                  <td><span className={styles.twoLines}>{lead.eventName}</span><span className={styles.cellSub}>{statusLabel(lead.department)} · {lead.owner || "Owner not recorded"}</span></td>
                  <td><span className={styles.twoLines}>{lead.actor || "Updater not recorded"}</span><time className={styles.cellSub} dateTime={lead.updatedAt}>{statusActivityTime(lead.updatedAt)}</time></td>
                  <td className={styles.secondaryColumn}><span>{lead.previousStatus ? statusLabel(lead.previousStatus) : "New"}</span>{lead.previousStatus && <span className={styles.cellSub}>{lead.previousActor || "Updater not recorded"}</span>}</td>
                  <td className={styles.secondaryColumn}><span className={`${styles.twoLines} ${styles.commentPreview}`}>{lead.comment || "—"}</span></td>
                  <td><button type="button" className={styles.iconButton} aria-label={`View details for ${lead.name}`} aria-pressed={lead.id === selectedId} onClick={event => selectLead(lead, event.currentTarget)}><ArrowUpRight size={16} aria-hidden="true" /></button></td>
                </tr>)}</tbody>
              </table>
              <div className={styles.mobileList}>{data.items.map(lead => <button key={lead.id} type="button" className={styles.mobileLead} aria-label={`View details for ${lead.name}`} onClick={event => selectLead(lead, event.currentTarget)}>
                <span className={styles.mobileName}>{lead.name}<ArrowUpRight size={16} aria-hidden="true" /></span><span className={styles.cellSub}>{lead.company || lead.email || "Contact details not recorded"}</span><span className={styles.mobileEvent}>{lead.eventName}</span><span className={styles.cellSub}>{statusLabel(lead.department)} · {lead.actor || "Updater not recorded"}</span><time className={styles.cellSub} dateTime={lead.updatedAt}>{statusActivityTime(lead.updatedAt)}</time>
              </button>)}</div>
            </>}
          </div>
          <StatusActivityPagination page={page} pageSize={pageSize} total={data?.total ?? 0} disabled={!data} onChange={changePage} onPageSizeChange={size => { setPageSize(size); changePage(1); }} />
        </div>
        {selected && <StatusLeadDetails key={selected.id} lead={selected} onClose={closeDetails} />}
      </div>
    </div>
  </dialog>, document.body);
}
