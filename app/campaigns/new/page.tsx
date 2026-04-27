"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Loader2, MapPin, Rocket, Tags } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
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
import { createCampaign } from "@/lib/apiRouter";
import { listAdminEvents, updateAdminEvent, type AdminEventItem } from "@/lib/auth";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default function NewCampaignPage() {
  const router = useRouter();

  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [category, setCategory] = useState("");
  const [icp, setIcp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const rows = await listAdminEvents(true);
        if (!active) return;
        setEvents(rows);
      } catch (error: unknown) {
        if (!active) return;
        toast.error("Failed to load events", {
          description: getErrorMessage(error),
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

  const validateForm = () => {
    if (!selectedEvent) return "Event selection is required.";
    if (!selectedEvent.eventName.trim()) return "Selected event is missing a name.";
    if (!selectedEvent.location?.trim()) return "Selected event is missing a location.";
    if (!selectedEvent.date?.trim()) return "Selected event is missing a date.";
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
    if (!selectedEvent) return;

    setIsSubmitting(true);
    try {
      let activeEvent = selectedEvent;
      if (!activeEvent.isActive) {
        activeEvent = await updateAdminEvent(activeEvent.id, { isActive: true });
        setEvents((prev) => prev.map((item) => (item.id === activeEvent.id ? activeEvent : item)));
      }

      const response = await createCampaign({
        name: activeEvent.eventName,
        location: activeEvent.location || undefined,
        date: activeEvent.date || undefined,
        category: category.trim(),
        icp: icp.trim(),
        eventRegistryId: activeEvent.id,
      });

      toast.success("Campaign created", {
        description: "Scraping will begin shortly.",
      });
      router.push(`/campaigns/${response.id}`);
    } catch (err: unknown) {
      toast.error("Failed to create campaign", {
        description: getErrorMessage(err),
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
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">New Campaign</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Select an event from the registry, then add campaign-specific details like category and ICP.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <Card className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Event Name
              </label>
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
                disabled={eventsLoading || isSubmitting}
              >
                <SelectTrigger className="h-10 border-zinc-200 bg-white">
                  <SelectValue
                    placeholder={eventsLoading ? "Loading events..." : "Select an event"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {events.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.eventName}{item.isActive ? "" : " (Inactive)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {events.length === 0 && !eventsLoading ? (
                <p className="text-xs text-zinc-500">
                  No events are registered yet.{" "}
                  <Link href="/admin/events" className="font-semibold text-zinc-700 hover:text-zinc-900">
                    Create an event first
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Name
              </label>
              <div className="relative">
                <Tags className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={selectedEvent?.eventName || ""}
                  readOnly
                  disabled
                  placeholder="Select an event"
                  className="h-10 border-zinc-200 bg-zinc-50 pl-9 text-zinc-700 disabled:opacity-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Location
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={selectedEvent?.location || ""}
                  readOnly
                  disabled
                  placeholder="Select an event"
                  className="h-10 border-zinc-200 bg-zinc-50 pl-9 text-zinc-700 disabled:opacity-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Date
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={selectedEvent?.date || ""}
                  readOnly
                  disabled
                  placeholder="Select an event"
                  className="h-10 border-zinc-200 bg-zinc-50 pl-9 text-zinc-700 disabled:opacity-100"
                />
              </div>
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

          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-xs leading-relaxed text-zinc-500">
            Event name, location, and date are locked to the selected registry entry. Category stays campaign-specific and can be set here.
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              ICP
            </label>
            <Textarea
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder={`Example:\nEvent: AMICT Malaysia\nTarget companies: Asset integrity and inspection vendors\nTarget roles: Sales Director, Regional Business Development Manager\nExclusions: Non-commercial institutions`}
              className="min-h-80 resize-y border-zinc-200 bg-white font-mono text-sm"
            />
            <p className="text-xs text-zinc-400">{icp.length} characters</p>
          </div>

          <div className="mt-6 flex items-center justify-end border-t border-zinc-100 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting || eventsLoading}
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
