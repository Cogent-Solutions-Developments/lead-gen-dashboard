"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Loader2,
  Filter,
  Play,
  Sparkles,
  Square,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  cancelCampaignContentGenerationJob,
  deleteCampaign,
  forceDeleteCampaign,
  generateCampaignLeadContent,
  getCampaignLeads,
  getCampaignInfo,
  listCampaigns,
  stopCampaign,
  type DeleteBlockedDetail,
  type CampaignInfo,
  type CampaignListItem,
  type LeadItem,
} from "@/lib/apiRouter";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/hooks/useAuth";
import { CampaignActionDialog } from "@/components/campaigns/CampaignActionDialog";
import { NormalUserEventsPage } from "@/components/events/NormalUserEventsPage";

const statusConfig: Record<
  string,
  { label: string; style: string; icon?: LucideIcon; spin?: boolean }
> = {
  processing: {
    label: "Processing",
    style: "border-blue-200/80 bg-blue-50/85 text-blue-700",
    icon: Loader2,
    spin: true,
  },
  content_generating: {
    label: "Content Generating",
    style: "border-blue-200/80 bg-blue-50/85 text-blue-700",
    icon: Loader2,
    spin: true,
  },
  needs_review: {
    label: "Needs Review",
    style: "border-amber-200/80 bg-amber-50/85 text-amber-700",
  },
  active_outreach: {
    label: "Active Outreach",
    style: "border-sky-200/80 bg-sky-50/85 text-sky-700",
  },
  completed: {
    label: "Completed",
    style: "border-emerald-200/80 bg-emerald-50/85 text-emerald-700",
  },
  cancelled: {
    label: "Cancelled",
    style: "border-zinc-300/80 bg-zinc-100/85 text-zinc-600",
  },
  failed: {
    label: "Failed",
    style: "border-rose-200/80 bg-rose-50/85 text-rose-700",
  },
};

const filterOnlyStatuses = [
  "processing",
  "content_generating",
  "needs_review",
  "active_outreach",
  "completed",
  "failed",
  "cancelled",
] as const;

const CAMPAIGN_LIST_POLL_MS = 30000;
const CONTENT_JOB_ACTIVE_STATES = new Set(["PENDING", "STARTED", "PROGRESS", "RETRY"]);
const CAMPAIGN_PAGE_QUERY_PARAM = "page";

type CampaignContentGenerationStatus = "preparing" | "running" | "stopping" | "paused";

type CampaignContentGenerationState = {
  status: CampaignContentGenerationStatus;
  total: number;
  completed: number;
  generated: number;
  failed: number;
  suppressed: number;
  currentLeadId: string | null;
  remainingLeadIds: string[];
  jobId?: string | null;
  message?: string | null;
};

type CampaignContentSummary = {
  loading: boolean;
  total: number;
  completed: number;
  emptyLeadIds: string[];
  error?: string | null;
};

function parseCampaignPageParam(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

function hasText(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

function isGeneratedLeadContentPresent(
  lead: Pick<LeadItem, "contentEmailSubject" | "contentEmail" | "contentSource" | "templateFallback">
) {
  const source = String(lead.contentSource || "").toLowerCase();
  return (
    hasText(lead.contentEmailSubject) &&
    hasText(lead.contentEmail) &&
    source !== "template" &&
    lead.templateFallback !== true
  );
}

function isLeadEligibleForCampaignContentGeneration(
  lead: Pick<
    LeadItem,
    "email" | "approvalStatus" | "isSuppressed" | "suppression" | "contactReadOnly"
  >
) {
  return (
    hasText(lead.email) &&
    lead.contactReadOnly !== true &&
    lead.approvalStatus !== "suppressed" &&
    lead.isSuppressed !== true &&
    !lead.suppression?.active
  );
}

function summarizeCampaignContent(leads: LeadItem[]): CampaignContentSummary {
  const eligibleLeads = leads.filter(isLeadEligibleForCampaignContentGeneration);
  const emptyLeadIds = eligibleLeads
    .filter((lead) => !isGeneratedLeadContentPresent(lead))
    .map((lead) => lead.id);
  return {
    loading: false,
    total: eligibleLeads.length,
    completed: Math.max(0, eligibleLeads.length - emptyLeadIds.length),
    emptyLeadIds,
    error: null,
  };
}

function statusUI(status: string) {
  return statusConfig[status] || {
    label: status.replaceAll("_", " "),
    style: "border-zinc-300/80 bg-zinc-100/85 text-zinc-700",
  };
}

function isManualUploadCampaign(
  campaign: Pick<CampaignListItem, "campaignType" | "manualUpload" | "campaignSource">
) {
  const campaignSource = String(campaign.campaignSource || "").toLowerCase();
  return (
    campaign.campaignType === "manual_upload" ||
    campaign.manualUpload === true ||
    campaignSource === "manual_csv_upload" ||
    campaignSource === "manual_template_upload"
  );
}

function stateFromContentGenerationJob(
  job: CampaignListItem["contentGenerationJob"] | null | undefined,
  campaign: CampaignListItem
): CampaignContentGenerationState | null {
  if (!job?.id) return null;
  const state = String(job.state || "").trim().toUpperCase();
  const pct = Math.max(0, Math.min(100, Number(job.pct || 0)));
  if (CONTENT_JOB_ACTIVE_STATES.has(state)) {
    return {
      status: job.cancelRequested ? "stopping" : "running",
      total: 100,
      completed: pct,
      generated: 0,
      failed: 0,
      suppressed: 0,
      currentLeadId: null,
      remainingLeadIds: [],
      jobId: job.id,
      message: job.message || null,
    };
  }
  if (state === "CANCELLED" || job.cancelRequested) {
    return {
      status: "paused",
      total: 100,
      completed: pct,
      generated: 0,
      failed: 0,
      suppressed: 0,
      currentLeadId: null,
      remainingLeadIds: [],
      jobId: job.id,
      message: job.message || null,
    };
  }
  if ((campaign.toApprove || 0) > 0 && state === "FAILURE") {
    return {
      status: "paused",
      total: 100,
      completed: pct,
      generated: 0,
      failed: 0,
      suppressed: 0,
      currentLeadId: null,
      remainingLeadIds: [],
      jobId: job.id,
      message: job.message || null,
    };
  }
  return null;
}

function getCampaignDisplayStatus(campaign: CampaignListItem) {
  const status = String(campaign.status || "").toLowerCase();

  if (!isManualUploadCampaign(campaign)) return status;
  if (status === "cancelled" || status === "failed" || status === "active_outreach") return status;
  if (status === "completed" || status === "needs_review" || status === "content_ready" || status === "people_ready") {
    return "completed";
  }

  return "content_generating";
}

function hasExplicitTimezone(value: string) {
  return /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value);
}

function timezoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const utcFromTz = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );

  return utcFromTz - date.getTime();
}

