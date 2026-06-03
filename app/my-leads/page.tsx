"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  FileUp,
  History,
  Mail,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";

type MyLeadStatus = {
  statusKey: string;
  label: string;
};

type MyLeadFilterState = {
  status: string;
  contact: "all" | "email" | "phone" | "complete" | "missing-contact" | "linkedin" | "website";
};

type MyLeadRow = {
  id: string;
  employeeName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  companyUrl: string;
  workflowStatus: string;
  workflowStatusLabel: string;
  workflowComment: string;
  workflowCommentUpdatedAt: string;
  isManualLead: boolean;
};

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;

const SALES_STATUSES: MyLeadStatus[] = [
  { statusKey: "new", label: "New" },
  { statusKey: "first-call", label: "First Call" },
  { statusKey: "follow-up", label: "Follow Up" },
  { statusKey: "proposal-sent", label: "Proposal Sent" },
  { statusKey: "deal-closed", label: "Deal Closed" },
  { statusKey: "deal-dead", label: "Deal Dead" },
];

const DELEGATE_STATUSES: MyLeadStatus[] = [
  { statusKey: "new", label: "New" },
  { statusKey: "first-call", label: "First Call" },
  { statusKey: "follow-up", label: "Followups" },
  { statusKey: "pending", label: "Pending" },
  { statusKey: "confirmed", label: "Confirmed" },
];

const EMPTY_FILTERS: MyLeadFilterState = {
  status: "all",
  contact: "all",
};

const myLeadRows: MyLeadRow[] = [];

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.22-.44-2.12-1.54-2.12a1.6 1.6 0 00-1.58 1.14 2.17 2.17 0 00-.1 1.08V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.95 0 3.52 1.27 3.52 4z" />
  </svg>
);

const WebsiteIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2z" />
    <path fill="white" transform="translate(6, 6) scale(0.5)" d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
  </svg>
);

const EmailIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2z" />
    <g transform="translate(6, 6) scale(0.5)">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="white" />
      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

