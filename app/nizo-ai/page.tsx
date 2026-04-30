"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  Brain,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  listEventLeads,
  listEvents,
  searchLeads,
  type EventLeadListItem,
  type EventSummaryItem,
  type LeadItem,
} from "@/lib/api";
import {
  parseNizoSearch,
  searchNizoEvents,
  searchNizoLeads,
  suggestNizoSearchTerms,
  type NizoParsedSearch,
  type NizoScoredEvent,
  type NizoScoredLead,
} from "@/lib/nizoAiSearch";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";

const RESULTS_PER_PAGE = 15;
const SCOPED_PROBE_LIMIT = 200;
const SCOPED_PROBE_MAX_ROWS = 1000;
const EVENT_KEY_SEARCH_LIMIT = 200;
const EVENT_KEY_SEARCH_MAX_ROWS = 1500;
const SEARCH_HISTORY_KEY = "nizo-ai-search-history";

const countryAliases: Array<[string, string]> = [
  ["qatar", "Qatar"],
  ["malaysia", "Malaysia"],
  ["angola", "Angola"],
  ["nigeria", "Nigeria"],
  ["saudi arabia", "Saudi Arabia"],
  ["ksa", "Saudi Arabia"],
  ["riyadh", "Saudi Arabia"],
  ["jeddah", "Saudi Arabia"],
  ["uae", "UAE"],
  ["dubai", "UAE"],
  ["abu dhabi", "UAE"],
  ["oman", "Oman"],
];

function text(value: unknown) {
  return String(value || "").trim();
}

function eventName(lead: LeadItem) {
  return text(lead.canonicalEventName) || text(lead.eventName) || text(lead.canonicalEventKey) || "Unknown event";
}

function leadSearchContext(lead: LeadItem) {
  return [
    lead.company,
    lead.title,
    lead.eventName,
    lead.canonicalEventName,
    lead.canonicalEventKey,
    lead.companyUrl,
  ]
    .map((value) => text(value).toLowerCase())
    .join(" ");
}

function leadCountry(lead: LeadItem) {
  const context = leadSearchContext(lead);
  const match = countryAliases.find(([signal]) => context.includes(signal));
  return match?.[1] || "";
}

