"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UploadCloud, FileUp, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// --------------------
// ✅ Configure endpoints
// --------------------
const GET_ALL_LEADS_ENDPOINT = "/api/all/leads"; // should return { leads: [...] } OR [...]
const UPLOAD_ENDPOINT = "/api/leads/uploads"; // multipart/form-data

// Custom LinkedIn Icon
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
  </svg>
);

interface Lead {
  id: string;

  // ✅ new for filtering
  eventName: string;

  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;
}

/**
 * Normalize position bucket from a title (CEO/CTO/etc)
 * Feel free to expand keywords.
 */
function positionBucket(titleRaw: string): string {
  const t = (titleRaw || "").toLowerCase();

  // C-suite
  if (/\bchief executive\b|\bceo\b/.test(t)) return "CEO";
  if (/\bchief technology\b|\bcto\b/.test(t)) return "CTO";
  if (/\bchief information\b|\bcio\b/.test(t)) return "CIO";
  if (/\bchief operating\b|\bcoo\b/.test(t)) return "COO";
  if (/\bchief financial\b|\bcfo\b/.test(t)) return "CFO";
  if (/\bchief marketing\b|\bcmo\b/.test(t)) return "CMO";
  if (/\bchief revenue\b|\bcro\b/.test(t)) return "CRO";
  if (/\bchief security\b|\bcso\b/.test(t)) return "CSO";
  if (/\bchief (?:product|commercial)\b|\bcpo\b|\bcco\b/.test(t)) return "Chief";

  // Leadership
  if (/\bvp\b|\bvice president\b/.test(t)) return "VP";
  if (/\bdirector\b/.test(t)) return "Director";
  if (/\bhead of\b/.test(t)) return "Head";
  if (/\bmanager\b/.test(t)) return "Manager";
  if (/\blead\b/.test(t)) return "Lead";

  // Default
  if (!t.trim()) return "Unknown";
  return "Other";
}

/**
 * Ranked search:
 * - exact/prefix matches score higher than partial matches
 * - matches in name/title/company score higher than email/phone/urls
 */
function scoreLead(lead: Lead, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const name = (lead.employeeName || "").toLowerCase();
  const title = (lead.title || "").toLowerCase();
  const company = (lead.company || "").toLowerCase();
  const email = (lead.email || "").toLowerCase();
  const phone = (lead.phone || "").toLowerCase();
  const eventName = (lead.eventName || "").toLowerCase();

  let score = 0;

  // Helper scoring
  const addFieldScore = (field: string, base: number) => {
    if (!field) return;
    if (field === q) score += base + 120; // exact
    else if (field.startsWith(q)) score += base + 80; // prefix
    else if (field.includes(q)) score += base + 30; // contains
    // token-based partials (e.g. typing "tech dir")
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      let hits = 0;
      for (const tok of tokens) {
        if (field.includes(tok)) hits++;
      }
      if (hits) score += base + hits * 12;
    }
  };

  addFieldScore(name, 120);
  addFieldScore(title, 90);
  addFieldScore(company, 80);
  addFieldScore(eventName, 70);
  addFieldScore(email, 30);
  addFieldScore(phone, 20);

  // Small bonus if query looks like an email fragment
  if (q.includes("@") && email.includes(q)) score += 40;

  return score;
}

