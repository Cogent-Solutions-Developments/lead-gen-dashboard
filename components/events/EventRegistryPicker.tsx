"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { AdminEventItem } from "@/lib/auth";
import { cn } from "@/lib/utils";

type EventStatusTab = "active" | "inactive";

type EventRegistryPickerProps = {
  events: AdminEventItem[];
  value: string;
  onValueChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  loadingLabel?: string;
  showStatusLabel?: boolean;
  showStatusTabs?: boolean;
  inactiveSelectable?: boolean;
  getEventValue?: (event: AdminEventItem) => string;
  isEventSelectable?: (event: AdminEventItem) => boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
};

function sortEvents(events: AdminEventItem[]) {
  return [...events].sort((a, b) => a.eventName.localeCompare(b.eventName));
}

export function EventRegistryPicker({
  events,
  value,
  onValueChange,
  loading = false,
  disabled = false,
  placeholder = "Select event",
  loadingLabel = "Loading events...",
  showStatusLabel = true,
  showStatusTabs = true,
  inactiveSelectable = true,
  getEventValue,
  isEventSelectable,
  className,
  triggerClassName,
  contentClassName,
}: EventRegistryPickerProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<EventStatusTab>("active");
  const eventValue = useCallback(
    (event: AdminEventItem) => getEventValue?.(event) || event.id,
    [getEventValue]
  );
  const canSelectEvent = useCallback(
    (event: AdminEventItem) =>
      isEventSelectable ? isEventSelectable(event) : event.isActive || inactiveSelectable,
    [inactiveSelectable, isEventSelectable]
  );

  const selectedEvent = useMemo(
    () => events.find((event) => eventValue(event) === value) ?? null,
    [events, eventValue, value]
  );
  const groupedEvents = useMemo(
    () => ({
      active: sortEvents(events.filter((event) => event.isActive)),
      inactive: sortEvents(events.filter((event) => !event.isActive)),
    }),
    [events]
  );
  const visibleEvents = showStatusTabs
    ? statusTab === "active"
      ? groupedEvents.active
      : groupedEvents.inactive
    : groupedEvents.active;
  const selectedStatusLabel = selectedEvent ? (selectedEvent.isActive ? "Active" : "Inactive") : "";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && pickerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggleOpen = () => {
    if (loading || disabled) return;
    setStatusTab(selectedEvent?.isActive === false ? "inactive" : "active");
    setOpen((current) => !current);
  };

  const handleSelect = (event: AdminEventItem) => {
    if (!canSelectEvent(event)) return;
    onValueChange(eventValue(event));
    setOpen(false);
  };

  return (
    <div ref={pickerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={loading || disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm shadow-none transition-colors hover:border-zinc-400 disabled:opacity-60",
          triggerClassName
        )}
      >
        <span className="min-w-0 flex-1">
          <span className={selectedEvent ? "block truncate font-medium text-zinc-900" : "block truncate text-zinc-400"}>
            {loading ? loadingLabel : selectedEvent?.eventName || placeholder}
          </span>
          {showStatusLabel && selectedEvent ? (
            <span className={selectedEvent.isActive ? "mt-0.5 block text-xs text-emerald-700" : "mt-0.5 block text-xs text-zinc-400"}>
              {selectedStatusLabel} event
            </span>
          ) : null}
        </span>
        <ChevronDown className={open ? "h-4 w-4 shrink-0 rotate-180 text-zinc-400 transition-transform" : "h-4 w-4 shrink-0 text-zinc-400 transition-transform"} />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-[120] mt-2 overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-[0_24px_60px_-34px_rgba(2,10,27,0.5)]",
            contentClassName
          )}
        >
          {showStatusTabs ? (
            <div className="grid grid-cols-2 gap-1 border-b border-zinc-100 bg-zinc-50/80 p-2">
              <button
                type="button"
                onClick={() => setStatusTab("active")}
                className={
                  statusTab === "active"
                    ? "h-9 rounded-lg bg-white px-3 text-xs font-bold uppercase tracking-wider text-emerald-700 shadow-sm"
                    : "h-9 rounded-lg px-3 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-white/70 hover:text-zinc-700"
                }
              >
                Active ({groupedEvents.active.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("inactive")}
                className={
                  statusTab === "inactive"
                    ? "h-9 rounded-lg bg-white px-3 text-xs font-bold uppercase tracking-wider text-zinc-700 shadow-sm"
                    : "h-9 rounded-lg px-3 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-white/70 hover:text-zinc-700"
                }
              >
                Inactive ({groupedEvents.inactive.length})
              </button>
            </div>
          ) : null}

          <div className="max-h-72 overflow-y-auto p-2" role="listbox">
            {visibleEvents.length > 0 ? (
              <div className="space-y-1">
                {visibleEvents.map((event) => {
                  const isSelected = eventValue(event) === value;
                  const isDisabled = !canSelectEvent(event);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => handleSelect(event)}
                      disabled={isDisabled}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-zinc-100 font-medium text-zinc-950"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                        isDisabled && "cursor-not-allowed text-zinc-300 hover:bg-transparent hover:text-zinc-300"
                      )}
                    >
                      <span className="min-w-0 truncate">{event.eventName}</span>
                      {isSelected ? <Check className="h-4 w-4 shrink-0 text-zinc-700" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-sm font-medium text-zinc-400">
                {showStatusTabs ? `No ${statusTab} events available` : "No active events available"}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
