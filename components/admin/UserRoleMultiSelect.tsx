"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, UsersRound, X, type LucideIcon } from "lucide-react";
import { getRoleLabel, type AuthRole } from "@/app/admin/admin-api";

type RoleDepartment = {
  id: string;
  label: string;
  description: string;
  roles: AuthRole[];
  icon?: LucideIcon;
};

function roleResponsibility(role: AuthRole) {
  if (role === "super_admin_user") return "Platform administration";
  if (role === "ceo_user") return "Executive leadership";
  if (role.includes("_manager_")) return "Department management";
  if (role === "marketing_designer_user") return "Design specialist";
  if (role === "marketing_developer_user") return "Development specialist";
  if (role === "marketing_user") return "Legacy marketing role";
  if (role === "client_user") return "Client dashboard access";
  return "Department team member";
}

export function UserRoleMultiSelect({
  selectedRoles,
  roleOptions,
  departments,
  disabled,
  onRolesChange,
}: {
  selectedRoles: AuthRole[];
  roleOptions: AuthRole[];
  departments: RoleDepartment[];
  disabled: boolean;
  onRolesChange: (roles: AuthRole[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const expanded = open && !disabled;
  const normalizedQuery = query.trim().toLowerCase();
  const groupedRoles = new Set(departments.flatMap((department) => department.roles));
  const otherRoles = roleOptions.filter((role) => !groupedRoles.has(role));
  const visibleDepartments = [
    ...departments,
    ...(otherRoles.length ? [{ id: "other", label: "Other roles", description: "Additional account roles.", roles: otherRoles }] : []),
  ].map((department): RoleDepartment & { selectedCount: number } => ({
    ...department,
    selectedCount: department.roles.filter((role) => selectedRoles.includes(role)).length,
    roles: department.roles.filter((role) => roleOptions.includes(role) &&
      `${department.label} ${getRoleLabel(role)} ${role.replaceAll("_", " ")} ${roleResponsibility(role)}`.toLowerCase().includes(normalizedQuery)),
  })).filter((department) => department.roles.length);

  useEffect(() => {
    if (!expanded) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    searchRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  const closePicker = () => {
    dialogRef.current?.close();
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="min-w-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label="Department roles"
        aria-haspopup="dialog"
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

      {expanded ? createPortal(
        <dialog
          ref={dialogRef}
          id={panelId}
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
          aria-describedby={`${panelId}-hint`}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)"));
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onCancel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            closePicker();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePicker();
          }}
          className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 font-sans text-slate-900 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm"
        >
          <div className="flex h-[min(46rem,calc(100dvh_-_2rem))] flex-col">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id={`${panelId}-title`} className="text-lg font-semibold text-slate-900">Select department roles</h2>
                <p id={`${panelId}-hint`} className="mt-1 text-sm text-zinc-500">Choose roles by department. Your first selection is the primary account role.</p>
              </div>
              <button type="button" onClick={closePicker} aria-label="Close role selector" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-blue-500">
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </header>
            <div className="shrink-0 px-5 py-4 sm:px-6">
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <input
                  ref={searchRef}
                  type="search"
                  aria-label="Search department roles"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search departments or roles…"
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-zinc-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-y border-zinc-100 bg-zinc-50/60 p-5 sm:px-6">
              <div className={`grid grid-cols-1 items-stretch gap-4 ${visibleDepartments.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "mx-auto max-w-xl"}`}>
                {visibleDepartments.length ? visibleDepartments.map((department) => {
                  const Icon = department.icon || UsersRound;
                  return (
                    <fieldset key={department.id} aria-describedby={`${panelId}-${department.id}-description`} className="min-w-0 rounded-xl border border-zinc-200 bg-white">
                      <legend className="sr-only">{department.label}</legend>
                      <div className="min-h-22 border-b border-zinc-100 px-3 py-3">
                        <div aria-hidden="true" className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-blue-600" />
                          <h3 className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{department.label}</h3>
                          {department.selectedCount ? <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">{department.selectedCount} selected</span> : null}
                        </div>
                        <p id={`${panelId}-${department.id}-description`} className="mt-1 text-xs leading-4 text-zinc-500">{department.description}</p>
                      </div>
                      <div className="space-y-0.5 p-1.5">
                        {department.roles.map((role) => {
                          const selected = selectedRoles.includes(role);
                          return (
                            <label key={role} className={`flex min-h-14 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition hover:bg-zinc-50 ${selected ? "bg-blue-50/70 text-blue-900" : "text-zinc-700"}`}>
                              <input
                                type="checkbox"
                                checked={selected}
                                aria-label={getRoleLabel(role)}
                                aria-describedby={`${panelId}-${role}-responsibility`}
                                aria-description={role === selectedRoles[0] ? "Primary account role" : undefined}
                                onChange={() => onRolesChange(selected ? selectedRoles.filter((value) => value !== role) : [...selectedRoles, role])}
                                className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium">{getRoleLabel(role)}</span>
                                <span id={`${panelId}-${role}-responsibility`} className="mt-0.5 block text-[11px] leading-4 text-zinc-500">{roleResponsibility(role)}</span>
                              </span>
                              {role === selectedRoles[0] ? <span aria-hidden="true" className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Primary</span> : null}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                }) : <p className="col-span-full px-3 py-6 text-center text-sm text-zinc-500">No matching roles.</p>}
              </div>
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-4 bg-white px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p aria-live="polite" className="text-sm font-medium text-slate-900">{selectedRoles.length} selected</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{selectedRoles.length ? `Primary: ${getRoleLabel(selectedRoles[0])}` : "Select at least one role."}</p>
              </div>
              <button type="button" onClick={closePicker} className="h-10 shrink-0 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Done</button>
            </footer>
          </div>
        </dialog>,
        document.body,
      ) : null}
      {selectedRoles.length > 1 ? (
        <div aria-label="Selected roles" className="mt-2 flex flex-wrap gap-1.5">
          {selectedRoles.map((role, index) => <span key={role} className="rounded-md border border-blue-100 bg-blue-50/60 px-2 py-1 text-xs text-blue-800">{getRoleLabel(role)}{index === 0 ? " · Primary" : ""}</span>)}
        </div>
      ) : null}
    </div>
  );
}
