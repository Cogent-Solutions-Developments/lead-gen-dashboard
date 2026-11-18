"use client";
import { useState } from "react";
import { ArrowUpRight, CheckCheck, ListTodo, MessageCircle, Plus } from "lucide-react";
import type { Overview } from "./api";
import styles from "./marketing.module.css";

const statuses = [
  { key: "queued", name: "To do", color: "#64748b" },
  { key: "in_progress", name: "In progress", color: "#3b82f6" },
  { key: "blocked", name: "Blocked", color: "#f59e0b" },
  { key: "review", name: "In review", color: "#8b5cf6" },
  { key: "completed", name: "Completed", color: "#10b981" },
  { key: "cancelled", name: "Cancelled", color: "#94a3b8" },
];
const series = [
  { key: "tasks", name: "Tasks", color: "#3b82f6", icon: ListTodo },
  { key: "requests", name: "Requests", color: "#8b5cf6", icon: Plus },
  { key: "reviews", name: "Reviews", color: "#10b981", icon: CheckCheck },
  { key: "other", name: "Other", color: "#64748b", icon: MessageCircle },
] as const;
const dateLabel = (date: string, weekday = false) => new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined,
  weekday ? { weekday: "short", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" });

export function OverviewInsights({ overview, onStatus, onActivity }: {
  overview: Overview | null;
  onStatus: (status: string) => void;
  onActivity: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState("");
  if (!overview) return <section className={styles.panel} role="status">Loading insights...</section>;
  const distribution = statuses.map(status => ({ ...status, value: overview.counts[status.key] || 0 }));
  const total = distribution.reduce((sum, status) => sum + status.value, 0);
  let position = 0;
  const gradient = total ? `conic-gradient(${distribution.filter(status => status.value).map(status => {
    const start = position;
    position += status.value / total * 100;
    return `${status.color} ${start}% ${position}%`;
  }).join(",")})` : "var(--mk-border)";
  const summary = overview.activitySummary;
  const days = summary?.days || [];
  const dayTotal = (day: typeof days[number]) => series.reduce((sum, entry) => sum + day[entry.key], 0);
  const maximum = Math.max(1, ...days.map(dayTotal));
  const selected = days.find(day => day.date === selectedDate) || days[days.length - 1];

  return <div className={styles.overviewGrid}>
    <section className={`${styles.panel} ${styles.insightPanel}`} aria-label="Request progress">
      <div className={styles.sectionHeading}><h2>Request progress</h2></div>
      <div className={styles.deliverySnapshot}>
        <div className={styles.deliveryRing} style={{ background: gradient }} role="img"
          aria-label={`${total} requests: ${distribution.map(status => `${status.value} ${status.name}`).join(", ")}`}>
          <div><strong>{total}</strong><small>Requests</small></div>
        </div>
        <div className={styles.statusLegend}>
          {distribution.map(status => <button key={status.key} type="button" disabled={!status.value}
            onClick={() => onStatus(status.key)} aria-label={`Show ${status.name} requests: ${status.value}`}>
            <span className={styles.chartDot} style={{ background: status.color }} aria-hidden="true" />
            <span>{status.name}</span><strong>{status.value}</strong>
          </button>)}
        </div>
      </div>
    </section>
    <section className={`${styles.panel} ${styles.insightPanel}`} aria-label="Team activity chart">
      <div className={styles.sectionHeading}>
        <div><h2>Team activity</h2><small>7 days · UTC</small></div>
        <button type="button" onClick={onActivity} aria-label="Open activity log" title="Activity log"><ArrowUpRight size={17} /></button>
      </div>
      {summary ? <>
        <div className={styles.activityChart} role="group" aria-label={`Daily updates: ${summary.total} in the last 7 days`}>
          {days.map(day => {
            const count = dayTotal(day);
            return <button key={day.date} type="button" className={styles.chartDay}
              aria-label={`${dateLabel(day.date)}: ${count} updates`} aria-pressed={selected?.date === day.date}
              title={`${dateLabel(day.date)}: ${series.map(entry => `${day[entry.key]} ${entry.name}`).join(", ")}`}
              onClick={() => setSelectedDate(day.date)}>
              <span className={styles.barValue}>{count}</span>
              <span className={styles.barTrack} aria-hidden="true"><span className={styles.dayBar} style={{ height: `${count / maximum * 100}%` }}>
                {series.map(entry => <span key={entry.key} style={{ height: `${count ? day[entry.key] / count * 100 : 0}%`, background: entry.color }} />)}
              </span></span>
              <time dateTime={day.date}>{dateLabel(day.date, true)}</time>
            </button>;
          })}
        </div>
        {selected && <div className={styles.activityReadout} role="status" aria-live="polite">
          <div><time dateTime={selected.date}>{dateLabel(selected.date)}</time><strong>{dayTotal(selected)} updates</strong></div>
          <div className={styles.activityLegend}>{series.map(({key,name,color,icon:Icon}) => <span key={key}>
            <Icon size={14} color={color} aria-hidden="true" /><span>{name}</span><strong>{selected[key]}</strong>
          </span>)}</div>
        </div>}
      </> : <div className={styles.empty}>Activity unavailable</div>}
    </section>
  </div>;
}
