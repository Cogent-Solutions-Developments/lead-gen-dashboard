"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  Copy,
  Database,
  Info,
  Layers3,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardLeadInventory, DashboardLeadInventoryItem } from "@/lib/api";

type InventoryTab = "quality" | "volume" | "departments";

const EMPTY_ITEMS: DashboardLeadInventoryItem[] = [];
const PIE_COLORS = ["#2563eb", "#f59e0b"];
const DEPARTMENTS = [
  { key: "sales", label: "Sales", color: "#2563eb" },
  { key: "delegate", label: "Delegate", color: "#10b981" },
  { key: "production", label: "Production", color: "#f59e0b" },
] as const;
const TABS: Array<{ id: InventoryTab; label: string; icon: typeof ShieldCheck }> = [
  { id: "quality", label: "Data quality", icon: ShieldCheck },
  { id: "volume", label: "Event volume", icon: BarChart3 },
  { id: "departments", label: "Department coverage", icon: Building2 },
];

function number(value: number) {
  return Number(value || 0).toLocaleString();
}

function percent(value: number) {
  return `${Math.round(Number(value || 0))}%`;
}

function shortEventName(value: string, maxLength: number) {
  const name = String(value || "Event").trim() || "Event";
  return name.length > maxLength ? `${name.slice(0, Math.max(maxLength - 1, 1))}…` : name;
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="relative min-w-0 overflow-hidden border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
          <p className="mt-2 text-3xl font-light tabular-nums tracking-tight text-zinc-950">{value}</p>
          <p className="mt-1 truncate text-xs text-zinc-500" title={detail}>{detail}</p>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(60,64,67,0.08)] ${className}`}>
      <div>
        <h3 className="text-base font-semibold tracking-tight text-zinc-950">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function chartSelectionKey(state: unknown) {
  if (!state || typeof state !== "object") return null;
  const payload = (state as { activePayload?: Array<{ payload?: { canonicalEventKey?: string } }> }).activePayload;
  return String(payload?.[0]?.payload?.canonicalEventKey || "").trim() || null;
}

export function LeadInventoryOverview({
  data,
  loading,
  error,
}: {
  data: DashboardLeadInventory | null;
  loading: boolean;
  error?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<InventoryTab>("quality");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showCounting, setShowCounting] = useState(false);
  const items = data?.items ?? EMPTY_ITEMS;
  const denseCharts = items.length > 12;
  const chartData = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        shortName: shortEventName(item.canonicalEventName, denseCharts ? 11 : 18),
        duplicateRate: item.rawLeads ? (item.duplicateLeads / item.rawLeads) * 100 : 0,
        sales: item.departments.sales?.uniqueLeads || 0,
        delegate: item.departments.delegate?.uniqueLeads || 0,
        production: item.departments.production?.uniqueLeads || 0,
      })),
    [denseCharts, items]
  );
  const selectedEvent = items.find((item) => item.canonicalEventKey === selectedKey) || items[0] || null;
  const duplicateRate = data?.totals.rawLeads
    ? (Number(data.totals.duplicateLeads || 0) / Number(data.totals.rawLeads)) * 100
    : 0;
  const pieData = useMemo(
    () => [
      { name: "Unique", value: Number(data?.totals.uniqueLeads || 0) },
      { name: "Repeats", value: Number(data?.totals.duplicateLeads || 0) },
    ],
    [data?.totals.duplicateLeads, data?.totals.uniqueLeads]
  );
  const barSize = items.length > 20 ? 10 : denseCharts ? 16 : 26;

  const drillIntoEvent = (state: unknown) => {
    const key = chartSelectionKey(state);
    if (!key) return;
    setSelectedKey(key);
    setActiveTab("quality");
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TABS.length - 1;
    else return;

    event.preventDefault();
    const nextTab = TABS[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`inventory-tab-${nextTab.id}`)?.focus();
  };

  if (loading && !data) {
    return (
      <section className="mt-8 space-y-5" aria-label="Loading lead inventory">
        <div className="h-14 animate-pulse border border-zinc-200 bg-white" />
        <div className="grid animate-pulse gap-4 2xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,.6fr)]">
          <div className="h-[36rem] border border-zinc-200 bg-white" />
          <div className="h-[36rem] border border-zinc-200 bg-white" />
        </div>
      </section>
    );
  }

  if (!data) {
    return error ? (
      <section className="mt-8 border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        Lead inventory unavailable.
      </section>
    ) : null;
  }

  return (
    <section className="mt-8 w-full space-y-4">
      <div className="border border-zinc-200 bg-white p-1 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
        <div className="flex flex-col gap-1 lg:flex-row lg:items-center">
          <nav className="grid min-w-0 flex-1 grid-cols-1 sm:grid-cols-3" role="tablist" aria-label="Lead inventory views">
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`inventory-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`inventory-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`relative flex min-h-12 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                    selected ? "bg-blue-600 text-white" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <div className="flex items-center justify-between gap-2 px-3 py-2 lg:justify-end lg:py-0">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {number(data.totals.eventCount)} events
            </span>
            <button
              type="button"
              onClick={() => setShowCounting((value) => !value)}
              className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Explain lead counting"
              aria-expanded={showCounting}
              title="How counts work"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {showCounting ? (
        <p className="border-l-2 border-blue-500 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-zinc-600">
          Unique: {data.counting.uniqueIdentity}. Department totals: {data.counting.departmentScope}.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="border border-zinc-200 bg-white py-20 text-center text-sm text-zinc-400">No leads yet.</div>
      ) : null}

      {items.length > 0 && activeTab === "quality" ? (
        <div
          id="inventory-panel-quality"
          role="tabpanel"
          aria-labelledby="inventory-tab-quality"
          className="grid gap-4 2xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,.6fr)]"
        >
          <ChartCard title="Data quality" subtitle="System totals and repeat health" className="min-h-[38rem]">
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-2 min-[1780px]:grid-cols-4">
              <SummaryMetric icon={Database} label="All rows" value={number(data.totals.rawLeads)} detail="Includes repeats" tone="bg-blue-50 text-blue-700" />
              <SummaryMetric icon={UsersRound} label="Unique" value={number(data.totals.uniqueLeads)} detail="Across the system" tone="bg-emerald-50 text-emerald-700" />
              <SummaryMetric icon={Copy} label="Repeats" value={number(data.totals.duplicateLeads)} detail={`${percent(duplicateRate)} of all rows`} tone="bg-amber-50 text-amber-700" />
              <SummaryMetric icon={Layers3} label="Event reach" value={number(data.totals.eventUniqueLeads)} detail={`${number(data.totals.crossEventRepeats)} cross-event repeats`} tone="bg-violet-50 text-violet-700" />
            </div>

            <div className="mt-4 grid items-center gap-4 border-t border-zinc-100 pt-4 lg:grid-cols-[minmax(18rem,.8fr)_minmax(14rem,.4fr)]">
              <div className="relative h-[20rem] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="84%" paddingAngle={3} stroke="none">
                      {pieData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 0, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-4xl font-light tabular-nums text-zinc-950">{percent(duplicateRate)}</p>
                    <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">repeat rate</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {pieData.map((entry, index) => {
                  const share = data.totals.rawLeads ? (entry.value / data.totals.rawLeads) * 100 : 0;
                  return (
                    <div key={entry.name} className="border border-zinc-200 p-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                        <span>{entry.name}</span>
                        <strong className="ml-auto tabular-nums text-zinc-950">{number(entry.value)}</strong>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(share, 100)}%`, backgroundColor: PIE_COLORS[index] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Event detail" subtitle="Choose one event to inspect" className="flex min-h-[38rem] flex-col">
            {selectedEvent ? (
              <div className="mt-5 flex flex-1 flex-col">
                <label htmlFor="event-detail-select" className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Event
                </label>
                <select
                  id="event-detail-select"
                  value={selectedEvent.canonicalEventKey}
                  onChange={(event) => setSelectedKey(event.target.value)}
                  className="mt-2 w-full border border-zinc-300 bg-white px-3 py-3 text-sm font-medium text-zinc-950 outline-none transition-colors hover:border-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  {items.map((item) => (
                    <option key={item.canonicalEventKey} value={item.canonicalEventKey}>{item.canonicalEventName}</option>
                  ))}
                </select>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 px-3 py-3">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-blue-600">Rows</p>
                    <p className="mt-1 text-xl font-light tabular-nums text-zinc-950">{number(selectedEvent.rawLeads)}</p>
                  </div>
                  <div className="bg-emerald-50 px-3 py-3">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-emerald-600">Unique</p>
                    <p className="mt-1 text-xl font-light tabular-nums text-zinc-950">{number(selectedEvent.uniqueLeads)}</p>
                  </div>
                  <div className="bg-amber-50 px-3 py-3">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-amber-600">Repeats</p>
                    <p className="mt-1 text-xl font-light tabular-nums text-zinc-950">{number(selectedEvent.duplicateLeads)}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {DEPARTMENTS.map((department) => {
                    const count = selectedEvent.departments[department.key]?.uniqueLeads || 0;
                    const width = selectedEvent.uniqueLeads ? Math.min((count / selectedEvent.uniqueLeads) * 100, 100) : 0;
                    return (
                      <div key={department.key}>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-zinc-600">{department.label}</span>
                          <span className="font-semibold tabular-nums text-zinc-950">{number(count)}</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${width}%`, backgroundColor: department.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link href={`/leads?event=${encodeURIComponent(selectedEvent.canonicalEventKey)}`} className="mt-auto inline-flex items-center justify-center gap-2 border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                  Open leads
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : null}
          </ChartCard>
        </div>
      ) : null}

      {items.length > 0 && activeTab === "volume" ? (
        <div id="inventory-panel-volume" role="tabpanel" aria-labelledby="inventory-tab-volume">
          <ChartCard title="Event volume" subtitle="Rows, unique leads and repeat rate · Click an event to inspect">
            <div className="mt-5 h-[34rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 18, right: 18, left: -4, bottom: 48 }} onClick={drillIntoEvent}>
                  <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="shortName" interval={0} angle={denseCharts ? -48 : -28} textAnchor="end" height={88} tick={{ fill: "#71717a", fontSize: denseCharts ? 9 : 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="leads" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={62} />
                  <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#a1a1aa", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 0, boxShadow: "0 12px 35px -22px rgba(15,23,42,.55)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Bar yAxisId="leads" dataKey="rawLeads" name="All rows" fill="#bfdbfe" radius={[4, 4, 0, 0]} maxBarSize={barSize} />
                  <Bar yAxisId="leads" dataKey="uniqueLeads" name="Unique" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={barSize} />
                  <Line yAxisId="rate" type="monotone" dataKey="duplicateRate" name="Repeat %" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      ) : null}

      {items.length > 0 && activeTab === "departments" ? (
        <div id="inventory-panel-departments" role="tabpanel" aria-labelledby="inventory-tab-departments">
          <ChartCard title="Department coverage" subtitle="Unique leads in each department scope · Click an event to inspect">
            <div className="mt-5 h-[34rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 18, right: 18, left: -4, bottom: 48 }} onClick={drillIntoEvent}>
                  <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="shortName" interval={0} angle={denseCharts ? -48 : -28} textAnchor="end" height={88} tick={{ fill: "#71717a", fontSize: denseCharts ? 9 : 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={62} />
                  <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 0, boxShadow: "0 12px 35px -22px rgba(15,23,42,.55)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  {DEPARTMENTS.map((department) => (
                    <Bar key={department.key} dataKey={department.key} name={department.label} fill={department.color} radius={[3, 3, 0, 0]} maxBarSize={barSize} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      ) : null}
    </section>
  );
}
