"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tags,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAdminEvent, listAdminEvents, type AdminEventItem } from "@/lib/auth";

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

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");

  const generatedEventKey = useMemo(
    () => slugifyEventKey(eventName, location, date),
    [eventName, location, date]
  );

  const loadEvents = async () => {
    setLoading(true);
    try {
      setEvents(await listAdminEvents(true));
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
      setEvents((prev) =>
        [...prev, created].sort((a, b) => a.eventName.localeCompare(b.eventName))
      );
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
            Create events once, keep their base details in the registry, and let the first related campaign activate them automatically.
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
            disabled={loading || saving}
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
                  Inactive events are ready for their first campaign. Once a campaign is launched with that event, the frontend will activate it before create.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                        Loading events...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
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
                          <Badge
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-none ${
                              item.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                            {item.eventKey}
                          </span>
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
                This event will be created as inactive. The first campaign or upload that uses it will activate it automatically.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 text-xs leading-relaxed text-zinc-500">
              Only event name, location, and date are stored here. Category stays campaign-specific and will be filled during campaign creation.
            </div>

            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
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
    </div>
  );
}
