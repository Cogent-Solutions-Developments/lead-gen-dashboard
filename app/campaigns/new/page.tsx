"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign } from "@/lib/apiRouter";

export default function NewCampaignPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [icp, setIcp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!name.trim()) return "Campaign name is required.";
    if (!location.trim()) return "Location is required.";
    if (!date) return "Date is required.";
    if (!category.trim()) return "Category is required.";
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
      const response = await createCampaign({
        name: name.trim(),
        location: location.trim(),
        date,
        category: category.trim(),
        icp: icp.trim(),
      });

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
          Fill in campaign details and ICP. All fields are sent to the backend.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <Card className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Qatar Tech Buyers Wave 1"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Location
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Doha, Qatar"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Category
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Conference"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>
          </div>

          <div className="mt-6 space-y-2">
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
