"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe2,
  ImagePlus,
  Info,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tags,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clearProtectedObjectUrlCache,
} from "@/lib/auth";
import {
  createAdminEvent,
  deleteAdminEvent,
  deleteAdminEventLogo,
  listAdminEvents,
  updateAdminEvent,
  uploadAdminEventLogo,
  type AdminEventItem,
  type AdminEventUpdateInput,
} from "../admin-api";
import { ProtectedImage } from "@/components/storage/ProtectedImage";

const EVENT_LOGO_MAX_BYTES = 20 * 1024 * 1024;
const EVENT_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function slugifyEventKey(...parts: Array<string | null | undefined>) {
  const input = parts
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

  return input
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function validateEventLogo(file: File) {
  if (!EVENT_LOGO_TYPES.includes(file.type)) return "Use a JPG, PNG, or WebP image.";
  if (file.size > EVENT_LOGO_MAX_BYTES) return "Event logo must be 20MB or smaller.";
  return "";
}

function EventLogoThumbnail({ event }: { event: AdminEventItem }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50 text-xs font-semibold text-zinc-500">
      <ProtectedImage
        src={event.logoUrl}
        directUrlPath={event.logoUrl ? `${event.logoUrl}/download-url` : undefined}
        alt=""
        className="h-full w-full object-cover"
        fallback={event.eventName.slice(0, 2).toUpperCase()}
      />
    </div>
  );
}

function EventLogoPreview({
  event,
  previewUrl,
}: {
  event: AdminEventItem | null;
  previewUrl: string;
}) {
  if (previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={previewUrl} alt="" className="h-full w-full object-cover" />
    );
  }

  if (event) {
    return (
      <ProtectedImage
        src={event.logoUrl}
        directUrlPath={event.logoUrl ? `${event.logoUrl}/download-url` : undefined}
        alt=""
        className="h-full w-full object-cover"
        fallback={event.eventName.slice(0, 2).toUpperCase()}
      />
    );
  }

  return <span>LG</span>;
}

function InfoHint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute right-0 top-8 z-30 w-72 translate-y-1 rounded-xl border border-blue-100 bg-white p-3 text-left text-xs leading-relaxed text-zinc-600 opacity-0 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.45)] transition-all duration-150 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
        {children}
      </span>
    </span>
  );
}

type EventStatusValue = "active" | "inactive";
type EventTypeValue = "conference" | "boardroom";
type EventRegistryTab = "registered" | "create";
type EventPageSize = 10 | 25 | 50;

function sortEvents(rows: AdminEventItem[]) {
  return [...rows].sort((a, b) => a.eventName.localeCompare(b.eventName));
}

function eventStatusValue(isActive: boolean): EventStatusValue {
  return isActive ? "active" : "inactive";
}

type TableStatusTarget = {
  event: AdminEventItem;
  nextStatus: EventStatusValue;
};

type EventDeleteTarget = {
  event: AdminEventItem;
};

function AdminEventDialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-blue-950/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="admin-modal-panel relative z-[1] flex max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-300/85 bg-white/96">
        <div className="relative space-y-5 overflow-y-auto p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Event Registry
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full p-0 text-zinc-500 hover:bg-blue-50 hover:text-blue-700"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

