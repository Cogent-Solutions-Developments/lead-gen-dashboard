"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign } from "@/lib/apiRouter";

export default function NewCampaignPage() {
  const router = useRouter();

  const [icp, setIcp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!icp.trim()) return "ICP is required.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createCampaign(icp.trim());

      toast.success("Campaign created", {
        description: "Scraping will begin shortly.",
      });
      router.push(`/campaigns/${response.id}`);
    } catch (err: unknown) {
      const description =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error("Failed to create campaign", { description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-1">
      <Link
        href="/campaigns"
        className="mb-6 inline-flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Campaigns
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">New Campaign</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Provide ICP details to create a campaign.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <Card className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              ICP
            </label>
            <Textarea
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder={`Example:\nEvent: 12th MICT Forum Qatar\nTarget companies: B2B technology vendors in GCC\nTarget roles: Sales Director, Business Development Manager\nExclusions: Non-commercial institutions`}
              className="min-h-80 resize-y border-zinc-200 bg-white font-mono text-sm"
            />
            <p className="text-xs text-zinc-400">{icp.length} characters</p>
          </div>

          <div className="mt-6 flex items-center justify-end border-t border-zinc-100 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 min-w-40 bg-sidebar text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Launch Campaign
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