function getStatusDotClass(status: string) {
  if (status === "deal-closed" || status === "confirmed") return "bg-emerald-500";
  if (status === "proposal-sent" || status === "pending") return "bg-blue-500";
  if (status === "follow-up" || status === "first-call") return "bg-amber-500";
  if (status === "deal-dead") return "bg-rose-500";
  return "bg-zinc-300";
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function filterRows(rows: MyLeadRow[], query: string, filters: MyLeadFilterState) {
  const search = normalizeSearch(query);
  return rows.filter((row) => {
    if (filters.status !== "all" && row.workflowStatus !== filters.status) return false;
    if (filters.contact === "email" && !row.email) return false;
    if (filters.contact === "phone" && !row.phone) return false;
    if (filters.contact === "complete" && (!row.email || !row.phone)) return false;
    if (filters.contact === "missing-contact" && (row.email || row.phone)) return false;
    if (filters.contact === "linkedin" && !row.linkedinUrl) return false;
    if (filters.contact === "website" && !row.companyUrl) return false;
    if (!search) return true;

    return [
      row.employeeName,
      row.title,
      row.company,
      row.email,
      row.phone,
      row.linkedinUrl,
      row.companyUrl,
      row.workflowStatusLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

export default function MyLeadsPage() {
  const router = useRouter();
  const { persona } = usePersona();
  const { isSuperAdmin, role } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<MyLeadFilterState>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState<number>(100);

  useEffect(() => {
    if (isSuperAdmin) router.replace("/dashboard");
  }, [isSuperAdmin, router]);

  const statusOptions = useMemo(
    () => (persona === "delegates" || persona === "production" ? DELEGATE_STATUSES : SALES_STATUSES),
    [persona]
  );

  const visibleRows = useMemo(() => filterRows(myLeadRows, searchInput, filters), [filters, searchInput]);
  const pagedRows = visibleRows.slice(pageOffset, pageOffset + pageSize);
  const activeFilterCount = [filters.status !== "all", filters.contact !== "all"].filter(Boolean).length;
  const pageTotal = visibleRows.length;
  const pageRangeStart = pagedRows.length > 0 ? pageOffset + 1 : 0;
  const pageRangeEnd = pageOffset + pagedRows.length;
  const hasMore = pageOffset + pageSize < pageTotal;

  if (!role || isSuperAdmin) return null;

  const showBackendPendingToast = () => {
    toast.info("My Leads backend is not connected yet.");
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPageOffset(0);
  };

  return (
    <>
      <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1 font-sans">
        <header className="min-h-[6.25rem] shrink-0 border-b border-zinc-300 pb-11">
          <div className="flex min-w-0 items-center gap-7 whitespace-nowrap overflow-hidden">
            <div className="min-w-0 flex-1">
              <Select value="my-leads">
                <SelectTrigger
                  aria-label="Select lead source"
                  className="group !h-auto w-fit max-w-full justify-start gap-4 whitespace-normal rounded-none border-0 bg-transparent p-0 text-left text-zinc-950 shadow-none transition-colors hover:text-blue-700 focus:ring-0 focus-visible:ring-0 [&>svg]:mt-1 [&>svg]:h-7 [&>svg]:w-7 [&>svg]:opacity-40 [&>svg]:transition-colors [&>svg]:group-hover:opacity-70"
                >
                  <span className="line-clamp-2 min-w-0 text-3xl font-light leading-[1.12] tracking-[-0.025em] sm:text-4xl 2xl:text-5xl">
                    My Leads
                  </span>
                </SelectTrigger>
                <SelectContent align="start" position="popper" className="max-h-[22rem] min-w-[24rem] rounded-none border-zinc-300 bg-white shadow-2xl">
                  <SelectItem value="my-leads" className="py-3 text-base">
                    My Leads
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex min-w-max flex-nowrap items-center justify-end gap-8">
              <div className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white p-1.5" aria-label="My leads actions">
                <button
                  type="button"
                  onClick={showBackendPendingToast}
                  className="inline-flex h-9 w-40 items-center justify-center gap-2.5 rounded-full text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <FileUp className="h-4 w-4" />
                  Upload leads
                </button>

                <button
                  type="button"
                  onClick={showBackendPendingToast}
                  className="inline-flex h-9 w-40 items-center justify-center gap-2.5 rounded-full border border-blue-500/20 bg-blue-600 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add a lead
                </button>
              </div>

              <div className="flex shrink-0 items-baseline gap-3">
                <span className="text-sm font-medium text-zinc-400">Leads To Cover</span>
                <span className="text-4xl font-light tabular-nums tracking-tight text-zinc-950">
                  {pageTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-12 overflow-hidden pt-10 xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="shrink-0 space-y-10 overflow-y-auto pr-2 scrollbar-hide">
            <div className="space-y-6">
              <div className="mt-8">
                <label className="mb-4 block text-xs font-medium text-zinc-400">Search intelligence</label>
                <div className="relative h-11 w-full rounded-full border border-zinc-300 bg-white px-4 shadow-[0_22px_60px_-52px_rgba(2,10,27,0.42)] transition-colors focus-within:border-zinc-400">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                      setPageOffset(0);
                    }}
                    placeholder="Find in sheet..."
                    className="h-full w-full border-0 bg-transparent pl-7 pr-1 text-sm font-light tracking-tight text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-zinc-100 pt-4">
                <label className="mb-3 block text-xs font-medium text-zinc-400">Intelligent filters</label>
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className="flex h-11 w-full items-center justify-between rounded-full border border-zinc-300 bg-white px-4 text-left shadow-[0_18px_46px_-42px_rgba(2,10,27,0.42)] transition-colors hover:border-zinc-400"
                >
                  <span className="inline-flex items-center gap-4 text-sm font-light text-zinc-500">
                    <SlidersHorizontal className="h-4 w-4" />
                    Advanced filters
                  </span>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-100 px-1.5 text-xs font-medium tabular-nums text-zinc-500">
                    {activeFilterCount}
                  </span>
                </button>
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 border-b border-transparent pb-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950"
                  >
                    Clear filter model
                  </button>
                ) : null}
              </div>

              <div className="mt-5 space-y-4 border-t border-zinc-100 pt-5">
                <label className="text-xs font-medium text-zinc-400">Data coverage</label>
                <div className="space-y-0">
                  <div className="flex items-center justify-between border-b border-zinc-100 py-4">
                    <span className="text-sm font-light text-zinc-500">Total profile count</span>
                    <span className="text-xl font-light tabular-nums tracking-tight text-zinc-950">
                      {pageTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-100 py-4">
                    <span className="text-sm font-light text-zinc-500">Visible range</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPageOffset(0);
                      }}
                    >
                      <SelectTrigger className="h-9 w-16 justify-end gap-1 rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-xl font-light tabular-nums tracking-tight text-zinc-950 shadow-none transition-colors focus:border-blue-600 focus:ring-0 [&>svg]:ml-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end" className="rounded-none border-zinc-300 shadow-xl">
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)} className="py-2.5 text-sm">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden xl:border-l xl:border-zinc-300 xl:pl-16">
            <div className="min-h-0 flex-1 overflow-auto pr-4 scrollbar-modern">
              {pagedRows.length === 0 ? (
                <div className="w-full">
                  <div className="sticky top-0 z-20 grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 bg-[#f7f7f7]/95 py-3 text-sm font-light text-zinc-500 backdrop-blur">
                    <div>Identity details</div>
                    <div>Contact channels</div>
                    <div>Status</div>
                  </div>
                  <div className="flex h-40 items-center justify-center border-b border-zinc-100 text-zinc-400 font-light">
                    {searchInput || activeFilterCount > 0 ? "No matching records found." : "Workspace is currently empty."}
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <div className="sticky top-0 z-20 grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 bg-[#f7f7f7]/95 py-3 text-sm font-light text-zinc-500 backdrop-blur">
                    <div>Identity details</div>
                    <div>Contact channels</div>
                    <div>Status</div>
                  </div>
                  {pagedRows.map((item) => (
                    <div key={item.id} className="group grid grid-cols-[minmax(0,0.75fr)_minmax(14rem,0.95fr)_10rem] border-b border-zinc-300 py-6 transition-all duration-300 hover:bg-zinc-50/60">
                      <div className="pr-8">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-5">
                            <span className="text-xl font-light tracking-tight text-zinc-950">{item.employeeName || "-"}</span>
                            {item.isManualLead ? (
                              <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-500">Manual</span>
                            ) : null}
                          </div>
                          <span className="max-w-sm text-base font-light leading-relaxed text-zinc-700">{item.title || "-"}</span>
                          <span className="text-xs font-medium text-zinc-400">{item.company || "-"}</span>
                        </div>
                      </div>

                      <div className="pr-8">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-4">
                            {item.email ? (
                              <>
                                <EmailIcon className="h-3.5 w-3.5 text-[#EF4444]" />
                                <span className="truncate text-sm font-light tracking-tight text-zinc-700">{item.email}</span>
                              </>
                            ) : (
                              <span className="text-sm font-light tracking-tight text-zinc-700">-</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            {item.phone ? (
                              <>
                                <PhoneIcon className="h-3.5 w-3.5 text-[#22C55E]" />
                                <span className="truncate text-sm font-light text-zinc-500">{item.phone}</span>
                              </>
                            ) : (
                              <span className="text-sm font-light text-zinc-500">-</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
                            {item.linkedinUrl ? (
                              <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                                <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
                                <span className="text-xs font-medium">LinkedIn</span>
                              </a>
                            ) : null}
                            {item.companyUrl ? (
                              <a href={item.companyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                                <WebsiteIcon className="h-3.5 w-3.5 text-zinc-950" />
                                <span className="text-xs font-medium">Website</span>
                              </a>
                            ) : null}
                            <button type="button" onClick={showBackendPendingToast} className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                              <Copy className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Copy lead</span>
                            </button>
                            <button type="button" onClick={showBackendPendingToast} className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-zinc-400 transition-colors hover:border-blue-600 hover:text-zinc-950">
                              <Mail className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Generate content</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex h-full flex-col">
                        <Select value={item.workflowStatus} onValueChange={showBackendPendingToast}>
                          <SelectTrigger className="h-10 w-full rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-base font-light shadow-none transition-colors focus:border-blue-600 focus:ring-0">
                            <SelectValue placeholder={item.workflowStatusLabel} />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-zinc-300 shadow-2xl">
                            {statusOptions.map((option) => (
                              <SelectItem key={option.statusKey} value={option.statusKey} className="text-xs py-2.5">
                                <span className="flex items-center gap-3">
                                  <span className={`ml-1 h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotClass(option.statusKey)}`} />
                                  {option.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-auto pt-3">
                          {item.workflowComment ? (
                            <button type="button" onClick={showBackendPendingToast} className="mb-2 block w-full border-l border-zinc-300 pl-3 text-left transition-colors hover:border-zinc-900">
                              <span className="line-clamp-2 text-xs font-light leading-relaxed text-zinc-500">
                                {item.workflowComment}
                              </span>
                              {item.workflowCommentUpdatedAt ? (
                                <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                                  <Clock3 className="h-3 w-3" />
                                  {item.workflowCommentUpdatedAt}
                                </span>
                              ) : null}
                            </button>
                          ) : null}
                          <button type="button" onClick={showBackendPendingToast} className="inline-flex items-center gap-1.5 border-b border-transparent pb-0.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-900 hover:text-zinc-950">
                            <History className="h-3.5 w-3.5" />
                            Comment history
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer className="mt-6 flex shrink-0 flex-col gap-5 border-t border-zinc-100 pb-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-400">Lead sheet range</p>
                <p className="text-lg font-light tabular-nums tracking-tight text-zinc-950">
                  {pageRangeStart}-{pageRangeEnd}
                  <span className="ml-2 text-sm text-zinc-400">of {pageTotal.toLocaleString()} records</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  aria-label="Previous page"
                  className="h-11 w-11 rounded-full border border-zinc-300 bg-white p-0 text-zinc-500 shadow-none transition-all hover:border-zinc-900 hover:bg-white hover:text-zinc-950 disabled:opacity-30"
                  onClick={() => setPageOffset((prev) => Math.max(0, prev - pageSize))}
                  disabled={pageOffset === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Next page"
                  className="h-11 w-11 rounded-full border border-zinc-950 bg-transparent p-0 text-zinc-950 shadow-none transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:border-zinc-300 disabled:text-zinc-300 disabled:opacity-100"
                  onClick={() => setPageOffset((prev) => prev + pageSize)}
                  disabled={!hasMore}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {filterOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-zinc-950/35 backdrop-blur-[2px]"
            onClick={() => setFilterOpen(false)}
          />

          <div className="relative z-[1] w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-300/85 bg-white/96 shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_24px_40px_-24px_rgba(2,10,27,0.6),0_12px_22px_-16px_rgba(15,23,42,0.34)] backdrop-blur-[10px]">
            <div className="relative space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">My Leads</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">Advanced Filters</h2>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-full p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  onClick={() => setFilterOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => {
                      setFilters((prev) => ({ ...prev, status: value }));
                      setPageOffset(0);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-none border-zinc-300 bg-white shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-zinc-300 shadow-2xl">
                      <SelectItem value="all">All statuses</SelectItem>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.statusKey} value={option.statusKey}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Contact</label>
                  <Select
                    value={filters.contact}
                    onValueChange={(value) => {
                      setFilters((prev) => ({ ...prev, contact: value as MyLeadFilterState["contact"] }));
                      setPageOffset(0);
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-none border-zinc-300 bg-white shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-zinc-300 shadow-2xl">
                      <SelectItem value="all">All contacts</SelectItem>
                      <SelectItem value="email">Has email</SelectItem>
                      <SelectItem value="phone">Has phone</SelectItem>
                      <SelectItem value="complete">Email and phone</SelectItem>
                      <SelectItem value="missing-contact">Missing contact</SelectItem>
                      <SelectItem value="linkedin">Has LinkedIn</SelectItem>
                      <SelectItem value="website">Has website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-100 pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetFilters}
                  className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="h-9 rounded-md bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
