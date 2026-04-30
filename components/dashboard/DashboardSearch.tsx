"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  getRecentCampaigns,
  listEvents,
  searchLeads,
  type EventSummaryItem,
  type LeadItem,
  type RecentCampaign,
} from "@/lib/apiRouter";

type SearchResult =
  | {
      type: "lead";
      id: string;
      title: string;
      subtitle: string;
      meta: string;
      href: string;
    }
  | {
      type: "campaign";
      id: string;
      title: string;
      subtitle: string;
      meta: string;
      href: string;
    }
  | {
      type: "event";
      id: string;
      title: string;
      subtitle: string;
      meta: string;
      href: string;
    };

const SEARCH_FETCH_LIMIT = 100;

function compactText(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" · ");
}

function includesQuery(values: Array<string | number | null | undefined>, query: string) {
  const normalized = query.toLowerCase();
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalized));
}

function leadHref(lead: LeadItem) {
  const params = new URLSearchParams();
  params.set("lead", lead.id);

  if (lead.employeeName) params.set("search", lead.employeeName);
  if (lead.canonicalEventKey) params.set("event", lead.canonicalEventKey);

  return `/leads?${params.toString()}`;
}

function uniqueResults(results: SearchResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = `${result.type}:${result.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapLeadResult(lead: LeadItem): SearchResult {
  return {
    type: "lead",
    id: lead.id,
    title: lead.employeeName || "Unnamed lead",
    subtitle: compactText([lead.title, lead.company]) || "Lead record",
    meta: compactText([lead.email, lead.phone, lead.canonicalEventName || lead.eventName]) || "No contact detail",
    href: leadHref(lead),
  };
}

function mapCampaignResult(campaign: RecentCampaign): SearchResult {
  return {
    type: "campaign",
    id: campaign.id,
    title: campaign.name || campaign.canonicalEventName || "Untitled campaign",
    subtitle: compactText([campaign.canonicalEventName, campaign.status]) || "Campaign",
    meta: `${campaign.leadsCount || 0} leads`,
    href: `/campaigns/${campaign.id}`,
  };
}

function mapEventResult(event: EventSummaryItem): SearchResult {
  return {
    type: "event",
    id: event.canonicalEventKey,
    title: event.canonicalEventName || event.canonicalEventKey,
    subtitle: event.relatedCampaignNames.slice(0, 2).join(", ") || "Event lead sheet",
    meta: compactText([`${event.leadCount || 0} leads`, `${event.campaignCount || 0} campaigns`]),
    href: `/leads?event=${encodeURIComponent(event.canonicalEventKey)}`,
  };
}

export function DashboardSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const q = debouncedQuery;
    const requestId = ++requestRef.current;

    if (q.length < 2) {
      return;
    }

    void (async () => {
      setLoading(true);

      const [leadResponse, campaignResponse, eventResponse] = await Promise.allSettled([
        searchLeads({ search: q, limit: SEARCH_FETCH_LIMIT, offset: 0, sortBy: "relevance" }),
        getRecentCampaigns(SEARCH_FETCH_LIMIT),
        listEvents(),
      ]);

      if (requestId !== requestRef.current) return;

      const leadResults =
        leadResponse.status === "fulfilled"
          ? (leadResponse.value.items || []).map((lead) => mapLeadResult(lead))
          : [];

      const campaignResults =
        campaignResponse.status === "fulfilled"
          ? (campaignResponse.value.campaigns || [])
              .filter((campaign) =>
                includesQuery(
                  [
                    campaign.name,
                    campaign.canonicalEventName,
                    campaign.status,
                    campaign.campaignType,
                    campaign.campaignSource,
                  ],
                  q
                )
              )
              .map(mapCampaignResult)
          : [];

      const eventResults =
        eventResponse.status === "fulfilled"
          ? (eventResponse.value.events || [])
              .filter((event) =>
                includesQuery(
                  [
                    event.canonicalEventName,
                    event.canonicalEventKey,
                    event.relatedCampaignNames.join(" "),
                    event.leadCount,
                    event.campaignCount,
                  ],
                  q
                )
              )
              .map(mapEventResult)
          : [];

      setResults(uniqueResults([...leadResults, ...campaignResults, ...eventResults]));
      setLoading(false);
    })();
  }, [debouncedQuery]);

  const resultSections: Array<{ type: SearchResult["type"]; results: SearchResult[] }> = [
    { type: "lead" as const, results: results.filter((result) => result.type === "lead") },
    { type: "campaign" as const, results: results.filter((result) => result.type === "campaign") },
    { type: "event" as const, results: results.filter((result) => result.type === "event") },
  ].filter((section) => section.results.length > 0);

  return (
    <div className="relative">
      <div className="relative isolate flex h-12 items-center gap-2.5 overflow-hidden rounded-full border border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(248,251,255,0.9)_52%,rgba(239,246,255,0.84)_100%)] px-2 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.72),0_3px_8px_-7px_rgba(37,99,235,0.48),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(214,226,244,0.68)] backdrop-blur-[14px]">
        <div className="relative z-[2] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_7px_16px_-14px_rgba(15,23,42,0.8)]">
          <Search className="h-4.5 w-4.5" />
        </div>
        <div className="relative z-[2] min-w-0 flex-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sales..."
            className="h-9 w-full bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </div>
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="relative z-[2] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900"
            aria-label="Clear dashboard search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {query.trim().length >= 2 ? (
        <Card className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(44rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,251,255,0.94)_56%,rgba(240,246,255,0.9)_100%)] p-0 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.82),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[18px]">
          {loading ? (
            <div className="flex items-center gap-2 px-5 py-5 text-sm font-medium text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Searching sales data
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="flex items-center justify-between border-b border-slate-100/85 px-5 py-3.5">
                <span className="text-sm font-semibold text-slate-900">Search results</span>
                <span className="rounded-full border border-slate-200/80 bg-white/78 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  {results.length} found
                </span>
              </div>

              <div className="max-h-[30rem] overflow-y-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {resultSections.map((section) => {
                  return (
                    <section key={section.type} className="not-last:mb-3">
                      <div className="space-y-1">
                        {section.results.map((result) => (
                          <Link
                            key={`${result.type}-${result.id}`}
                            href={result.href}
                            className="group grid grid-cols-[minmax(0,1.35fr)_minmax(9rem,0.8fr)_auto] items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition-colors hover:border-slate-200/90 hover:bg-white/78"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-zinc-900">
                                {result.title}
                              </span>
                              <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                                {result.subtitle}
                              </span>
                            </span>
                            <span className="hidden truncate text-xs font-medium text-slate-500 sm:block">
                              {result.meta}
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-400 transition-colors group-hover:border-blue-100 group-hover:text-blue-700">
                              <ArrowUpRight className="h-4 w-4" />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-5 py-5 text-sm font-medium text-slate-500">No matching sales records found.</div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
