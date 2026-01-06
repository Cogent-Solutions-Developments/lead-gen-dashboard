"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Loader2, Pause, X, Rocket } from "lucide-react";

const queueItems = [
  {
    id: "1",
    icpPreview: "Oil & Gas Vendors - Nigeria, 12th MICT Forum...",
    status: "processing",
    progress: 67,
    leadsFound: 45,
    estimatedTime: "~8 min remaining",
    addedAt: "2 min ago",
  },
  {
    id: "2",
    icpPreview: "Tech Startups - UAE, Dubai Tech Summit...",
    status: "queued",
    position: 1,
    addedAt: "15 min ago",
  },
  {
    id: "3",
    icpPreview: "Manufacturing - Qatar, Industrial equipment...",
    status: "queued",
    position: 2,
    addedAt: "1 hour ago",
  },
];

export default function QueuePage() {
  const processingItem = queueItems.find((item) => item.status === "processing");
  const queuedItems = queueItems.filter((item) => item.status === "queued");

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">Queue</h1>
        <p className="mb-6 text-slate-500">ICPs waiting to be processed</p>
      </motion.div>

      {/* Currently Processing */}
      {processingItem && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 mb-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            Currently Scraping
          </h2>

          <Card className="p-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                  <Rocket className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-slate-900 font-medium">{processingItem.icpPreview}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className="bg-blue-100 text-blue-700">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Scraping
                    </Badge>
                    <span className="text-sm text-slate-500">{processingItem.leadsFound} leads found</span>
                    <span className="text-sm text-blue-600 font-medium">{processingItem.estimatedTime}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Progress</span>
                <span className="font-semibold text-blue-600">{processingItem.progress}%</span>
              </div>
              <Progress value={processingItem.progress} className="h-3" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Queue */}
      {queuedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 mb-4">
            <Clock className="h-4 w-4 text-amber-500" />
            Waiting ({queuedItems.length})
          </h2>

          <div className="space-y-3">
            {queuedItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                      #{item.position}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-slate-900 line-clamp-1">{item.icpPreview}</p>
                      <p className="text-sm text-slate-500">Added {item.addedAt}</p>
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <X className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {!processingItem && queuedItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-600">Queue is empty</p>
          <p className="text-slate-500">Add a new campaign to start scraping</p>
        </motion.div>
      )}
    </div>
  );
}