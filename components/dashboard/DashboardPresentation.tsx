import type { ComponentType, ReactNode } from "react";

export function SummaryMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
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
          <Icon className="h-4 w-4" aria-hidden={true} />
        </span>
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: ReactNode;
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

