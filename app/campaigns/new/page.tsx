"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewCampaignPage() {
  const [icp, setIcp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!icp.trim()) {
      toast.error("Please enter an ICP");
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Submit to backend/Make.com webhook
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast.success("Campaign added to queue!", {
      description: "Scraping will begin shortly.",
    });
    
    setIcp("");
    setIsSubmitting(false);
  };

  return (
    <div>
      <Link href="/campaigns" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Campaigns
      </Link>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">New Campaign</h1>
        <p className="mb-6 text-slate-500">Enter your Ideal Customer Profile to start scraping</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit}>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Ideal Customer Profile</h2>
                <p className="text-sm text-slate-500">Describe your target audience in detail</p>
              </div>
            </div>

            <Textarea
              placeholder={`Enter your ICP here...

Example:
Event: 12th MICT Forum Qatar

Target Companies:
- Oil & Gas equipment suppliers and service providers
- Vendors serving upstream, midstream, downstream, HSE
- Equipment & OEMs: pumps, valves, actuators, compressors, pipelines

Company Attributes:
- Employee count: 25-5,000+
- Annual revenue: USD 5M-2B+
- Presence: Nigeria HQ or GCC region operations

Target Roles:
- Sales Manager / Senior Sales Manager
- Business Development Manager/Director
- Key Account Manager
- Country Manager / General Manager
- Marketing Manager / VP Marketing

Exclusions:
- Oil & gas operators (NOCs/IOCs) - they're buyers, not sponsors
- Generic office suppliers, staffing firms
- Academic institutions and government bodies`}
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {icp.length > 0 ? `${icp.length} characters` : "Start typing your ICP..."}
              </p>
              <Button 
                type="submit" 
                disabled={isSubmitting || !icp.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding to Queue...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Start Campaign
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      </motion.div>
    </div>
  );
}