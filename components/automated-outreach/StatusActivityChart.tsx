"use client";

import { useState, type CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, Layers3, RefreshCw } from "lucide-react";
import { OUTREACH_DEPARTMENTS } from "@/lib/automatedOutreach";
import { useStatusActivity } from "@/hooks/useStatusActivity";
import { statusActivityPath, statusActivityTime, statusChartScale, type StatusActivityBoard } from "@/lib/statusOutreachActivity";
import { StatusActivityDrawer } from "./StatusActivityDrawer";
import styles from "./StatusActivityChart.module.css";

export function StatusActivityChart({ refreshKey = 0 }: { refreshKey?: number }) {
  const [department, setDepartment] = useState("");
  const [eventKey, setEventKey] = useState("");
  const [selected, setSelected] = useState<{ key: string; label: string } | null>(null);
  const { data, previous, error, reload, refreshing } = useStatusActivity<StatusActivityBoard>(
    `/status-activity?${statusActivityPath(department, eventKey)}`, 5000, refreshKey);
  const scale = statusChartScale(data?.items ?? [], previous?.items);
  const maximum = scale.maximum;
  const ticks = Array.from({ length: maximum / scale.step + 1 }, (_, index) => index * scale.step);
  const eventName = data?.events.find(event => event.key === eventKey)?.name || "All events";
  const clock = data ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(data.asOf)) : null;

  return <section aria-labelledby="status-activity-heading" className={styles.monitor}>
    <header className={styles.header}>
      <div className={styles.heading}>
        <h2 id="status-activity-heading">Lead status activity</h2>
        <p>Live workflow distribution. Select a status to explore its leads.</p>
      </div>
      <div className={styles.filters}>
        <label className={styles.filter}>
          <Layers3 size={14} aria-hidden="true" /><span>Department</span>
          <select aria-label="Department" value={department} onChange={event => { setDepartment(event.target.value); setEventKey(""); setSelected(null); }}>
            <option value="">All</option>{OUTREACH_DEPARTMENTS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select><ChevronDown size={12} aria-hidden="true" />
        </label>
        <label className={`${styles.filter} ${styles.eventFilter}`}>
          <CalendarDays size={14} aria-hidden="true" /><span>Event</span>
          <select aria-label="Event" value={eventKey} onChange={event => { setEventKey(event.target.value); setSelected(null); }}>
            <option value="">All events</option>{data?.events.map(event => <option key={event.key} value={event.key}>{event.name}</option>)}
            {eventKey && !data?.events.some(event => event.key === eventKey) && <option value={eventKey}>Selected event</option>}
          </select><ChevronDown size={12} aria-hidden="true" />
        </label>
      </div>
    </header>

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
                  aria-label={`${item.label}: ${item.count} leads${old ? `, ${delta > 0 ? "+" : ""}${delta} since previous refresh` : ""}. View leads and status history.`}>
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
                </button>
                <div role="tooltip" id={`status-readout-${item.key}`} className={styles.readout} data-align={index === 0 ? "start" : index === data.items.length - 1 ? "end" : "center"}>
                  <div className={styles.readoutTitle}>{item.label}<ArrowUpRight size={14} aria-hidden="true" /></div>
                  <dl><div><dt>Current leads</dt><dd>{item.count.toLocaleString()}</dd></div><div><dt>Updated in 24h</dt><dd>{updated.toLocaleString()}</dd></div><div><dt>No update in 24h</dt><dd>{older.toLocaleString()}</dd></div><div><dt>Previous refresh</dt><dd>{old ? old.count.toLocaleString() : "—"}</dd></div></dl>
                  <p>Latest update<br /><span>{statusActivityTime(item.lastUpdatedAt)}</span></p>
                  <span className={styles.readoutAction}>Select to view leads & history</span>
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>
      {!data.total && <p className={styles.noResults}>No tracked leads match these filters. Eligible leads appear after automatic discovery.</p>}
      <footer className={styles.footer}>
        <div className={styles.legend}>
          <span><i className={styles.legendCurrent} aria-hidden="true" />Current count</span>
          <span><i className={styles.legendPrevious} aria-hidden="true" />Previous refresh</span>
          <span><i className={styles.legendBand} aria-hidden="true" />Updated in 24h</span>
          <span><i className={styles.legendOlder} aria-hidden="true" />No update in 24h</span>
        </div>
        <p>Hatched segment = recently updated leads</p>
      </footer>
    </>}
    {selected && <StatusActivityDrawer status={selected} department={department} eventKey={eventKey} eventName={eventName} onClose={() => setSelected(null)} />}
  </section>;
}
