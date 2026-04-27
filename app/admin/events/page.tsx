"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tags,
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
  createAdminEvent,
  listAdminEvents,
  updateAdminEvent,
  type AdminEventItem,
  type AdminEventUpdateInput,
} from "@/lib/auth";

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

type EventStatusValue = "active" | "inactive";

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
        className="absolute inset-0 bg-zinc-950/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-[1] w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200/85 bg-white/96 shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_24px_40px_-24px_rgba(2,10,27,0.6),0_12px_22px_-16px_rgba(15,23,42,0.34)] backdrop-blur-[10px]">
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-sky-200/50 via-blue-300/25 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-gradient-to-tr from-zinc-100/70 to-transparent blur-2xl" />

        <div className="relative space-y-5 p-6">
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
              className="h-9 w-9 shrink-0 rounded-full p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
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
        className="absolute inset-0 bg-zinc-950/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/85 bg-white/96 shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_24px_40px_-24px_rgba(2,10,27,0.6),0_12px_22px_-16px_rgba(15,23,42,0.34)] backdrop-blur-[10px]">
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-sky-200/50 via-blue-300/25 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-gradient-to-tr from-zinc-100/70 to-transparent blur-2xl" />

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

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm leading-relaxed text-zinc-600">
            {detail}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              onClick={onClose}
              className="h-9 rounded-md border border-zinc-200/80 bg-white/90 px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 disabled:opacity-60"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isBusy}
              onClick={onConfirm}
              className="h-9 rounded-md bg-sidebar px-3.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-70"
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

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [editingEvent, setEditingEvent] = useState<AdminEventItem | null>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState<EventStatusValue>("inactive");
  const [editSaving, setEditSaving] = useState(false);
  const [tableStatusTarget, setTableStatusTarget] = useState<TableStatusTarget | null>(null);
  const [tableStatusSavingId, setTableStatusSavingId] = useState<string | null>(null);

  const generatedEventKey = useMemo(
    () => slugifyEventKey(eventName, location, date),
    [eventName, location, date]
  );
  const isBusy = saving || editSaving || Boolean(tableStatusSavingId);

  const loadEvents = async () => {
    setLoading(true);
    try {
      setEvents(sortEvents(await listAdminEvents(true)));
    } catch (error: unknown) {
      toast.error("Failed to load events", {
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

  const resetForm = () => {
    setEventName("");
    setLocation("");
    setDate("");
  };

  const closeEditDialog = (force = false) => {
    if (editSaving && !force) return;
    setEditingEvent(null);
  };

  const openEditDialog = (item: AdminEventItem) => {
    setEditingEvent(item);
    setEditEventName(item.eventName);
    setEditLocation(item.location ?? "");
    setEditDate(item.date ?? "");
    setEditStatus(eventStatusValue(item.isActive));
  };

  const hasDetailChanges = useMemo(() => {
    if (!editingEvent) return false;
    return (
      editEventName.trim() !== editingEvent.eventName ||
      editLocation.trim() !== (editingEvent.location ?? "") ||
      editDate.trim() !== (editingEvent.date ?? "")
    );
  }, [editDate, editEventName, editLocation, editingEvent]);

  const hasStatusChange = useMemo(() => {
    if (!editingEvent) return false;
    return editingEvent.isActive !== (editStatus === "active");
  }, [editStatus, editingEvent]);

  const saveEditedEvent = async () => {
    if (!editingEvent) return;

    const nextEventName = editEventName.trim();
    const nextLocation = editLocation.trim();
    const nextDate = editDate.trim();

    if (!nextEventName) {
      toast.error("Event name is required");
      return;
    }

    const payload: AdminEventUpdateInput = {};

    if (nextEventName !== editingEvent.eventName) payload.eventName = nextEventName;
    if (nextLocation !== (editingEvent.location ?? "")) payload.location = nextLocation;
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
        date,
        isActive: false,
      });
      setEvents((prev) => sortEvents([...prev, created]));
      toast.success("Event created", {
        description: `${created.eventName} is saved and waiting for its first campaign.`,
      });
      resetForm();
    } catch (error: unknown) {
      toast.error("Failed to create event", {
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="font-sans flex min-h-[calc(100dvh-3rem)] flex-col overflow-y-auto bg-transparent p-1">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-lg font-normal text-zinc-900">Admin Control</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">Event Registry</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Create events once, keep their base details in the registry, and switch them to active when they are ready for campaign create or upload.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/users">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-zinc-200 bg-white/90 px-4 text-zinc-700 hover:bg-zinc-50"
            >
              <UsersRound className="mr-2 h-4 w-4" />
              Users
            </Button>
          </Link>

          <Link href="/choose-persona">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-zinc-200 bg-white/90 px-4 text-zinc-700 hover:bg-zinc-50"
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
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Total Events", value: stats.total, icon: Tags },
              { label: "Active Events", value: stats.active, icon: ShieldCheck },
              { label: "Inactive Events", value: stats.inactive, icon: CalendarDays },
            ].map((item) => (
              <Card key={item.label} className="rounded-2xl border border-zinc-200 bg-white/86 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{item.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden rounded-2xl border border-zinc-200/85 bg-white/82">
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Registered Events</h2>
                <p className="text-sm text-zinc-500">
                  Only active events appear in campaign create and upload selectors. Keep inactive events hidden until they are ready to use.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Key</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-500">
                        Loading events...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-500">
                        No events found.
                      </td>
                    </tr>
                  ) : (
                    events.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-zinc-50/80">
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-900">{item.eventName}</span>
                            <span className="text-xs text-zinc-500">{item.id}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-700">{item.location || "-"}</td>
                        <td className="px-5 py-4 text-sm text-zinc-700">{formatDate(item.date)}</td>
                        <td className="px-5 py-4">
                          <Select
                            value={eventStatusValue(item.isActive)}
                            onValueChange={(value) => handleTableStatusSelection(item, value)}
                            disabled={isBusy}
                          >
                            <SelectTrigger
                              className={`h-9 w-[8.75rem] border text-xs font-semibold capitalize shadow-none ${
                                item.isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-zinc-200 bg-white">
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                            {item.eventKey}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openEditDialog(item)}
                            disabled={isBusy}
                            className="h-8 border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="h-fit rounded-2xl border border-zinc-200 bg-white/88 p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
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

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Event Name</label>
              <Input
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                placeholder="AMICT Malaysia"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Location</label>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Kuala Lumpur, Malaysia"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Generated Event Key</p>
              <p className="mt-2 break-all text-sm font-medium text-zinc-700">
                {generatedEventKey || "Event key preview will appear here"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                This event will be created as inactive. Switch it to active from the table when you are ready to use it in campaign create or upload.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs leading-relaxed text-zinc-500">
              Only event name, location, and date are stored here. Category stays campaign-specific and will be filled during campaign creation.
            </div>

            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isBusy}
              className="h-10 w-full bg-sidebar text-white hover:bg-zinc-800 disabled:opacity-50"
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
      </div>

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
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Location</label>
              <Input
                value={editLocation}
                onChange={(event) => setEditLocation(event.target.value)}
                placeholder="Kuala Lumpur, Malaysia"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</label>
              <Input
                type="date"
                value={editDate}
                onChange={(event) => setEditDate(event.target.value)}
                className="h-10 border-zinc-200 bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</label>
            <Select value={editStatus} onValueChange={(value) => setEditStatus(value as EventStatusValue)}>
              <SelectTrigger className="h-10 border-zinc-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-200 bg-white">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-sm leading-relaxed text-zinc-600">
            Updating name, location, or date here will also refresh the linked campaign snapshots automatically.
            <span className="mt-1 block text-xs text-zinc-500">
              Status changes still apply only to the registry record itself.
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs leading-relaxed text-zinc-500">
            The event key stays stable here and is not edited from the UI, so event mapping remains consistent while details are updated.
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={editSaving}
              onClick={() => closeEditDialog()}
              className="h-10 border border-zinc-200 bg-white px-4 text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleEditSubmit()}
              disabled={editSaving}
              className="h-10 bg-sidebar px-4 text-white hover:bg-zinc-800 disabled:opacity-50"
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
    </div>
  );
}
