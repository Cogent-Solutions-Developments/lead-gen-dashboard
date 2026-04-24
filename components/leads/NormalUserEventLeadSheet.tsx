"use client";

import { useEffect, useMemo, useState } from "react";
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
  ExternalLink,
  Loader2,
  RefreshCcw,
  Search,
  ChevronLeft,
} from "lucide-react";
import {
  listAllLeads,
  listEvents,
  updateLeadWorkflowStatus,
  type EventSummaryItem,
  type LeadItem,
  type WorkflowStatus,
} from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
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
};

const WORKFLOW_STATUS_OPTIONS: Array<{ value: WorkflowStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "pending", label: "Pending" },
  { value: "complete", label: "Complete" },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  };
}

function mapLeadItem(item: LeadItem): LeadSheetRow | null {
  const canonicalEventKey = asText(item.canonicalEventKey);
  const leadIdentityKey = asText(item.leadIdentityKey);
  if (!canonicalEventKey || !leadIdentityKey) return null;

  const workflowStatus = (item.workflowStatus || "new") as WorkflowStatus;

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
  };
}

function updateSearchParam(pathname: string, searchParams: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(searchParams.toString());
  if (value) next.set(key, value);
  else next.delete(key);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [updatingKeys, setUpdatingKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [eventsResponse, leadsResponse] = await Promise.all([listEvents(), listAllLeads()]);
        if (cancelled) return;
        setEvents(eventsResponse.events || []);
        setAllLeads(leadsResponse.leads || []);
      } catch (error: unknown) {
        if (!cancelled) {
          toast.error("Failed to load lead sheet", {
            description: getErrorMessage(error),
          });
          setEvents([]);
          setAllLeads([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const selectedEventKey = useMemo(() => {
    if (eventParam && events.some((item) => item.canonicalEventKey === eventParam)) {
      return eventParam;
    }
    return events[0]?.canonicalEventKey || "";
  }, [eventParam, events]);

  useEffect(() => {
    if (!events.length || !selectedEventKey || eventParam === selectedEventKey) return;
    router.replace(updateSearchParam(pathname, new URLSearchParams(searchParams.toString()), "event", selectedEventKey));
  }, [eventParam, events.length, pathname, router, searchParams, selectedEventKey]);

  const selectedEvent = useMemo(
    () => events.find((item) => item.canonicalEventKey === selectedEventKey) ?? null,
    [events, selectedEventKey]
  );

  const eventLeads = useMemo(() => {
    const buckets = new Map<string, LeadSheetRow>();

    for (const item of allLeads) {
      const mapped = mapLeadItem(item);
      if (!mapped) continue;
      if (selectedEventKey && mapped.canonicalEventKey !== selectedEventKey) continue;

      const key = `${mapped.canonicalEventKey}::${mapped.leadIdentityKey}`;
      const current = buckets.get(key);
      buckets.set(key, current ? mergeLeadRows(current, mapped) : mapped);
    }

    return Array.from(buckets.values());
  }, [allLeads, selectedEventKey]);

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
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [eventLeads, searchQuery]);

  const handleEventChange = (value: string) => {
    router.replace(updateSearchParam(pathname, new URLSearchParams(searchParams.toString()), "event", value));
  };

  const handleWorkflowStatusChange = async (item: LeadSheetRow, nextStatus: WorkflowStatus) => {
    const updateKey = `${item.canonicalEventKey}::${item.leadIdentityKey}`;

    setUpdatingKeys((prev) => ({ ...prev, [updateKey]: true }));
    try {
      const response = await updateLeadWorkflowStatus(item.id, nextStatus);

      setAllLeads((prev) =>
        prev.map((lead) => {
          if (
            asText(lead.canonicalEventKey) === response.canonicalEventKey &&
            asText(lead.leadIdentityKey) === response.leadIdentityKey
          ) {
            return { ...lead, workflowStatus: response.workflowStatus };
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
  };

  return (
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
              Combined event view with one workflow status per lead across related campaign runs.
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
              onClick={() => setRefreshTick((value) => value + 1)}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
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
              placeholder="Name, company, email, phone"
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
                          <p className="text-sm font-semibold text-zinc-900">
                            {item.employeeName || "-"}
                          </p>
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
                        <div className="flex max-w-[11rem] items-center gap-2">
                          <Select
                            value={item.workflowStatus}
                            onValueChange={(value) =>
                              handleWorkflowStatusChange(item, value as WorkflowStatus)
                            }
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="h-9 w-full border-zinc-200/80 bg-white/85 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WORKFLOW_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
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
  );
}
