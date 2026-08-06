"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isManagerRole } from "@/lib/auth";
import { submittedDayEnd, submittedDayStart } from "@/lib/eventSubmissionFilters";
import {
  fetchEventSubmission,
  fetchEventSubmissionOverview,
  fetchEventSubmissions,
  type EventSubmission,
  type EventSubmissionCluster,
  type EventSubmissionFilters,
  type EventSubmissionOverview,
  type EventSubmissionType,
  type JsonValue,
} from "@/lib/eventSubmissionsApi";

const PAGE_SIZE = 25;
const EMPTY_OVERVIEW: EventSubmissionOverview = {
  metrics: {
    total: 0,
    registrations: 0,
    sponsorships: 0,
    events: 0,
    matched: 0,
    unmatched: 0,
    ambiguous: 0,
  },
  eventClusters: [],
  categoryClusters: [],
  sponsorClusters: [],
};

type ClusterView = "events" | "categories" | "sponsors";
type FormTypeFilter = "all" | EventSubmissionType;
type MatchFilter = "all" | "matched" | "unmatched" | "ambiguous";

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Please try again.";
  try {
    const parsed = JSON.parse(error.message) as { detail?: string };
    return parsed.detail || error.message;
  } catch {
    return error.message;
  }
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function contactName(submission: EventSubmission) {
  const name = [submission.contact.firstName, submission.contact.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || submission.contact.workEmail || "Unnamed contact";
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function displayValue(value: JsonValue | undefined): string {
  if (value == null) return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((item) => displayValue(item)).join(", ");
  for (const key of ["label", "title", "name", "display", "value"]) {
    const candidate = value[key];
    if (typeof candidate === "string" || typeof candidate === "number") return String(candidate);
  }
  return "Not provided";
}

function selectionPrice(value: JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const price = value.price;
  if (!price || typeof price !== "object" || Array.isArray(price)) return "";
  if (typeof price.display === "string") return price.display;

  const currency = typeof price.currency === "string" ? price.currency : "";
  const amount = typeof price.amount === "number" ? formatNumber(price.amount) : "";
  return [currency, amount].filter(Boolean).join(" ");
}

function selectionSummary(selections: JsonValue[] | null) {
  if (!selections?.length) return "No selection";
  return selections.map((item) => displayValue(item)).join(" · ");
}

function clusterPrice(cluster: EventSubmissionCluster) {
  return selectionPrice(cluster.value);
}

function SponsorPackages({ selections }: { selections: JsonValue[] | null }) {
  if (!selections?.length) return <p className="mt-2 text-sm text-zinc-400">No selection</p>;

  return (
    <div className="mt-3 space-y-3">
      {selections.map((item, index) => {
        const price = selectionPrice(item);
        return (
          <div key={index} className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Package description</p>
              <p className="mt-1.5 text-sm font-semibold leading-6 text-zinc-900">{displayValue(item)}</p>
            </div>
            <div aria-label="Sponsor package price" className="min-w-40 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-500">Package price</p>
              <p className="mt-1 text-xl font-bold tracking-tight text-blue-700">{price || "Not provided"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailValue({ value }: { value: JsonValue }) {
  if (value == null) return <span className="text-zinc-400">Not provided</span>;
  if (typeof value === "boolean") {
    return <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{value ? "Yes" : "No"}</span>;
  }
  if (typeof value === "string" || typeof value === "number") {
    return <span className="break-words text-zinc-800">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-zinc-400">None</span>;
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <DetailValue value={item} />
          </div>
        ))}
      </div>
    );
  }
  for (const key of ["label", "title", "name", "display", "value"]) {
    const candidate = value[key];
    if (typeof candidate === "string" || typeof candidate === "number") {
      return <span className="break-words text-zinc-800">{String(candidate)}</span>;
    }
  }
  return (
    <dl className="grid gap-2">
      {Object.entries(value).map(([key, item]) => (
        <div key={key} className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{humanizeKey(key)}</dt>
          <dd className="text-sm leading-6"><DetailValue value={item} /></dd>
        </div>
      ))}
    </dl>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="admin-card-soft p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{formatNumber(value)}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700">{icon}</span>
      </div>
    </article>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-5" aria-label="Loading submissions">
      {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-md bg-zinc-100" />)}
    </div>
  );
}

function SubmissionTypeBadge({ type }: { type: EventSubmissionType }) {
  return type === "registration" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"><UsersRound className="h-3.5 w-3.5" /> Registration</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700"><BadgeDollarSign className="h-3.5 w-3.5" /> Sponsor</span>
  );
}

function DetailDrawer({
  submission,
  loading,
  onClose,
}: {
  submission: EventSubmission | null;
  loading: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const excludedFields = new Set([
    "firstName", "first_name", "lastName", "last_name", "jobTitle", "job_title",
    "company", "companyName", "company_name", "mobileNumber", "mobile_number",
    "phone", "phoneNumber", "workEmail", "work_email", "email", "country",
    "countryName", "country_name", "category", "interested",
  ]);
  const additionalEntries = Object.entries(submission?.formData || {}).filter(([key]) => !excludedFields.has(key));

  const copy = async (label: string, value: string | null) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Submission details">
      <button type="button" aria-label="Close submission details" className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-zinc-300 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Submission</p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-zinc-900">{submission ? contactName(submission) : "Loading"}</h2>
            {submission ? <p className="mt-1 truncate text-sm text-zinc-500">{submission.event.eventName}</p> : null}
          </div>
          <Button type="button" variant="ghost" autoFocus className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 p-0 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900" onClick={onClose}>
            <X className="h-4 w-4" /><span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 scrollbar-modern sm:px-7">
          {loading || !submission ? (
            <div className="flex min-h-80 items-center justify-center text-sm text-zinc-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <SubmissionTypeBadge type={submission.submissionType} />
              </div>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Contact</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Name", contactName(submission)], ["Job title", submission.contact.jobTitle],
                    ["Company", submission.contact.company], ["Country", submission.contact.country],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
                      <p className="mt-1.5 break-words text-sm font-medium text-zinc-800">{value || "Not provided"}</p>
                    </div>
                  ))}
                  <button type="button" disabled={!submission.contact.workEmail} onClick={() => void copy("Email", submission.contact.workEmail)} className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:cursor-default disabled:hover:border-zinc-200 disabled:hover:bg-white">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-700"><Mail className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Email</span><span className="mt-1 block truncate text-sm font-medium text-zinc-800">{submission.contact.workEmail || "Not provided"}</span></span>
                    {submission.contact.workEmail ? <Copy className="h-3.5 w-3.5 text-zinc-300 group-hover:text-blue-600" /> : null}
                  </button>
                  <button type="button" disabled={!submission.contact.mobileNumber} onClick={() => void copy("Mobile", submission.contact.mobileNumber)} className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:cursor-default disabled:hover:border-zinc-200 disabled:hover:bg-white">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-700"><ClipboardList className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Mobile</span><span className="mt-1 block truncate text-sm font-medium text-zinc-800">{submission.contact.mobileNumber || "Not provided"}</span></span>
                    {submission.contact.mobileNumber ? <Copy className="h-3.5 w-3.5 text-zinc-300 group-hover:text-blue-600" /> : null}
                  </button>
                </div>
              </section>

              <section>
                <h3 aria-label={submission.submissionType === "registration" ? "Registration category" : "Sponsor interest"} className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{submission.submissionType === "registration" ? "Category" : "Sponsor"}</h3>
                {submission.submissionType === "sponsorship" ? (
                  <SponsorPackages selections={submission.interested} />
                ) : (
                  <p className="mt-2 text-sm font-medium text-zinc-800">{selectionSummary(submission.category)}</p>
                )}
              </section>

              {additionalEntries.length ? (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Answers</h3>
                  <dl className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white px-4">
                    {additionalEntries.map(([key, value]) => (
                      <div key={key} className="grid gap-2 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5"><dt className="text-sm font-medium text-zinc-500">{humanizeKey(key)}</dt><dd className="text-sm leading-6"><DetailValue value={value} /></dd></div>
                    ))}
                  </dl>
                </section>
              ) : null}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Timing</h3>
                <dl className="mt-3 grid gap-x-5 gap-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-zinc-400">Submitted</dt><dd className="mt-1 font-medium text-zinc-800">{formatDateTime(submission.submittedAt)}</dd></div>
                  <div><dt className="text-zinc-400">Received</dt><dd className="mt-1 font-medium text-zinc-800">{formatDateTime(submission.receivedAt)}</dd></div>
                </dl>
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function EventSubmissionsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdminLike, isSuperAdmin } = useAuth();
  const canView = isAdminLike || isManagerRole(user?.role);
  const isLegacyAdminRoute = isSuperAdmin && pathname === "/event-submissions";
  const [overview, setOverview] = useState<EventSubmissionOverview>(EMPTY_OVERVIEW);
  const [browseOverview, setBrowseOverview] = useState<EventSubmissionOverview>(EMPTY_OVERVIEW);
  const [items, setItems] = useState<EventSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [clusterView, setClusterView] = useState<ClusterView>("events");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [eventName, setEventName] = useState("");
  const [formType, setFormType] = useState<FormTypeFilter>("all");
  const [matchStatus, setMatchStatus] = useState<MatchFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<{ label: string; value: string } | null>(null);
  const [sponsorFilter, setSponsorFilter] = useState<{ label: string; value: string } | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<EventSubmission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo<EventSubmissionFilters>(() => ({
    eventName: eventName || undefined,
    submissionType: formType === "all" ? undefined : formType,
    matchStatus: matchStatus === "all" ? undefined : matchStatus,
    search: search || undefined,
    submittedFrom: submittedDayStart(fromDate),
    submittedTo: submittedDayEnd(toDate),
    categoryValue: categoryFilter?.value,
    interestedValue: sponsorFilter?.value,
  }), [categoryFilter, eventName, formType, fromDate, matchStatus, search, sponsorFilter, toDate]);

  useEffect(() => {
    if (isLegacyAdminRoute) router.replace("/admin/event-submissions");
  }, [isLegacyAdminRoute, router]);

  useEffect(() => {
    if (!canView || isLegacyAdminRoute) return;
    const controller = new AbortController();
    const loadBrowseOverview = async () => {
      try {
        const response = await fetchEventSubmissionOverview({}, controller.signal);
        if (!controller.signal.aborted) setBrowseOverview(response.overview);
      } catch {
        if (!controller.signal.aborted) setBrowseOverview(EMPTY_OVERVIEW);
      }
    };
    void loadBrowseOverview();
    return () => controller.abort();
  }, [canView, isLegacyAdminRoute, refreshKey]);

  useEffect(() => {
    if (!canView || isLegacyAdminRoute) return;
    const controller = new AbortController();
    const load = async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setLoading(true);
      setError("");
      try {
        const [overviewResponse, listResponse] = await Promise.all([
          fetchEventSubmissionOverview(filters, controller.signal),
          fetchEventSubmissions({ ...filters, sortBy: "submittedAt", sortOrder: "desc", limit: PAGE_SIZE, offset }, controller.signal),
        ]);
        setOverview(overviewResponse.overview);
        setItems(listResponse.items);
        setTotal(listResponse.pagination.total);
        setHasMore(listResponse.pagination.hasMore);
      } catch (requestError: unknown) {
        if (!controller.signal.aborted) setError(getErrorMessage(requestError));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [canView, filters, isLegacyAdminRoute, offset, refreshKey]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const loadDetail = async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setDetailLoading(true);
      setSelectedSubmission(null);
      try {
        setSelectedSubmission(await fetchEventSubmission(selectedId, controller.signal));
      } catch (requestError: unknown) {
        if (controller.signal.aborted) return;
        toast.error("Could not load submission", { description: getErrorMessage(requestError) });
        setSelectedId("");
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    };
    void loadDetail();
    return () => controller.abort();
  }, [selectedId]);

  const clearFilters = useCallback(() => {
    setSearchInput(""); setSearch(""); setEventName(""); setFormType("all");
    setMatchStatus("all"); setFromDate(""); setToDate("");
    setCategoryFilter(null); setSponsorFilter(null); setOffset(0);
  }, []);

  const activeFilterCount = [search, eventName, formType !== "all" ? formType : "", matchStatus !== "all" ? matchStatus : "", fromDate, toDate, categoryFilter, sponsorFilter].filter(Boolean).length;
  const eventOptions = useMemo(
    () => browseOverview.eventClusters.map((cluster) => cluster.eventName).sort((a, b) => a.localeCompare(b)),
    [browseOverview.eventClusters]
  );
  const firstItem = total ? offset + 1 : 0;
  const lastItem = Math.min(offset + items.length, total);

  if (isLegacyAdminRoute) return null;

  if (!canView) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center p-6">
        <section className="admin-card w-full p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700"><ShieldCheck className="h-5 w-5" /></span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">Restricted</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">Admins and managers only.</p>
        </section>
      </main>
    );
  }

  const clusterTabs: Array<{ id: ClusterView; label: string; count: number; icon: ReactNode }> = [
    { id: "events", label: "Events", count: browseOverview.eventClusters.length, icon: <CalendarDays className="h-4 w-4" /> },
    { id: "categories", label: "Categories", count: browseOverview.categoryClusters.length, icon: <Tag className="h-4 w-4" /> },
    { id: "sponsors", label: "Sponsors", count: browseOverview.sponsorClusters.length, icon: <BadgeDollarSign className="h-4 w-4" /> },
  ];

  const noClusters = (clusterView === "events" && !browseOverview.eventClusters.length) ||
    (clusterView === "categories" && !browseOverview.categoryClusters.length) ||
    (clusterView === "sponsors" && !browseOverview.sponsorClusters.length);

  return (
    <main className="admin-page min-h-[calc(100dvh-3rem)] pb-10">
      <header className="admin-page-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="admin-eyebrow">Admin Control</p>
          <h1 className="admin-title">Event Submissions</h1>
          <p className="admin-description">Review registrations and sponsor enquiries.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setRefreshKey((current) => current + 1)} disabled={loading} className="h-10 self-start border-zinc-300 bg-white px-4 text-zinc-700 hover:bg-zinc-50 xl:self-auto">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Refresh
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Submission summary">
        <MetricCard icon={<Inbox className="h-5 w-5" />} label="Submissions" value={overview.metrics.total} />
        <MetricCard icon={<UsersRound className="h-5 w-5" />} label="Registrations" value={overview.metrics.registrations} />
        <MetricCard icon={<BadgeDollarSign className="h-5 w-5" />} label="Sponsors" value={overview.metrics.sponsorships} />
        <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Matched" value={overview.metrics.matched} />
      </section>

      <section className="admin-card mt-5 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-baseline gap-2"><h2 className="text-base font-semibold text-zinc-900">Submissions</h2><span className="text-xs text-zinc-500">{formatNumber(total)}</span></div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex max-w-full flex-1 gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Submission groups">
              {clusterTabs.map((tab) => (
                <button key={tab.id} type="button" role="tab" aria-selected={clusterView === tab.id} onClick={() => { setClusterView(tab.id); setFiltersOpen(true); }} className={`flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${clusterView === tab.id && filtersOpen ? "border border-zinc-200 bg-white text-blue-700" : "text-zinc-500 hover:text-zinc-800"}`}>
                  {tab.icon} {tab.label}<span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{tab.count}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setFiltersOpen((current) => !current)} aria-expanded={filtersOpen} className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md border transition-colors ${filtersOpen || activeFilterCount ? "border-blue-200 bg-blue-50 text-blue-700" : "border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"}`}>
              <SlidersHorizontal className="h-4 w-4" />{activeFilterCount ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{activeFilterCount}</span> : null}<span className="sr-only">Toggle browse and filters</span>
            </button>
          </div>
        </div>
        {filtersOpen ? (
          <div className="border-b border-zinc-100 bg-zinc-50">
            <div className="p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1.4fr)_minmax(11rem,1fr)_10rem_10rem_10rem]">
                <label className="flex h-10 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100"><Search className="mr-2 h-4 w-4 text-zinc-400" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search" className="h-full min-w-0 flex-1 bg-transparent text-zinc-800 outline-none placeholder:text-zinc-400" /></label>
                <select value={eventName} onChange={(event) => { setEventName(event.target.value); setOffset(0); }} className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"><option value="">All events</option>{eventOptions.map((event) => <option key={event} value={event}>{event}</option>)}</select>
                <select value={formType} onChange={(event) => { const next = event.target.value as FormTypeFilter; setFormType(next); if (next === "registration") setSponsorFilter(null); if (next === "sponsorship") setCategoryFilter(null); setOffset(0); }} className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 outline-none focus:border-blue-300"><option value="all">All forms</option><option value="registration">Registrations</option><option value="sponsorship">Sponsors</option></select>
                <select value={matchStatus} onChange={(event) => { setMatchStatus(event.target.value as MatchFilter); setOffset(0); }} className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 outline-none focus:border-blue-300"><option value="all">All matches</option><option value="matched">Matched</option><option value="unmatched">Unmatched</option><option value="ambiguous">Ambiguous</option></select>
                <Button type="button" variant="outline" onClick={clearFilters} disabled={!activeFilterCount} className="h-10 border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"><X className="mr-2 h-4 w-4" /> Clear</Button>
              </div>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Submitted</span><span className="text-xs text-zinc-500">From</span><label className="flex h-9 items-center rounded-md border border-zinc-300 bg-white px-2.5 text-xs text-zinc-500"><CalendarDays className="mr-2 h-3.5 w-3.5" /><input aria-label="Submitted from" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => { setFromDate(event.target.value); setOffset(0); }} className="bg-transparent font-medium text-zinc-700 outline-none" /></label><span className="text-xs text-zinc-500">To</span><label className="flex h-9 items-center rounded-md border border-zinc-300 bg-white px-2.5 text-xs text-zinc-500"><input aria-label="Submitted to" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => { setToDate(event.target.value); setOffset(0); }} className="bg-transparent font-medium text-zinc-700 outline-none" /></label></div>
                <div className="flex flex-wrap gap-2">{categoryFilter ? <button type="button" onClick={() => { setCategoryFilter(null); setOffset(0); }} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{categoryFilter.label}<X className="h-3 w-3" /></button> : null}{sponsorFilter ? <button type="button" onClick={() => { setSponsorFilter(null); setOffset(0); }} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{sponsorFilter.label}<X className="h-3 w-3" /></button> : null}</div>
              </div>
            </div>
            <div className="grid max-h-72 gap-2 overflow-y-auto border-t border-zinc-200 p-4 scrollbar-modern sm:grid-cols-2 xl:grid-cols-3">
              {clusterView === "events" ? browseOverview.eventClusters.map((cluster) => (
                <button key={cluster.eventName} type="button" onClick={() => { setEventName(cluster.eventName); setOffset(0); }} className="group flex min-w-0 items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700"><CalendarDays className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{cluster.eventName}</span><span className="text-sm font-semibold text-zinc-700">{cluster.count}</span>
                </button>
              )) : null}
              {clusterView === "categories" ? browseOverview.categoryClusters.map((cluster) => (
                <button key={cluster.filterValue} type="button" onClick={() => { setCategoryFilter({ label: cluster.label, value: cluster.filterValue }); setSponsorFilter(null); setFormType("registration"); setOffset(0); }} className="group flex min-w-0 items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700"><Tag className="h-4 w-4" /></span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{cluster.label}</span><span className="text-sm font-semibold text-zinc-700">{cluster.count}</span>
                </button>
              )) : null}
              {clusterView === "sponsors" ? browseOverview.sponsorClusters.map((cluster) => (
                <button key={cluster.filterValue} type="button" onClick={() => { setSponsorFilter({ label: cluster.label, value: cluster.filterValue }); setCategoryFilter(null); setFormType("sponsorship"); setOffset(0); }} className="group flex min-w-0 items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700"><BadgeDollarSign className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-zinc-900">{cluster.label}</span>{clusterPrice(cluster) ? <span className="mt-0.5 block truncate text-xs text-zinc-500">{clusterPrice(cluster)}</span> : null}</span><span className="text-sm font-semibold text-zinc-700">{cluster.count}</span>
                </button>
              )) : null}
              {noClusters && !loading ? <div className="col-span-full py-10 text-center text-sm text-zinc-500">No results.</div> : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="m-5 flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 py-12 text-center"><AlertCircle className="h-7 w-7 text-red-600" /><h3 className="mt-3 font-semibold text-red-900">Could not load</h3><p className="mt-2 max-w-lg text-sm text-red-700">{error}</p><Button type="button" variant="outline" onClick={() => setRefreshKey((current) => current + 1)} className="mt-5 border-red-200 bg-white text-red-700 hover:bg-red-100">Retry</Button></div>
        ) : loading && !items.length ? <LoadingRows /> : !items.length ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400"><Inbox className="h-5 w-5" /></span><h3 className="mt-4 text-base font-semibold text-zinc-900">No submissions</h3>{activeFilterCount ? <Button type="button" variant="outline" onClick={clearFilters} className="mt-4">Clear filters</Button> : null}</div>
        ) : (
          <>
            <div className="admin-table-wrap hidden lg:block">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead className="bg-zinc-50"><tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400"><th className="px-5 py-3">Contact</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Form</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Submitted</th><th className="px-5 py-3 text-right">Details</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">{items.map((submission) => (
                  <tr key={submission.id} className="group transition-colors hover:bg-zinc-50"><td className="px-5 py-4"><p className="font-semibold text-zinc-900">{contactName(submission)}</p><p className="mt-1 text-xs text-zinc-500">{submission.contact.workEmail || submission.contact.mobileNumber || "-"}</p></td><td className="max-w-[16rem] px-4 py-4"><p className="truncate text-sm font-medium text-zinc-800">{submission.event.eventName}</p></td><td className="max-w-[20rem] px-4 py-4"><SubmissionTypeBadge type={submission.submissionType} /><p className="mt-2 truncate text-xs text-zinc-500" title={selectionSummary(submission)}>{selectionSummary(submission)}</p></td><td className="max-w-[13rem] px-4 py-4"><p className="truncate text-sm font-medium text-zinc-800">{submission.contact.company || "-"}</p><p className="mt-1 text-xs text-zinc-500">{submission.contact.country || "-"}</p></td><td className="whitespace-nowrap px-4 py-4 text-sm text-zinc-600">{formatDateTime(submission.submittedAt)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedId(submission.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">View <ArrowRight className="h-3.5 w-3.5" /></button></td></tr>
                ))}</tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-100 lg:hidden">{items.map((submission) => (
              <button key={submission.id} type="button" onClick={() => setSelectedId(submission.id)} className="block w-full p-5 text-left transition-colors hover:bg-blue-50/35"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate font-semibold text-zinc-900">{contactName(submission)}</p><p className="mt-1 truncate text-xs text-zinc-500">{submission.contact.company || submission.contact.workEmail || "No company provided"}</p></div><SubmissionTypeBadge type={submission.submissionType} /></div><p className="mt-3 truncate text-sm font-medium text-zinc-700">{submission.event.eventName}</p><p className="mt-1 truncate text-xs text-zinc-500">{selectionSummary(submission)}</p><div className="mt-4 flex items-center justify-between text-xs text-zinc-400"><span>{formatDateTime(submission.submittedAt)}</span><span className="inline-flex items-center gap-1 font-semibold text-blue-700">View <ChevronRight className="h-3.5 w-3.5" /></span></div></button>
            ))}</div>
            <footer className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-zinc-500"><strong className="font-semibold text-zinc-800">{firstItem}-{lastItem}</strong> / <strong className="font-semibold text-zinc-800">{formatNumber(total)}</strong></p><div className="flex items-center gap-2"><Button type="button" variant="outline" disabled={offset === 0 || loading} onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))} className="h-9 border-zinc-300 bg-white px-3 text-xs"><ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev</Button><span className="px-2 text-xs font-medium text-zinc-500">{Math.floor(offset / PAGE_SIZE) + 1}</span><Button type="button" variant="outline" disabled={!hasMore || loading} onClick={() => setOffset((current) => current + PAGE_SIZE)} className="h-9 border-zinc-300 bg-white px-3 text-xs">Next <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div></footer>
          </>
        )}
      </section>

      {selectedId ? <DetailDrawer submission={selectedSubmission} loading={detailLoading} onClose={() => { setSelectedId(""); setSelectedSubmission(null); }} /> : null}
    </main>
  );
}
