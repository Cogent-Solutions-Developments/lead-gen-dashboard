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
  contacted: { label: "Contacted", color: "#18181b" },
  pending: { label: "Pending Review", color: "#71717a" },
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
      } catch (err: unknown) {
        if (!alive) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Failed to load distribution", { description: message });
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
      { status: "contacted", visitors: d.contacted, fill: "#18181b" },
      { status: "pending", visitors: d.pending, fill: "#71717a" },
      { status: "other", visitors: d.other, fill: "#f4f4f5" },
    ];
  }, [dist]);

  const totalLeads = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.visitors || 0), 0);
  }, [data]);

  return (
    <Card className="relative flex h-full min-h-[20rem] flex-col gap-0 overflow-hidden rounded-none border-0 bg-transparent shadow-none lg:min-h-0">
      <CardHeader className="relative z-[2] border-b border-zinc-300 pb-6 pt-0 px-0 items-start">
        <CardTitle className="text-xl font-light tracking-tight text-zinc-950">Lead Distribution</CardTitle>
        <CardDescription className="text-sm font-light text-zinc-500">Current pipeline status</CardDescription>
      </CardHeader>

      <CardContent className="relative z-[2] flex flex-1 flex-col justify-center pb-0 px-0">
        <ChartContainer config={chartConfig} className="mx-auto h-[min(15rem,30vh)] w-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="visitors"
              nameKey="status"
              innerRadius={60}
              strokeWidth={2}
              stroke="#ffffff"
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-zinc-950 text-4xl font-light tracking-tighter">
                          {totalLeads.toLocaleString()}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-zinc-400 text-[10px] font-bold uppercase tracking-widest">
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

      <div className="relative z-[2] flex items-center justify-start gap-8 pb-2 pt-6 border-t border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Contacted</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pending</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-100" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Other</span>
        </div>
      </div>
    </Card>
  );
}