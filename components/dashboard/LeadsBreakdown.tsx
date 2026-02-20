"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getDashboardDistribution } from "@/lib/apiRouter";
import { toast } from "sonner";
import { usePersona } from "@/hooks/usePersona";

type Dist = { total: number; contacted: number; pending: number; other: number };

const chartConfig = {
  visitors: { label: "Leads" },
  contacted: { label: "Contacted", color: "var(--sidebar-primary)" },
  pending: { label: "Pending Review", color: "#00d2ff" },
  other: { label: "Other", color: "#e4e4e7" },
} satisfies ChartConfig;

export function LeadsBreakdown() {
  const [dist, setDist] = React.useState<Dist | null>(null);
  const { persona } = usePersona();

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const d = await getDashboardDistribution();
        if (!alive) return;
        setDist(d);
      } catch (err: any) {
        if (!alive) return;
        toast.error("Failed to load distribution", { description: err.message });
        setDist({ total: 0, contacted: 0, pending: 0, other: 0 });
      }
    })();

    return () => {
      alive = false;
    };
  }, [persona]);

  const data = React.useMemo(() => {
    const d = dist || { total: 0, contacted: 0, pending: 0, other: 0 };
    return [
      { status: "contacted", visitors: d.contacted, fill: "url(#lead-status-contacted)" },
      { status: "pending", visitors: d.pending, fill: "url(#lead-status-pending)" },
      { status: "other", visitors: d.other, fill: "url(#lead-status-other)" },
    ];
  }, [dist]);

  const totalLeads = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.visitors || 0), 0);
  }, [data]);

  return (
    <Card className="relative isolate flex h-full min-h-[20rem] flex-col gap-0 overflow-hidden rounded-2xl border border-[rgb(255_255_255_/_0.82)] bg-slate p-0 lg:min-h-0 [background-image:radial-gradient(132%_120%_at_88%_-8%,rgba(125,177,255,0.42)_0%,rgba(183,214,255,0.17)_34%,rgba(255,255,255,0)_60%),radial-gradient(126%_112%_at_10%_6%,rgba(255,255,255,0.72)_0%,rgba(250,252,255,0.5)_52%,rgba(240,246,253,0.38)_100%),linear-gradient(160deg,rgba(255,255,255,0.8)_0%,rgba(250,252,255,0.64)_56%,rgba(240,246,253,0.52)_100%)] backdrop-blur-[16px] [backdrop-filter:saturate(175%)_blur(16px)] shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.24)] [transform:perspective(1200px)_translateY(0)_rotateX(0deg)_rotateY(0deg)] transition-[transform,border-color,box-shadow,background-image,backdrop-filter] duration-200 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:[background:linear-gradient(170deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.34)_34%,rgba(255,255,255,0)_70%),radial-gradient(80%_70%_at_18%_0%,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0)_72%)] after:pointer-events-none after:absolute after:inset-0 after:z-[1] after:opacity-[0.14] after:mix-blend-soft-light after:[background:linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)] hover:border-[rgb(255_255_255_/_0.94)] hover:[background-image:radial-gradient(132%_120%_at_88%_-8%,rgba(125,177,255,0.5)_0%,rgba(183,214,255,0.24)_34%,rgba(255,255,255,0)_60%),radial-gradient(126%_112%_at_10%_6%,rgba(255,255,255,0.82)_0%,rgba(250,253,255,0.58)_52%,rgba(244,248,254,0.44)_100%),linear-gradient(160deg,rgba(255,255,255,0.86)_0%,rgba(252,254,255,0.72)_56%,rgba(243,248,254,0.58)_100%)] hover:[backdrop-filter:saturate(185%)_blur(18px)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.82),0_0_12px_-9px_rgba(2,10,27,0.58),0_0_6px_-5px_rgba(15,23,42,0.36),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_0_rgba(221,230,244,0.74),inset_0_0_22px_rgba(255,255,255,0.24)] hover:[transform:perspective(1200px)_translateY(-4px)_rotateX(1.4deg)_rotateY(-0.6deg)]">
      <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gradient-to-br from-sky-300/34 via-blue-500/12 to-blue-700/0 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-300/20 via-sky-200/10 to-transparent blur-3xl" />

      <CardHeader className="relative z-[2] items-center border-b border-slate-100/70 bg-gradient-to-b from-white/50 to-white/20 pb-4 pt-5 backdrop-blur-[10px] [backdrop-filter:saturate(150%)_blur(10px)]">
        <CardTitle className="text-zinc-900">Lead Distribution</CardTitle>
        <CardDescription>Current pipeline status</CardDescription>
      </CardHeader>

      <CardContent className="relative z-[2] flex flex-1 flex-col justify-center pb-0">
        <ChartContainer config={chartConfig} className="mx-auto h-[min(15rem,30vh)] w-full">
          <PieChart>
            <defs>
              <linearGradient id="lead-status-contacted" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7bb6ff" />
                <stop offset="52%" stopColor="#2f79f0" />
                <stop offset="100%" stopColor="#1356bf" />
              </linearGradient>

              <linearGradient id="lead-status-pending" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#95f0ff" />
                <stop offset="54%" stopColor="#39cdf7" />
                <stop offset="100%" stopColor="#0b8ec6" />
              </linearGradient>

              <linearGradient id="lead-status-other" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f4f8ff" />
                <stop offset="55%" stopColor="#dde6f5" />
                <stop offset="100%" stopColor="#c8d4ea" />
              </linearGradient>

              <filter id="lead-status-grain" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.95"
                  numOctaves="2"
                  seed="8"
                  stitchTiles="stitch"
                  result="noise"
                />
                <feColorMatrix in="noise" type="saturate" values="0" result="desaturatedNoise" />
                <feComponentTransfer in="desaturatedNoise" result="grainAlpha">
                  <feFuncA type="table" tableValues="0 0.11" />
                </feComponentTransfer>
                <feComposite in="grainAlpha" in2="SourceAlpha" operator="in" result="grainMasked" />
                <feBlend in="SourceGraphic" in2="grainMasked" mode="soft-light" />
              </filter>
            </defs>

            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="visitors"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
              stroke="rgba(255,255,255,0.62)"
              filter="url(#lead-status-grain)"
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-zinc-900 text-3xl font-bold">
                          {totalLeads.toLocaleString()}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-zinc-500 text-xs font-medium uppercase tracking-wider">
                          Total Leads
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>

      <div className="relative z-[2] flex items-center justify-center gap-5 pb-5 pt-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[linear-gradient(135deg,#7bb6ff_0%,#2f79f0_52%,#1356bf_100%)]" />
          <span className="text-xs text-zinc-600 font-medium">Contacted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[linear-gradient(135deg,#95f0ff_0%,#39cdf7_54%,#0b8ec6_100%)]" />
          <span className="text-xs text-zinc-600 font-medium">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[linear-gradient(135deg,#f4f8ff_0%,#dde6f5_55%,#c8d4ea_100%)]" />
          <span className="text-xs text-zinc-600 font-medium">Other</span>
        </div>
      </div>
    </Card>
  );
}
