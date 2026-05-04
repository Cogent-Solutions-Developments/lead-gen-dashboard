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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCampaignFromUpload } from "@/lib/apiRouter";
import { persistCampaignUploadSummary } from "@/lib/campaignUploadSummary";
import { useAuth } from "@/hooks/useAuth";
import { getCachedAuthUserDisplayName, listActiveEventRegistry, type AdminEventItem } from "@/lib/auth";

const uploadSteps = [
  { id: "event", label: "Event" },
  { id: "details", label: "Details" },
  { id: "csv", label: "Lead sheet" },
] as const;

type UploadStep = (typeof uploadSteps)[number]["id"];

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
  const [leadSheet, setLeadSheet] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<UploadStep>("event");

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const rows = await listActiveEventRegistry();
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
  }, []);

  const selectedEvent = useMemo(
    () => events.find((item) => item.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const eventReady = Boolean(
    selectedEvent?.eventName.trim() &&
      selectedEvent.location?.trim()
  );
  const displayName = getDisplayName(user);
  const firstName = displayName.split(/\s+/)[0] || "there";
  const activeStepIndex = uploadSteps.findIndex((step) => step.id === currentStep);

  const validateLeadSheet = (file: File | null) => {
    if (!file) return "A CSV lead sheet is required.";
    if (!file.name.toLowerCase().endsWith(".csv")) return "Only .csv files are supported.";
    if (file.size <= 0) return "The selected CSV file is empty.";
    return null;
  };

  const validateForm = () => {
    if (!selectedEvent) return "Event selection is required.";
    if (!selectedEvent.eventName.trim()) return "Selected event is missing a name.";
    if (!selectedEvent.location?.trim()) return "Selected event is missing a location.";
    return validateLeadSheet(leadSheet);
  };

  const validateEventStep = () => {
    if (!selectedEvent) return "Event selection is required.";
    if (!selectedEvent.eventName.trim()) return "Selected event is missing a name.";
    if (!selectedEvent.location?.trim()) return "Selected event is missing a location.";
    return null;
  };

  const goToStep = (step: UploadStep) => {
    if (step !== "event" && !eventReady) {
      toast.error("Select an event first.");
      return;
    }

    setCurrentStep(step);
  };

  const goNext = () => {
    if (currentStep === "event") {
      const error = validateEventStep();
      if (error) {
        toast.error(error);
        return;
      }
      setCurrentStep("details");
      return;
    }

    if (currentStep === "details") {
      setCurrentStep("csv");
    }
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

    setIsSubmitting(true);
    try {
      const response = await createCampaignFromUpload({
        name: selectedEvent.eventName,
        location: selectedEvent.location || "",
        category: category.trim(),
        date: selectedEvent.date || "",
        eventRegistryId: selectedEvent.id,
        icp: notes.trim(),
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
      <header className="shrink-0 border-b border-zinc-200 pb-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-950"
            >
              <ArrowLeft className="mr-2 h-3 w-3" />
              Return to dashboard
            </Link>

            <div className="mt-8">
              <h1 className="text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">
                Campaign Upload
              </h1>
              <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-zinc-500">
                Onboard your latest event intelligence and synchronize lead data with our database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentStep !== "event" ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep === "csv" ? "details" : "event")}
                className="inline-flex h-10 items-center justify-center px-5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950"
              >
                Go Back
              </button>
            ) : null}

            {currentStep !== "csv" ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-950 bg-transparent px-6 text-sm font-semibold text-zinc-950 transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white active:scale-[0.98]"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                form="upload-campaign-form"
                type="submit"
                disabled={isSubmitting || eventsLoading}
                className="inline-flex h-10 min-w-36 items-center justify-center gap-2 rounded-full border border-zinc-950 bg-transparent px-6 text-sm font-semibold text-zinc-950 transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white active:scale-[0.98] disabled:opacity-50"
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
            )}
          </div>
        </div>
      </header>

      <form
        id="upload-campaign-form"
        onSubmit={handleSubmit}
        className="mt-16 grid min-h-0 flex-1 w-full gap-16 xl:grid-cols-[19rem_minmax(0,1fr)] overflow-hidden"
      >
        <nav className="shrink-0 space-y-2">
          {uploadSteps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isDone =
              step.id === "event"
                ? eventReady
                : step.id === "details"
                  ? activeStepIndex > index
                  : Boolean(leadSheet);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                className={`group flex w-full items-center justify-between border-b border-zinc-100 py-6 text-left transition-colors ${
                  isActive ? "border-zinc-900" : "hover:border-zinc-300"
                }`}
              >
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${
                    isActive ? "text-zinc-900" : "text-zinc-400"
                  }`}>
                    Step 0{index + 1}
                  </span>
                  <span className={`mt-1 text-xl font-light tracking-tight ${
                    isActive ? "text-zinc-950" : "text-zinc-500"
                  }`}>
                    {step.label}
                  </span>
                </div>
                {isDone && !isActive && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <ArrowLeft className="h-3 w-3 rotate-180" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="min-h-0 flex-1 flex flex-col lg:border-l lg:border-zinc-200 lg:pl-16 overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-12 pr-4">
            {currentStep === "event" ? (
              <section className="max-w-4xl space-y-12">
                <div className="space-y-2">
                  <h2 className="text-3xl font-light tracking-tight text-zinc-950">Select active event</h2>
                  <p className="text-base font-light text-zinc-500">
                    Welcome back, {firstName}. Select an entry from the registry to begin.
                  </p>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-xs font-medium text-zinc-400">Registry entry</label>
                    <Select
                      value={selectedEventId}
                      onValueChange={setSelectedEventId}
                      disabled={eventsLoading || isSubmitting}
                    >
                      <SelectTrigger className="!h-14 w-full rounded-none border-0 border-b border-zinc-200 bg-transparent px-0 text-xl font-light shadow-none transition-colors focus:border-blue-600 focus:ring-0">
                        <SelectValue placeholder={eventsLoading ? "Accessing registry..." : "Choose an event"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-zinc-200 shadow-xl">
                        {events.map((item) => (
                          <SelectItem key={item.id} value={item.id} className="py-3 text-base">
                            {item.eventName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-12 border-t border-zinc-100 pt-10 md:grid-cols-2">
                    <div className="space-y-4 md:col-span-2">
                      <label className="text-xs font-medium text-zinc-400">Official name</label>
                      <p className="text-2xl font-light tracking-tight text-zinc-950">
                        {selectedEvent?.eventName || "—"}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-medium text-zinc-400">Registry location</label>
                      <p className="text-xl font-light tracking-tight text-zinc-950">
                        {selectedEvent?.location || "—"}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-medium text-zinc-400">Scheduled date</label>
                      <p className="text-xl font-light tracking-tight text-zinc-950">
                        {selectedEvent?.date || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {currentStep === "details" ? (
              <section className="max-w-4xl space-y-12">
                <div className="space-y-2">
                  <h2 className="text-3xl font-light tracking-tight text-zinc-950">Capture details</h2>
                  <p className="text-base font-light text-zinc-500">
                    Provide context to help our intelligence engine categorize these leads.
                  </p>
                </div>

                <div className="space-y-12">
                  <div className="space-y-4">
                    <label className="text-xs font-medium text-zinc-400">Industry category</label>
                    <input
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      placeholder="e.g. Energy, Finance, Technology"
                      className="h-14 w-full border-b border-zinc-200 bg-transparent text-xl font-light tracking-tight text-zinc-950 placeholder:text-zinc-300 focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-medium text-zinc-400">Target ICP & Context</label>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Describe your ideal customer profile and outreach goals..."
                      className="min-h-[12rem] w-full border-b border-zinc-200 bg-transparent py-2 text-xl font-light leading-relaxed tracking-tight text-zinc-950 placeholder:text-zinc-300 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {currentStep === "csv" ? (
              <section className="max-w-4xl space-y-12">
                <div className="space-y-2">
                  <h2 className="text-3xl font-light tracking-tight text-zinc-950">Synchronize lead sheet</h2>
                  <p className="text-base font-light text-zinc-500">
                    Upload your prepared CSV data to finalize the onboard process.
                  </p>
                </div>

                <div className="space-y-10">
                  <input
                    ref={leadSheetInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleLeadSheetChange}
                  />

                  <div className="space-y-6">
                    <label className="text-xs font-medium text-zinc-400">Lead sheet source</label>

                    <button
                      type="button"
                      onClick={handlePickLeadSheet}
                      className={`group flex w-full items-center justify-between border-y border-zinc-100 py-10 transition-colors hover:bg-zinc-50/50 ${
                        leadSheet ? "border-blue-100 bg-blue-50/20" : ""
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition-all group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                          <UploadCloud className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="text-2xl font-light tracking-tight text-zinc-950">
                            {leadSheet ? leadSheet.name : "Choose CSV directory"}
                          </p>
                          <p className="text-sm font-light text-zinc-500">
                            {leadSheet ? formatBytes(leadSheet.size) : "Standard CSV format accepted"}
                          </p>
                        </div>
                      </div>
                      {leadSheet ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            clearLeadSheet();
                          }}
                          className="mr-4 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 hover:border-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400">
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
