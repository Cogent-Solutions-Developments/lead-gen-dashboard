"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, Loader2, Target, Terminal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { createCampaign } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function NewCampaignPage() {
  const router = useRouter();

  const [icp, setIcp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icp.trim()) return toast.error("Please enter an ICP");

    setIsSubmitting(true);
    try {
      const res = await createCampaign(icp);
      toast.success("Campaign added to queue!", { description: "Scraping will begin shortly." });
      router.push(`/campaigns/${res.id}`);
    } catch (err: any) {
      toast.error("Failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      {/* Back Link */}
      <Link
        href="/campaigns"
        className="mb-6 inline-flex items-center text-sm font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">New Campaign</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Define your Ideal Customer Profile (ICP) to initialize the scraping engine.
        </p>
      </motion.div>

      {/* Main Form Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-4xl"
      >
        <form onSubmit={handleSubmit}>
          <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md">

            {/* Card Header */}
            <div className="border-b border-zinc-100 bg-zinc-50/30 px-6 py-5">
              <div className="flex items-center gap-4">
                {/* Icon Container - Target Icon for "Precision" */}
                {/* <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm">
                  <Target className="h-5 w-5 text-sidebar-primary" />
                </div> */}
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Campaign Targeting</h2>
                  <p className="text-xs text-zinc-500">The AI will use this criteria to identify valid leads.</p>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-6">
              <div className="relative">
                {/* Decorative label */}
                <div className="absolute right-4 top-4 rounded-md border border-zinc-100 bg-zinc-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  ICP Input
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

Exclusions:
- Oil & gas operators (NOCs/IOCs)
- Academic institutions`}
                  value={icp}
                  onChange={(e) => setIcp(e.target.value)}
                  className="min-h-112.5 w-full resize-none rounded-lg border border-zinc-200 bg-white p-6 font-mono text-sm leading-relaxed text-zinc-800 placeholder:text-zinc-300 focus:border-zinc-900 focus:ring-0 focus:ring-offset-0"
                />
              </div>

              {/* Footer Actions */}
              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-zinc-400" />
                  <p className="text-xs font-medium text-zinc-400">
                    {icp.length > 0 ? `${icp.length} chars` : "Waiting for input..."}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !icp.trim()}
                  className="h-11 min-w-40 bg-sidebar text-white shadow-lg shadow-zinc-900/10 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-zinc-400" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Launch Campaign
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </motion.div>
    </div>
  );
}