export default function TotalLeads() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);

  // Search
  const [q, setQ] = useState("");

  // ✅ Filters you asked for
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");

  // Upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const resetFilters = () => {
    setQ("");
    setEventFilter("all");
    setPositionFilter("all");
  };

  // --------------------
  // ✅ Fetch ALL leads
  // --------------------
  const fetchAllLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get(GET_ALL_LEADS_ENDPOINT);
      const raw = Array.isArray(res.data) ? res.data : res.data?.leads ?? [];

      const mapped: Lead[] = raw.map((x: any) => ({
        id: x.id,

        // ✅ IMPORTANT: map your backend event name field here
        // Try these common names:
        eventName: x.eventName ?? x.event ?? x.campaignName ?? x.icpName ?? x.icpPreview ?? "Unknown Event",

        employeeName: x.employeeName ?? x.employee_name ?? "",
        title: x.title ?? "",
        company: x.company ?? x.companyName ?? "",
        email: x.email ?? "",
        phone: x.phone ?? "",
        linkedinUrl: x.linkedinUrl ?? x.linkedin_url ?? "",
        companyUrl: x.companyUrl ?? x.company_url ?? "",
      }));

      setLeads(mapped);
    } catch (e: any) {
      toast.error("Failed to load leads", { description: e?.response?.data?.detail || e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dropdown options
  const eventOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) {
      if (l.eventName?.trim()) set.add(l.eventName.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const positionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) set.add(positionBucket(l.title));
    const arr = Array.from(set);
    // Make it nicer: keep common buckets at top
    const preferred = ["CEO", "CTO", "CIO", "COO", "CFO", "CMO", "Chief", "VP", "Director", "Head", "Manager", "Lead", "Other", "Unknown"];
    return preferred.filter((p) => arr.includes(p)).concat(arr.filter((x) => !preferred.includes(x)).sort());
  }, [leads]);

  // --------------------
  // ✅ Filter + BEST search results (ranked)
  // --------------------
  const visibleLeads = useMemo(() => {
    const query = q.trim();

    // 1) apply filters first
    const filtered = leads.filter((l) => {
      if (eventFilter !== "all" && l.eventName !== eventFilter) return false;
      if (positionFilter !== "all" && positionBucket(l.title) !== positionFilter) return false;
      return true;
    });

    // 2) apply ranked search
    if (!query) return filtered;

    const withScores = filtered
      .map((l) => ({ lead: l, score: scoreLead(l, query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    return withScores.map((x) => x.lead);
  }, [leads, q, eventFilter, positionFilter]);

  // --------------------
  // ✅ Upload handler
  // --------------------
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.isArray(files) ? files : Array.from(files);
      if (!arr.length) return;

      setUploading(true);
      try {
        const form = new FormData();
        arr.forEach((f) => form.append("files", f)); // change to "file" if your backend expects singular

        await api.post(UPLOAD_ENDPOINT, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Uploaded", { description: `${arr.length} file(s) uploaded` });
        await fetchAllLeads();
      } catch (e: any) {
        toast.error("Upload failed", { description: e?.response?.data?.detail || e?.message });
      } finally {
        setUploading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) await uploadFiles(e.dataTransfer.files);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-transparent p-1">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6 pb-6 border-b border-zinc-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Total Leads</h1>
          <p className="mt-2 text-sm text-zinc-500">
            All leads from database • Total: {leads.length} • Showing: {visibleLeads.length}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchAllLeads}
          className="h-10 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </Button>
      </div>

      {/* Search + Filters (Event + Position) */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm mb-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Search & Filters</h2>
          <Button variant="ghost" className="text-zinc-500 hover:text-zinc-900" onClick={resetFilters}>
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Search */}
          <div className="lg:col-span-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                className="w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="Type to search (ranked results): name, title, company, event, email..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Event filter */}
          <div className="lg:col-span-3">
            <select
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              title="Event"
            >
              <option value="all">All Events</option>
              {eventOptions.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </div>

          {/* Position filter */}
          <div className="lg:col-span-3">
            <select
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              title="Position"
            >
              <option value="all">All Positions</option>
              {positionOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Upload Area */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm mb-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">File Uploads</h2>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={async (e) => {
                if (e.target.files?.length) await uploadFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Upload files
            </Button>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`px-6 py-8 transition-colors ${dragOver ? "bg-zinc-50" : "bg-white"}`}
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-12 w-12 rounded-xl border border-zinc-200 bg-white flex items-center justify-center">
              <UploadCloud className="h-6 w-6 text-zinc-500" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">Drag & drop files here</p>
            <p className="text-xs text-zinc-500">Or click “Upload files”.</p>
          </div>
        </div>
      </Card>

      {/* Leads Table (Only Lead Data) */}
      {/* Leads Table (No horizontal scroll) */}
      <Card className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm max-w-full">
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
          <h2 className="font-semibold text-zinc-900">Leads</h2>
          <div className="flex items-center gap-2">
            <Badge className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-none border border-zinc-200 bg-white text-zinc-500">
              Total: {leads.length}
            </Badge>
            <Badge className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-none border border-zinc-200 bg-zinc-50 text-zinc-500">
              Showing: {visibleLeads.length}
            </Badge>
          </div>
        </div>

        {/* IMPORTANT: no overflow-x-auto */}
        <div className="w-full max-w-full overflow-x-hidden">
          <table className="w-full table-fixed">
            {/* Force column widths so table doesn't expand */}
            <colgroup>
              <col style={{ width: "160px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "210px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "70px" }} />
            </colgroup>

            <thead className="bg-white border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Event</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Position</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Company</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Phone</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">Links</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-50">
              {visibleLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-zinc-500">
                    No leads match your search/filters.
                  </td>
                </tr>
              ) : (
                visibleLeads.map((item) => (
                  <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                    {/* Event */}
                    <td className="px-4 py-3 align-top">
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-700 truncate">{item.eventName || "—"}</p>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 align-top">
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 truncate">{item.employeeName || "—"}</p>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="px-4 py-3 align-top">
                      <div className="min-w-0">
                        {/* allow wrapping instead of expanding width */}
                        <p className="text-sm text-zinc-700 whitespace-normal break-words leading-snug">
                          {item.title || "—"}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {positionBucket(item.title)}
                        </p>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3 align-top">
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-900 font-semibold truncate">{item.company || "—"}</p>
                        {item.companyUrl ? (
                          <a
                            href={item.companyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline block truncate"
                            title={item.companyUrl}
                          >
                            {item.companyUrl}
                          </a>
                        ) : null}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 align-top">
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-600 font-mono truncate" title={item.email}>
                          {item.email || "—"}
                        </p>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 align-top">
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500 truncate" title={item.phone}>
                          {item.phone || "—"}
                        </p>
                      </div>
                    </td>

                    {/* Links */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-3 justify-start">
                        {item.linkedinUrl ? (
                          <a
                            href={item.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-400 hover:text-zinc-900 transition-colors"
                            title="LinkedIn"
                          >
                            <LinkedInIcon className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-zinc-200" title="No LinkedIn">
                            <LinkedInIcon className="h-4 w-4" />
                          </span>
                        )}

                        {item.companyUrl ? (
                          <a
                            href={item.companyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-400 hover:text-zinc-900 transition-colors"
                            title="Company website"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-zinc-200" title="No website">
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
      </Card>

    </div>
  );
}