function parseDbTimestamp(value: string) {
  if (!value) return null;

  if (hasExplicitTimezone(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = value.replace(" ", "T");
  const m = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/
  );

  if (!m) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, y, mo, d, h, mi, s = "0", msRaw = "0"] = m;
  const ms = Number(msRaw.padEnd(3, "0").slice(0, 3));
  const guessUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s), ms);

  // DB local time is Germany (Europe/Berlin); convert that wall time to UTC.
  let offset = timezoneOffsetMs(new Date(guessUtc), "Europe/Berlin");
  let utc = guessUtc - offset;
  offset = timezoneOffsetMs(new Date(utc), "Europe/Berlin");
  utc = guessUtc - offset;

  return new Date(utc);
}

function formatCreatedAt(value: string) {
  const parsed = parseDbTimestamp(value);
  if (!parsed) return value;

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCampaignDate(value?: string | null) {
  if (!value) return "";

  const raw = String(value).trim();
  const dateOnly = raw.split("T")[0];
  const m = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (m) {
    const [, y, mo, d] = m;
    const parsed = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return raw;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function isContentGenerationAbortError(error: unknown) {
  const candidate = error as { code?: string; name?: string; message?: string } | null | undefined;
  const message = String(candidate?.message || "").toLowerCase();
  return (
    candidate?.code === "ERR_CANCELED" ||
    candidate?.name === "CanceledError" ||
    candidate?.name === "AbortError" ||
    message.includes("aborted") ||
    message.includes("canceled") ||
    message.includes("cancelled")
  );
}

type CampaignDialogTarget = {
  id: string;
  name: string;
  mode: "stop" | "delete";
};

function SuperAdminCampaignsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPage = parseCampaignPageParam(searchParams.get(CAMPAIGN_PAGE_QUERY_PARAM));
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [campaignInfoById, setCampaignInfoById] = useState<Record<string, CampaignInfo | null>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [dialogTarget, setDialogTarget] = useState<CampaignDialogTarget | null>(null);
  const [deleteBlockedDetail, setDeleteBlockedDetail] = useState<DeleteBlockedDetail | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isForceDeleting, setIsForceDeleting] = useState(false);
  const [contentGenerationByCampaign, setContentGenerationByCampaign] = useState<
    Record<string, CampaignContentGenerationState>
  >({});
  const [contentSummaryByCampaign, setContentSummaryByCampaign] = useState<
    Record<string, CampaignContentSummary>
  >({});
  const { persona } = usePersona();
  const { isSuperAdmin } = useAuth();
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const contentGenerationControllersRef = useRef<Map<string, AbortController>>(new Map());
  const contentGenerationStopRequestedRef = useRef<Set<string>>(new Set());
  const didMountFilterResetRef = useRef(false);

  const replaceCampaignPage = useCallback(
    (page: number) => {
      const nextPage = parseCampaignPageParam(String(page));
      setCurrentPage((prev) => (prev === nextPage ? prev : nextPage));

      const params = new URLSearchParams(
        typeof window === "undefined" ? "" : window.location.search
      );
      if (nextPage <= 1) {
        params.delete(CAMPAIGN_PAGE_QUERY_PARAM);
      } else {
        params.set(CAMPAIGN_PAGE_QUERY_PARAM, String(nextPage));
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  useEffect(() => {
    const pageFromUrl = parseCampaignPageParam(searchParams.get(CAMPAIGN_PAGE_QUERY_PARAM));
    setCurrentPage((prev) => (prev === pageFromUrl ? prev : pageFromUrl));
  }, [searchParams]);

  const fetchData = useCallback(async (options?: { silent?: boolean; showErrors?: boolean }) => {
    const silent = Boolean(options?.silent);
    const showErrors = options?.showErrors !== false;

    if (!silent) {
      setLoading(true);
    }

    try {
      const res = await listCampaigns({
        status: statusFilter,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        search: searchQuery.trim() || undefined,
        category: categoryFilter === "all" ? undefined : categoryFilter,
      });

      setItems(res.campaigns || []);
      setTotalItems(Number(res.total || 0));
      setCategoryOptions(res.categories || []);
    } catch (err: unknown) {
      if (showErrors) {
        toast.error("Failed to load campaigns", { description: getErrorMessage(err) });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [categoryFilter, currentPage, itemsPerPage, searchQuery, statusFilter]);

  useEffect(() => {
    let alive = true;

    (async () => {
      await fetchData();
    })();

    const t = setInterval(() => {
      if (!alive) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void fetchData({ silent: true, showErrors: false });
    }, CAMPAIGN_LIST_POLL_MS);

    const handleVisibilityChange = () => {
      if (!alive || document.visibilityState !== "visible") return;
      void fetchData({ silent: true, showErrors: false });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData, persona]);

  useEffect(() => {
    setCampaignInfoById({});
    setContentSummaryByCampaign({});
  }, [persona]);

  useEffect(() => {
    const controllers = contentGenerationControllersRef.current;
    const stopRequests = contentGenerationStopRequestedRef.current;

    return () => {
      controllers.clear();
      stopRequests.clear();
    };
  }, []);

  useEffect(() => {
    if (!isFilterOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!filterPanelRef.current) return;
      if (!filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isFilterOpen]);

  const statusFilters = useMemo(() => {
    return [
      { value: "all", label: "All statuses" },
      ...filterOnlyStatuses.map((value) => ({
        value,
        label: statusConfig[value]?.label || value.replaceAll("_", " "),
      })),
    ];
  }, []);

  const categoryFilters = useMemo(() => {
    const byKey = new Map<string, string>();

    for (const raw of categoryOptions) {
      const value = String(raw || "").trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, value);
    }

    for (const campaign of items) {
      const raw = String(campaign.category || campaignInfoById[campaign.id]?.category || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, raw);
    }

    if (categoryFilter !== "all") {
      const selected = categoryFilter.trim();
      if (selected && !byKey.has(selected.toLowerCase())) byKey.set(selected.toLowerCase(), selected);
    }

    const values = Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
    return [{ value: "all", label: "All categories" }, ...values.map((value) => ({ value, label: value }))];
  }, [categoryOptions, categoryFilter, items, campaignInfoById]);

  useEffect(() => {
    if (loading || items.length === 0) return;
    const viewport = listViewportRef.current;
    if (!viewport) return;

    let rafId = 0;
    const recompute = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const sampleRow = viewport.querySelector<HTMLElement>("[data-campaign-row='true']");
        const isDesktop = window.matchMedia("(min-width: 768px)").matches;
        const fallbackRowHeight = isDesktop ? 154 : 210;
        const rowHeight = sampleRow?.getBoundingClientRect().height || fallbackRowHeight;
        const availableHeight = viewport.clientHeight;
        if (!rowHeight || !availableHeight) return;

        const maxRows = Math.max(1, Math.floor((availableHeight + 4) / rowHeight));
        setItemsPerPage((prev) => (prev === maxRows ? prev : maxRows));
      });
    };

    recompute();

    const resizeObserver = new ResizeObserver(recompute);
    resizeObserver.observe(viewport);
    window.addEventListener("resize", recompute);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [items.length, loading]);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const visibleItems = items;

  useEffect(() => {
    if (items.length === 0) return;
    setContentGenerationByCampaign((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const campaign of items) {
        const serverState = stateFromContentGenerationJob(campaign.contentGenerationJob, campaign);
        if (serverState) {
          const current = next[campaign.id];
          if (
            !current ||
            current.jobId !== serverState.jobId ||
            current.status !== serverState.status ||
            current.completed !== serverState.completed
          ) {
            next[campaign.id] = serverState;
            changed = true;
          }
          continue;
        }
        if (next[campaign.id]?.jobId) {
          delete next[campaign.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min((currentPage - 1) * itemsPerPage + visibleItems.length, totalItems);

  const visiblePageNumbers = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const activeFilters =
    statusFilter !== "all" || categoryFilter !== "all" || searchQuery.trim().length > 0;

  useEffect(() => {
    if (!didMountFilterResetRef.current) {
      didMountFilterResetRef.current = true;
      return;
    }

    replaceCampaignPage(1);
  }, [categoryFilter, replaceCampaignPage, searchQuery, statusFilter]);

  useEffect(() => {
    if (loading) return;
    if (currentPage > totalPages) {
      replaceCampaignPage(totalPages);
    }
  }, [currentPage, loading, replaceCampaignPage, totalPages]);

  useEffect(() => {
    if (loading || visibleItems.length === 0) return;

    const missingIds = visibleItems
      .map((campaign) => campaign.id)
      .filter((id) => !(id in campaignInfoById));

    if (missingIds.length === 0) return;

    let cancelled = false;

    (async () => {
      const pairs = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const res = await getCampaignInfo(id);
            return [id, res.info] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );

      if (cancelled) return;

      setCampaignInfoById((prev) => {
        const next = { ...prev };
        for (const [id, info] of pairs) {
          if (!(id in next)) next[id] = info;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, visibleItems, campaignInfoById]);

  useEffect(() => {
    if (loading || visibleItems.length === 0) return;

    const ids = visibleItems.map((campaign) => campaign.id);
    let cancelled = false;

    setContentSummaryByCampaign((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = {
          ...(next[id] || { total: 0, completed: 0, emptyLeadIds: [] }),
          loading: true,
          error: null,
        };
      }
      return next;
    });

    (async () => {
      const pairs = await Promise.all(
        ids.map(async (id) => {
          try {
            const response = await getCampaignLeads(id, "all");
            return [id, summarizeCampaignContent(response.leads || [])] as const;
          } catch (error: unknown) {
            return [
              id,
              {
                loading: false,
                total: 0,
                completed: 0,
                emptyLeadIds: [],
                error: getErrorMessage(error),
              } satisfies CampaignContentSummary,
            ] as const;
          }
        })
      );

      if (cancelled) return;

      setContentSummaryByCampaign((prev) => {
        const next = { ...prev };
        for (const [id, summary] of pairs) {
          next[id] = summary;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, visibleItems]);

  const closeDialog = () => {
    if (isStopping || isDeleting || isForceDeleting) return;
    setDialogTarget(null);
    setDeleteBlockedDetail(null);
  };

  const openDialog = (
    mode: CampaignDialogTarget["mode"],
    id: string,
    campaignName: string,
    event?: React.MouseEvent
  ) => {
    event?.preventDefault();
    if (!isSuperAdmin) return;
    setDeleteBlockedDetail(null);
    setDialogTarget({ id, name: campaignName, mode });
  };

  const clearCampaignContentGeneration = (campaignId: string) => {
    contentGenerationStopRequestedRef.current.delete(campaignId);
    const controller = contentGenerationControllersRef.current.get(campaignId);
    if (controller) {
      controller.abort();
      contentGenerationControllersRef.current.delete(campaignId);
    }
    setContentGenerationByCampaign((prev) => {
      const next = { ...prev };
      delete next[campaignId];
      return next;
    });
  };

  const setCampaignContentGenerationState = (
    campaignId: string,
    state: CampaignContentGenerationState
  ) => {
    setContentGenerationByCampaign((prev) => ({ ...prev, [campaignId]: state }));
  };

  const loadCampaignContentSummary = useCallback(
    async (campaignId: string, options?: { silent?: boolean; throwOnError?: boolean }) => {
      if (!options?.silent) {
        setContentSummaryByCampaign((prev) => ({
          ...prev,
          [campaignId]: {
            ...(prev[campaignId] || { total: 0, completed: 0, emptyLeadIds: [] }),
            loading: true,
            error: null,
          },
        }));
      }

      try {
        const response = await getCampaignLeads(campaignId, "all");
        const summary = summarizeCampaignContent(response.leads || []);
        setContentSummaryByCampaign((prev) => ({ ...prev, [campaignId]: summary }));
        return summary;
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        setContentSummaryByCampaign((prev) => ({
          ...prev,
          [campaignId]: {
            ...(prev[campaignId] || { total: 0, completed: 0, emptyLeadIds: [] }),
            loading: false,
            error: message,
          },
        }));
        if (options?.throwOnError) throw error;
        return null;
      }
    },
    []
  );

  useEffect(() => {
    if (loading || visibleItems.length === 0) return;

    const activeIds = visibleItems
      .filter((campaign) => {
        const state =
          contentGenerationByCampaign[campaign.id] ||
          stateFromContentGenerationJob(campaign.contentGenerationJob, campaign);
        return (
          state?.status === "preparing" ||
          state?.status === "running" ||
          state?.status === "stopping"
        );
      })
      .map((campaign) => campaign.id);

    if (activeIds.length === 0) return;

    let cancelled = false;
    const refresh = () => {
      if (cancelled) return;
      for (const id of activeIds) {
        void loadCampaignContentSummary(id, { silent: true });
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [contentGenerationByCampaign, loading, loadCampaignContentSummary, visibleItems]);

  const runCampaignContentGenerationQueue = async (
    campaignId: string,
    leadIds: string[],
    stats?: Pick<CampaignContentGenerationState, "total" | "completed" | "generated" | "failed" | "suppressed">
  ) => {
    const total = stats?.total ?? leadIds.length;
    let completed = stats?.completed ?? 0;
    let generated = stats?.generated ?? 0;
    let failed = stats?.failed ?? 0;
    let suppressed = stats?.suppressed ?? 0;
    let queued = 0;

    if (leadIds.length === 0) {
      clearCampaignContentGeneration(campaignId);
      return;
    }

    contentGenerationStopRequestedRef.current.delete(campaignId);

    const controller = new AbortController();
    contentGenerationControllersRef.current.set(campaignId, controller);
    setCampaignContentGenerationState(campaignId, {
      status: "running",
      total,
      completed,
      generated,
      failed,
      suppressed,
      currentLeadId: leadIds[0] || null,
      remainingLeadIds: leadIds,
    });

    try {
      const response = await generateCampaignLeadContent({
        campaignId,
        leadIds,
        signal: controller.signal,
      });
      if (response?.queued) {
        queued = leadIds.length;
        setCampaignContentGenerationState(campaignId, {
          status: "running",
          total,
          completed,
          generated,
          failed,
          suppressed,
          currentLeadId: leadIds[0] || null,
          remainingLeadIds: leadIds,
          jobId: response.jobId || null,
        });
        toast.success("Content generation queued", {
          description: `${queued} lead${queued === 1 ? "" : "s"} sent to one sequential content worker.`,
        });
        await fetchData({ silent: true, showErrors: false });
        await loadCampaignContentSummary(campaignId, { silent: true });
        return;
      }
      completed += leadIds.length;
      generated += Number(response?.generatedCount ?? 0);
      failed += Number(response?.failedCount ?? 0);
      suppressed += Number(response?.suppressedCount ?? 0);
      toast.success("Content generation completed", {
        description: `Generated ${generated} lead${generated === 1 ? "" : "s"}. ${
          failed || suppressed ? `Skipped/failed ${failed + suppressed}.` : ""
        }`,
      });
    } catch (error: unknown) {
      if (isContentGenerationAbortError(error)) {
        contentGenerationStopRequestedRef.current.add(campaignId);
        setCampaignContentGenerationState(campaignId, {
          status: "paused",
          total,
          completed,
          generated,
          failed,
          suppressed,
          currentLeadId: null,
          remainingLeadIds: leadIds,
        });
        toast.info("Content generation stopped", {
          description: `${completed}/${total} lead${total === 1 ? "" : "s"} processed. Use Continue to resume.`,
        });
        await fetchData({ silent: true, showErrors: false });
        return;
      }
      failed += leadIds.length;
      toast.error("Content generation failed", { description: getErrorMessage(error) });
    } finally {
      if (contentGenerationControllersRef.current.get(campaignId) === controller) {
        contentGenerationControllersRef.current.delete(campaignId);
      }
    }
    await fetchData({ silent: true, showErrors: false });
    await loadCampaignContentSummary(campaignId, { silent: true });
    clearCampaignContentGeneration(campaignId);
  };

  const handleGenerateCampaignContent = async (
    campaign: CampaignListItem,
    event?: React.MouseEvent,
    options?: { force?: boolean }
  ) => {
    event?.preventDefault();
    if (!isSuperAdmin) return;
    if (!options?.force && contentGenerationByCampaign[campaign.id]) return;

    setCampaignContentGenerationState(campaign.id, {
      status: "preparing",
      total: 0,
      completed: 0,
      generated: 0,
      failed: 0,
      suppressed: 0,
      currentLeadId: null,
      remainingLeadIds: [],
    });

    try {
      const summary = await loadCampaignContentSummary(campaign.id, { throwOnError: true });
      const emptyLeadIds = [...(summary?.emptyLeadIds || [])];
      const total = Number(summary?.total || 0);
      const completed = Number(summary?.completed || 0);

      if (emptyLeadIds.length === 0) {
        clearCampaignContentGeneration(campaign.id);
        toast.info("No leads need content", {
          description: "This campaign has no empty lead content left to generate.",
        });
        return;
      }

      if (contentGenerationStopRequestedRef.current.has(campaign.id)) {
        setCampaignContentGenerationState(campaign.id, {
          status: "paused",
          total,
          completed,
          generated: 0,
          failed: 0,
          suppressed: 0,
          currentLeadId: null,
          remainingLeadIds: emptyLeadIds,
        });
        toast.info("Content generation stopped", {
          description: `${completed}/${total} lead${total === 1 ? "" : "s"} processed. Use Continue to resume.`,
        });
        return;
      }

      setCampaignContentGenerationState(campaign.id, {
        status: "running",
        total,
        completed,
        generated: 0,
        failed: 0,
        suppressed: 0,
        currentLeadId: null,
        remainingLeadIds: emptyLeadIds,
      });

      await runCampaignContentGenerationQueue(campaign.id, emptyLeadIds, {
        total,
        completed,
        generated: 0,
        failed: 0,
        suppressed: 0,
      });
    } catch (error: unknown) {
      const controller = contentGenerationControllersRef.current.get(campaign.id);
      if (controller) contentGenerationControllersRef.current.delete(campaign.id);
      if (isContentGenerationAbortError(error)) {
        setCampaignContentGenerationState(campaign.id, {
          status: "paused",
          total: 0,
          completed: 0,
          generated: 0,
          failed: 0,
          suppressed: 0,
          currentLeadId: null,
          remainingLeadIds: [],
        });
        toast.info("Content generation stopped", {
          description: "The campaign generation request was stopped before leads were selected.",
        });
      } else {
        clearCampaignContentGeneration(campaign.id);
        toast.error("Content generation failed", { description: getErrorMessage(error) });
      }
    }
  };

  const handleStopCampaignContentGeneration = async (campaignId: string, event?: React.MouseEvent) => {
    event?.preventDefault();
    if (!isSuperAdmin) return;
    const campaign = items.find((item) => item.id === campaignId);
    const state =
      contentGenerationByCampaign[campaignId] ||
      (campaign ? stateFromContentGenerationJob(campaign.contentGenerationJob, campaign) : null);
    if (!state || state.status === "paused" || state.status === "stopping") return;

    contentGenerationStopRequestedRef.current.add(campaignId);
    const controller = contentGenerationControllersRef.current.get(campaignId);
    const stopMessage = "Stop requested. The current lead step will finish before the worker stops.";
    setContentGenerationByCampaign((prev) => ({
      ...prev,
      [campaignId]: { ...state, status: "stopping", message: stopMessage },
    }));
    if (state.jobId) {
      try {
        await cancelCampaignContentGenerationJob(campaignId, state.jobId);
        toast.info("Content generation stop requested", {
          description: stopMessage,
        });
        await fetchData({ silent: true, showErrors: false });
      } catch (error: unknown) {
        setContentGenerationByCampaign((prev) => ({
          ...prev,
          [campaignId]: state,
        }));
        toast.error("Stop content generation failed", { description: getErrorMessage(error) });
      }
      return;
    }
    if (controller) controller.abort();
  };

  const handleContinueCampaignContentGeneration = async (campaignId: string, event?: React.MouseEvent) => {
    event?.preventDefault();
    if (!isSuperAdmin) return;
    const campaign = items.find((item) => item.id === campaignId);
    const state =
      contentGenerationByCampaign[campaignId] ||
      (campaign ? stateFromContentGenerationJob(campaign.contentGenerationJob, campaign) : null);
    if (!state || state.status !== "paused") return;

    const remainingLeadIds = [...state.remainingLeadIds];
    if (remainingLeadIds.length === 0) {
      if (campaign) {
        contentGenerationStopRequestedRef.current.delete(campaignId);
        await handleGenerateCampaignContent(campaign, undefined, { force: true });
        return;
      }
      clearCampaignContentGeneration(campaignId);
      return;
    }

    await runCampaignContentGenerationQueue(campaignId, remainingLeadIds, {
      total: state.total,
      completed: state.completed,
      generated: state.generated,
      failed: state.failed,
      suppressed: state.suppressed,
    });
  };

  const handleStopConfirm = async () => {
    if (!isSuperAdmin || !dialogTarget || dialogTarget.mode !== "stop" || isStopping) return;
    const campaignId = dialogTarget.id;

    setIsStopping(true);
    setItems((prev) => prev.map((c) => (c.id === campaignId ? { ...c, status: "cancelled" } : c)));

    try {
      const res = await stopCampaign(campaignId);
      toast.success("Stop requested", { description: res.message || "Campaign stopping..." });
      setDialogTarget(null);
      setDeleteBlockedDetail(null);
      void fetchData();
    } catch (err: unknown) {
      toast.error("Stop failed", { description: getErrorMessage(err) });
      void fetchData();
    } finally {
      setIsStopping(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!isSuperAdmin || !dialogTarget || dialogTarget.mode !== "delete" || isDeleting) return;
    const campaignId = dialogTarget.id;

    setIsDeleting(true);

    try {
      const result = await deleteCampaign(campaignId);

      if (!result.ok) {
        setDeleteBlockedDetail(result.detail);
        if (result.detail.blockers.some((blocker) => blocker.code === "campaign_not_terminal")) {
          toast.info("Stop the campaign first", { description: result.detail.message });
        }
        return;
      }

      setItems((prev) => prev.filter((campaign) => campaign.id !== campaignId));
      setCampaignInfoById((prev) => {
        const next = { ...prev };
        delete next[campaignId];
        return next;
      });
      setDialogTarget(null);
      setDeleteBlockedDetail(null);
      toast.success("Campaign deleted", { description: result.data.message });
    } catch (err: unknown) {
      toast.error("Delete failed", { description: getErrorMessage(err) });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleForceDeleteConfirm = async () => {
    if (!isSuperAdmin || !dialogTarget || dialogTarget.mode !== "delete" || !deleteBlockedDetail || isForceDeleting) return;
    const campaignId = dialogTarget.id;

    setIsForceDeleting(true);

    try {
      const result = await forceDeleteCampaign(campaignId);
      setItems((prev) => prev.filter((campaign) => campaign.id !== campaignId));
      setCampaignInfoById((prev) => {
        const next = { ...prev };
        delete next[campaignId];
        return next;
      });
      setDialogTarget(null);
      setDeleteBlockedDetail(null);
      toast.success("Campaign force deleted", { description: result.message });
      void fetchData();
    } catch (err: unknown) {
      toast.error("Force delete failed", { description: getErrorMessage(err) });
    } finally {
      setIsForceDeleting(false);
    }
  };

  const isStopAllowed = (campaign: CampaignListItem) => {
    if (isManualUploadCampaign(campaign)) {
      return getCampaignDisplayStatus(campaign) === "content_generating";
    }
    return !["cancelled", "completed", "failed"].includes(String(campaign.status || "").toLowerCase());
  };

  const listShell =
    "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-300/80 bg-white/32 backdrop-blur-[8px]";

  return (
    <div className="font-sans flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-transparent p-1">
      <div className="relative z-10 flex shrink-0 flex-col gap-4 border-b border-zinc-100/90 bg-transparent pb-6 backdrop-blur-[8px] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-light leading-[1.12] tracking-[-0.025em] text-zinc-950 sm:text-4xl 2xl:text-5xl">Campaigns</h1>
          <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-zinc-500">
            Manage and track your lead generation workflows
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div ref={filterPanelRef} className="relative">
            <Button
              type="button"
              className="analytics-frost-btn h-10 px-4"
              onClick={() => setIsFilterOpen((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFilters && (
                <span className="rounded-full bg-zinc-900/12 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                  {totalItems}
                </span>
              )}
            </Button>

            {isFilterOpen && (
              <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-zinc-300 bg-white p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.85),0_16px_24px_-14px_rgba(2,10,27,0.24),0_6px_12px_-8px_rgba(15,23,42,0.14)]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-800">Filter Campaigns</p>
                  {activeFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                        setCategoryFilter("all");
                        setSearchQuery("");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Name, ICP, or campaign ID"
                      className="h-9 border-zinc-300/80 bg-white/80 pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {statusFilters.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setStatusFilter(option.value)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          statusFilter === option.value
                            ? "border-zinc-300 bg-zinc-900 text-white"
                            : "border-zinc-300 bg-white/82 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categoryFilters.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCategoryFilter(option.value)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          categoryFilter === option.value
                            ? "border-zinc-300 bg-zinc-900 text-white"
                            : "border-zinc-300 bg-white/82 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-300/70 pt-3 text-xs text-zinc-500">
                  <span>{totalItems} campaigns match</span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsFilterOpen(false)}
                    className="h-7 rounded-md border border-zinc-300/80 bg-white/80 px-2.5 text-xs font-medium text-zinc-700 hover:bg-white"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>

          {isSuperAdmin ? (
            <Link href="/campaigns/new">
              <Button className="btn-sidebar-noise h-10">
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 pr-1">
        <div className={listShell}>
          <div className="hidden grid-cols-[minmax(0,2.25fr)_minmax(250px,0.95fr)_minmax(300px,1fr)] items-center gap-6 border-b border-zinc-300/80 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 md:grid">
            <span>Campaign</span>
            <span>Metrics</span>
            <span className="text-right">Actions</span>
          </div>

          <div ref={listViewportRef} className="min-h-0 flex-1 overflow-hidden">
            {loading && <div className="px-5 py-8 text-sm text-zinc-500">Loading campaigns...</div>}

            {!loading && visibleItems.length === 0 && (
              <div className="px-5 py-8 text-sm text-zinc-500">
                {activeFilters ? "No campaigns match the current filters." : "No campaigns found."}
              </div>
            )}

            {!loading &&
              visibleItems.map((campaign, index) => {
                const displayStatus = getCampaignDisplayStatus(campaign);
                const s = statusUI(displayStatus);
                const StatusIcon = s.icon;
                const campaignInfo = campaignInfoById[campaign.id];
                const category = campaign.category || campaignInfo?.category;
                const location = campaign.location || campaignInfo?.location;
                const eventDate = campaign.date || campaignInfo?.date;
                const creatorName = campaign.createdByUserDisplayName || campaign.createdByUsername || "";
                const creatorText = creatorName
                  ? `${isManualUploadCampaign(campaign) ? "Uploaded" : "Created"} by ${creatorName}`
                  : "Creator not recorded";
                const contentGenerationState =
                  contentGenerationByCampaign[campaign.id] ||
                  stateFromContentGenerationJob(campaign.contentGenerationJob, campaign);
                const contentSummary = contentSummaryByCampaign[campaign.id];
                const emptyContentLeadIds = contentSummary?.emptyLeadIds || [];
                const emptyContentCount = emptyContentLeadIds.length;
                const contentSummaryTotal = Number(contentSummary?.total || 0);
                const contentSummaryCompleted = Number(contentSummary?.completed || 0);
                const isPreparingContent = contentGenerationState?.status === "preparing";
                const isRunningContent =
                  contentGenerationState?.status === "preparing" ||
                  contentGenerationState?.status === "running" ||
                  contentGenerationState?.status === "stopping";
                const isContentPaused = contentGenerationState?.status === "paused";
                const isJobBackedContentState = Boolean(contentGenerationState?.jobId);
                const activeContentCompleted =
                  isJobBackedContentState && contentSummaryTotal > 0
                    ? contentSummaryCompleted
                    : contentGenerationState?.completed ?? contentSummaryCompleted;
                const activeContentTotal =
                  isJobBackedContentState && contentSummaryTotal > 0
                    ? contentSummaryTotal
                    : contentGenerationState?.total || contentSummaryTotal;
                const contentProgressLabel =
                  activeContentTotal > 0
                    ? `${activeContentCompleted}/${activeContentTotal}`
                    : "";
                const contentSummaryProgressLabel =
                  contentSummaryTotal > 0 ? `${contentSummaryCompleted}/${contentSummaryTotal}` : "";
                const shouldShowGenerateContent =
                  isSuperAdmin &&
                  !isRunningContent &&
                  !isContentPaused &&
                  !contentSummary?.loading &&
                  contentSummaryTotal > 0 &&
                  emptyContentCount === contentSummaryTotal;
                const shouldShowContinueContent =
                  isSuperAdmin &&
                  !isRunningContent &&
                  !isContentPaused &&
                  !contentSummary?.loading &&
                  contentSummaryTotal > 0 &&
                  emptyContentCount > 0 &&
                  emptyContentCount < contentSummaryTotal;

                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    data-campaign-row="true"
                    className="group border-b border-zinc-300/75 transition-colors hover:bg-white/30 last:border-b-0"
                  >
                    <div className="grid gap-5 px-6 py-4 md:min-h-[9.75rem] md:grid-cols-[minmax(0,2.25fr)_minmax(250px,0.95fr)_minmax(300px,1fr)] md:items-start">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide shadow-none ${s.style}`}
                          >
                            {StatusIcon && (
                              <StatusIcon className={`mr-1.5 h-3 w-3 ${s.spin ? "animate-spin" : ""}`} />
                            )}
                            {s.label}
                          </Badge>

                          {category ? (
                            <>
                              <span className="h-4 w-px bg-zinc-300/80" aria-hidden="true" />
                              <Badge className="rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-blue-700 shadow-none">
                                {category}
                              </Badge>
                            </>
                          ) : null}

                        </div>

                        <Link href={`/campaigns/${campaign.id}`} className="block">
                          <h3 className="truncate text-base font-semibold text-zinc-900 transition-colors hover:text-blue-700">
                            {campaign.name}
                          </h3>
                        </Link>

                        {isSuperAdmin ? (
                          <p className="mt-1 truncate text-xs font-medium text-zinc-500">
                            {creatorText}
                          </p>
                        ) : null}

                        {(displayStatus === "processing" || displayStatus === "content_generating") && (
                          <div className="mt-3 max-w-xs">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${campaign.progress || 0}%` }}
                                className="h-full rounded-full bg-sidebar-primary"
                              />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[10px] font-medium text-zinc-500">Progress</span>
                              <span className="text-[10px] font-bold text-zinc-800">
                                {campaign.progress || 0}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 md:self-start md:pt-8">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                            Total Leads
                          </p>
                          <p className="mt-0.5 text-2xl font-bold leading-none text-zinc-900">
                            {campaign.totalLeads}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                            To Approve
                          </p>
                          <p
                            className={`mt-0.5 text-2xl font-bold leading-none ${
                              campaign.toApprove > 0 ? "text-zinc-900" : "text-zinc-300"
                            }`}
                          >
                            {campaign.toApprove}
                          </p>
                        </div>
                      </div>

                      <div className="flex min-h-[4.5rem] flex-col gap-3 md:items-end md:pt-8">
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          {isSuperAdmin && isStopAllowed(campaign) ? (
                            <Button
                              onClick={(e) => openDialog("stop", campaign.id, campaign.name, e)}
                              className="h-9 rounded-md border border-red-700 bg-red-600 px-3.5 text-xs font-semibold text-white shadow-[0_8px_14px_-10px_rgba(185,28,28,0.68)] hover:border-red-800 hover:bg-red-700 hover:text-white"
                            >
                              <Square className="mr-1.5 h-3 w-3 fill-current" />
                              Stop
                            </Button>
                          ) : null}

                          {isSuperAdmin ? (
                            <Button
                              onClick={(e) => openDialog("delete", campaign.id, campaign.name, e)}
                              className="h-9 rounded-md border border-red-200/85 bg-white/82 px-3.5 text-xs font-semibold text-red-600 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          ) : null}

                          {isSuperAdmin && isRunningContent ? (
                            <Button
                              type="button"
                              onClick={(e) => void handleStopCampaignContentGeneration(campaign.id, e)}
                              disabled={contentGenerationState?.status === "stopping"}
                              title={
                                contentGenerationState?.status === "stopping"
                                  ? contentGenerationState.message || "Stop requested. Waiting for the current lead step to finish."
                                  : isPreparingContent
                                  ? "Stop after campaign leads are loaded"
                                  : "Stop content generation for this campaign"
                              }
                              className="h-9 rounded-md border border-amber-300 bg-amber-50 px-3.5 text-xs font-semibold text-amber-800 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.35),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-amber-400 hover:bg-amber-100 hover:text-amber-900 disabled:opacity-70"
                            >
                              {contentGenerationState?.status === "stopping" ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Square className="mr-1.5 h-3 w-3 fill-current" />
                              )}
                              {contentGenerationState?.status === "stopping" ? "Stopping after lead" : "Stop"}
                              {contentProgressLabel ? (
                                <span className="ml-1.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px]">
                                  {contentProgressLabel}
                                </span>
                              ) : null}
                            </Button>
                          ) : isSuperAdmin && isContentPaused ? (
                            <Button
                              type="button"
                              onClick={(e) => void handleContinueCampaignContentGeneration(campaign.id, e)}
                              title={
                                (contentGenerationState?.remainingLeadIds.length ?? 0) > 0
                                  ? `Continue remaining ${contentGenerationState?.remainingLeadIds.length ?? 0} lead${
                                      (contentGenerationState?.remainingLeadIds.length ?? 0) === 1 ? "" : "s"
                                    }`
                                  : "Continue campaign content generation"
                              }
                              className="h-9 rounded-md border border-blue-200/85 bg-blue-50 px-3.5 text-xs font-semibold text-blue-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.35),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800"
                            >
                              <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                              Continue
                              {contentProgressLabel ? (
                                <span className="ml-1.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px]">
                                  {contentProgressLabel}
                                </span>
                              ) : null}
                            </Button>
                          ) : shouldShowGenerateContent ? (
                            <Button
                              type="button"
                              onClick={(e) => handleGenerateCampaignContent(campaign, e)}
                              title={`Generate personalized content for ${emptyContentCount} empty lead${
                                emptyContentCount === 1 ? "" : "s"
                              }`}
                              className="h-9 rounded-md border border-violet-200/85 bg-white/82 px-3.5 text-xs font-semibold text-violet-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-white/82"
                            >
                              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                              Generate Content
                            </Button>
                          ) : shouldShowContinueContent ? (
                            <Button
                              type="button"
                              onClick={(e) => handleGenerateCampaignContent(campaign, e)}
                              title={`Continue generating content for ${emptyContentCount} empty lead${
                                emptyContentCount === 1 ? "" : "s"
                              }`}
                              className="h-9 rounded-md border border-blue-200/85 bg-blue-50 px-3.5 text-xs font-semibold text-blue-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.35),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800"
                            >
                              <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                              Continue
                              {contentSummaryProgressLabel ? (
                                <span className="ml-1.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px]">
                                  {contentSummaryProgressLabel}
                                </span>
                              ) : null}
                            </Button>
                          ) : null}

                          <Link href={`/campaigns/${campaign.id}`}>
                            <Button
                              className="h-9 rounded-md border border-zinc-300/80 bg-white/82 px-3.5 text-xs font-semibold text-zinc-700 shadow-[0_8px_14px_-12px_rgba(2,10,27,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
                            >
                              View Details
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 px-6 py-2.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs text-zinc-500">
                        {location ? (
                          <span className="inline-flex min-w-0 items-center">
                            <span className="max-w-[13rem] truncate">{location}</span>
                          </span>
                        ) : null}

                        {location && eventDate ? (
                          <span className="h-3.5 w-px bg-zinc-300/80" aria-hidden="true" />
                        ) : null}

                        {eventDate ? (
                          <span className="inline-flex items-center">
                            {formatCampaignDate(eventDate)}
                          </span>
                        ) : null}
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                        <Clock className="h-3.5 w-3.5" />
                        Created {formatCreatedAt(campaign.createdAt)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
          </div>

          {!loading && visibleItems.length > 0 && (
            <div className="flex shrink-0 items-center justify-between border-t border-zinc-300/80 px-6 py-3">
              <span className="text-xs text-zinc-500">
                Showing {rangeStart}-{rangeEnd} of {totalItems}
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => replaceCampaignPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8 rounded-md border border-zinc-300/80 bg-white/82 px-2 text-zinc-600 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                {visiblePageNumbers.map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => replaceCampaignPage(pageNum)}
                    className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold transition-colors ${
                      pageNum === currentPage
                        ? "border-zinc-300 bg-zinc-900 text-white"
                        : "border-zinc-300/80 bg-white/82 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => replaceCampaignPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 rounded-md border border-zinc-300/80 bg-white/82 px-2 text-zinc-600 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CampaignActionDialog
        open={Boolean(dialogTarget)}
        mode={dialogTarget?.mode ?? "stop"}
        campaignName={dialogTarget?.name ?? "Campaign"}
        isBusy={isStopping || isDeleting || isForceDeleting}
        blockedDetail={deleteBlockedDetail}
        onClose={closeDialog}
        onConfirmStop={handleStopConfirm}
        onConfirmDelete={handleDeleteConfirm}
        onConfirmForceDelete={handleForceDeleteConfirm}
      />
    </div>
  );
}

export default function CampaignsPage() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <SuperAdminCampaignsPage /> : <NormalUserEventsPage />;
}
