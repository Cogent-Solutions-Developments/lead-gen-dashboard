"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
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
  Loader2,
  Search,
  FileUp,
  X,
  ExternalLink,
  UploadCloud,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { getApiKeyClient } from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";

const GET_ALL_LEADS_ENDPOINT = "/api/all/leads";
const UPLOAD_ENDPOINT = "/api/leads/uploads";
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;

type PresenceFilter = "all" | "yes" | "no";
type SortBy =
  | "relevance"
  | "name_asc"
  | "name_desc"
  | "company_asc"
  | "company_desc"
  | "event_asc"
  | "position_asc";

interface Lead {
  id: string;
  eventName: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;
}

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
  </svg>
);

function asText(value: unknown) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function hasValue(value: string) {
  return value.trim().length > 0;
}

function normalizePhone(value: string) {
  return value.toLowerCase().replaceAll(/\s+/g, "").replaceAll(/[()-]/g, "");
}

function formatEventLabel(raw: string) {
  const cleaned = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Unknown Event";

  const acronyms = new Set(["aim", "aimct", "mict", "gcc", "ksa", "uae", "uk", "us", "api", "icp"]);

  return cleaned
    .split(" ")
    .map((token) => {
      const lower = token.toLowerCase();

      if (/^\d+$/.test(token) || /^\d+(st|nd|rd|th)$/i.test(token)) return token;
      if (acronyms.has(lower)) return lower.toUpperCase();
      if (/^[A-Z0-9]+$/.test(token)) return token;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function positionBucket(titleRaw: string): string {
  const t = (titleRaw || "").toLowerCase();

  if (/\bchief executive\b|\bceo\b/.test(t)) return "CEO";
  if (/\bchief technology\b|\bcto\b/.test(t)) return "CTO";
  if (/\bchief information\b|\bcio\b/.test(t)) return "CIO";
  if (/\bchief operating\b|\bcoo\b/.test(t)) return "COO";
  if (/\bchief financial\b|\bcfo\b/.test(t)) return "CFO";
  if (/\bchief marketing\b|\bcmo\b/.test(t)) return "CMO";
  if (/\bchief revenue\b|\bcro\b/.test(t)) return "CRO";
  if (/\bchief security\b|\bcso\b/.test(t)) return "CSO";
  if (/\bchief (?:product|commercial)\b|\bcpo\b|\bcco\b/.test(t)) return "Chief";

  if (/\bvp\b|\bvice president\b/.test(t)) return "VP";
  if (/\bdirector\b/.test(t)) return "Director";
  if (/\bhead of\b/.test(t)) return "Head";
  if (/\bmanager\b/.test(t)) return "Manager";
  if (/\blead\b/.test(t)) return "Lead";

  if (!t.trim()) return "Unknown";
  return "Other";
}

function scoreLead(lead: Lead, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const name = lead.employeeName.toLowerCase();
  const title = lead.title.toLowerCase();
  const company = lead.company.toLowerCase();
  const email = lead.email.toLowerCase();
  const phone = lead.phone.toLowerCase();
  const eventName = lead.eventName.toLowerCase();
  const linkedin = lead.linkedinUrl.toLowerCase();
  const website = lead.companyUrl.toLowerCase();
  const id = lead.id.toLowerCase();

  let score = 0;

  const addFieldScore = (field: string, base: number) => {
    if (!field) return;
    if (field === q) score += base + 120;
    else if (field.startsWith(q)) score += base + 80;
    else if (field.includes(q)) score += base + 30;

    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      let hits = 0;
      for (const tok of tokens) if (field.includes(tok)) hits += 1;
      if (hits) score += base + hits * 12;
    }
  };

  addFieldScore(name, 140);
  addFieldScore(title, 120);
  addFieldScore(company, 100);
  addFieldScore(eventName, 90);
  addFieldScore(email, 80);
  addFieldScore(phone, 70);
  addFieldScore(linkedin, 40);
  addFieldScore(website, 40);
  addFieldScore(id, 25);

  return score;
}

function matchesPresence(value: string, filter: PresenceFilter) {
  if (filter === "all") return true;
  const present = hasValue(value);
  return filter === "yes" ? present : !present;
}

function sortLeads(rows: Lead[], sortBy: SortBy) {
  const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
  const sorted = [...rows];

  switch (sortBy) {
    case "name_asc":
      sorted.sort((a, b) => collator.compare(a.employeeName || "", b.employeeName || ""));
      break;
    case "name_desc":
      sorted.sort((a, b) => collator.compare(b.employeeName || "", a.employeeName || ""));
      break;
    case "company_asc":
      sorted.sort((a, b) => collator.compare(a.company || "", b.company || ""));
      break;
    case "company_desc":
      sorted.sort((a, b) => collator.compare(b.company || "", a.company || ""));
      break;
    case "event_asc":
      sorted.sort((a, b) => collator.compare(a.eventName || "", b.eventName || ""));
      break;
    case "position_asc":
      sorted.sort((a, b) => collator.compare(positionBucket(a.title), positionBucket(b.title)));
      break;
    default:
      sorted.sort((a, b) => collator.compare(a.employeeName || "", b.employeeName || ""));
      break;
  }

  return sorted;
}

export default function TotalLeads() {
  const { persona } = usePersona();
  const api = useMemo(() => getApiKeyClient(persona), [persona]);

  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [q, setQ] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("relevance");

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [eventTextFilter, setEventTextFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [hasEmailFilter, setHasEmailFilter] = useState<PresenceFilter>("all");
  const [hasPhoneFilter, setHasPhoneFilter] = useState<PresenceFilter>("all");
  const [hasLinkedinFilter, setHasLinkedinFilter] = useState<PresenceFilter>("all");
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState<PresenceFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const clearAdvancedFilters = useCallback(() => {
    setNameFilter("");
    setJobTitleFilter("");
    setCompanyFilter("");
    setEventTextFilter("");
    setDomainFilter("");
    setPhoneFilter("");
    setHasEmailFilter("all");
    setHasPhoneFilter("all");
    setHasLinkedinFilter("all");
    setHasWebsiteFilter("all");
  }, []);

  const resetFilters = useCallback(() => {
    setQ("");
    setEventFilter("all");
    setPositionFilter("all");
    setSortBy("relevance");
    clearAdvancedFilters();
  }, [clearAdvancedFilters]);

  const fetchAllLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(GET_ALL_LEADS_ENDPOINT);
      const raw = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.leads) ? res.data.leads : [];

      const mapped: Lead[] = raw.map((x: Record<string, unknown>) => ({
        id: asText(x.id),
        eventName:
          asText(x.eventName) ||
          asText(x.event) ||
          asText(x.campaignName) ||
          asText(x.icpName) ||
          asText(x.icpPreview) ||
          "Unknown Event",
        employeeName: asText(x.employeeName) || asText(x.employee_name),
        title: asText(x.title),
        company: asText(x.company) || asText(x.companyName),
        email: asText(x.email),
        phone: asText(x.phone),
        linkedinUrl: asText(x.linkedinUrl) || asText(x.linkedin_url),
        companyUrl: asText(x.companyUrl) || asText(x.company_url),
      }));

      setLeads(mapped);
    } catch (e: unknown) {
      toast.error("Failed to load leads", {
        description: e instanceof Error ? e.message : "Could not fetch leads.",
      });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void fetchAllLeads();
  }, [persona, fetchAllLeads]);

  const eventOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.eventName.trim()) set.add(l.eventName.trim());
    return Array.from(set)
      .map((value) => ({ value, label: formatEventLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [leads]);

  const positionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) set.add(positionBucket(l.title));
    const arr = Array.from(set);

    const preferred = [
      "CEO",
      "CTO",
      "CIO",
      "COO",
      "CFO",
      "CMO",
      "Chief",
      "VP",
      "Director",
      "Head",
      "Manager",
      "Lead",
      "Other",
      "Unknown",
    ];

    return preferred.filter((p) => arr.includes(p)).concat(arr.filter((x) => !preferred.includes(x)).sort());
  }, [leads]);
  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (nameFilter.trim()) count += 1;
    if (jobTitleFilter.trim()) count += 1;
    if (companyFilter.trim()) count += 1;
    if (eventTextFilter.trim()) count += 1;
    if (domainFilter.trim()) count += 1;
    if (phoneFilter.trim()) count += 1;
    if (hasEmailFilter !== "all") count += 1;
    if (hasPhoneFilter !== "all") count += 1;
    if (hasLinkedinFilter !== "all") count += 1;
    if (hasWebsiteFilter !== "all") count += 1;
    return count;
  }, [
    nameFilter,
    jobTitleFilter,
    companyFilter,
    eventTextFilter,
    domainFilter,
    phoneFilter,
    hasEmailFilter,
    hasPhoneFilter,
    hasLinkedinFilter,
    hasWebsiteFilter,
  ]);

  const filteredLeads = useMemo(() => {
    const query = q.trim().toLowerCase();
    const nameNeedle = nameFilter.trim().toLowerCase();
    const jobTitleNeedle = jobTitleFilter.trim().toLowerCase();
    const companyNeedle = companyFilter.trim().toLowerCase();
    const eventNeedle = eventTextFilter.trim().toLowerCase();
    const domainNeedle = domainFilter.trim().toLowerCase();
    const phoneNeedle = normalizePhone(phoneFilter.trim());

    const scoped = leads.filter((lead) => {
      const eventName = lead.eventName.toLowerCase();
      const name = lead.employeeName.toLowerCase();
      const title = lead.title.toLowerCase();
      const company = lead.company.toLowerCase();
      const email = lead.email.toLowerCase();
      const phone = lead.phone.toLowerCase();
      const website = lead.companyUrl.toLowerCase();

      if (eventFilter !== "all" && lead.eventName !== eventFilter) return false;
      if (positionFilter !== "all" && positionBucket(lead.title) !== positionFilter) return false;

      if (nameNeedle && !name.includes(nameNeedle)) return false;
      if (jobTitleNeedle && !title.includes(jobTitleNeedle)) return false;
      if (companyNeedle && !company.includes(companyNeedle)) return false;
      if (eventNeedle && !eventName.includes(eventNeedle)) return false;

      if (domainNeedle && !`${email} ${website}`.includes(domainNeedle)) return false;
      if (phoneNeedle && !normalizePhone(phone).includes(phoneNeedle)) return false;

      if (!matchesPresence(lead.email, hasEmailFilter)) return false;
      if (!matchesPresence(lead.phone, hasPhoneFilter)) return false;
      if (!matchesPresence(lead.linkedinUrl, hasLinkedinFilter)) return false;
      if (!matchesPresence(lead.companyUrl, hasWebsiteFilter)) return false;
      if (!query) return true;

      return scoreLead(lead, query) > 0;
    });

    if (!query) {
      if (sortBy === "relevance") return sortLeads(scoped, "name_asc");
      return sortLeads(scoped, sortBy);
    }

    if (sortBy === "relevance") {
      return scoped
        .map((lead) => ({ lead, score: scoreLead(lead, query) }))
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.lead);
    }

    return sortLeads(scoped, sortBy);
  }, [
    leads,
    q,
    eventFilter,
    positionFilter,
    sortBy,
    nameFilter,
    jobTitleFilter,
    companyFilter,
    eventTextFilter,
    domainFilter,
    phoneFilter,
    hasEmailFilter,
    hasPhoneFilter,
    hasLinkedinFilter,
    hasWebsiteFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage));

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const visiblePageNumbers = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (eventFilter !== "all") count += 1;
    if (positionFilter !== "all") count += 1;
    if (q.trim()) count += 1;
    count += advancedFilterCount;
    return count;
  }, [eventFilter, positionFilter, q, advancedFilterCount]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    q,
    eventFilter,
    positionFilter,
    sortBy,
    nameFilter,
    jobTitleFilter,
    companyFilter,
    eventTextFilter,
    domainFilter,
    phoneFilter,
    hasEmailFilter,
    hasPhoneFilter,
    hasLinkedinFilter,
    hasWebsiteFilter,
    itemsPerPage,
  ]);

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.isArray(files) ? files : Array.from(files);
    if (!arr.length) return;

    setSelectedFiles((prev) => {
      const map = new Map<string, File>();
      for (const f of prev) map.set(`${f.name}-${f.size}`, f);
      for (const f of arr) map.set(`${f.name}-${f.size}`, f);
      return Array.from(map.values());
    });
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadSelectedFiles = useCallback(async () => {
    if (!selectedFiles.length) {
      toast.info("Select files to upload");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      selectedFiles.forEach((f) => form.append("files", f));

      await api.post(UPLOAD_ENDPOINT, form);

      toast.success("Uploaded", { description: `${selectedFiles.length} file(s) uploaded` });
      setSelectedFiles([]);
      setUploadOpen(false);
      await fetchAllLeads();
    } catch (e: unknown) {
      toast.error("Upload failed", {
        description: e instanceof Error ? e.message : "Upload request failed.",
      });
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, api, fetchAllLeads]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const showingFrom = filteredLeads.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = filteredLeads.length === 0 ? 0 : Math.min(currentPage * itemsPerPage, filteredLeads.length);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="font-sans flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1">
      <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-100/90 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Leads Intelligence</h1>
          <p className="mt-1 text-sm text-zinc-500">Apollo-style lead search with deep filters and fast pagination.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void fetchAllLeads()} className="h-10 border-zinc-200 text-zinc-700 hover:bg-zinc-50">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="mt-3 shrink-0 overflow-hidden rounded-xl border border-zinc-200/85 bg-white/70 shadow-none">
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search anything: name, title, company, event, email, phone, domain..."
                className="h-9 border-zinc-200/85 bg-white/90 pl-8 text-sm"
              />
            </div>

            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger size="sm" className="h-9 min-w-[10rem] border-zinc-200/80 bg-white/90 text-xs font-semibold shadow-none">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent align="end" className="border-zinc-200 bg-white/96 backdrop-blur-[10px]">
                <SelectItem value="all">All Events</SelectItem>
                {eventOptions.map((eventOption) => (
                  <SelectItem key={eventOption.value} value={eventOption.value}>
                    {eventOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger size="sm" className="h-9 min-w-[8rem] border-zinc-200/80 bg-white/90 text-xs font-semibold shadow-none">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent align="end" className="border-zinc-200 bg-white/96 backdrop-blur-[10px]">
                <SelectItem value="all">All Positions</SelectItem>
                {positionOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger size="sm" className="h-9 min-w-[8.5rem] border-zinc-200/80 bg-white/90 text-xs font-semibold shadow-none">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent align="end" className="border-zinc-200 bg-white/96 backdrop-blur-[10px]">
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="company_asc">Company A-Z</SelectItem>
                <SelectItem value="company_desc">Company Z-A</SelectItem>
                <SelectItem value="event_asc">Event A-Z</SelectItem>
                <SelectItem value="position_asc">Position</SelectItem>
              </SelectContent>
            </Select>

            <Button type="button" variant="outline" onClick={() => setIsAdvancedOpen((prev) => !prev)} className="h-9 border-zinc-200 text-zinc-700">
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Filters
              {advancedFilterCount > 0 ? <span className="ml-1 text-[10px]">({advancedFilterCount})</span> : null}
            </Button>

            <Button type="button" variant="outline" onClick={resetFilters} className="h-9 border-zinc-200 text-zinc-700">
              <X className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          {isAdvancedOpen && (
            <div className="mt-3 rounded-xl border border-zinc-200/85 bg-white p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Name</label>
                  <Input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="Contains..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Job Title</label>
                  <Input value={jobTitleFilter} onChange={(e) => setJobTitleFilter(e.target.value)} placeholder="Contains..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Company</label>
                  <Input value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} placeholder="Contains..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Event</label>
                  <Input value={eventTextFilter} onChange={(e) => setEventTextFilter(e.target.value)} placeholder="Contains..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Domain</label>
                  <Input value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} placeholder=".ae, .sa, company.com" className="h-8 text-xs" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Phone Contains</label>
                  <Input value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} placeholder="+971, 555..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Has Email</label>
                  <Select value={hasEmailFilter} onValueChange={(v: PresenceFilter) => setHasEmailFilter(v)}>
                    <SelectTrigger size="sm" className="h-8 text-xs shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Has Phone</label>
                  <Select value={hasPhoneFilter} onValueChange={(v: PresenceFilter) => setHasPhoneFilter(v)}>
                    <SelectTrigger size="sm" className="h-8 text-xs shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Has LinkedIn</label>
                  <Select value={hasLinkedinFilter} onValueChange={(v: PresenceFilter) => setHasLinkedinFilter(v)}>
                    <SelectTrigger size="sm" className="h-8 text-xs shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Has Website</label>
                  <Select value={hasWebsiteFilter} onValueChange={(v: PresenceFilter) => setHasWebsiteFilter(v)}>
                    <SelectTrigger size="sm" className="h-8 text-xs shadow-none"><SelectValue /></SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-200/80 pt-2.5">
                <p className="text-[11px] text-zinc-500">
                  {advancedFilterCount > 0 ? `${advancedFilterCount} advanced filters active` : "No advanced filters active"}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="outline" onClick={clearAdvancedFilters} className="h-7 text-[11px]">Clear advanced</Button>
                  <Button type="button" variant="outline" onClick={() => setIsAdvancedOpen(false)} className="h-7 text-[11px]">Done</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="relative isolate mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200/85 bg-white/70 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100/85 bg-white/45 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Lead Explorer</h2>
            {activeFilterCount > 0 ? (
              <Badge className="rounded-full border border-zinc-200/80 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 shadow-none">
                {activeFilterCount} active
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="rounded-md border border-zinc-200/80 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
              Total {leads.length}
            </Badge>
            <Badge className="rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 shadow-none">
              Filtered {filteredLeads.length}
            </Badge>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 pb-2 pt-2">
          <table className="min-w-[1100px] w-full">
            <thead className="border-b border-zinc-100/85 bg-white/70">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Event</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Name</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Position</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Company</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Email</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Phone</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Links</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100/70">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-zinc-500">
                    No leads match the current filter combination.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((item) => (
                  <tr key={item.id} className="group transition-colors hover:bg-white/46">
                    <td className="px-3 py-3 align-top">
                      <span className="line-clamp-2 text-sm text-zinc-700">
                        {item.eventName ? formatEventLabel(item.eventName) : "-"}
                      </span>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="block text-sm font-semibold text-zinc-900">{item.employeeName || "-"}</span>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="line-clamp-2 text-sm text-zinc-700">{item.title || "-"}</span>
                      <span className="mt-0.5 block text-[11px] text-zinc-400">{positionBucket(item.title)}</span>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="block text-sm font-semibold text-zinc-900">{item.company || "-"}</span>
                      {item.companyUrl ? (
                        <a
                          href={item.companyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 block w-fit max-w-[20rem] truncate text-xs text-zinc-400 hover:text-zinc-600 hover:underline"
                          title={item.companyUrl}
                        >
                          {item.companyUrl}
                        </a>
                      ) : null}
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="font-mono text-xs text-zinc-600">{item.email || "-"}</span>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <span className="text-xs text-zinc-500">{item.phone || "-"}</span>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center gap-3">
                        {item.linkedinUrl ? (
                          <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900" title="LinkedIn">
                            <LinkedInIcon className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-zinc-200">
                            <LinkedInIcon className="h-4 w-4" />
                          </span>
                        )}

                        {item.companyUrl ? (
                          <a href={item.companyUrl} target="_blank" rel="noreferrer" className="text-zinc-400 transition-colors hover:text-zinc-900" title="Website">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-zinc-200">
                            <ExternalLink className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLeads.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100/85 bg-white/38 px-4 py-3">
            <span className="text-xs text-zinc-500">
              Showing {showingFrom}-{showingTo} of {filteredLeads.length} leads
            </span>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="inline-flex items-center gap-2 rounded-md border border-zinc-200/80 bg-white/82 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600">
                <span>Rows per page</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => {
                    const next = Number(value);
                    if (!Number.isNaN(next)) setItemsPerPage(next);
                  }}
                >
                  <SelectTrigger size="sm" className="h-7 min-w-[4.25rem] border-zinc-200/80 bg-white/95 px-2 text-[11px] font-semibold text-zinc-800 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" className="border-zinc-200 bg-white/96 backdrop-blur-[10px]">
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <span className="text-[11px] text-zinc-500">Page {currentPage} / {totalPages}</span>

              <Button type="button" variant="outline" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-8 border-zinc-200/80 bg-white/82 px-2 text-zinc-600 shadow-none disabled:opacity-40">
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
                      : "border-zinc-200/80 bg-white/82 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <Button type="button" variant="outline" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="h-8 border-zinc-200/80 bg-white/82 px-2 text-zinc-600 shadow-none disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4"
          onMouseDown={() => {
            if (!uploading) setUploadOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Upload Files</h3>
                <p className="text-xs text-zinc-500">Drag and drop or choose files to upload</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-zinc-900"
                onClick={() => {
                  if (!uploading) setUploadOpen(false);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={[
                  "rounded-xl border border-dashed p-6 text-center transition-colors",
                  dragOver ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white",
                ].join(" ")}
              >
                <div className="mx-auto h-12 w-12 rounded-xl border border-zinc-200 bg-white flex items-center justify-center">
                  <UploadCloud className="h-6 w-6 text-zinc-500" />
                </div>
                <p className="mt-3 text-sm font-semibold text-zinc-900">Drag and drop files here</p>
                <p className="mt-1 text-xs text-zinc-500">or click below to select files</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />

                <Button
                  variant="outline"
                  className="mt-4 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Choose files
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Selected</p>

                {selectedFiles.length === 0 ? (
                  <p className="text-sm text-zinc-500">No files selected.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-100">
                    {selectedFiles.map((f, idx) => (
                      <div
                        key={`${f.name}-${f.size}`}
                        className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-b-0 border-zinc-100"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-zinc-900">{f.name}</p>
                          <p className="text-xs text-zinc-400">{Math.round(f.size / 1024)} KB</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-red-600"
                          onClick={() => removeFile(idx)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-2">
              <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Cancel
              </Button>

              <Button className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={uploadSelectedFiles} disabled={uploading || selectedFiles.length === 0}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Upload
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

