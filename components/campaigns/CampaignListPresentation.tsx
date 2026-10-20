import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const campaignListShellClassName = "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-300/80 bg-white/32 backdrop-blur-[8px]";
export const campaignListRowClassName = "group border-b border-zinc-300/75 transition-[background-color,box-shadow] last:border-b-0 hover:bg-white/30";
export const campaignPageTitleClassName = "text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl";

export function CampaignPageHeader({ title, description, children }: {
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
}) {
  return <header className="relative z-10 flex shrink-0 flex-col gap-4 border-b border-zinc-100/90 bg-transparent pb-6 backdrop-blur-[8px] sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className={campaignPageTitleClassName}>{title}</h1>
      <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-zinc-500">{description}</p>
    </div>
    {children}
  </header>;
}

export function CampaignListHeader({ label = "Campaign", className }: { label?: ReactNode; className?: string }) {
  return <div className={cn("hidden shrink-0 grid-cols-[minmax(0,2.25fr)_minmax(250px,0.95fr)_minmax(300px,1fr)] items-center gap-6 border-b border-zinc-300/80 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 md:grid", className)}>
    <span>{label}</span><span>Metrics</span><span className="text-right">Actions</span>
  </div>;
}
