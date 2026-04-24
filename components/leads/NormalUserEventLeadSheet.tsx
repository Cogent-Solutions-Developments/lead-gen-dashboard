"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addEventLead,
  createWorkflowStatus,
  listAllLeads,
  listEvents,
  listWorkflowStatuses,
  updateLeadWorkflowStatus,
  type EventLeadCreateRequest,
  type EventSummaryItem,
  type LeadItem,
  type WorkflowStatus,
  type WorkflowStatusDefinitionItem,
} from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
import {
  ChevronLeft,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

type LeadSheetRow = {
  id: string;
  canonicalEventKey: string;
  canonicalEventName: string;
  leadIdentityKey: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;
  workflowStatus: WorkflowStatus;
  workflowStatusLabel: string;
  isManualLead: boolean;
};

type AddLeadFormState = {
  fullName: string;
  title: string;
  companyName: string;
  companyUrl: string;
  email: string;
  phone: string;
  linkedinUrl: string;
};

const DEFAULT_WORKFLOW_STATUSES: WorkflowStatusDefinitionItem[] = [
  {
    id: "workflow-default-new",
    statusKey: "new",
    label: "New",
    isSystemDefault: true,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "workflow-default-pending",
    statusKey: "pending",
    label: "Pending",
    isSystemDefault: true,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "workflow-default-complete",
    statusKey: "complete",
    label: "Complete",
    isSystemDefault: true,
    sortOrder: 2,
    isActive: true,
  },
];

const CREATE_STATUS_SENTINEL = "__create_custom_status__";

const EMPTY_ADD_LEAD_FORM: AddLeadFormState = {
  fullName: "",
  title: "",
  companyName: "",
  companyUrl: "",
  email: "",
  phone: "",
  linkedinUrl: "",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function humanizeStatusLabel(value: string) {
  const cleaned = asText(value);
  if (!cleaned) return "New";
  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sortWorkflowStatuses(items: WorkflowStatusDefinitionItem[]) {
  return [...items]
    .filter((item) => item.isActive !== false && asText(item.statusKey))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      if (a.isSystemDefault !== b.isSystemDefault) return a.isSystemDefault ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
}

function mergeWorkflowStatuses(items: WorkflowStatusDefinitionItem[]) {
  const byKey = new Map<string, WorkflowStatusDefinitionItem>();
  for (const item of items) {
    const key = asText(item.statusKey);
    if (!key) continue;
    byKey.set(key, item);
  }
  return sortWorkflowStatuses(Array.from(byKey.values()));
}

function filledScore(lead: Partial<LeadSheetRow>) {
  return [
    lead.employeeName,
    lead.title,
    lead.company,
    lead.email,
    lead.phone,
    lead.linkedinUrl,
    lead.companyUrl,
  ].filter((value) => asText(value).length > 0).length;
}

function mergeLeadRows(base: LeadSheetRow, next: LeadSheetRow) {
  const preferred = filledScore(next) > filledScore(base) ? next : base;
  const fallback = preferred === base ? next : base;

  return {
    ...preferred,
    employeeName: preferred.employeeName || fallback.employeeName,
    title: preferred.title || fallback.title,
    company: preferred.company || fallback.company,
    email: preferred.email || fallback.email,
    phone: preferred.phone || fallback.phone,
    linkedinUrl: preferred.linkedinUrl || fallback.linkedinUrl,
    companyUrl: preferred.companyUrl || fallback.companyUrl,
    workflowStatus: preferred.workflowStatus || fallback.workflowStatus,
    workflowStatusLabel: preferred.workflowStatusLabel || fallback.workflowStatusLabel,
    isManualLead: preferred.isManualLead || fallback.isManualLead,
  };
}

function mapLeadItem(item: LeadItem, labelLookup: Map<string, string>): LeadSheetRow | null {
  const canonicalEventKey = asText(item.canonicalEventKey);
  const leadIdentityKey = asText(item.leadIdentityKey);
  if (!canonicalEventKey || !leadIdentityKey) return null;

  const workflowStatus = asText(item.workflowStatus) || "new";
  const workflowStatusLabel =
    asText(item.workflowStatusLabel) ||
    labelLookup.get(workflowStatus) ||
    humanizeStatusLabel(workflowStatus);

  return {
    id: item.id,
    canonicalEventKey,
    canonicalEventName: asText(item.canonicalEventName) || asText(item.eventName) || "Unknown Event",
    leadIdentityKey,
    employeeName: asText(item.employeeName),
    title: asText(item.title),
    company: asText(item.company),
    email: asText(item.email),
    phone: asText(item.phone),
    linkedinUrl: asText(item.linkedinUrl),
    companyUrl: asText(item.companyUrl),
    workflowStatus,
    workflowStatusLabel,
    isManualLead: Boolean(item.isManualLead),
  };
}

function updateSearchParam(pathname: string, searchParams: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(searchParams.toString());
  if (value) next.set(key, value);
  else next.delete(key);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function LeadSheetDialog({
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

      <div className="relative z-[1] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200/85 bg-white/96 shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_24px_40px_-24px_rgba(2,10,27,0.6),0_12px_22px_-16px_rgba(15,23,42,0.34)] backdrop-blur-[10px]">
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-sky-200/50 via-blue-300/25 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-gradient-to-tr from-zinc-100/70 to-transparent blur-2xl" />

        <div className="relative space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Lead Sheet
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

export function NormalUserEventLeadSheet() {
  const { persona } = usePersona();
  const personaLabel =
    persona === "delegates" ? "Delegate" : persona === "production" ? "Production" : "Sales";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event") || "";

  const [events, setEvents] = useState<EventSummaryItem[]>([]);
  const [allLeads, setAllLeads] = useState<LeadItem[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatusDefinitionItem[]>(
    DEFAULT_WORKFLOW_STATUSES
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingKeys, setUpdatingKeys] = useState<Record<string, boolean>>({});
  const [createStatusOpen, setCreateStatusOpen] = useState(false);
  const [statusDraftLabel, setStatusDraftLabel] = useState("");
  const [statusTargetLead, setStatusTargetLead] = useState<LeadSheetRow | null>(null);
  const [creatingStatus, setCreatingStatus] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState<AddLeadFormState>(EMPTY_ADD_LEAD_FORM);
  const [addingLead, setAddingLead] = useState(false);

  const workflowStatusLabelLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const item of workflowStatuses) {
      lookup.set(item.statusKey, item.label);
    }
    return lookup;
  }, [workflowStatuses]);

  const statusOptions = useMemo(() => {
    return workflowStatuses.length > 0 ? workflowStatuses : DEFAULT_WORKFLOW_STATUSES;
  }, [workflowStatuses]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsResponse, leadsResponse, statusResponse] = await Promise.all([
        listEvents(),
        listAllLeads(),
        listWorkflowStatuses(),
      ]);
      setEvents(eventsResponse.events || []);
      setAllLeads(leadsResponse.leads || []);
      setWorkflowStatuses(
        mergeWorkflowStatuses([...(statusResponse.statuses || []), ...DEFAULT_WORKFLOW_STATUSES])
      );
    } catch (error: unknown) {
      toast.error("Failed to load lead sheet", {
        description: getErrorMessage(error),
      });
      setEvents([]);
      setAllLeads([]);
      setWorkflowStatuses(DEFAULT_WORKFLOW_STATUSES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedEventKey = useMemo(() => {
    if (eventParam && events.some((item) => item.canonicalEventKey === eventParam)) {
      return eventParam;
    }
    return events[0]?.canonicalEventKey || "";
  }, [eventParam, events]);

  useEffect(() => {
    if (!events.length || !selectedEventKey || eventParam === selectedEventKey) return;
    router.replace(
      updateSearchParam(pathname, new URLSearchParams(searchParams.toString()), "event", selectedEventKey)
    );
  }, [eventParam, events.length, pathname, router, searchParams, selectedEventKey]);

  const selectedEvent = useMemo(
    () => events.find((item) => item.canonicalEventKey === selectedEventKey) ?? null,
    [events, selectedEventKey]
  );

  const eventLeads = useMemo(() => {
    const buckets = new Map<string, LeadSheetRow>();

    for (const item of allLeads) {
      const mapped = mapLeadItem(item, workflowStatusLabelLookup);
      if (!mapped) continue;
      if (selectedEventKey && mapped.canonicalEventKey !== selectedEventKey) continue;

      const key = `${mapped.canonicalEventKey}::${mapped.leadIdentityKey}`;
      const current = buckets.get(key);
      buckets.set(key, current ? mergeLeadRows(current, mapped) : mapped);
    }

    return Array.from(buckets.values());
  }, [allLeads, selectedEventKey, workflowStatusLabelLookup]);

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return eventLeads;

    return eventLeads.filter((item) =>
      [
        item.employeeName,
        item.title,
        item.company,
        item.email,
        item.phone,
        item.linkedinUrl,
        item.companyUrl,
        item.workflowStatusLabel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [eventLeads, searchQuery]);

  const handleEventChange = (value: string) => {
    router.replace(updateSearchParam(pathname, new URLSearchParams(searchParams.toString()), "event", value));
  };

  const handleWorkflowStatusChange = useCallback(
    async (item: LeadSheetRow, nextStatus: WorkflowStatus) => {
      const updateKey = `${item.canonicalEventKey}::${item.leadIdentityKey}`;

      setUpdatingKeys((prev) => ({ ...prev, [updateKey]: true }));
      try {
        const response = await updateLeadWorkflowStatus(item.id, nextStatus);
        const nextLabel =
          asText(response.workflowStatusLabel) ||
          workflowStatusLabelLookup.get(response.workflowStatus) ||
          humanizeStatusLabel(response.workflowStatus);

        setAllLeads((prev) =>
          prev.map((lead) => {
            if (
              asText(lead.canonicalEventKey) === response.canonicalEventKey &&
              asText(lead.leadIdentityKey) === response.leadIdentityKey
            ) {
              return {
                ...lead,
                workflowStatus: response.workflowStatus,
                workflowStatusLabel: nextLabel,
              };
            }
            return lead;
          })
        );
      } catch (error: unknown) {
        toast.error("Failed to update status", {
          description: getErrorMessage(error),
        });
      } finally {
        setUpdatingKeys((prev) => {
          const next = { ...prev };
          delete next[updateKey];
          return next;
        });
      }
    },
    [workflowStatusLabelLookup]
  );

  const openCreateStatusDialog = (item: LeadSheetRow) => {
    setStatusTargetLead(item);
    setStatusDraftLabel("");
    setCreateStatusOpen(true);
  };

  const handleStatusSelection = (item: LeadSheetRow, value: string) => {
    if (value === CREATE_STATUS_SENTINEL) {
      openCreateStatusDialog(item);
      return;
    }
    void handleWorkflowStatusChange(item, value);
  };

  const closeCreateStatusDialog = (force = false) => {
    if (creatingStatus && !force) return;
    setCreateStatusOpen(false);
    setStatusDraftLabel("");
    setStatusTargetLead(null);
  };

  const submitCreateStatus = async () => {
    const label = statusDraftLabel.trim();
    if (!label) {
      toast.error("Status label is required");
      return;
    }

    setCreatingStatus(true);
    try {
      const created = await createWorkflowStatus(label);
      setWorkflowStatuses((prev) => mergeWorkflowStatuses([...prev, created]));
      toast.success("Custom status created", {
        description: `${created.label} is now available in your workflow.`,
      });

      const target = statusTargetLead;
      closeCreateStatusDialog(true);

      if (target) {
        await handleWorkflowStatusChange(target, created.statusKey);
      }
    } catch (error: unknown) {
      toast.error("Failed to create status", {
        description: getErrorMessage(error),
      });
    } finally {
      setCreatingStatus(false);
    }
  };

  const closeAddLeadDialog = (force = false) => {
    if (addingLead && !force) return;
    setAddLeadOpen(false);
    setAddLeadForm(EMPTY_ADD_LEAD_FORM);
  };

  const updateAddLeadField = (field: keyof AddLeadFormState, value: string) => {
    setAddLeadForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitAddLead = async () => {
    if (!selectedEvent) {
      toast.error("Select an event first");
      return;
    }

    const payload: EventLeadCreateRequest = {
      fullName: addLeadForm.fullName.trim(),
      title: addLeadForm.title.trim() || undefined,
      companyName: addLeadForm.companyName.trim() || undefined,
      companyUrl: addLeadForm.companyUrl.trim() || undefined,
      email: addLeadForm.email.trim() || undefined,
      phone: addLeadForm.phone.trim() || undefined,
      linkedinUrl: addLeadForm.linkedinUrl.trim() || undefined,
    };

    if (!payload.fullName) {
      toast.error("Full name is required");
      return;
    }

    setAddingLead(true);
    try {
      const created = await addEventLead(selectedEvent.canonicalEventKey, payload);
      const nextLead: LeadItem = {
        id: created.id,
        batchId: "",
        employeeName: created.employeeName,
        title: created.title || "",
        company: created.company || "",
        email: created.email || "",
        phone: created.phone || "",
        linkedinUrl: created.linkedinUrl || "",
        companyUrl: created.companyUrl || "",
        contentEmailSubject: null,
        contentEmail: null,
        contentLinkedin: null,
        contentWhatsapp: null,
        eventName: created.canonicalEventName,
        canonicalEventKey: created.canonicalEventKey,
        canonicalEventName: created.canonicalEventName,
        leadIdentityKey: created.leadIdentityKey,
        workflowStatus: created.workflowStatus,
        workflowStatusLabel:
          asText(created.workflowStatusLabel) ||
          workflowStatusLabelLookup.get(created.workflowStatus) ||
          humanizeStatusLabel(created.workflowStatus),
        hostIcpRunId: created.hostIcpRunId,
        isManualLead: Boolean(created.isManualLead),
        manualLeadAddedByUserId: created.manualLeadAddedByUserId,
        manualLeadAddedByUsername: created.manualLeadAddedByUsername,
        manualLeadAddedAt: created.manualLeadAddedAt,
        approvalStatus: "pending",
      };

      setAllLeads((prev) => [nextLead, ...prev]);
      setEvents((prev) =>
        prev.map((item) =>
          item.canonicalEventKey === created.canonicalEventKey
            ? { ...item, leadCount: Number(item.leadCount || 0) + 1 }
            : item
        )
      );
      closeAddLeadDialog(true);
      toast.success("Lead added", {
        description: `${created.employeeName} is now part of ${created.canonicalEventName}.`,
      });
    } catch (error: unknown) {
      toast.error("Failed to add lead", {
        description: getErrorMessage(error),
      });
    } finally {
      setAddingLead(false);
    }
  };

  return (
    <>
      <div className="font-sans flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1">
        <div className="relative z-10 flex shrink-0 flex-col gap-4 border-b border-zinc-100/90 bg-transparent pb-6 backdrop-blur-[8px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
                {personaLabel} Lead Sheet
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
                {selectedEvent?.canonicalEventName || "Lead Sheet"}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Combined event view with personal workflow statuses across all related campaign runs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/campaigns">
                <Button
                  variant="outline"
                  className="h-9 border-zinc-200/80 bg-white/85 px-3.5 text-xs font-semibold text-zinc-700 hover:bg-white"
                >
                  <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back to Events
                </Button>
              </Link>

              <Button
                variant="outline"
                className="h-9 border-zinc-200/80 bg-white/85 px-3.5 text-xs font-semibold text-zinc-700 hover:bg-white"
                onClick={() => setAddLeadOpen(true)}
                disabled={!selectedEvent}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Lead
              </Button>

              <Button
                variant="outline"
                className="h-9 border-zinc-200/80 bg-white/85 px-3.5 text-xs font-semibold text-zinc-700 hover:bg-white"
                onClick={() => void loadData()}
              >
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
              {selectedEvent ? `${selectedEvent.leadCount} leads` : "0 leads"}
            </Badge>
            <Badge className="rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
              {statusOptions.length} statuses
            </Badge>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Event
              </label>
              <Select value={selectedEventKey} onValueChange={handleEventChange}>
                <SelectTrigger className="h-10 w-full border-zinc-200/80 bg-white/85 text-sm">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((item) => (
                    <SelectItem key={item.canonicalEventKey} value={item.canonicalEventKey}>
                      {item.canonicalEventName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.625rem)] h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Search Leads
              </label>
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name, company, email, phone, status"
                className="h-10 border-zinc-200/80 bg-white/85 pl-9 text-sm"
              />
            </div>
          </div>

          {selectedEvent ? (
            <div className="rounded-xl border border-zinc-200/80 bg-white/55 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Related Campaigns
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedEvent.relatedCampaignNames.length > 0 ? (
                  selectedEvent.relatedCampaignNames.map((name) => (
                    <Badge
                      key={name}
                      className="rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 shadow-none"
                    >
                      {name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-zinc-500">No related campaigns recorded.</span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/32 backdrop-blur-[8px]">
          <div className="min-h-0 h-full overflow-auto px-4 py-3">
            {loading ? (
              <div className="px-5 py-10 text-sm text-zinc-500">Loading lead sheet...</div>
            ) : !selectedEvent ? (
              <div className="px-5 py-10 text-sm text-zinc-500">No events available for this pipeline.</div>
            ) : filteredLeads.length === 0 ? (
              <div className="px-5 py-10 text-sm text-zinc-500">
                {searchQuery.trim() ? "No leads match the current search." : "No leads found for this event."}
              </div>
            ) : (
              <table className="min-w-[980px] w-full">
                <thead className="border-b border-zinc-100/85 bg-white/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Profile
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Contact Info
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100/70">
                  {filteredLeads.map((item) => {
                    const updateKey = `${item.canonicalEventKey}::${item.leadIdentityKey}`;
                    const isUpdating = Boolean(updatingKeys[updateKey]);

                    return (
                      <tr key={updateKey} className="transition-colors hover:bg-white/46">
                        <td className="px-4 py-4 align-top">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-zinc-900">
                                {item.employeeName || "-"}
                              </p>
                              {item.isManualLead ? (
                                <Badge className="rounded-full border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 shadow-none">
                                  Manual Lead
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-zinc-600">{item.title || "-"}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                              {item.company || "-"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1.5 text-sm text-zinc-700">
                            <p>{item.email || "-"}</p>
                            <p>{item.phone || "-"}</p>
                            <div className="flex flex-wrap gap-3 pt-1">
                              {item.linkedinUrl ? (
                                <a
                                  href={item.linkedinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
                                >
                                  LinkedIn
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : null}
                              {item.companyUrl ? (
                                <a
                                  href={item.companyUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
                                >
                                  Website
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex max-w-[12rem] items-center gap-2">
                            <Select
                              value={item.workflowStatus}
                              onValueChange={(value) => handleStatusSelection(item, value)}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="h-9 w-full border-zinc-200/80 bg-white/85 text-sm">
                                <SelectValue placeholder={item.workflowStatusLabel} />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((option) => (
                                  <SelectItem key={option.statusKey} value={option.statusKey}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                                <SelectItem value={CREATE_STATUS_SENTINEL}>
                                  <span className="inline-flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5" />
                                    Add custom status
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <LeadSheetDialog
        open={createStatusOpen}
        title="Create Custom Status"
        description="This status will belong only to your account in the current pipeline."
        onClose={closeCreateStatusDialog}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Status Label
            </label>
            <Input
              value={statusDraftLabel}
              onChange={(event) => setStatusDraftLabel(event.target.value)}
              placeholder="For example: Follow Up"
              className="h-10 border-zinc-200/80 bg-white/90"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-md border border-zinc-200/80 bg-white/90 px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
              onClick={() => closeCreateStatusDialog()}
              disabled={creatingStatus}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 rounded-md border border-zinc-200/80 bg-white/82 px-3.5 text-xs font-semibold text-zinc-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
              onClick={() => void submitCreateStatus()}
              disabled={creatingStatus}
            >
              {creatingStatus ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create Status
                </>
              )}
            </Button>
          </div>
        </div>
      </LeadSheetDialog>

      <LeadSheetDialog
        open={addLeadOpen}
        title="Add Lead"
        description={
          selectedEvent
            ? `Add one lead directly into ${selectedEvent.canonicalEventName}.`
            : "Select an event first before adding a lead."
        }
        onClose={closeAddLeadDialog}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Full Name
            </label>
            <Input
              value={addLeadForm.fullName}
              onChange={(event) => updateAddLeadField("fullName", event.target.value)}
              placeholder="Lead name"
              className="h-10 border-zinc-200/80 bg-white/90"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Title
            </label>
            <Input
              value={addLeadForm.title}
              onChange={(event) => updateAddLeadField("title", event.target.value)}
              placeholder="Job title"
              className="h-10 border-zinc-200/80 bg-white/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Company Name
            </label>
            <Input
              value={addLeadForm.companyName}
              onChange={(event) => updateAddLeadField("companyName", event.target.value)}
              placeholder="Company"
              className="h-10 border-zinc-200/80 bg-white/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Company URL
            </label>
            <Input
              value={addLeadForm.companyUrl}
              onChange={(event) => updateAddLeadField("companyUrl", event.target.value)}
              placeholder="https://company.com"
              className="h-10 border-zinc-200/80 bg-white/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Email
            </label>
            <Input
              value={addLeadForm.email}
              onChange={(event) => updateAddLeadField("email", event.target.value)}
              placeholder="name@company.com"
              className="h-10 border-zinc-200/80 bg-white/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Phone
            </label>
            <Input
              value={addLeadForm.phone}
              onChange={(event) => updateAddLeadField("phone", event.target.value)}
              placeholder="+60 ..."
              className="h-10 border-zinc-200/80 bg-white/90"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              LinkedIn URL
            </label>
            <Input
              value={addLeadForm.linkedinUrl}
              onChange={(event) => updateAddLeadField("linkedinUrl", event.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="h-10 border-zinc-200/80 bg-white/90"
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-xs leading-relaxed text-zinc-500">
          Sales users need at least an email or phone. Delegate and production users can save a lead with just the basic profile details.
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-md border border-zinc-200/80 bg-white/90 px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
            onClick={() => closeAddLeadDialog()}
            disabled={addingLead}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-9 rounded-md border border-zinc-200/80 bg-white/82 px-3.5 text-xs font-semibold text-zinc-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
            onClick={() => void submitAddLead()}
            disabled={addingLead || !selectedEvent}
          >
            {addingLead ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Lead
              </>
            )}
          </Button>
        </div>
      </LeadSheetDialog>
    </>
  );
}
