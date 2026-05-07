"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Genos } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
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

const genos = Genos({
  subsets: ["latin"],
  weight: ["300", "400"],
});

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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
    </svg>
  );
}

function WebsiteIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2z" />
      <path
        fill="white"
        transform="translate(6, 6) scale(0.5)"
        d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
      />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2z" />
      <g transform="translate(6, 6) scale(0.5)">
        <rect x="2" y="4" width="20" height="16" rx="2" fill="white" />
        <path
          d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
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
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchNote, setSearchNote] = useState("");

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
      setSearched(true);
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
        recent: [],
        leads: sortedResults.slice(0, 50).map((entry) => entry.lead),
        events: eventsCache,
        limit: 6,
      }),
    [eventsCache, query, sortedResults]
  );
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
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Card className="max-w-md rounded-[2.5rem] border-0 bg-white p-10 text-center shadow-2xl ring-1 ring-black/5">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-400">
              <Brain className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Nizo AI for Sales</h1>
            <p className="mt-4 text-zinc-500 font-light leading-relaxed">
              This intelligence engine is reserved for Sales. Switch your identity to begin searching.
            </p>
            {isSuperAdmin ? (
              <Button 
                className="mt-8 btn-sidebar-noise w-full h-12 rounded-2xl text-base" 
                onClick={() => setPersona("sales")}
              >
                Switch to Sales
              </Button>
            ) : (
              <Link href="/dashboard" className="block mt-8">
                <Button className="w-full h-12 rounded-2xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-none">
                  Return to Dashboard
                </Button>
              </Link>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100dvh-3rem)] overflow-y-auto bg-[#f7f7f5] font-sans text-zinc-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-20 h-72 w-72 rounded-full bg-blue-500/6 blur-3xl" />
        <div className="absolute right-[8%] top-1/3 h-80 w-80 rounded-full bg-zinc-950/5 blur-3xl" />
      </div>

      <div className="relative flex min-h-[calc(100dvh-3rem)] w-full flex-col p-1">
        <header className="flex shrink-0 items-start justify-between gap-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-950"
            >
              <ArrowLeft className="mr-2 h-3 w-3" />
              Return to dashboard
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 border-l border-zinc-200 pl-8">
            <div>
              <p className="text-xs font-medium text-zinc-400">Candidates</p>
              <p className="mt-1 text-2xl font-light tabular-nums tracking-tight text-zinc-950">
                {candidateCount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Matched</p>
              <p className="mt-1 text-2xl font-light tabular-nums tracking-tight text-zinc-950">
                {results.length.toLocaleString()}
              </p>
            </div>
          </div>
        </header>

        <section className={`${searched ? "py-9" : "grid flex-1 place-items-center pb-20"} transition-all duration-500`}>
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className={`mx-auto w-full text-center ${searched ? "max-w-4xl" : "max-w-5xl"}`}
          >
            <AnimatePresence initial={false}>
              {!searched ? (
                <motion.div
                  key="nizo-ai-intro"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-9"
                >
                  <div className="flex items-end justify-center gap-3">
                    <h1 className={`${genos.className} text-6xl font-light leading-none tracking-[-0.055em] text-zinc-950 2xl:text-7xl`}>
                      NizoAI
                    </h1>
                    <Brain strokeWidth={1.2} className="mb-1 h-11 w-11 text-zinc-950 2xl:h-13 2xl:w-13" />
                  </div>
                  <p className="mx-auto mt-5 max-w-xl text-lg font-light leading-relaxed text-zinc-500">
                    Ask for the exact prospects you need. NizoAI ranks the sales workspace.
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div
              layout
              className={`relative mx-auto rounded-full border border-white/70 bg-white/72 px-4 py-1.5 text-left shadow-[0_34px_100px_-68px_rgba(2,10,27,0.62)] ring-1 ring-zinc-950/5 backdrop-blur-2xl transition-colors focus-within:border-zinc-300 ${
                searched ? "max-w-2xl" : "max-w-[46rem]"
              }`}
            >
              <Search className="absolute left-6 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" />
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder="Search leads, regions, titles, or campaigns..."
                rows={1}
                className="block min-h-10 w-full resize-none overflow-hidden border-0 bg-transparent py-2 pl-10 pr-14 text-center text-[clamp(1rem,1.28vw,1.45rem)] font-light leading-tight tracking-[-0.035em] text-zinc-950 outline-none placeholder:text-zinc-300"
              />
              <Button
                type="button"
                size="icon"
                className="absolute right-3.5 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-zinc-950 text-white shadow-none transition-colors hover:bg-blue-600"
                disabled={loading}
                onClick={() => void runSearch()}
                aria-label="Run AI Search"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
              </Button>
            </motion.div>

            <AnimatePresence>
              {searchSuggestions.length ? (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2 overflow-hidden"
                >
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void runSearch(suggestion)}
                      className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white/70 px-3.5 text-xs font-medium text-zinc-500 backdrop-blur-xl transition-colors hover:border-blue-600 hover:text-blue-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>

          </motion.div>
        </section>

      <div className="mb-20 mt-0 w-full">
        {searched ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-light tracking-[-0.04em] text-zinc-950">{resultTitle}</h2>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-sm font-light text-zinc-400">{resultMeta}</span>
                  {searchNote ? (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                      Note
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {searchNote ? (
              <div className="mb-8 rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-sm text-amber-800 backdrop-blur-sm">
                <p className="font-medium">Search insight: <span className="font-normal opacity-80">{searchNote}</span></p>
              </div>
            ) : null}

            {results.length === 0 ? (
              <div className="border-y border-zinc-200 p-20 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-300">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-light tracking-[-0.03em] text-zinc-950">Refine your search</h3>
                <p className="mt-2 font-light text-zinc-500">Try using fewer keywords or a broader industry title.</p>
              </div>
            ) : (
              <div className="overflow-hidden border-y border-zinc-200">
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[56rem] border-b border-zinc-200 px-8 py-5">
                    <div className="grid grid-cols-[minmax(24rem,1fr)_minmax(18rem,0.85fr)_12rem_8rem] text-sm font-light text-zinc-500">
                      <div>Identity details</div>
                      <div>Contact channels</div>
                      <div>Match Intelligence</div>
                      <div className="text-right">Action</div>
                    </div>
                  </div>

                  <div className="divide-y divide-zinc-200">
                    {paginatedResults.map(({ lead, score, relevance }) => {
                      const country = leadCountry(lead);

                      return (
                        <div
                          key={lead.id}
                          className="group grid grid-cols-[minmax(24rem,1fr)_minmax(18rem,0.85fr)_12rem_8rem] items-center px-8 py-6 transition-colors hover:bg-zinc-50/60"
                        >
                          <div className="pr-8">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-3">
                                <span className="text-xl font-light tracking-tight text-zinc-950">{text(lead.employeeName) || "Unnamed Lead"}</span>
                                {lead.isManualLead && (
                                  <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">Manual</span>
                                )}
                              </div>
                              <span className="max-w-sm text-base font-light leading-relaxed text-zinc-700">{text(lead.title) || "-"}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                {text(lead.company) && (
                                  <span className="text-xs font-medium text-zinc-400">{text(lead.company)}</span>
                                )}
                                {country && (
                                  <>
                                    <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                    <span className="text-xs font-medium text-emerald-600/70">{country}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pr-8">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                {lead.email ? (
                                  <>
                                    <EmailIcon className="h-3.5 w-3.5 text-[#EF4444]" />
                                    <span className="text-sm font-light tracking-tight text-zinc-700">{lead.email}</span>
                                  </>
                                ) : (
                                  <span className="text-sm font-light tracking-tight text-zinc-400">No email</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {lead.phone ? (
                                  <>
                                    <PhoneIcon className="h-3.5 w-3.5 text-[#22C55E]" />
                                    <span className="text-sm font-light text-zinc-500">{lead.phone}</span>
                                  </>
                                ) : (
                                  <span className="text-sm font-light text-zinc-400">No phone</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
                                {lead.linkedinUrl && (
                                  <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                                    <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
                                    <span className="text-xs font-medium">LinkedIn</span>
                                  </a>
                                )}
                                {lead.companyUrl && (
                                  <a href={lead.companyUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                                    <WebsiteIcon className="h-3.5 w-3.5 text-zinc-950" />
                                    <span className="text-xs font-medium">Website</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-4">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.max(8, Math.min(100, relevance))}%` }}
                                  className="h-full bg-blue-600"
                                />
                              </div>
                              <span className="text-sm font-bold text-zinc-900">{score}</span>
                            </div>
                            <p className="mt-2 text-xs font-medium text-zinc-950">{eventName(lead)}</p>
                          </div>

                          <div className="text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void copyLeadDetails(lead, score);
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-blue-600 hover:text-white hover:ring-blue-600"
                                title="Copy Intelligence"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  downloadLeadDetails(lead, score);
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-blue-600 hover:text-white hover:ring-blue-600"
                                title="Download Report"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-200 px-8 py-8">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-400">Intelligence range</p>
                    <p className="text-lg font-light tabular-nums tracking-tight text-zinc-950">
                      {showingFrom}—{showingTo}
                      <span className="ml-2 text-sm text-zinc-400 font-normal">of {results.length.toLocaleString()} records</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      aria-label="Previous page"
                      className="h-11 w-11 rounded-full border border-zinc-200 bg-white p-0 text-zinc-500 shadow-none transition-all hover:border-zinc-900 hover:bg-white hover:text-zinc-950 disabled:opacity-30"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Next page"
                      className="h-11 w-11 rounded-full border border-zinc-950 bg-transparent p-0 text-zinc-950 shadow-none transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:border-zinc-200 disabled:text-zinc-300 disabled:opacity-100"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </div>
    </div>
    </div>
  );
}
