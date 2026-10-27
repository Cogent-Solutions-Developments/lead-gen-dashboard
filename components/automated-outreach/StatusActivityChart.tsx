"use client";

import { useState, type CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Layers3, Mail, RefreshCw } from "lucide-react";
import { OUTREACH_DEPARTMENTS } from "@/lib/automatedOutreach";
import { useStatusActivity } from "@/hooks/useStatusActivity";
import { STATUS_ACTIVITY_TIME_ZONE, statusActivityDateError, statusActivityDatePreset, statusActivityPath, statusActivityTime, statusChartScale, type StatusActivityBoard } from "@/lib/statusOutreachActivity";
import { StatusActivityDrawer } from "./StatusActivityDrawer";
import { StatusMailSummary } from "./StatusMailSummary";
import { StatusActivityReportDownload } from "./StatusActivityReportDownload";
import styles from "./StatusActivityChart.module.css";

export function StatusActivityChart({ refreshKey = 0 }: { refreshKey?: number }) {
  const [department, setDepartment] = useState("");
  const [eventKey, setEventKey] = useState("");
  const [selected, setSelected] = useState<{ key: string; label: string } | null>(null);
  const [range, setRange] = useState(() => statusActivityDatePreset(7));
  const [draftRange, setDraftRange] = useState(range);
  const dateError = statusActivityDateError(draftRange);
  const hasDateChanges = draftRange.startDate !== range.startDate || draftRange.endDate !== range.endDate;
  const { data, previous, error, reload, refreshing } = useStatusActivity<StatusActivityBoard>(
    `/status-activity?${statusActivityPath(department, eventKey, { ...range, timezone: STATUS_ACTIVITY_TIME_ZONE })}`, 5000, refreshKey);
  const scale = statusChartScale(data?.items ?? [], previous?.items);
  const maximum = scale.maximum;
  const ticks = Array.from({ length: maximum / scale.step + 1 }, (_, index) => index * scale.step);
  const eventName = data?.events.find(event => event.key === eventKey)?.name || "All events";
  const clock = data ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(data.asOf)) : null;

  return <section aria-labelledby="status-activity-heading" className={styles.monitor}>
    <header className={styles.header}>
      <div className={styles.heading}>
        <h2 id="status-activity-heading">Lead status activity</h2>
        <p>Live lead statuses and outreach mail. Select a status to explore leads, emails, and history.</p>
      </div>
      <div className={styles.filters}>
        <label className={styles.filter}>
          <Layers3 size={14} aria-hidden="true" /><span>Department</span>
          <select aria-label="Department" value={department} onChange={event => { setDepartment(event.target.value); setEventKey(""); setSelected(null); }}>
            <option value="">All</option>{OUTREACH_DEPARTMENTS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select><ChevronDown size={12} aria-hidden="true" />
        </label>
      </div>
    </header>

    <form className={styles.dateFilters} aria-label="Filter by latest status update date" onSubmit={event => {
      event.preventDefault();
      if (dateError) return;
      setRange(draftRange);
      setSelected(null);
    }}>
      <div className={styles.dateHeading}><span>Latest status update</span><span>Sri Lanka time (UTC+05:30) · Both dates included</span></div>
      <div className={styles.dateControls}>
        <label className={styles.dateField}>From date<input type="date" required aria-label="From date" aria-invalid={Boolean(dateError)} aria-describedby={dateError ? "status-date-error" : undefined} max={draftRange.endDate || undefined} value={draftRange.startDate} onChange={event => setDraftRange(current => ({ ...current, startDate: event.target.value }))} /></label>
        <label className={styles.dateField}>To date<input type="date" required aria-label="To date" aria-invalid={Boolean(dateError)} aria-describedby={dateError ? "status-date-error" : undefined} min={draftRange.startDate || undefined} value={draftRange.endDate} onChange={event => setDraftRange(current => ({ ...current, endDate: event.target.value }))} /></label>
        <label className={`${styles.dateField} ${styles.eventDateField}`}>Event (optional)
          <select aria-label="Event (optional)" value={eventKey} onChange={event => { setEventKey(event.target.value); setSelected(null); }}>
            <option value="">All events</option>{data?.events.map(event => <option key={event.key} value={event.key}>{event.name}</option>)}
            {eventKey && !data?.events.some(event => event.key === eventKey) && <option value={eventKey}>Selected event</option>}
          </select>
        </label>
        <div className={styles.datePresets} role="group" aria-label="Date presets">{([
          { days: 1, label: "Today" }, { days: 7, label: "Last 7 days" }, { days: 30, label: "Last 30 days" },
        ] as const).map(preset => {
          const dates = statusActivityDatePreset(preset.days);
          return <button key={preset.days} type="button" className={styles.dateButton} aria-pressed={draftRange.startDate === dates.startDate && draftRange.endDate === dates.endDate} onClick={() => setDraftRange(dates)}>{preset.label}</button>;
        })}</div>
        <button type="submit" className={`${styles.dateButton} ${styles.applyDates}`} disabled={Boolean(dateError) || !hasDateChanges}>Apply</button>
        <StatusActivityReportDownload key={`${department}:${eventKey}:${range.startDate}:${range.endDate}`} filters={{ ...range, department, eventKey }} disabled={!data || Boolean(error) || Boolean(dateError) || hasDateChanges} />
      </div>
      {dateError ? <p role="alert" id="status-date-error" className={styles.dateError}>{dateError}</p> : <p className={styles.dateHint} role="status">Showing updates from {range.startDate} to {range.endDate}.{hasDateChanges ? " Apply to update the results." : ""}</p>}
    </form>

    <div className={styles.instrumentBar}>
      <div className={styles.metrics}>
        <span><strong>{data ? data.total.toLocaleString() : "—"}</strong> tracked leads</span>
        <span><strong>{data ? data.updated24h.toLocaleString() : "—"}</strong> updated in 24h</span>
      </div>
      <div className={styles.liveControls}>
        <span className={`${styles.live} ${error ? styles.offline : ""}`}><i aria-hidden="true" />{error ? "Refresh interrupted" : "Live · 5s"}</span>
        <time dateTime={data?.asOf} className={styles.clock}>{clock || "Connecting"}</time>
        <button type="button" aria-label="Refresh lead status activity" disabled={refreshing} onClick={reload} className={styles.refresh}>
          <RefreshCw size={14} aria-hidden="true" className={refreshing ? styles.spinning : ""} />
        </button>
      </div>
    </div>

    {error && <p role="alert" className={styles.error}>{data ? "Showing the last successful update. " : ""}{error} <button type="button" onClick={reload}>Retry</button></p>}
    {!data ? <p role="status" className={styles.empty}>{error ? "Status activity is unavailable." : "Loading lead statuses…"}</p> : <>
      {data.mail && <StatusMailSummary mail={data.mail} />}
      <div className={styles.scrollArea} tabIndex={0} role="region" aria-label="Lead status chart; scroll horizontally on smaller screens">
        <div className={styles.plot} style={{ "--columns": data.items.length, minWidth: Math.max(500, data.items.length * 112 + 52) } as CSSProperties}>
          <div className={styles.axisTitle}>LEADS</div>
          <div aria-hidden="true" className={styles.grid}>{ticks.map(tick => <div key={tick} className={styles.gridLine} style={{ bottom: `${tick / maximum * 100}%` }}>
            <span>{tick.toLocaleString()}</span>
          </div>)}</div>
          <div className={styles.columns}>
            {data.items.map((item, index) => {
              const old = previous?.items.find(row => row.key === item.key);
              const delta = old ? item.count - old.count : 0;
              const updated = Math.min(item.count, item.updated24h);
              const older = item.count - updated;
              return <div key={item.key} className={styles.column} style={{
                "--current": `${item.count / maximum * 100}%`,
                "--older": `${older / maximum * 100}%`,
                "--updated": `${updated / maximum * 100}%`,
                "--previous": `${(old?.count ?? item.count) / maximum * 100}%`,
              } as CSSProperties}>
                <button type="button" className={styles.statusButton} onClick={() => setSelected({ key: item.key, label: item.label })}
                  aria-describedby={`status-readout-${item.key}`}
                  aria-label={`${item.label}: ${item.count} leads${old ? `, ${delta > 0 ? "+" : ""}${delta} since previous refresh` : ""}.${item.mail ? ` ${item.mail.sent} confirmed emails, ${item.mail.awaitingConfirmation} awaiting confirmation, ${item.mail.needsAttention} leads needing attention.` : ""} View leads, outreach emails, and status history.`}>
                  <span className={styles.statusName}>{item.label}</span>
                  <span aria-hidden="true" className={styles.track}>
                    <span className={styles.crosshair} />
                    <span className={styles.stem} />
                    {updated > 0 && <span className={styles.activityBand} />}
                    {updated > 0 && older > 0 && <span className={styles.olderMark} />}
                    {old && <span className={styles.previousMark} />}
                    <span className={styles.currentMark}>
                      <span className={styles.value}>{item.count.toLocaleString()}</span>
                      <span className={styles.cap} />
                    </span>
                  </span>
                  <span className={styles.movement}>
                    {old ? delta === 0 ? <span className={styles.unchanged}>—</span> : <span className={delta > 0 ? styles.increase : styles.decrease}>{delta > 0 ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}{Math.abs(delta)}<span className={styles.movementLabel}> since refresh</span></span> : <span className={styles.unchanged}>Awaiting next refresh</span>}
                  </span>
                  {item.mail && <span className={styles.columnMail}><span><Mail size={11} aria-hidden="true" />{item.mail.sent.toLocaleString()} sent</span>{item.mail.needsAttention > 0 && <span className={styles.mailIssue}>{item.mail.needsAttention.toLocaleString()} need attention</span>}</span>}
                </button>
                <div role="tooltip" id={`status-readout-${item.key}`} className={styles.readout} data-align={index === 0 ? "start" : index === data.items.length - 1 ? "end" : "center"}>
                  <div className={styles.readoutTitle}>{item.label}<ArrowUpRight size={14} aria-hidden="true" /></div>
                  <dl><div><dt>Current leads</dt><dd>{item.count.toLocaleString()}</dd></div><div><dt>Updated in 24h</dt><dd>{updated.toLocaleString()}</dd></div><div><dt>Previous refresh</dt><dd>{old ? old.count.toLocaleString() : "—"}</dd></div></dl>
                  {item.mail && <div className={styles.readoutMail}><h3>Status Outreach mail</h3><dl><div><dt>Confirmed sends</dt><dd>{item.mail.sent.toLocaleString()}</dd></div><div><dt>Awaiting confirmation</dt><dd>{item.mail.awaitingConfirmation.toLocaleString()}</dd></div><div><dt>Planned next sends</dt><dd>{item.mail.scheduledLeads.toLocaleString()}</dd></div><div><dt>Leads needing attention</dt><dd>{item.mail.needsAttention.toLocaleString()}</dd></div><div><dt>Paused leads</dt><dd>{item.mail.pausedLeads.toLocaleString()}</dd></div></dl></div>}
                  <p>Latest update<br /><span>{statusActivityTime(item.lastUpdatedAt)}</span></p>
                  <span className={styles.readoutAction}>Select to view leads, emails & history</span>
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>
      {!data.total && <p className={styles.noResults}>No leads have a latest status update in this date range and filter selection. Try a different date range, department, or event.</p>}
      <footer className={styles.footer}>
        <div className={styles.legend}>
          <span><i className={styles.legendCurrent} aria-hidden="true" />Current count</span>
          <span><i className={styles.legendPrevious} aria-hidden="true" />Previous refresh</span>
          <span><i className={styles.legendBand} aria-hidden="true" />Updated in 24h</span>
          <span><i className={styles.legendOlder} aria-hidden="true" />No update in 24h</span>
        </div>
        <p>Hatching = updated in 24h · Mail totals grouped by current lead status</p>
      </footer>
    </>}
    {selected && <StatusActivityDrawer range={range} status={selected} department={department} eventKey={eventKey} eventName={eventName} onClose={() => setSelected(null)} />}
  </section>;
}
