"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Loader2, ListFilter } from "lucide-react";

const queueItems = [
  {
    id: "1",
    name: "Oil & Gas Vendors - Nigeria",
    status: "processing",
    progress: 67,
    leads: 45,
  },
  {
    id: "2",
    name: "Tech Startups - UAE",
    status: "queued",
    position: 1,
    leads: 32,
  },
  {
    id: "3",
    name: "Manufacturing - Qatar",
    status: "queued",
    position: 2,
    leads: 28,
  },
];

export function QueueStatus() {
  return (
    <Card className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-none dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header: Title + Subtitle layout */}
      <div className="flex items-center justify-between border-b border-zinc-100 p-6 py-5 dark:border-zinc-900">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Queue Status</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Real-time scraping progress</p>
        </div>
        <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          <ListFilter className="h-4 w-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 space-y-0 p-0">
        {queueItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex flex-col gap-3 p-6 transition-colors ${
              index !== queueItems.length - 1 ? "border-b border-zinc-100 dark:border-zinc-900" : ""
            } hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Icon Indicator */}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                    item.status === "processing"
                      ? "border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                      : "border-transparent bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"
                  }`}
                >
                  {item.status === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sidebar-primary" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                
                {/* Text Details */}
                <div>
                  <p className={`text-sm font-medium ${item.status === "processing" ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {item.leads} leads {item.position && `• #${item.position} in line`}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <Badge
                variant="secondary"
                className={`rounded-full px-2.5 font-normal ${
                  item.status === "processing"
                    ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                {item.status === "processing" ? "Running" : "Queued"}
              </Badge>
            </div>

            {/* Progress Bar (Only for processing) */}
            {item.status === "processing" && (
              <div className="pl-11 pr-1">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Scraping profiles...</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{item.progress}%</span>
                </div>
                <Progress 
                  value={item.progress} 
                  className="h-1.5 bg-zinc-100 dark:bg-zinc-900 [&>*]:bg-sidebar-primary" 
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}