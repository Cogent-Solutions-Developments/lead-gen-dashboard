"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Pause, X, Layers, Inbox, Hash } from "lucide-react";

const queueItems = [
  {
    id: "1",
    name: "Oil & Gas Vendors - Nigeria",
    icpPreview: "Targeting procurement managers in Lagos...",
    status: "processing",
    progress: 67,
    leadsFound: 45,
    estimatedTime: "~8 min remaining",
    addedAt: "2 min ago",
  },
  {
    id: "2",
    name: "Tech Startups - UAE",
    icpPreview: "SaaS founders attending Dubai Tech Summit...",
    status: "queued",
    position: 1,
    addedAt: "15 min ago",
  },
  {
    id: "3",
    name: "Manufacturing - Qatar",
    icpPreview: "Industrial equipment suppliers in Saudi & Qatar...",
    status: "queued",
    position: 2,
    addedAt: "1 hour ago",
  },
];

export default function QueuePage() {
  const processingItem = queueItems.find((item) => item.status === "processing");
  const queuedItems = queueItems.filter((item) => item.status === "queued");

  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 border-b border-zinc-100 pb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Scraping Queue</h1>
        <p className="mt-2 text-sm text-zinc-500">Monitor active scraping jobs and upcoming tasks.</p>
      </motion.div>

      {/* Currently Processing Section */}
      {processingItem && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
             <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sidebar-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sidebar-primary"></span>
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Now Processing
            </h2>
          </div>

          <Card className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md transition-all">
            {/* REMOVED: Active Indicator Line was here */}

            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                
                {/* Left: Icon & Info */}
                <div className="flex items-start gap-5 w-full">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 shadow-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-sidebar-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900">{processingItem.name}</h3>
                            <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{processingItem.icpPreview}</p>
                        </div>
                        {/* Desktop Pause Button */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="hidden sm:flex border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300 transition-all ml-4"
                        >
                            <Pause className="mr-2 h-3.5 w-3.5" />
                            Pause
                        </Button>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <Badge className="bg-zinc-900 text-sidebar-primary border-zinc-900 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider">
                        Running
                      </Badge>
                      <span className="text-xs font-medium text-zinc-500 px-2 border-l border-zinc-200">
                        {processingItem.leadsFound} leads found
                      </span>
                      <span className="text-xs font-medium text-zinc-900 px-2 border-l border-zinc-200">
                        {processingItem.estimatedTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar Area */}
              <div className="mt-8">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  <span>Scraping Progress</span>
                  <span className="text-zinc-900">{processingItem.progress}%</span>
                </div>
                {/* Custom Neon Green Progress Bar */}
                <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${processingItem.progress}%` }}
                    className="h-full rounded-full bg-sidebar-primary"
                    transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Queue List Section */}
      {queuedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-zinc-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Up Next ({queuedItems.length})
            </h2>
          </div>

          <div className="space-y-3">
            {queuedItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Changed to flex-row and items-center to ensure vertical alignment */}
                <Card className="group flex flex-row items-center gap-4 p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all">
                  
                  {/* Position Indicator - Standard "Hash" icon look */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 border border-zinc-100 group-hover:bg-zinc-100 group-hover:text-zinc-600 transition-colors">
                    <div className="flex items-center gap-0.5 text-sm font-semibold">
                        <Hash className="h-3 w-3 opacity-50" />
                        {item.position}
                    </div>
                  </div>

                  {/* Info - Force left alignment and fill space */}
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-semibold text-zinc-900 text-sm truncate">{item.name}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">Added {item.addedAt}</p>
                  </div>

                  {/* Cancel Action */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 shrink-0 text-zinc-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!processingItem && queuedItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-zinc-100 rounded-xl bg-zinc-50/30"
        >
          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-zinc-100">
             <Inbox className="h-8 w-8 text-zinc-300" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">Queue is empty</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-xs mx-auto">
            All jobs have been processed. Add a new campaign to start scraping.
          </p>
        </motion.div>
      )}
    </div>
  );
}