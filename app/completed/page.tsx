"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Download, 
  Eye, 
  Calendar, 
  Users 
} from "lucide-react";
import Link from "next/link";

const completedCampaigns = [
  {
    id: "1",
    name: "Manufacturing - GCC",
    event: "Gulf Manufacturing Expo",
    completedAt: "Jan 4, 2024",
    leads: 312,
  },
  {
    id: "2",
    name: "Healthcare Summit",
    event: "MENA Healthcare 2023",
    completedAt: "Dec 28, 2023",
    leads: 189,
  },
];

export default function CompletedPage() {
  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 border-b border-zinc-100 pb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Completed Campaigns</h1>
        <p className="mt-2 text-sm text-zinc-500">Archive of finished scraping jobs.</p>
      </motion.div>

      <div className="space-y-4">
        {completedCampaigns.map((campaign, index) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-sm">
              
              {/* Main Body */}
              <div className="p-6">
                <div className="flex items-start gap-5">
                  {/* Icon Box */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 text-sidebar shadow-sm">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">{campaign.name}</h3>
                    <p className="text-sm text-zinc-500 mt-1">{campaign.event}</p>
                    
                    <div className="flex items-center gap-3 mt-3">
                      <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider shadow-none">
                        Completed
                      </Badge>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                        <Calendar className="h-3.5 w-3.5" />
                        Finished {campaign.completedAt}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Footer: Leads Left, Actions Right */}
              <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/30 px-6 py-4">
                
                {/* Metric: Total Leads */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border border-zinc-200 rounded-lg text-zinc-400">
                        <Users className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Leads</span>
                        <span className="text-lg font-bold text-zinc-900 leading-none">{campaign.leads}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link href={`/campaigns/${campaign.id}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300"
                    >
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      View
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300"
                  >
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Export
                  </Button>
                </div>

              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}