function buildLeadShareText(lead: LeadItem, score?: number) {
  return [
    text(lead.employeeName) || "Unnamed lead",
    text(lead.title) || text(lead.company)
      ? `${text(lead.title) || "No title"}${text(lead.company) ? ` · ${text(lead.company)}` : ""}`
      : "",
    lead.email ? `Email: ${lead.email}` : "",
    lead.phone ? `Mobile: ${lead.phone}` : "",
    lead.linkedinUrl ? `LinkedIn: ${lead.linkedinUrl}` : "",
    lead.companyUrl ? `Company website: ${lead.companyUrl}` : "",
    `Event: ${eventName(lead)}`,
    typeof score === "number" ? `NizoAI score: ${score}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function LinkedinIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" />
    </svg>
  );
}

function mapEventLeadToLead(item: EventLeadListItem): LeadItem {
  return {
    id: item.id,
    batchId: "",
    employeeName: item.employeeName,
    title: item.title || "",
    company: item.company || null,
    email: item.email || null,
    phone: item.phone || null,
    linkedinUrl: item.linkedinUrl || null,
    companyUrl: item.companyUrl || null,
    contentEmailSubject: null,
    contentEmail: null,
    contentLinkedin: null,
    contentWhatsapp: null,
    eventName: item.eventName || item.canonicalEventName,
    canonicalEventKey: item.canonicalEventKey,
    canonicalEventName: item.canonicalEventName,
    leadIdentityKey: item.leadIdentityKey,
    workflowStatus: item.workflowStatus,
    workflowStatusLabel: item.workflowStatusLabel,
    approvalStatus: "approved",
    isSuppressed: item.isSuppressed,
    suppression: item.suppression,
    contactReadOnly: item.contactReadOnly,
    isManualLead: item.isManualLead,
    manualLeadAddedByUserId: item.manualLeadAddedByUserId,
    manualLeadAddedByUsername: item.manualLeadAddedByUsername,
    manualLeadAddedAt: item.manualLeadAddedAt,
  };
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value);
}

function expandTitleProbe(value: string) {
  const aliases: Record<string, string[]> = {
    ceo: ["ceo", "chief executive officer", "founder", "owner"],
    cfo: ["cfo", "chief financial officer"],
    coo: ["coo", "chief operating officer"],
    cto: ["cto", "chief technology officer"],
    vp: ["vp", "vice president"],
  };

  return aliases[value] || [value];
}

function normalizeForEventMatch(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function eventAliasesForLocation(location: string) {
  const aliases: Record<string, string[]> = {
    qatar: ["qatar"],
    malaysia: ["malaysia"],
    angola: ["angola"],
    nigeria: ["nigeria"],
    "saudi arabia": ["saudi arabia", "ksa", "riyadh", "jeddah"],
    riyadh: ["riyadh", "ksa", "saudi arabia"],
    jeddah: ["jeddah", "ksa", "saudi arabia"],
  };

  return aliases[location] || [location];
}

function fallbackEventMatchesByLocation(
  events: EventSummaryItem[],
  parsedSearch: NizoParsedSearch
): NizoScoredEvent[] {
  const locations = parsedSearch.intent.locations.flatMap(eventAliasesForLocation);
  if (!locations.length) return [];

  return events
    .map((event) => {
      const haystack = normalizeForEventMatch([
        event.canonicalEventKey,
        event.canonicalEventName,
        ...(event.relatedCampaignNames || []),
      ].join(" "));
      const matched = locations.filter((location) => haystack.includes(normalizeForEventMatch(location)));
      return {
        event,
        score: matched.length ? 100 + Number(event.leadCount || 0) / 100000 : 0,
        reasons: matched.map((location) => `event/location: ${location}`),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

function fallbackEventKeysByLocation(parsedSearch: NizoParsedSearch) {
  const map: Record<string, string[]> = {
    qatar: ["aimct-qatar-2026"],
    malaysia: ["aimct-malaysia-2026"],
    angola: ["aimct-angola-2026"],
    nigeria: ["aim-nigeria-2026"],
    "saudi arabia": ["aimct-ksa-2026", "stadium-2026"],
    riyadh: ["aimct-ksa-2026", "stadium-2026"],
    jeddah: ["aimct-ksa-2026", "stadium-2026"],
  };

  return uniqueValues(parsedSearch.intent.locations.flatMap((location) => map[location] || []));
}

export default function NizoAiPage() {
  const { persona, setPersona } = usePersona();
  const { isSuperAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const [eventsCache, setEventsCache] = useState<EventSummaryItem[]>([]);
  const [eventLeadCount, setEventLeadCount] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);
  const [results, setResults] = useState<NizoScoredLead[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchNote, setSearchNote] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) setRecentSearches(JSON.parse(saved).filter((item: unknown) => typeof item === "string").slice(0, 6));
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const rememberSearch = useCallback((value: string) => {
    setRecentSearches((current) => {
      const next = uniqueValues([value, ...current]).slice(0, 6);
      try {
        window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // Search history is optional; ranking should not depend on storage availability.
      }
      return next;
    });
  }, []);

  const loadSalesEvents = useCallback(async () => {
    if (eventsCache.length) return eventsCache;
    const response = await listEvents();
    const rows = Array.isArray(response.events) ? response.events : [];
    setEventsCache(rows);
    return rows;
  }, [eventsCache]);

  const buildLeadProbes = useCallback((value: string, parsedSearch: NizoParsedSearch, eventScoped: boolean) => {
    const { intent } = parsedSearch;

    if (eventScoped) {
      return uniqueValues([
        ...intent.titles.flatMap(expandTitleProbe),
        ...intent.companies,
        ...intent.keywords.filter(
          (keyword) => !intent.locations.includes(keyword) && !intent.industries.includes(keyword)
        ),
        intent.titles.length ? "" : value,
      ]).slice(0, 5);
    }

    return uniqueValues([
      value,
      ...intent.titles.flatMap(expandTitleProbe),
      ...intent.locations,
      ...intent.industries,
      ...intent.companies,
      ...intent.keywords.slice(0, 5),
      intent.titles.length && intent.locations.length ? `${intent.titles[0]} ${intent.locations[0]}` : "",
      intent.titles.length && intent.industries.length ? `${intent.titles[0]} ${intent.industries[0]}` : "",
    ]).slice(0, 8);
  }, []);

  const loadEventKeySearchLeads = useCallback(async (canonicalEventKey: string, probe: string) => {
    const rows: LeadItem[] = [];
    let offset = 0;
    let total = 0;
    let hasMore = true;

    while (hasMore && rows.length < EVENT_KEY_SEARCH_MAX_ROWS) {
      const response = await listEventLeads(canonicalEventKey, {
        limit: EVENT_KEY_SEARCH_LIMIT,
        offset,
        search: probe || undefined,
        includeManual: true,
      });
      const items = response.items || [];
      rows.push(...items.map(mapEventLeadToLead));
      total = Number(response.total || response.event?.leadCount || total || 0);
      offset += EVENT_KEY_SEARCH_LIMIT;
      hasMore = Boolean(response.hasMore) && items.length > 0;
    }

    return { rows, total };
  }, []);

  const loadCandidateSalesLeads = useCallback(async (value: string, parsedSearch: NizoParsedSearch) => {
    let events: EventSummaryItem[] = [];
    try {
      events = await loadSalesEvents();
    } catch {
      events = [];
    }

    const scoredEvents = searchNizoEvents(events, parsedSearch, value);
    const eventMatches = (scoredEvents.length ? scoredEvents : fallbackEventMatchesByLocation(events, parsedSearch)).slice(0, 6);
    const fallbackEventKeys = eventMatches.length ? [] : fallbackEventKeysByLocation(parsedSearch);
    const eventScoped = eventMatches.length > 0 || fallbackEventKeys.length > 0;
    const probes = buildLeadProbes(value, parsedSearch, eventScoped);
    const searchableProbes = probes.length ? probes : [""];

    const rowsById = new Map<string, LeadItem>();
    const scopedEventKeys = eventMatches.map((entry) => entry.event.canonicalEventKey);
    const eventKeys = scopedEventKeys.length ? scopedEventKeys : fallbackEventKeys.length ? fallbackEventKeys : [undefined];
    const scoped = eventKeys.some(Boolean);
    const loadedEventLeadCount = eventMatches.reduce((sum, entry) => sum + Number(entry.event.leadCount || 0), 0);

    if (scoped) {
      const eventResults = await Promise.all(
        eventKeys
          .filter(isNonEmptyString)
          .flatMap((canonicalEventKey) =>
            searchableProbes.map((probe) => loadEventKeySearchLeads(canonicalEventKey, probe))
          )
      );

      for (const result of eventResults) {
        for (const lead of result.rows) rowsById.set(lead.id, lead);
      }
    } else {
      await Promise.all(
        eventKeys.flatMap((canonicalEventKey) => searchableProbes.map(async (probe) => {
          try {
            const limit = SCOPED_PROBE_LIMIT;
            let offset = 0;
            let fetched = 0;
            let hasMore = true;

            while (hasMore && fetched < SCOPED_PROBE_MAX_ROWS) {
              const response = await searchLeads({
                search: probe,
                limit,
                offset,
                canonicalEventKey,
                sortBy: "relevance",
                sortDir: "desc",
              });
              const items = response.items || [];
              for (const lead of items) rowsById.set(lead.id, lead);

              fetched += items.length;
              offset += limit;
              hasMore = Boolean(response.hasMore) && items.length > 0;
            }
          } catch {
            // A failed probe should not block the other searches.
          }
        }))
      );
    }

    return {
      rows: Array.from(rowsById.values()),
      eventMatches,
      eventScopeCount: eventKeys.filter(Boolean).length,
      eventLeadCount: loadedEventLeadCount,
    };
  }, [buildLeadProbes, loadEventKeySearchLeads, loadSalesEvents]);

  const runSearch = async (nextQuery?: string) => {
    const value = (nextQuery ?? query).trim();
    if (!value) {
      toast.error("Type a search first");
      return;
    }

    setLoading(true);
    setSearchNote("");
    try {
      const parsedSearch = parseNizoSearch(value);
      const { rows, eventScopeCount, eventLeadCount: scopedEventLeadCount } = await loadCandidateSalesLeads(value, parsedSearch);
      const matches = searchNizoLeads(rows, parsedSearch, value);

      if (parsedSearch.intent.locations.length && eventScopeCount === 0) {
        setSearchNote("No matching event bucket found for that location, so NizoAI used the normal lead search.");
      }

      setQuery(value);
      setEventLeadCount(scopedEventLeadCount);
      setCandidateCount(rows.length);
      setResults(matches);
      setCurrentPage(1);
      setSelectedLeadId(matches[0]?.lead.id || "");
      setSearched(true);
      rememberSearch(value);
    } catch (error) {
      toast.error("Search failed", {
        description: error instanceof Error ? error.message : "Could not load sales leads.",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLeadDetails = async (lead: LeadItem, score: number) => {
    try {
      await navigator.clipboard.writeText(buildLeadShareText(lead, score));
      toast.success("Lead details copied");
    } catch {
      toast.error("Could not copy lead details");
    }
  };

  const downloadLeadDetails = (lead: LeadItem, score: number) => {
    try {
      const blob = new Blob([buildLeadShareText(lead, score)], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filenameBase = text(lead.employeeName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      link.href = url;
      link.download = `${filenameBase || "nizo-lead"}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Lead details downloaded");
    } catch {
      toast.error("Could not download lead details");
    }
  };

  const resultTitle = useMemo(() => {
    if (!searched) return "";
    if (results.length === 0) return "No matching leads";
    return `${results.length} matching lead${results.length === 1 ? "" : "s"}`;
  }, [results.length, searched]);
  const sortedResults = results;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedResults.length / RESULTS_PER_PAGE)),
    [sortedResults.length]
  );
  const paginatedResults = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * RESULTS_PER_PAGE;
    return sortedResults.slice(start, start + RESULTS_PER_PAGE);
  }, [currentPage, sortedResults, totalPages]);
  const searchSuggestions = useMemo(
    () =>
      suggestNizoSearchTerms(query, {
        recent: recentSearches,
        leads: sortedResults.slice(0, 50).map((entry) => entry.lead),
        events: eventsCache,
        limit: 6,
      }),
    [eventsCache, query, recentSearches, sortedResults]
  );
  const visiblePageNumbers = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);
  const showingFrom = sortedResults.length === 0 ? 0 : (Math.min(currentPage, totalPages) - 1) * RESULTS_PER_PAGE + 1;
  const showingTo = sortedResults.length === 0 ? 0 : Math.min(showingFrom + paginatedResults.length - 1, sortedResults.length);
  const resultMeta = useMemo(() => {
    if (!searched) return "";
    const parts = [];
    if (eventLeadCount) parts.push(`${eventLeadCount} event leads`);
    if (candidateCount) parts.push(`${candidateCount} candidates ranked`);
    if (sortedResults.length) parts.push(`showing ${showingFrom}-${showingTo} of ${sortedResults.length}`);
    return parts.join(" • ");
  }, [candidateCount, eventLeadCount, sortedResults.length, searched, showingFrom, showingTo]);

  if (persona !== "sales") {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-4">
        <Card className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">NizoAI is for Sales</h1>
          <p className="mt-2 text-sm text-zinc-500">Switch to Sales to search all sales leads.</p>
          {isSuperAdmin ? (
            <Button className="mt-5 btn-sidebar-noise" onClick={() => setPersona("sales")}>
              Switch to Sales
            </Button>
          ) : (
            <Link href="/dashboard">
              <Button className="mt-5 btn-sidebar-noise">Back</Button>
            </Link>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-3rem)] bg-transparent px-4 py-8 font-sans">
      <div className="mx-auto flex min-h-[52vh] max-w-4xl flex-col items-center justify-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center text-zinc-950">
          <Brain className="h-8 w-8" />
        </div>

        <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
          Find Sales Leads Faster
        </h1>

        <div className="mt-7 w-full rounded-3xl border border-zinc-200 bg-white p-3 shadow-[0_22px_44px_-34px_rgba(2,10,27,0.55)]">
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void runSearch();
              }
            }}
            placeholder="Search sales leads..."
            className="min-h-24 w-full resize-none rounded-2xl border-0 bg-transparent px-3 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />

          {searchSuggestions.length ? (
            <div className="mb-3 flex flex-wrap gap-2 px-1">
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void runSearch(suggestion)}
                  className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-sidebar hover:border-blue-200 hover:bg-blue-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                <Search className="h-3 w-3" />
                Fuzzy search
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                Sales leads
              </span>
            </div>

            <Button
              type="button"
              size="icon"
              className="h-9 w-9 rounded-full bg-sidebar text-white shadow-[0_12px_24px_-16px_rgba(20,90,204,0.9)] hover:bg-sidebar/90"
              disabled={loading}
              onClick={() => void runSearch()}
              aria-label="Search"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {recentSearches.length ? (
          <div className="mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
            {recentSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void runSearch(item)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {searched ? (
        <div className="mx-auto mt-3 w-full max-w-7xl">
          <div className="mb-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{resultTitle}</h2>
              <span className="text-xs font-medium text-zinc-500">{resultMeta}</span>
            </div>
          </div>
          {searchNote ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {searchNote}
            </div>
          ) : null}

          {results.length === 0 ? (
            <Card className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 shadow-sm">
              No matches. Try fewer words or a broader title.
            </Card>
          ) : (
            <Card className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="w-full overflow-x-auto">
                <table className="min-w-[920px] w-full">
                  <thead className="border-b border-zinc-200 bg-slate-50">
                    <tr>
                      <th className="w-[33%] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Lead</th>
                      <th className="w-[24%] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Country / Status</th>
                      <th className="w-[24%] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Contact</th>
                      <th className="w-[11%] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Score</th>
                      <th className="w-[8%] px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedResults.map(({ lead, score, relevance }) => {
                      const country = leadCountry(lead);

                      return (
                      <tr
                        key={lead.id}
                        className={`cursor-pointer align-middle transition-colors hover:bg-slate-50/80 ${
                          selectedLeadId === lead.id ? "bg-blue-50/45" : ""
                        }`}
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="min-w-0 pr-4">
                            <p className="truncate text-sm font-semibold leading-5 text-zinc-950">{text(lead.employeeName) || "Unnamed lead"}</p>
                            <p className="line-clamp-2 max-w-[24rem] text-xs leading-5 text-slate-500">
                              {text(lead.title) || "No title"}
                              {text(lead.company) ? <span> · {text(lead.company)}</span> : null}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            {country ? (
                              <span className="inline-flex h-5 items-center rounded-full bg-emerald-50 px-2 text-[11px] font-semibold leading-none text-emerald-700">
                                {country}
                              </span>
                            ) : null}
                            <span className="inline-flex h-5 items-center rounded-full bg-slate-100 px-2 text-[11px] font-semibold leading-none text-slate-600">
                              New
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 max-w-[22rem] text-[11px] leading-4 text-slate-400">
                            {eventName(lead)}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <div className="min-w-0 text-xs leading-4">
                            <p className={`truncate ${lead.email ? "text-zinc-800" : "text-slate-300"}`}>{lead.email || "No email"}</p>
                            <p className={`mt-0.5 truncate ${lead.phone ? "text-zinc-700" : "text-slate-300"}`}>
                              {lead.phone ? `Mobile: ${lead.phone}` : "No mobile"}
                            </p>
                            {lead.linkedinUrl ? (
                              <a
                                href={lead.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700"
                              >
                                <LinkedinIcon className="h-3 w-3" />
                                LinkedIn
                              </a>
                            ) : (
                              <p className="mt-0.5 text-[11px] text-slate-300">No LinkedIn</p>
                            )}
                            {lead.companyUrl ? (
                              <a
                                href={lead.companyUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                className="mt-0.5 block truncate text-[11px] font-medium text-slate-500 hover:text-sidebar"
                              >
                                Website: {lead.companyUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                              </a>
                            ) : (
                              <p className="mt-0.5 text-[11px] text-slate-300">No website</p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex min-w-[5.5rem] items-center gap-3">
                            <div className="h-1 w-9 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-sidebar"
                                style={{ width: `${Math.max(8, Math.min(100, relevance))}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-sidebar">{score}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void copyLeadDetails(lead, score);
                              }}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-sidebar"
                              aria-label="Copy lead details"
                              title="Copy lead details"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                downloadLeadDetails(lead, score);
                              }}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-sidebar"
                              aria-label="Download lead details"
                              title="Download lead details"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
                <span className="text-xs text-zinc-500">
                  Showing {showingFrom}-{showingTo} of {results.length} matches
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-zinc-500">Page {Math.min(currentPage, totalPages)} / {totalPages}</span>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="h-8 border-zinc-200 bg-white px-2 text-zinc-600 shadow-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>

                  {visiblePageNumbers.map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold transition-colors ${
                        pageNum === currentPage
                          ? "border-zinc-300 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 border-zinc-200 bg-white px-2 text-zinc-600 shadow-none disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
