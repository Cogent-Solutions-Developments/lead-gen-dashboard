"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Copy,
  GitBranch,
  Loader2,
  MailCheck,
  Megaphone,
  RefreshCw,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDashboardOutreachTracking,
  type DashboardOutreachTracking,
} from "@/lib/api";

const MIX_COLORS = ["#2563eb", "#8b5cf6"];

function sriLankaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function number(value: number) {
  return Number(value || 0).toLocaleString();
}

function shortName(value: string) {
  const normalized = String(value || "Campaign").trim() || "Campaign";
  return normalized.length > 28 ? `${normalized.slice(0, 27)}…` : normalized;
}

function CopyValue({ value, label, numeric = false }: { value: string | number; label: string; numeric?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`group inline-flex max-w-full items-center gap-2 text-left text-zinc-700 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${numeric ? "tabular-nums" : ""}`}
      aria-label={`Copy ${label}: ${value}`}
      title={`Copy ${label}`}
    >
      <span className="min-w-0 break-words">{numeric ? number(Number(value)) : value}</span>
      {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-zinc-300 group-hover:text-blue-600" aria-hidden="true" />}
    </button>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof MailCheck; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 border border-zinc-200 bg-white px-4 py-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-light tabular-nums tracking-tight text-zinc-950">{number(value)}</p>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

export function OutreachTrackingPanel() {
  const [selectedDate, setSelectedDate] = useState(sriLankaDate);
  const [data, setData] = useState<DashboardOutreachTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getDashboardOutreachTracking(selectedDate));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Outreach tracking is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(
    () => (data?.items ?? []).slice(0, 10).map((item) => ({ ...item, shortName: shortName(item.campaignName) })),
    [data?.items]
  );
  const mixData = useMemo(
    () => [
      { name: "Initial", value: Number(data?.totals.initialEmailCount || 0) },
      { name: "Follow-up", value: Number(data?.totals.followUpEmailCount || 0) },
    ],
    [data?.totals.followUpEmailCount, data?.totals.initialEmailCount]
  );

  return (
    <div id="inventory-panel-outreach" role="tabpanel" aria-labelledby="inventory-tab-outreach" className="space-y-4">
      <div className="flex flex-col gap-3 border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">Send date</p>
            <p className="text-xs font-medium text-zinc-600">Sri Lanka · UTC+5:30</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              if (!event.target.value) return;
              setData(null);
              setSelectedDate(event.target.value);
            }}
            className="h-10 border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 outline-none transition-colors hover:border-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            aria-label="Outreach send date"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="grid h-10 w-10 place-items-center border border-zinc-300 bg-white text-zinc-500 transition-colors hover:border-blue-500 hover:text-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Refresh outreach tracking"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid h-[30rem] place-items-center border border-zinc-200 bg-white text-sm text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-label="Loading outreach tracking" />
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={MailCheck} label="Sent" value={data.totals.sentEmailCount} tone="bg-blue-50 text-blue-700" />
            <Metric icon={UserRoundCheck} label="Leads" value={data.totals.contactedLeadCount} tone="bg-emerald-50 text-emerald-700" />
            <Metric icon={Megaphone} label="Campaigns" value={data.totals.campaignCount} tone="bg-amber-50 text-amber-700" />
            <Metric icon={GitBranch} label="Follow-ups" value={data.totals.followUpEmailCount} tone="bg-violet-50 text-violet-700" />
          </div>

          {data.items.length ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.55fr)]">
              <section className="border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight text-zinc-950">Campaign activity</h3>
                  <span className="text-xs tabular-nums text-zinc-400">Top {chartData.length}</span>
                </div>
                <div className="mt-4 h-[22rem] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 18, left: 12, bottom: 4 }}>
                      <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 5" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="shortName" width={190} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "#f4f4f5" }} contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 0, fontSize: 12 }} />
                      <Bar dataKey="sentEmailCount" name="Sent emails" fill="#2563eb" radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
                <h3 className="text-base font-semibold tracking-tight text-zinc-950">Email mix</h3>
                <div className="relative mt-2 h-[16rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={mixData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">
                        {mixData.map((entry, index) => <Cell key={entry.name} fill={MIX_COLORS[index]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 0, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-3xl font-light tabular-nums text-zinc-950">{number(data.totals.sentEmailCount)}</p>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">sent</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {mixData.map((entry, index) => (
                    <div key={entry.name} className="bg-zinc-50 px-3 py-3">
                      <span className="mb-2 block h-1 w-7" style={{ backgroundColor: MIX_COLORS[index] }} />
                      <p className="text-lg font-light tabular-nums text-zinc-950">{number(entry.value)}</p>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">{entry.name}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center border border-zinc-200 bg-white text-center">
              <div>
                <MailCheck className="mx-auto h-8 w-8 text-zinc-300" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-zinc-600">No sent emails</p>
                <p className="mt-1 text-xs text-zinc-400">Choose another Sri Lanka date.</p>
              </div>
            </div>
          )}

          {data.items.length ? (
            <section className="overflow-hidden border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
                <h3 className="text-base font-semibold tracking-tight text-zinc-950">Campaign records</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-blue-700">{number(data.items.length)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-zinc-50 text-[0.65rem] uppercase tracking-[0.13em] text-zinc-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Campaign ID</th>
                      <th className="px-4 py-3 font-semibold">Campaign</th>
                      <th className="px-4 py-3 font-semibold">Sent</th>
                      <th className="px-4 py-3 font-semibold">Leads</th>
                      <th className="px-4 py-3 font-semibold">Initial</th>
                      <th className="px-5 py-3 font-semibold">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.items.map((item) => (
                      <tr key={item.campaignId} className="transition-colors hover:bg-blue-50/30">
                        <td className="max-w-[17rem] px-5 py-3 font-mono text-xs"><CopyValue value={item.campaignId} label="campaign ID" /></td>
                        <td className="max-w-[26rem] px-4 py-3 font-medium"><CopyValue value={item.campaignName} label="campaign name" /></td>
                        <td className="px-4 py-3"><CopyValue value={item.sentEmailCount} label="sent email count" numeric /></td>
                        <td className="px-4 py-3"><CopyValue value={item.contactedLeadCount} label="contacted lead count" numeric /></td>
                        <td className="px-4 py-3"><CopyValue value={item.initialEmailCount} label="initial email count" numeric /></td>
                        <td className="px-5 py-3"><CopyValue value={item.followUpEmailCount} label="follow-up email count" numeric /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
