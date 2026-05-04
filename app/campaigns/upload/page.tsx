"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileText,
  Loader2,
  MapPin,
  Tags,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  { id: "event", label: "Event", icon: CalendarDays },
  { id: "details", label: "Details", icon: FileText },
  { id: "csv", label: "Lead sheet", icon: UploadCloud },
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
    <div className="min-h-screen bg-transparent p-1 font-sans">
      <div className="mb-8 flex w-full max-w-[88rem] flex-col gap-4 border-b border-zinc-200/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>

          <div className="mt-5">
            <h1 className="mt-1 text-4xl font-semibold leading-none tracking-tight text-zinc-950">Bulk Leads Upload</h1>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid w-full max-w-[88rem] gap-12 xl:grid-cols-[19rem_minmax(0,1fr)]"
      >
        <nav className="h-fit">
          {uploadSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.id === currentStep;
            const isDone =
              step.id === "event"
                ? eventReady
                : step.id === "details"
                  ? activeStepIndex > index
                  : Boolean(leadSheet);

            return (
              <div key={step.id} className="relative">
                {index < uploadSteps.length - 1 ? (
                  <span
                    className={`absolute left-5 top-14 hidden h-8 w-px xl:block ${
                      isDone ? "bg-blue-200" : "bg-zinc-200"
                    }`}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className={`relative z-[1] flex w-full items-center gap-5 py-4 text-left transition-colors ${
                    isActive
                      ? "text-zinc-950"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-base font-semibold shadow-[0_10px_18px_-14px_rgba(15,23,42,0.65),inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(148,163,184,0.22)] transition-all ${
                      isDone
                        ? "border-white/25 bg-[linear-gradient(148deg,#2d71df_0%,#145acc_54%,#0f4697_100%)] text-white shadow-[0_14px_24px_-15px_rgba(8,28,70,0.9),inset_0_1px_0_rgba(255,255,255,0.28)]"
                      : isActive
                        ? "border-white/25 bg-[linear-gradient(148deg,#2d71df_0%,#145acc_54%,#0f4697_100%)] text-white shadow-[0_14px_24px_-15px_rgba(8,28,70,0.9),inset_0_1px_0_rgba(255,255,255,0.28)]"
                        : "border-zinc-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.82)_100%)] text-zinc-400"
                  }`}
                >
                  <StepIcon className="h-5 w-5" />
                </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-base font-semibold">{step.label}</span>
                    <span className="text-sm text-zinc-400">Step {index + 1} of 3</span>
                  </span>
                </button>
              </div>
            );
          })}
        </nav>

        <div className="min-h-[30rem]">
          {currentStep === "event" ? (
            <section className="max-w-5xl space-y-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Select Event</h2>
                  <p className="mt-2 text-base text-zinc-500">
                    Hey {firstName}, got some leads? Upload them here.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-500">Event name</label>
                  <Select
                    value={selectedEventId}
                    onValueChange={setSelectedEventId}
                    disabled={eventsLoading || isSubmitting}
                  >
                    <SelectTrigger className="!h-12 max-w-[64rem] rounded-md border-zinc-200 bg-white/80 text-base">
                      <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event"} />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.eventName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {events.length === 0 && !eventsLoading ? (
                    isSuperAdmin ? (
                      <p className="text-xs text-zinc-500">
                        No active events are available.{" "}
                        <Link href="/admin/events" className="font-semibold text-zinc-700 hover:text-zinc-900">
                          Activate an event first
                        </Link>
                        .
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        No active events are available right now. Please ask an admin to activate one first.
                      </p>
                    )
                  ) : null}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-zinc-500">Name</label>
                    <div className="relative">
                      <Tags className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <Input
                        value={selectedEvent?.eventName || ""}
                        readOnly
                        disabled
                        placeholder="Select an event"
                        className="h-12 rounded-md border-zinc-200 bg-white/55 pl-10 text-zinc-700 disabled:opacity-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-500">Location</label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <Input
                        value={selectedEvent?.location || ""}
                        readOnly
                        disabled
                        placeholder="Select an event"
                        className="h-12 rounded-md border-zinc-200 bg-white/55 pl-10 text-zinc-700 disabled:opacity-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-500">Date</label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                      <Input
                        value={selectedEvent?.date || ""}
                        readOnly
                        disabled
                        placeholder="Select an event"
                        className="h-12 rounded-md border-zinc-200 bg-white/55 pl-10 text-zinc-700 disabled:opacity-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-zinc-200/70 pt-5">
                <Button type="button" onClick={goNext} className="btn-sidebar-noise h-11 rounded-md px-6">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </section>
          ) : null}

          {currentStep === "details" ? (
            <section className="max-w-4xl space-y-8">
              <div>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Add Details</h2>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-500">
                    Category <span className="normal-case tracking-normal text-zinc-400">Optional</span>
                  </label>
                  <Input
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Conference"
                    className="h-12 rounded-md border-zinc-200 bg-white/80"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-500">
                    Notes / Description <span className="normal-case tracking-normal text-zinc-400">Optional</span>
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={`Example:\nEvent: AMICT Malaysia\nSource: Sponsor outreach list\nNotes: Focus on GCC software vendors with active field teams`}
                    className="min-h-52 resize-y rounded-md border-zinc-200 bg-white/80 text-sm leading-6"
                  />
                  <p className="text-xs text-zinc-400">{notes.length} characters</p>
                </div>
              </div>

              <div className="flex justify-between border-t border-zinc-200/70 pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep("event")}
                  className="h-11 rounded-md border border-zinc-200 bg-white/45 px-5"
                >
                  Back
                </Button>
                <Button type="button" onClick={goNext} className="btn-sidebar-noise h-11 rounded-md px-6">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </section>
          ) : null}

          {currentStep === "csv" ? (
            <section className="max-w-5xl space-y-9">
              <div>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Upload Lead Sheet</h2>
              </div>

              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <input
                  ref={leadSheetInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleLeadSheetChange}
                />

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-zinc-500">Lead sheet (.csv)</p>

                  <button
                    type="button"
                    onClick={handlePickLeadSheet}
                    className="group flex w-full items-center justify-between gap-5 border-y border-zinc-200/80 py-6 text-left transition-colors hover:border-blue-200"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-white/25 bg-[linear-gradient(148deg,#2d71df_0%,#145acc_54%,#0f4697_100%)] text-white shadow-[0_14px_24px_-15px_rgba(8,28,70,0.9),inset_0_1px_0_rgba(255,255,255,0.28)]">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-zinc-950">Choose CSV lead sheet</p>
                        <p className="mt-1 text-sm text-zinc-500">Only `.csv` files are accepted.</p>
                      </div>
                    </div>
                    <span className="hidden rounded-md border border-blue-100 bg-white/70 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors group-hover:bg-blue-50 sm:inline-flex">
                      Browse
                    </span>
                  </button>

                  {leadSheet ? (
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 pb-4">
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
                        aria-label="Remove CSV"
                        className="h-8 w-8 rounded-md border border-zinc-200/80 bg-white/70 p-0 text-zinc-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

              </div>

              <div className="flex justify-between border-t border-zinc-200/70 pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep("details")}
                  className="h-11 rounded-md border border-zinc-200 bg-white/45 px-5"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || eventsLoading}
                  className="btn-sidebar-noise btn-sidebar-noise-strong h-11 min-w-44 rounded-md px-6 text-sm font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Upload Leads
                    </>
                  )}
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      </form>
    </div>
  );
}