function StateChangeConfirmDialog({
  open,
  eventName,
  nextStatus,
  isBusy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  eventName: string;
  nextStatus: EventStatusValue;
  isBusy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  const nextLabel = nextStatus === "active" ? "Active" : "Inactive";
  const detail =
    nextStatus === "active"
      ? "This event will become active and available in the active registry state."
      : "This event will move to inactive mode until an admin activates it again or uses it in the first related campaign flow.";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0 bg-blue-950/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="admin-modal-panel relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-300/85 bg-white/96">
        <div className="relative space-y-5 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Confirm Status Change
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                Switch to {nextLabel}?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                <span className="font-semibold text-zinc-800">{eventName}</span> will be saved with
                status set to <span className="font-semibold text-zinc-800">{nextLabel}</span>.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-300 bg-zinc-50/80 p-4 text-sm leading-relaxed text-zinc-600">
            {detail}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              onClick={onClose}
              className="h-9 rounded-md border border-zinc-300/80 bg-white/90 px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 disabled:opacity-60"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isBusy}
              onClick={onConfirm}
              className="h-9 rounded-md bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Confirm Change</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteEventConfirmDialog({
  open,
  eventName,
  isBusy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  eventName: string;
  isBusy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close delete confirmation"
        className="absolute inset-0 bg-blue-950/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="admin-modal-panel relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-300/85 bg-white/96">
        <div className="relative space-y-5 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Delete Event
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">
                Delete {eventName}?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                This removes the event registry record. Events linked to campaigns or agenda files must be cleaned up first.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              onClick={onClose}
              className="h-9 rounded-md border border-zinc-300/80 bg-white/90 px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 disabled:opacity-60"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isBusy}
              onClick={onConfirm}
              className="h-9 rounded-md bg-red-600 px-3.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-70"
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete Event
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminEventsPage() {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState<EventTypeValue>("conference");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [date, setDate] = useState("");
  const [editingEvent, setEditingEvent] = useState<AdminEventItem | null>(null);
  const [activeTab, setActiveTab] = useState<EventRegistryTab>("registered");
  const [pageSize, setPageSize] = useState<EventPageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [editEventName, setEditEventName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editEventType, setEditEventType] = useState<EventTypeValue>("conference");
  const [editWebsiteUrl, setEditWebsiteUrl] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState<EventStatusValue>("inactive");
  const [editSaving, setEditSaving] = useState(false);
  const [tableStatusTarget, setTableStatusTarget] = useState<TableStatusTarget | null>(null);
  const [tableStatusSavingId, setTableStatusSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventDeleteTarget | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoUploadOpen, setLogoUploadOpen] = useState(false);
  const [logoUploadEvent, setLogoUploadEvent] = useState<AdminEventItem | null>(null);

  const generatedEventKey = useMemo(
    () => slugifyEventKey(eventName, location, date),
    [eventName, location, date]
  );
  const isBusy = saving || editSaving || logoBusy || deleteSaving || Boolean(tableStatusSavingId);
  const logoTargetEvent = logoUploadEvent ?? editingEvent;

  const loadEvents = async () => {
    setLoading(true);
    try {
      const eventRows = await listAdminEvents(true);
      setEvents(sortEvents(eventRows));
    } catch (error: unknown) {
      toast.error("Failed to load event registry", {
        description: getErrorMessage(error),
      });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const stats = useMemo(() => {
    const active = events.filter((item) => item.isActive).length;
    const inactive = events.length - active;
    return { total: events.length, active, inactive };
  }, [events]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(events.length / pageSize)), [events.length, pageSize]);
  const paginatedEvents = useMemo(() => {
    const pageStart = (currentPage - 1) * pageSize;
    return events.slice(pageStart, pageStart + pageSize);
  }, [currentPage, events, pageSize]);
  const visiblePageNumbers = useMemo(() => {
    const visibleCount = Math.min(pageCount, 5);
    const start = Math.min(Math.max(currentPage - 2, 1), Math.max(pageCount - visibleCount + 1, 1));
    return Array.from({ length: visibleCount }, (_, index) => start + index);
  }, [currentPage, pageCount]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), pageCount));
  }, [pageCount]);

  const resetForm = () => {
    setEventName("");
    setLocation("");
    setEventType("conference");
    setWebsiteUrl("");
    setDate("");
  };

  const closeEditDialog = (force = false) => {
    if (editSaving && !force) return;
    setLogoUploadOpen(false);
    setLogoUploadEvent(null);
    setSelectedLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    setEditingEvent(null);
  };

  const closeLogoUploadDialog = () => {
    if (logoBusy) return;
    setLogoUploadOpen(false);
    setLogoUploadEvent(null);
    setSelectedLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const openEditDialog = (item: AdminEventItem) => {
    setEditingEvent(item);
    setEditEventName(item.eventName);
    setEditLocation(item.location ?? "");
    setEditEventType((item.eventType === "boardroom" ? "boardroom" : "conference") as EventTypeValue);
    setEditWebsiteUrl(item.websiteUrl ?? "");
    setEditDate(item.date ?? "");
    setEditStatus(eventStatusValue(item.isActive));
    setSelectedLogoFile(null);
    setLogoUploadOpen(false);
    setLogoUploadEvent(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const hasDetailChanges = useMemo(() => {
    if (!editingEvent) return false;
    return (
      editEventName.trim() !== editingEvent.eventName ||
      editLocation.trim() !== (editingEvent.location ?? "") ||
      editEventType !== (editingEvent.eventType || "conference") ||
      editWebsiteUrl.trim() !== (editingEvent.websiteUrl ?? "") ||
      editDate.trim() !== (editingEvent.date ?? "")
    );
  }, [editDate, editEventName, editEventType, editLocation, editWebsiteUrl, editingEvent]);

  const hasStatusChange = useMemo(() => {
    if (!editingEvent) return false;
    return editingEvent.isActive !== (editStatus === "active");
  }, [editStatus, editingEvent]);

  const saveEditedEvent = async () => {
    if (!editingEvent) return;

    const nextEventName = editEventName.trim();
    const nextLocation = editLocation.trim();
    const nextWebsiteUrl = editWebsiteUrl.trim();
    const nextDate = editDate.trim();

    if (!nextEventName) {
      toast.error("Event name is required");
      return;
    }

    const payload: AdminEventUpdateInput = {};

    if (nextEventName !== editingEvent.eventName) payload.eventName = nextEventName;
    if (nextLocation !== (editingEvent.location ?? "")) payload.location = nextLocation;
    if (editEventType !== (editingEvent.eventType || "conference")) payload.eventType = editEventType;
    if (nextWebsiteUrl !== (editingEvent.websiteUrl ?? "")) payload.websiteUrl = nextWebsiteUrl;
    if (nextDate !== (editingEvent.date ?? "")) payload.date = nextDate;
    if ((editStatus === "active") !== editingEvent.isActive) payload.isActive = editStatus === "active";
    if (hasDetailChanges) payload.syncLinkedCampaigns = true;

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save");
      closeEditDialog();
      return;
    }

    setEditSaving(true);
    try {
      const updated = await updateAdminEvent(editingEvent.id, payload);
      setEvents((prev) => sortEvents(prev.map((item) => (item.id === updated.id ? updated : item))));
      toast.success("Event updated", {
        description:
          hasDetailChanges
            ? `${updated.eventName} and its linked campaign snapshot details were updated.`
              : hasStatusChange
                ? `${updated.eventName} is now ${updated.isActive ? "active" : "inactive"}.`
                : `${updated.eventName} details were saved.`,
      });
      closeEditDialog(true);
    } catch (error: unknown) {
      toast.error("Failed to update event", {
        description: getErrorMessage(error),
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingEvent) return;
    if (!editEventName.trim()) {
      toast.error("Event name is required");
      return;
    }
    if (!hasDetailChanges && !hasStatusChange) {
      toast.info("No changes to save");
      closeEditDialog();
      return;
    }
    await saveEditedEvent();
  };

  const handleTableStatusSelection = (item: AdminEventItem, value: string) => {
    const nextStatus = value as EventStatusValue;
    if (nextStatus === eventStatusValue(item.isActive)) return;
    setTableStatusTarget({ event: item, nextStatus });
  };

  const confirmTableStatusChange = async () => {
    if (!tableStatusTarget) return;

    const { event, nextStatus } = tableStatusTarget;
    setTableStatusSavingId(event.id);
    try {
      const updated = await updateAdminEvent(event.id, { isActive: nextStatus === "active" });
      setEvents((prev) => sortEvents(prev.map((item) => (item.id === updated.id ? updated : item))));
      toast.success("Event status updated", {
        description: `${updated.eventName} is now ${updated.isActive ? "active" : "inactive"}.`,
      });
      setTableStatusTarget(null);
    } catch (error: unknown) {
      toast.error("Failed to update event status", {
        description: getErrorMessage(error),
      });
    } finally {
      setTableStatusSavingId(null);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      const response = await deleteAdminEvent(deleteTarget.event.id);
      setEvents((prev) => prev.filter((item) => item.id !== response.event.id));
      toast.success("Event deleted", {
        description: response.event.eventName,
      });
      setDeleteTarget(null);
    } catch (error: unknown) {
      toast.error("Failed to delete event", {
        description: getErrorMessage(error),
      });
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!eventName.trim()) {
      toast.error("Event name is required");
      return;
    }
    if (!location.trim()) {
      toast.error("Location is required");
      return;
    }
    if (!date) {
      toast.error("Date is required");
      return;
    }
    if (!generatedEventKey) {
      toast.error("Unable to generate event key");
      return;
    }

    setSaving(true);
    try {
      const created = await createAdminEvent({
        eventName: eventName.trim(),
        eventKey: generatedEventKey,
        location: location.trim(),
        eventType,
        websiteUrl: websiteUrl.trim(),
        date,
        isActive: false,
      });
      setEvents((prev) => sortEvents([...prev, created]));
      toast.success("Event created", {
        description: `${created.eventName} is saved and waiting for its first campaign.`,
      });
      resetForm();
      setActiveTab("registered");
    } catch (error: unknown) {
      toast.error("Failed to create event", {
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let objectUrl = "";
    if (selectedLogoFile) {
      objectUrl = window.URL.createObjectURL(selectedLogoFile);
      setLogoPreviewUrl(objectUrl);
    } else {
      setLogoPreviewUrl("");
    }
    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [selectedLogoFile]);

  const handleLogoSelect = (file: File | null) => {
    if (!file) {
      setSelectedLogoFile(null);
      return;
    }
    const error = validateEventLogo(file);
    if (error) {
      toast.error("Event logo rejected", { description: error });
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }
    setSelectedLogoFile(file);
  };

  const handleLogoUpload = async () => {
    if (!logoTargetEvent || !selectedLogoFile) {
      toast.error("Choose a logo first");
      return;
    }
    setLogoBusy(true);
    try {
      const response = await uploadAdminEventLogo(logoTargetEvent.id, selectedLogoFile);
      clearProtectedObjectUrlCache(`/api/events/${logoTargetEvent.id}/logo`);
      setEditingEvent((current) => (current?.id === response.event.id ? response.event : current));
      setEvents((prev) => sortEvents(prev.map((item) => (item.id === response.event.id ? response.event : item))));
      setSelectedLogoFile(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      setLogoUploadOpen(false);
      setLogoUploadEvent(null);
      toast.success("Event logo updated", { description: response.event.eventName });
    } catch (error: unknown) {
      toast.error("Event logo upload failed", { description: getErrorMessage(error) });
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!logoTargetEvent) return;
    setLogoBusy(true);
    try {
      const response = await deleteAdminEventLogo(logoTargetEvent.id);
      clearProtectedObjectUrlCache(`/api/events/${logoTargetEvent.id}/logo`);
      setEditingEvent((current) => (current?.id === response.event.id ? response.event : current));
      setEvents((prev) => sortEvents(prev.map((item) => (item.id === response.event.id ? response.event : item))));
      setSelectedLogoFile(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      setLogoUploadOpen(false);
      setLogoUploadEvent(null);
      toast.success("Event logo removed", { description: response.event.eventName });
    } catch (error: unknown) {
      toast.error("Event logo delete failed", { description: getErrorMessage(error) });
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="admin-page flex min-h-[calc(100dvh-3rem)] w-full min-w-0 flex-col bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-card p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            <p className="admin-eyebrow">Admin Control</p>
            <h1 className="admin-title">Event Registry</h1>
          </div>

          <div className="admin-actions">
            <Link href="/admin/users">
              <Button
                type="button"
                variant="outline"
                className="h-10 border-zinc-300 bg-white/90 px-4 text-zinc-700 hover:bg-zinc-50"
              >
                <UsersRound className="mr-2 h-4 w-4" />
                Users
              </Button>
            </Link>

            <Link href="/choose-persona">
              <Button
                type="button"
                variant="outline"
                className="h-10 border-zinc-300 bg-white/90 px-4 text-zinc-700 hover:bg-zinc-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Workspaces
              </Button>
            </Link>

            <Button
              type="button"
              onClick={() => void loadEvents()}
              disabled={loading || isBusy}
              className="analytics-frost-btn h-10 px-4"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total Events", value: stats.total, icon: Tags },
            { label: "Active Events", value: stats.active, icon: ShieldCheck },
            { label: "Inactive Events", value: stats.inactive, icon: CalendarDays },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-zinc-200 bg-white/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{item.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
        {[
          { value: "registered" as const, label: "Registered Events", icon: Tags },
          { value: "create" as const, label: "Create Event", icon: Plus },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setActiveTab(item.value)}
            className={`flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === item.value
                ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                : "text-zinc-600 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === "registered" ? (
        <div className="mt-4 min-w-0">
          <Card className="admin-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-zinc-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Registered Events</h2>
                <p className="text-sm text-zinc-500">Active events are available to campaign create and upload selectors.</p>
              </div>
            </div>

            <div className="min-w-0">
              <div className="hidden border-b border-zinc-100 bg-zinc-50/70 px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400 lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(8rem,1fr)_7rem_9.5rem_minmax(8rem,1fr)_12rem] lg:gap-5">
                <div>Event</div>
                <div>Location</div>
                <div>Date</div>
                <div>Status</div>
                <div>Key</div>
                <div className="text-right">Actions</div>
              </div>

              <div className="admin-list-panel max-h-[min(34rem,calc(100dvh-22rem))] overflow-y-auto divide-y divide-zinc-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {loading ? (
                  <div className="px-5 py-10 text-center text-sm text-zinc-500">Loading events...</div>
                ) : events.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-zinc-500">No events found.</div>
                ) : (
                  paginatedEvents.map((item) => (
                    <div
                      key={item.id}
                      className="grid min-w-0 gap-3 px-5 py-3 transition-colors hover:bg-zinc-50/80 lg:grid-cols-[minmax(0,2.2fr)_minmax(8rem,1fr)_7rem_9.5rem_minmax(8rem,1fr)_12rem] lg:items-center lg:gap-5"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setSelectedLogoFile(null);
                              if (logoInputRef.current) logoInputRef.current.value = "";
                              setLogoUploadEvent(item);
                              setLogoUploadOpen(true);
                            }}
                            className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg text-left disabled:cursor-not-allowed disabled:opacity-70"
                            aria-label={`Update logo for ${item.eventName}`}
                          >
                            <EventLogoThumbnail event={item} />
                            <span className="absolute inset-0 flex items-center justify-center bg-blue-950/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                              <PencilLine className="h-3.5 w-3.5" />
                            </span>
                          </button>
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-zinc-900" title={item.eventName}>
                              {item.eventName}
                            </span>
                            <span className="block truncate text-xs text-zinc-500">
                              {(item.eventType || "conference") === "boardroom" ? "Boardroom" : "Conference"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 text-sm text-zinc-700">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                          Location
                        </span>
                        <span className="block truncate" title={item.location || "-"}>
                          {item.location || "-"}
                        </span>
                      </div>

                      <div className="text-sm text-zinc-700">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                          Date
                        </span>
                        {formatDate(item.date)}
                      </div>

                      <div>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                          Status
                        </span>
                        <Select
                          value={eventStatusValue(item.isActive)}
                          onValueChange={(value) => handleTableStatusSelection(item, value)}
                          disabled={isBusy}
                        >
                          <SelectTrigger
                            className={`h-9 w-full border text-xs font-semibold capitalize shadow-none sm:w-44 lg:w-[8.75rem] ${
                              item.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-zinc-300 bg-white">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="min-w-0">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                          Key
                        </span>
                        <span className="block max-w-full truncate rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600" title={item.eventKey}>
                          {item.eventKey}
                        </span>
                      </div>

                      <div className="flex flex-nowrap justify-start gap-2 lg:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openEditDialog(item)}
                          disabled={isBusy}
                          className="h-8 whitespace-nowrap border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDeleteTarget({ event: item })}
                          disabled={isBusy}
                          className="h-8 whitespace-nowrap border-red-200 bg-white px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {events.length > 0 ? (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3 text-sm text-zinc-500">
                  <div className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 shadow-sm">
                    <span className="whitespace-nowrap text-xs font-medium text-zinc-600">Rows per page</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value) as EventPageSize);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[4.75rem] rounded-md border-zinc-200 bg-white text-sm font-semibold text-zinc-800 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-300 bg-white">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="mx-1 whitespace-nowrap text-xs font-medium text-zinc-500">
                    Page {currentPage} / {pageCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      aria-label="Previous page"
                      className="h-9 w-9 rounded-lg border-zinc-200 bg-white p-0 text-zinc-500 shadow-none hover:bg-zinc-50 hover:text-zinc-800 disabled:bg-zinc-50 disabled:text-zinc-300 disabled:opacity-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {visiblePageNumbers.map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentPage(pageNumber)}
                        aria-current={pageNumber === currentPage ? "page" : undefined}
                        className={`h-9 w-9 rounded-lg p-0 text-sm font-semibold shadow-none ${
                          pageNumber === currentPage
                            ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                        }`}
                      >
                        {pageNumber}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentPage >= pageCount}
                      onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                      aria-label="Next page"
                      className="h-9 w-9 rounded-lg border-zinc-200 bg-white p-0 text-zinc-500 shadow-none hover:bg-zinc-50 hover:text-zinc-800 disabled:bg-zinc-50 disabled:text-zinc-300 disabled:opacity-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="admin-card mt-4 p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Create Event</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Save the event once. Campaigns will later read name, location, and date directly from the registry.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
              <Plus className="h-5 w-5" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Event Name</label>
              <Input
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                placeholder="AMICT Malaysia"
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Location</label>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Kuala Lumpur, Malaysia"
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Event Type</label>
              <Select value={eventType} onValueChange={(value) => setEventType(value as EventTypeValue)}>
                <SelectTrigger className="h-10 border-zinc-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-300 bg-white">
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="boardroom">Boardroom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Website Link</label>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://example.com/event"
                  className="h-10 border-zinc-300 bg-white pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Generated Event Key</label>
                <InfoHint label="Generated event key details">
                  <span className="block font-semibold text-zinc-800">Event key preview</span>
                  <span className="mt-1 block">
                    This event will be created as inactive. Switch it to active from the table when you are ready to use it in campaign create or upload.
                  </span>
                </InfoHint>
              </div>
              <div className="flex min-h-10 items-center rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700">
                <span className="break-all">
                  {generatedEventKey || "Event key preview will appear here"}
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isBusy}
              className="h-10 w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 md:col-span-2 xl:col-span-3"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Event...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      <AdminEventDialog
        open={Boolean(editingEvent)}
        title={editingEvent ? `Edit ${editingEvent.eventName}` : "Edit Event"}
        description="Update the event registry details here. Name, location, and date can be refreshed without leaving this page."
        onClose={closeEditDialog}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Event Name</label>
              <Input
                value={editEventName}
                onChange={(event) => setEditEventName(event.target.value)}
                placeholder="AMICT Malaysia"
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Location</label>
              <Input
                value={editLocation}
                onChange={(event) => setEditLocation(event.target.value)}
                placeholder="Kuala Lumpur, Malaysia"
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</label>
              <Input
                type="date"
                value={editDate}
                onChange={(event) => setEditDate(event.target.value)}
                className="h-10 border-zinc-300 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Event Type</label>
              <Select value={editEventType} onValueChange={(value) => setEditEventType(value as EventTypeValue)}>
                <SelectTrigger className="h-10 border-zinc-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-300 bg-white">
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="boardroom">Boardroom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Website Link</label>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={editWebsiteUrl}
                  onChange={(event) => setEditWebsiteUrl(event.target.value)}
                  placeholder="https://example.com/event"
                  className="h-10 border-zinc-300 bg-white pl-9"
                />
              </div>
            </div>

          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</label>
            <Select value={editStatus} onValueChange={(value) => setEditStatus(value as EventStatusValue)}>
              <SelectTrigger className="h-10 border-zinc-300 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-300 bg-white">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-zinc-300 bg-zinc-50/70 p-4 text-sm leading-relaxed text-zinc-600">
            Updating name, location, or date here will also refresh the linked campaign snapshots automatically.
            <span className="mt-1 block text-xs text-zinc-500">
              Status changes apply only to the registry record itself.
            </span>
          </div>

          <div className="rounded-xl border border-zinc-300 bg-white/80 p-4 text-xs leading-relaxed text-zinc-500">
            The event key stays stable here and is not edited from the UI, so event mapping remains consistent while details are updated.
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Event Logo</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={logoBusy || editSaving}
                onClick={() => {
                  setLogoUploadEvent(editingEvent);
                  setLogoUploadOpen(true);
                }}
                className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-500 transition-colors hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-70"
                aria-label="Update event logo"
              >
                <EventLogoPreview event={editingEvent} previewUrl={logoPreviewUrl} />
                <span className="absolute inset-0 flex items-center justify-center bg-blue-950/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <PencilLine className="h-4 w-4" />
                </span>
              </button>
              <p className="text-sm text-zinc-600">
                {selectedLogoFile?.name || (editingEvent?.logoStorageObjectId ? "Logo is set for this event." : "No logo selected.")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={editSaving}
              onClick={() => closeEditDialog()}
              className="h-10 border border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleEditSubmit()}
              disabled={editSaving}
              className="h-10 bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {editSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </AdminEventDialog>

      <AdminEventDialog
        open={logoUploadOpen && Boolean(logoTargetEvent)}
        title="Update Event Logo"
        description="Choose a JPG, PNG, or WebP logo. The uploaded logo will replace the current registry image."
        onClose={closeLogoUploadDialog}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-300 bg-zinc-50/70 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-500">
                <EventLogoPreview event={logoTargetEvent} previewUrl={logoPreviewUrl} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Event Logo</p>
                <p className="mt-1 text-sm font-medium text-zinc-800">
                  {selectedLogoFile?.name || logoTargetEvent?.eventName || "Event logo"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Use a clear square mark when possible. Supported formats are JPG, PNG, and WebP up to 20MB.
                </p>
              </div>
            </div>
          </div>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => handleLogoSelect(event.target.files?.[0] ?? null)}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={logoBusy || editSaving}
              onClick={() => logoInputRef.current?.click()}
              className="h-9 border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              Choose Logo
            </Button>
            <Button
              type="button"
              disabled={!selectedLogoFile || logoBusy || editSaving}
              onClick={() => void handleLogoUpload()}
              className="h-9 bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {logoBusy && selectedLogoFile ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Upload
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={logoBusy || editSaving || (!logoTargetEvent?.logoStorageObjectId && !selectedLogoFile)}
              onClick={() => void handleLogoDelete()}
              className="h-9 border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      </AdminEventDialog>

      <StateChangeConfirmDialog
        open={Boolean(tableStatusTarget)}
        eventName={tableStatusTarget?.event.eventName || "This event"}
        nextStatus={tableStatusTarget?.nextStatus || "inactive"}
        isBusy={Boolean(tableStatusSavingId)}
        onClose={() => {
          if (!tableStatusSavingId) setTableStatusTarget(null);
        }}
        onConfirm={() => void confirmTableStatusChange()}
      />

      <DeleteEventConfirmDialog
        open={Boolean(deleteTarget)}
        eventName={deleteTarget?.event.eventName || "this event"}
        isBusy={deleteSaving}
        onClose={() => {
          if (!deleteSaving) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteEvent()}
      />
    </div>
  );
}
