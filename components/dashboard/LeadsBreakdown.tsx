"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// FIX 1: Use actual colors here, not undefined variables.
// This ensures the chart always has a color to paint on initial load.
const chartData = [
  { status: "contacted", visitors: 842, fill: "var(--sidebar-primary)" }, // Neon Green
  { status: "pending", visitors: 28, fill: "#18181b" }, // Zinc-900 (Black)
  { status: "remaining", visitors: 559, fill: "#e4e4e7" }, // Zinc-200 (Gray)
]

const chartConfig = {
  visitors: {
    label: "Leads",
  },
  contacted: {
    label: "Contacted",
    color: "var(--sidebar-primary)",
  },
  pending: {
    label: "Pending Review",
    color: "#18181b",
  },
  remaining: {
    label: "Unprocessed",
    color: "#e4e4e7", 
  },
} satisfies ChartConfig

export function LeadsBreakdown() {
  const totalLeads = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0)
  }, [])

  return (
<Card className="flex flex-col h-112.5 border-zinc-200 shadow-none bg-white">      <CardHeader className="items-center pb-0 pt-6">
        <CardTitle className="text-zinc-900">Lead Distribution</CardTitle>
        <CardDescription>Current pipeline status</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-0 flex flex-col justify-center">
        {/* FIX 2: Removed 'aspect-square' and invalid 'max-h'. 
            Used explicit h-[250px] to guarantee space is reserved on reload. */}
        <ChartContainer
          config={chartConfig}
          className="mx-auto h-62.5 w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-zinc-900 text-3xl font-bold"
                        >
                          {totalLeads.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-zinc-500 text-xs font-medium uppercase tracking-wider"
                        >
                          Total Leads
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pb-8 pt-4">
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-sidebar-primary shadow-[0_0_4px_rgba(var(--sidebar-primary),0.5)]" />
            <span className="text-xs text-zinc-600 font-medium">Contacted</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-zinc-900" />
            <span className="text-xs text-zinc-600 font-medium">Pending</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-zinc-200" />
            <span className="text-xs text-zinc-600 font-medium">Other</span>
        </div>
      </div>
    </Card>
  )
}