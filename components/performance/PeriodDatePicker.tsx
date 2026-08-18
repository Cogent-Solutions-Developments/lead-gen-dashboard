"use client";

import { CalendarDays } from "lucide-react";
import type { ManagerPerformancePeriod } from "@/lib/auth";

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, Math.max(0, (month || 1) - 1), day || 1);
}

function dateValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function isoWeekValue(value: Date) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekToDate(value: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return "";
  const year = Number(match[1]);
  const week = Number(match[2]);
  const fourth = new Date(year, 0, 4);
  const monday = startOfWeek(fourth);
  monday.setDate(monday.getDate() + (week - 1) * 7);
  return dateValue(monday);
}

export function anchorDateForPeriod(value: string, period: ManagerPerformancePeriod) {
  const parsed = parseDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  if (period === "weekly") return dateValue(startOfWeek(parsed));
  if (period === "monthly") return dateValue(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  if (period === "yearly") return dateValue(new Date(parsed.getFullYear(), 0, 1));
  return dateValue(parsed);
}

export function PeriodDatePicker({
  period,
  value,
  onChange,
}: {
  period: ManagerPerformancePeriod;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseDate(value);
  const inputValue = period === "weekly"
    ? isoWeekValue(parsed)
    : period === "monthly"
      ? value.slice(0, 7)
      : period === "yearly"
        ? value.slice(0, 4)
        : value;

  return (
    <label className="relative flex h-11 min-w-0 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 shadow-sm">
      <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
      <span className="sr-only">Choose {period} reporting period</span>
      <input
        type={period === "weekly" ? "week" : period === "monthly" ? "month" : period === "yearly" ? "number" : "date"}
        min={period === "yearly" ? 2000 : undefined}
        max={period === "yearly" ? 2100 : undefined}
        value={inputValue}
        onChange={(event) => {
          const next = event.target.value;
          if (!next) return;
          if (period === "weekly") onChange(weekToDate(next));
          else if (period === "monthly") onChange(`${next}-01`);
          else if (period === "yearly") onChange(`${next}-01-01`);
          else onChange(next);
        }}
        className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-zinc-700 outline-none"
      />
    </label>
  );
}
