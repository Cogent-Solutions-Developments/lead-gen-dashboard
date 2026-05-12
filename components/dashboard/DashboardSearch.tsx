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
      <div className="relative flex h-11 items-center gap-5 rounded-full border border-zinc-300 bg-white px-4 transition-colors focus-within:border-zinc-900">
        <Search className="h-4 w-4 text-zinc-400" />
        <div className="min-w-0 flex-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search intelligence..."
            className="h-9 w-full bg-transparent text-sm font-light tracking-tight text-zinc-950 outline-none placeholder:text-zinc-300"
          />
        </div>
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-zinc-950"
            aria-label="Clear dashboard search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {query.trim().length >= 2 ? (
        <Card className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(44rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-300 bg-white p-0 shadow-[0_32px_80px_-48px_rgba(2,10,27,0.65)]">
          {loading ? (
            <div className="flex items-center gap-3 px-6 py-8 text-sm font-light text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching intelligence registry
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Search results</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {results.length} found
                </span>
              </div>

              <div className="max-h-[30rem] overflow-y-auto px-2 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {resultSections.map((section) => {
                  return (
                    <section key={section.type} className="not-last:mb-2">
                      <div className="space-y-0.5">
                        {section.results.map((result) => (
                          <Link
                            key={`${result.type}-${result.id}`}
                            href={result.href}
                            className="group grid grid-cols-[minmax(0,1.35fr)_minmax(9rem,0.8fr)_auto] items-center gap-6 rounded-xl border border-transparent px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50/50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-zinc-950 group-hover:text-blue-700">
                                {result.title}
                              </span>
                              <span className="mt-0.5 block truncate text-xs font-light text-zinc-500">
                                {result.subtitle}
                              </span>
                            </span>
                            <span className="hidden truncate text-[11px] font-medium text-zinc-400 sm:block">
                              {result.meta}
                            </span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-100 bg-white text-zinc-400 transition-all group-hover:border-zinc-900 group-hover:bg-zinc-950 group-hover:text-white">
                              <ArrowUpRight className="h-4 w-4" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-6 py-8 text-sm font-light text-zinc-400">No matching intelligence found.</div>
          )}
        </Card>
      ) : null}
    </div>
  );
}