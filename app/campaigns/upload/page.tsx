"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { EventRegistryPicker } from "@/components/events/EventRegistryPicker";
import { createCampaignFromUpload } from "@/lib/apiRouter";
import { persistCampaignUploadSummary } from "@/lib/campaignUploadSummary";
import { useAuth } from "@/hooks/useAuth";
import { getCachedAuthUserDisplayName, listActiveEventRegistry, listAdminEvents, type AdminEventItem } from "@/lib/auth";
import { LEAD_TYPE_OPTIONS, type LeadType } from "@/lib/leads/leadTypes";

const leadSheetAccept = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const allowedLeadSheetExtensions = new Set([".csv", ".xlsx"]);

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

function getDisplayName(user: ReturnType<typeof useAuth>["user"]) {
  const values = [user?.fullName, getCachedAuthUserDisplayName(user), user?.username]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];
  const rolePlaceholders = new Set([
    "sales_user",
    "sales user",
    "delegate_user",
    "delegate user",
    "production_user",
    "production user",
    "super_admin_user",
    "super admin user",
  ]);

  return values.find((value) => !rolePlaceholders.has(value.toLowerCase())) || "there";
}

export default function UploadCampaignPage() {
  const router = useRouter();
  const { isSuperAdmin, user } = useAuth();
  const leadSheetInputRef = useRef<HTMLInputElement | null>(null);

  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [leadType, setLeadType] = useState<LeadType | "">("");
  const [leadSheet, setLeadSheet] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || isSuperAdmin) return;
    router.replace("/my-leads?upload=1");
  }, [isSuperAdmin, router, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const rows = isSuperAdmin ? await listAdminEvents(true) : await listActiveEventRegistry();
        if (!active) return;
        setEvents(rows);
      } catch (error: unknown) {
        if (!active) return;
        toast.error("Failed to load events", {
          description: getApiErrorMessage(error),
        });
        setEvents([]);
      } finally {
        if (active) setEventsLoading(false);
      }
    };

    void loadEvents();

    return () => {
      active = false;
    };
  }, [isSuperAdmin, user]);

  const selectedEvent = useMemo(
    () => events.find((item) => item.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const displayName = getDisplayName(user);
  const firstName = displayName.split(/\s+/)[0] || "there";
  const pageTitle = isSuperAdmin ? "Campaign Upload" : "Upload Leads";

  const validateLeadSheet = (file: File | null) => {
    if (!file) return "A CSV or XLSX lead sheet is required.";
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    if (!allowedLeadSheetExtensions.has(extension)) return "Only .csv and .xlsx files are supported.";
    if (file.size <= 0) return "The selected lead sheet is empty.";
    return null;
  };

  const validateForm = () => {
    if (!selectedEvent) return "Event selection is required.";
    if (!selectedEvent.isActive) return "Selected event is inactive. Activate it before uploading leads.";
    if (!selectedEvent.eventName.trim()) return "Selected event is missing a name.";
    if (!selectedEvent.location?.trim()) return "Selected event is missing a location.";
    if (!leadType) return "Lead type is required.";
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
    if (!selectedEvent) return;
    if (!leadType) return;

    setIsSubmitting(true);
    try {
      const response = await createCampaignFromUpload({
        name: selectedEvent.eventName,
        location: selectedEvent.location || "",
        category: category.trim(),
        date: selectedEvent.date || "",
        eventRegistryId: selectedEvent.id,
        icp: notes.trim(),
        leadType,
        leadSheet,
      });

      persistCampaignUploadSummary(response.id, response.importSummary);

      toast.success("Bulk leads uploaded", {
        description: `${response.importSummary.importedLeads} leads are ready for review.`,
      });

      if (!isSuperAdmin && response.canonicalEventKey) {
        router.push(`/leads?event=${encodeURIComponent(response.canonicalEventKey)}`);
      } else if (!isSuperAdmin) {
        router.push("/campaigns");
      } else {
        router.push(`/campaigns/${response.id}`);
      }
    } catch (error: unknown) {
      toast.error("Failed to upload campaign", {
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1 font-sans">
      <header className="shrink-0 border-b border-zinc-300 pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-950"
            >
              <ArrowLeft className="mr-2 h-3 w-3" />
              Return to dashboard
            </Link>

            <div className="mt-6">
              <h1 className="text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">
                {pageTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-base font-light leading-relaxed text-zinc-500 sm:text-lg">
                Onboard your latest event intelligence and synchronize lead data with our database.
              </p>
            </div>
          </div>

          <button
            form="upload-campaign-form"
            type="submit"
            disabled={isSubmitting || eventsLoading}
            className="inline-flex h-10 min-w-36 items-center justify-center gap-2 self-start rounded-full border border-zinc-950 bg-transparent px-6 text-sm font-semibold text-zinc-950 transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white active:scale-[0.98] disabled:opacity-50 lg:self-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Submit upload
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </header>

      <form
        id="upload-campaign-form"
        onSubmit={handleSubmit}
        aria-labelledby="campaign-upload-form-heading"
        className="mt-7 min-h-0 flex-1 overflow-y-auto pr-2 scrollbar-hide"
      >
        <section className="flex min-h-full w-full flex-col pb-2">
          <div className="space-y-2">
            <h2 id="campaign-upload-form-heading" className="text-3xl font-light tracking-tight text-zinc-950">
              Upload campaign data
            </h2>
            <p className="max-w-3xl text-base font-light leading-relaxed text-zinc-500">
              Welcome back, {firstName}. Select an active event, add lead context, and attach the lead sheet in one upload.
            </p>
          </div>

          <div className="mt-7 grid min-h-[30rem] flex-1 items-stretch gap-x-10 gap-y-8 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)] xl:grid-rows-[auto_minmax(0,1fr)] 2xl:gap-x-16">
            <div className="space-y-4 xl:col-start-1 xl:row-start-1">
              <p className="text-xs font-medium text-zinc-400">
                Active event <span aria-hidden="true" className="text-red-500">*</span>
              </p>
              <EventRegistryPicker
                events={events}
                value={selectedEventId}
                onValueChange={setSelectedEventId}
                loading={eventsLoading}
                disabled={eventsLoading || isSubmitting}
                placeholder="Choose an event"
                loadingLabel="Accessing registry..."
                showStatusTabs={false}
                inactiveSelectable={false}
                triggerClassName="!h-14 w-full rounded-full border-zinc-400 px-5 text-lg font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-950"
                contentClassName="w-full"
              />

              {selectedEvent ? (
                <div className="grid gap-x-8 gap-y-5 border-t border-zinc-200 pt-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-xs font-medium text-zinc-400">Official name</p>
                    <p className="text-xl font-light tracking-tight text-zinc-950">
                      {selectedEvent.eventName || "—"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400">Registry location</p>
                    <p className="text-lg font-light tracking-tight text-zinc-950">
                      {selectedEvent.location || "—"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400">Scheduled date</p>
                    <p className="text-lg font-light tracking-tight text-zinc-950">
                      {selectedEvent.date || "—"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid h-full min-h-0 gap-x-10 gap-y-8 md:grid-cols-2 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:grid-rows-[auto_minmax(0,1fr)] xl:border-l xl:border-zinc-200 xl:pl-10 2xl:pl-16">
              <div className="space-y-4">
                <label htmlFor="campaign-upload-lead-type" className="text-xs font-medium text-zinc-400">
                  Lead type <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <select
                  id="campaign-upload-lead-type"
                  value={leadType}
                  onChange={(event) => setLeadType(event.target.value as LeadType | "")}
                  required
                  aria-required="true"
                  className="h-14 w-full border-0 border-b border-zinc-300 bg-transparent text-xl font-light tracking-tight text-zinc-950 focus:border-blue-600 focus:outline-none"
                >
                  <option value="" disabled>Select lead type</option>
                  {LEAD_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <label htmlFor="campaign-upload-category" className="text-xs font-medium text-zinc-400">
                  Industry category
                </label>
                <input
                  id="campaign-upload-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="e.g. Energy, Finance, Technology"
                  className="h-14 w-full border-b border-zinc-300 bg-transparent text-xl font-light tracking-tight text-zinc-950 placeholder:text-zinc-300 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex min-h-[15rem] flex-col space-y-4 md:col-span-2">
                <label htmlFor="campaign-upload-notes" className="text-xs font-medium text-zinc-400">
                  Target ICP &amp; Context
                </label>
                <textarea
                  id="campaign-upload-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Describe your ideal customer profile and outreach goals..."
                  className="min-h-[15rem] w-full flex-1 resize-none rounded-[1.75rem] border border-zinc-300 bg-white/35 p-5 text-xl font-light leading-relaxed tracking-tight text-zinc-950 placeholder:text-zinc-300 transition-colors focus:border-blue-600 focus:bg-white/70 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex min-h-[15rem] flex-col space-y-4 xl:col-start-1 xl:row-start-2">
              <p className="text-xs font-medium text-zinc-400">
                Lead sheet <span aria-hidden="true" className="text-red-500">*</span>
              </p>
              <input
                ref={leadSheetInputRef}
                type="file"
                accept={leadSheetAccept}
                className="hidden"
                onChange={handleLeadSheetChange}
              />

              <div
                className={`group relative flex min-h-[15rem] w-full flex-1 items-stretch overflow-hidden rounded-[1.75rem] border border-dashed border-zinc-300 bg-white/35 transition-all hover:border-blue-400 hover:bg-blue-50/35 ${
                  leadSheet ? "border-blue-300 bg-blue-50/45" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={handlePickLeadSheet}
                  className="flex min-h-[12rem] min-w-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-400 shadow-sm transition-all group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                    <UploadCloud className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 max-w-full">
                    <span className="block truncate text-2xl font-light tracking-tight text-zinc-950">
                      {leadSheet ? leadSheet.name : "Choose lead sheet"}
                    </span>
                    <span className="mt-1 block text-sm font-light text-zinc-500">
                      {leadSheet ? formatBytes(leadSheet.size) : "CSV or XLSX accepted"}
                    </span>
                  </span>
                </button>

                {leadSheet ? (
                  <button
                    type="button"
                    onClick={clearLeadSheet}
                    aria-label="Remove selected lead sheet"
                    className="absolute right-4 top-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-400 shadow-sm transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePickLeadSheet}
                    aria-label="Choose lead sheet"
                    className="absolute right-4 top-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-400 shadow-sm transition-colors group-hover:border-blue-600 group-hover:text-blue-600"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>

            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
