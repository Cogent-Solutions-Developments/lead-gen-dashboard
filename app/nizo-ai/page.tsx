"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  Brain,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  Mail,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  findSimilarNizoLeads,
  searchNizoEvents,
  searchNizoLeads,
  sortNizoScoredLeads,
  type NizoSortMode,
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

const sortLabels: Record<NizoSortMode, string> = {
  best_match: "Best match",
  easiest: "Easiest to reach",
  seniority: "Seniority",
  freshest: "Not contacted",
};

function text(value: unknown) {
  return String(value || "").trim();
}

function eventName(lead: LeadItem) {
  return text(lead.canonicalEventName) || text(lead.eventName) || text(lead.canonicalEventKey) || "Unknown event";
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
  const [sortMode, setSortMode] = useState<NizoSortMode>("best_match");
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

  const resultTitle = useMemo(() => {
    if (!searched) return "";
    if (results.length === 0) return "No matching leads";
    return `${results.length} matching lead${results.length === 1 ? "" : "s"}`;
  }, [results.length, searched]);
  const sortedResults = useMemo(
    () => sortNizoScoredLeads(results, sortMode),
    [results, sortMode]
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedResults.length / RESULTS_PER_PAGE)),
    [sortedResults.length]
  );
  const paginatedResults = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * RESULTS_PER_PAGE;
    return sortedResults.slice(start, start + RESULTS_PER_PAGE);
  }, [currentPage, sortedResults, totalPages]);
  const visiblePageNumbers = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);
  const showingFrom = sortedResults.length === 0 ? 0 : (Math.min(currentPage, totalPages) - 1) * RESULTS_PER_PAGE + 1;
  const showingTo = sortedResults.length === 0 ? 0 : Math.min(showingFrom + paginatedResults.length - 1, sortedResults.length);
  const selectedLead = useMemo(
    () => sortedResults.find((entry) => entry.lead.id === selectedLeadId) || sortedResults[0] || null,
    [selectedLeadId, sortedResults]
  );
  const similarLeads = useMemo(
    () => (selectedLead ? findSimilarNizoLeads(selectedLead, sortedResults, 4) : []),
    [selectedLead, sortedResults]
  );
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
    <div className="min-h-[calc(100dvh-3rem)] overflow-y-auto bg-transparent px-4 py-8 font-sans">
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
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{resultTitle}</h2>
              <span className="text-xs font-medium text-zinc-500">{resultMeta}</span>
            </div>

            {results.length ? (
              <Select
                value={sortMode}
                onValueChange={(value) => {
                  setSortMode(value as NizoSortMode);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full border-zinc-200 bg-white text-xs font-semibold shadow-none sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {(Object.keys(sortLabels) as NizoSortMode[]).map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {sortLabels[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
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
            <>
            {selectedLead ? (
              <div className="mb-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
                <Card className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">{text(selectedLead.lead.employeeName) || "Selected lead"}</p>
                      <p className="mt-1 text-sm text-zinc-600">{text(selectedLead.lead.title) || "No title"}</p>
                      <p className="mt-1 text-xs text-zinc-500">{text(selectedLead.lead.company) || "No company"}</p>
                    </div>
                    <div className="min-w-32">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-600">
                        <span>Relevance</span>
                        <span>{selectedLead.score}/{selectedLead.maxScore}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-2 rounded-full bg-zinc-900"
                          style={{ width: `${Math.min(100, selectedLead.relevance)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {selectedLead.breakdown.slice(0, 6).map((item) => (
                      <div key={`${item.label}-${item.detail}`} className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-800">{item.label}</span>
                          <span className="text-xs font-semibold text-zinc-500">+{item.points}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-zinc-950">Similar leads</p>
                  <div className="mt-3 space-y-2">
                    {similarLeads.length ? similarLeads.map(({ entry, similarity }) => (
                      <button
                        key={entry.lead.id}
                        type="button"
                        onClick={() => setSelectedLeadId(entry.lead.id)}
                        className="block w-full rounded-lg border border-zinc-100 px-3 py-2 text-left hover:border-zinc-200 hover:bg-zinc-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-zinc-900">{text(entry.lead.employeeName) || "Unnamed lead"}</p>
                            <p className="mt-0.5 truncate text-xs text-zinc-500">{text(entry.lead.title) || "No title"}</p>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold text-zinc-400">{similarity}</span>
                        </div>
                      </button>
                    )) : (
                      <p className="text-xs text-zinc-500">No similar leads in this result set.</p>
                    )}
                  </div>
                </Card>
              </div>
            ) : null}

            <Card className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="w-full">
                <table className="w-full table-fixed">
                  <thead className="border-b border-zinc-100 bg-zinc-50/80">
                    <tr>
                      <th className="w-[36%] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Lead</th>
                      <th className="w-[28%] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Event</th>
                      <th className="w-[20%] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Contact</th>
                      <th className="w-[16%] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-100">
                    {paginatedResults.map(({ lead }) => (
                      <tr
                        key={lead.id}
                        className={`cursor-pointer align-top transition-colors hover:bg-zinc-50/70 ${
                          selectedLead?.lead.id === lead.id ? "bg-zinc-50" : ""
                        }`}
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        <td className="px-4 py-4">
                          <div className="pr-4">
                            <p className="text-sm font-semibold text-zinc-950">{text(lead.employeeName) || "Unnamed lead"}</p>
                            <p className="mt-1 text-sm text-zinc-600">{text(lead.title) || "No title"}</p>
                            <p className="mt-1 truncate text-xs text-zinc-500">{text(lead.company) || "No company"}</p>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="pr-4 text-sm leading-6 text-zinc-700">{eventName(lead)}</div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1 text-xs text-zinc-600">
                            <p className="truncate">{lead.email || "No email"}</p>
                            <p>{lead.phone || "No phone"}</p>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex min-w-[8.5rem] flex-nowrap items-center gap-2.5">
                            {lead.linkedinUrl ? (
                              <a
                                href={lead.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
                                aria-label="Open LinkedIn"
                                title="Open LinkedIn"
                              >
                                <UserRound className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                            {lead.companyUrl ? (
                              <a
                                href={lead.companyUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
                                aria-label="Open website"
                                title="Open website"
                              >
                                <Globe className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                            {lead.email ? (
                              <a
                                href={`mailto:${lead.email}`}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
                                aria-label="Send email"
                                title="Send email"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
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
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
