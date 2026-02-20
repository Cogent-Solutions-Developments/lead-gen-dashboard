"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getRecentCampaigns, type RecentCampaign } from "@/lib/apiRouter";
import { toast } from "sonner";
import { usePersona } from "@/hooks/usePersona";

const statusStyles: Record<string, string> = {
  active: "border-emerald-200/90 bg-emerald-50/90 text-emerald-700",
  completed: "border-zinc-200/85 bg-zinc-100/88 text-zinc-700",
  processing: "border-blue-200/90 bg-blue-50/90 text-blue-700",
  needs_review: "border-amber-200/90 bg-amber-50/90 text-amber-700",
  active_outreach: "border-indigo-200/85 bg-indigo-50/88 text-indigo-700",
  paused: "border-orange-200/90 bg-orange-50/90 text-orange-700",
  queued: "border-zinc-200/85 bg-zinc-100/86 text-zinc-600",
};

function safeStyle(status: string) {
  return statusStyles[status] || "border-zinc-200/85 bg-zinc-100/88 text-zinc-700";
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function RecentCampaigns() {
  const [campaigns, setCampaigns] = useState<RecentCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { persona } = usePersona();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await getRecentCampaigns(5);
        if (!alive) return;
        setCampaigns(res.campaigns || []);
      } catch (err: unknown) {
        if (!alive) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to load recent campaigns", { description: message });
        setCampaigns([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [persona]);

  return (
    <Card className="relative isolate flex h-112.5 flex-col overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-slate p-0 [background-image:radial-gradient(132%_120%_at_88%_-8%,rgba(125,177,255,0.42)_0%,rgba(183,214,255,0.17)_34%,rgba(255,255,255,0)_60%),radial-gradient(126%_112%_at_10%_6%,rgba(255,255,255,0.72)_0%,rgba(250,252,255,0.5)_52%,rgba(240,246,253,0.38)_100%),linear-gradient(160deg,rgba(255,255,255,0.8)_0%,rgba(250,252,255,0.64)_56%,rgba(240,246,253,0.52)_100%)] backdrop-blur-[16px] [backdrop-filter:saturate(175%)_blur(16px)] shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.24)] [transform:perspective(1200px)_translateY(0)_rotateX(0deg)_rotateY(0deg)] transition-[transform,border-color,box-shadow,background-image,backdrop-filter] duration-200 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:[background:linear-gradient(170deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.34)_34%,rgba(255,255,255,0)_70%),radial-gradient(80%_70%_at_18%_0%,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0)_72%)] after:pointer-events-none after:absolute after:inset-0 after:z-[1] after:opacity-[0.14] after:mix-blend-soft-light after:[background:linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)] hover:border-[rgb(255_255_255_/_0.94)] hover:[background-image:radial-gradient(132%_120%_at_88%_-8%,rgba(125,177,255,0.5)_0%,rgba(183,214,255,0.24)_34%,rgba(255,255,255,0)_60%),radial-gradient(126%_112%_at_10%_6%,rgba(255,255,255,0.82)_0%,rgba(250,253,255,0.58)_52%,rgba(244,248,254,0.44)_100%),linear-gradient(160deg,rgba(255,255,255,0.86)_0%,rgba(252,254,255,0.72)_56%,rgba(243,248,254,0.58)_100%)] hover:[backdrop-filter:saturate(185%)_blur(18px)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.24)] hover:[transform:perspective(1200px)_translateY(-4px)_rotateX(1.4deg)_rotateY(-0.6deg)]">
      <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-sky-300/34 via-blue-500/12 to-blue-700/0 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/10 to-transparent blur-3xl" />
      <div className="relative z-[2] flex shrink-0 items-center justify-between border-b border-slate-100/70 bg-gradient-to-b from-white/50 to-white/20 p-6 py-5 backdrop-blur-[10px] [backdrop-filter:saturate(150%)_blur(10px)]">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Recent Campaigns</h3>
          <p className="text-sm text-zinc-500">Your latest outreach campaigns</p>
        </div>
        <Button
          asChild
          variant="ghost"
          className="h-10 rounded-md border border-slate-300/80 bg-gradient-to-br from-white/95 via-slate-50/90 to-blue-50/80 px-4 text-slate-700  transition-all hover:-translate-y-0.5 hover:border-slate-300/95 hover:from-white hover:to-blue-50/90 hover:text-slate-900 hover:shadow-[0_12px_18px_-12px_rgba(15,23,42,0.5),0_3px_5px_-3px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-2px_0_rgba(148,163,184,0.55)] active:translate-y-px active:shadow-[0_7px_12px_-10px_rgba(15,23,42,0.44),0_2px_4px_-3px_rgba(59,130,246,0.34),inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(148,163,184,0.4)]"
        >
          <Link href="/campaigns">
            <span className="text-sm font-semibold">View all</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="relative z-[2] min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="divide-y divide-zinc-100/80 px-2 pb-2">
          {loading && <div className="p-6 text-sm text-zinc-400">Loading...</div>}

          {!loading && campaigns.length === 0 && (
            <div className="p-6 text-sm text-zinc-400">No campaigns yet</div>
          )}

          {!loading &&
            campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="group my-1 flex w-full items-center justify-between rounded-xl border border-transparent bg-gradient-to-b from-white/90 to-slate-50/80 p-4 text-left shadow-none transition-colors hover:border-slate-300/90 hover:from-white/95 hover:to-slate-50/85"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300/70 bg-gradient-to-br from-white/95 to-blue-50/75 text-slate-500 transition-colors group-hover:border-slate-300/90 group-hover:from-white/95 group-hover:to-blue-100/75 group-hover:text-blue-700">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <h4 className="truncate pr-4 font-medium text-zinc-900">{c.name}</h4>
                    <p className="text-xs text-zinc-500">
                      <span className="font-medium text-zinc-700">{c.leadsCount}</span>{" "}
                      leads generated
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <Badge
                    className={`rounded-full border px-2.5 font-normal shadow-none backdrop-blur-[6px] [backdrop-filter:saturate(130%)_blur(6px)] ${safeStyle(
                      c.status
                    )}`}
                  >
                    {formatStatus(c.status)}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
                </div>
              </Link>
            ))}

        </div>
      </div>
    </Card>
  );
}
