"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { getRoleLabel, type AuthRole } from "@/app/admin/admin-api";

export function UserRoleMultiSelect({
  selectedRoles,
  roleOptions,
  disabled,
  onRolesChange,
}: {
  selectedRoles: AuthRole[];
  roleOptions: AuthRole[];
  disabled: boolean;
  onRolesChange: (roles: AuthRole[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const expanded = open && !disabled;
  const visibleRoles = roleOptions.filter((role) =>
    `${getRoleLabel(role)} ${role.replaceAll("_", " ")}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!expanded) return;
    searchRef.current?.focus({ preventScroll: true });
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [expanded]);

  const closePicker = () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={containerRef}
      className="@container min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.preventDefault();
          event.stopPropagation();
          closePicker();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label="Department roles"
        aria-expanded={expanded}
        aria-controls={expanded ? panelId : undefined}
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !expanded) {
            event.preventDefault();
            setQuery("");
            setOpen(true);
          }
        }}
        className={`flex min-h-11 w-full items-center gap-2 rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm outline-none transition hover:border-blue-300 focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${expanded ? "border-blue-500 ring-3 ring-blue-50" : "border-zinc-300"}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selectedRoles.length ? "text-slate-900" : "text-zinc-500"}`}>
          {selectedRoles.length ? getRoleLabel(selectedRoles[0]) : "Select department roles"}
        </span>
        {selectedRoles.length > 1 ? (
          <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">+{selectedRoles.length - 1}</span>
        ) : null}
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div id={panelId} role="group" aria-label="Choose department roles" className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="relative border-b border-zinc-100">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <input
              ref={searchRef}
              type="search"
              aria-label="Search department roles"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search roles…"
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-200"
            />
          </div>
          <div className="grid max-h-44 grid-cols-1 gap-0.5 overflow-y-auto overscroll-contain p-1.5 @min-[28rem]:grid-cols-2">
            {visibleRoles.length ? visibleRoles.map((role) => {
              const selected = selectedRoles.includes(role);
              return (
                <label key={role} className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition hover:bg-zinc-50 ${selected ? "bg-blue-50/70 text-blue-900" : "text-zinc-700"}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    aria-description={role === selectedRoles[0] ? "Primary account role" : undefined}
                    onChange={() => onRolesChange(selected ? selectedRoles.filter((value) => value !== role) : [...selectedRoles, role])}
                    className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  />
                  <span className="min-w-0 flex-1">{getRoleLabel(role)}</span>
                  {role === selectedRoles[0] ? <span aria-hidden="true" className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Primary</span> : null}
                </label>
              );
            }) : <p className="col-span-full px-3 py-6 text-center text-sm text-zinc-500">No matching roles.</p>}
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/70 px-3 py-2">
            <span aria-live="polite" className="text-xs text-zinc-500">{selectedRoles.length} selected</span>
            <button type="button" onClick={closePicker} className="rounded-md px-3 py-1 text-xs font-semibold text-blue-700 outline-none hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500">Done</button>
          </div>
        </div>
      ) : null}
      {selectedRoles.length > 1 ? (
        <div aria-label="Selected roles" className="mt-2 flex flex-wrap gap-1.5">
          {selectedRoles.map((role, index) => <span key={role} className="rounded-md border border-blue-100 bg-blue-50/60 px-2 py-1 text-xs text-blue-800">{getRoleLabel(role)}{index === 0 ? " · Primary" : ""}</span>)}
        </div>
      ) : null}
    </div>
  );
}
