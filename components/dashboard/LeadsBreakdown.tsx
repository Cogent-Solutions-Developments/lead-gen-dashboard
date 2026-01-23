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
import { getDashboardDistribution } from "@/lib/api";
import { toast } from "sonner";

type Dist = { total: number; contacted: number; pending: number; other: number };

const chartConfig = {
  visitors: { label: "Leads" },
  contacted: { label: "Contacted", color: "var(--sidebar-primary)" },
  pending: { label: "Pending Review", color: "#00d2ff" },
  other: { label: "Other", color: "#e4e4e7" },
} satisfies ChartConfig;

export function LeadsBreakdown() {
  const [dist, setDist] = React.useState<Dist | null>(null);

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
  }, []);

  const data = React.useMemo(() => {
    const d = dist || { total: 0, contacted: 0, pending: 0, other: 0 };
    return [
      { status: "contacted", visitors: d.contacted, fill: "var(--sidebar-primary)" },
      { status: "pending", visitors: d.pending, fill: "#00d2ff" },
      { status: "other", visitors: d.other, fill: "#e4e4e7" },
    ];
  }, [dist]);

  const totalLeads = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.visitors || 0), 0);
  }, [data]);

  return (
    <Card className="flex flex-col h-112.5 border-zinc-200 shadow-none bg-white">
      <CardHeader className="items-center pb-0 pt-6">
        <CardTitle className="text-zinc-900">Lead Distribution</CardTitle>
        <CardDescription>Current pipeline status</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0 flex flex-col justify-center">
        <ChartContainer config={chartConfig} className="mx-auto h-62.5 w-full">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={data} dataKey="visitors" nameKey="status" innerRadius={60} strokeWidth={5}>
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

      <div className="flex items-center justify-center gap-6 pb-8 pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sidebar-primary" />
          <span className="text-xs text-zinc-600 font-medium">Contacted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#00d2ff]" />
          <span className="text-xs text-zinc-600 font-medium">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-zinc-200" />
          <span className="text-xs text-zinc-600 font-medium">Other</span>
        </div>
      </div>
    </Card>
  );
}
