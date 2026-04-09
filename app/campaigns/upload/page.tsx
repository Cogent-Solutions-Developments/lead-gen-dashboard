"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCampaignFromUpload } from "@/lib/apiRouter";
import { persistCampaignUploadSummary } from "@/lib/campaignUploadSummary";

const preferredHeaders = [
  "employeeName",
  "title",
  "company",
  "email",
  "phone",
  "linkedinUrl",
  "companyUrl",
  "approvalStatus",
  "contentEmailSubject",
  "contentEmail",
  "contentLinkedin",
  "contentWhatsapp",
];

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getApiErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "An unexpected error occurred.";

  const trimmed = error.message.trim();
  if (!trimmed) return "An unexpected error occurred.";

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { detail?: string; message?: string };
      return parsed.detail || parsed.message || trimmed;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export default function UploadCampaignPage() {
  const router = useRouter();
  const leadSheetInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [leadSheet, setLeadSheet] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateLeadSheet = (file: File | null) => {
    if (!file) return "A CSV lead sheet is required.";
    if (!file.name.toLowerCase().endsWith(".csv")) return "Only .csv files are supported.";
    if (file.size <= 0) return "The selected CSV file is empty.";
    return null;
  };

  const validateForm = () => {
    if (!name.trim()) return "Campaign name is required.";
    return validateLeadSheet(leadSheet);
  };

  const handlePickLeadSheet = () => {
    leadSheetInputRef.current?.click();
  };

  const handleLeadSheetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    const error = validateLeadSheet(picked);

    if (error) {
      if (picked) toast.error(error);
      setLeadSheet(null);
      event.target.value = "";
      return;
    }

    setLeadSheet(picked);
  };

  const clearLeadSheet = () => {
    setLeadSheet(null);
    if (leadSheetInputRef.current) leadSheetInputRef.current.value = "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    if (!leadSheet) return;

    setIsSubmitting(true);
    try {
      const response = await createCampaignFromUpload({
        name: name.trim(),
        location: location.trim(),
        category: category.trim(),
        date,
        icp: notes.trim(),
        leadSheet,
      });

      persistCampaignUploadSummary(response.id, response.importSummary);

      toast.success("Campaign uploaded", {
        description: `${response.importSummary.importedLeads} leads are ready for review.`,
      });

      router.push(`/campaigns/${response.id}`);
    } catch (error: unknown) {
      toast.error("Failed to upload campaign", {
        description: getApiErrorMessage(error),
      });
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
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Upload Campaign</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Import a CSV lead sheet for outreach. Uploaded campaigns skip lead generation and go
          straight to review.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <Card className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/75 p-4">
            <p className="text-sm font-semibold text-amber-900">Manual upload mode</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">
              Only the leads in your CSV will be used for approval and outreach. The system will
              not discover or generate additional leads for this campaign.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Name
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Qatar Tech Buyers Upload"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Location <span className="normal-case tracking-normal text-zinc-400">Optional</span>
              </label>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Doha, Qatar"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Date <span className="normal-case tracking-normal text-zinc-400">Optional</span>
              </label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Category <span className="normal-case tracking-normal text-zinc-400">Optional</span>
              </label>
              <Input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Conference"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Notes / Description <span className="normal-case tracking-normal text-zinc-400">Optional</span>
            </label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={`Example:\nEvent: 12th MICT Forum Qatar\nSource: Sponsor outreach list\nNotes: Focus on GCC software vendors with active field teams`}
              className="min-h-44 resize-y border-zinc-200 bg-white font-mono text-sm"
            />
            <p className="text-xs text-zinc-400">{notes.length} characters</p>
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Lead Sheet (.csv)
            </label>

            <input
              ref={leadSheetInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleLeadSheetChange}
            />

            <button
              type="button"
              onClick={handlePickLeadSheet}
              className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-5 py-10 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-zinc-900">Choose CSV lead sheet</p>
              <p className="mt-1 max-w-xl text-sm text-zinc-500">
                Upload your lead sheet and the campaign will be created as review-ready without
                starting discovery.
              </p>
            </button>

            {leadSheet ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-500" />
                    <p className="truncate text-sm font-medium text-zinc-900">{leadSheet.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{formatBytes(leadSheet.size)}</p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearLeadSheet}
                  className="h-8 rounded-md border border-zinc-200/80 bg-white px-2.5 text-zinc-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Preferred CSV Headers
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                The exported template uses the headers below. Matching them will reduce rejected or
                invalid rows during import.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {preferredHeaders.map((header) => (
                  <span
                    key={header}
                    className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
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
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Campaign
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
