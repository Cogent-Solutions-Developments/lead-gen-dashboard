"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  MailCheck,
  MessageSquareReply,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";

import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import { SettingsBackButton } from "@/components/settings/SettingsBackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignListItem } from "@/lib/api";
import {
  getOutreachCampaignSummary,
  listOutreachCampaigns,
  outreachDepartments,
  type OutreachAnalyticsSummary,
  type OutreachDepartment,
} from "@/lib/outreachAnalytics";

const PAGE_SIZE = 25;
const countFormatter = new Intl.NumberFormat();
type CampaignLoad = { key: string; campaigns: CampaignListItem[]; total: number; error: string };
type SummaryLoad = { key: string; summary: OutreachAnalyticsSummary | null; error: string };

function metric(value: number | undefined) {
  return countFormatter.format(value ?? 0);
}

function percent(value: number | undefined) {
  return `${(value ?? 0).toFixed(1)}%`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load outreach analytics.";
}

export default function OutreachAnalyticsPage() {
  const [department, setDepartment] = useState<OutreachDepartment>("sales");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [campaignLoad, setCampaignLoad] = useState<CampaignLoad>({ key: "", campaigns: [], total: 0, error: "" });
  const [summaryLoad, setSummaryLoad] = useState<SummaryLoad>({ key: "", summary: null, error: "" });
  const campaignKey = `${department}:${page}:${search}:${refreshKey}`;
  const currentCampaignLoad = campaignLoad.key === campaignKey ? campaignLoad : null;
  const campaigns = currentCampaignLoad?.campaigns ?? [];
  const total = currentCampaignLoad?.total ?? 0;
  const campaignError = currentCampaignLoad?.error ?? "";
  const loadingCampaigns = currentCampaignLoad === null;
  const activeCampaignId = campaigns.some((campaign) => campaign.id === selectedCampaignId)
    ? selectedCampaignId
    : "";
  const summaryKey = `${department}:${activeCampaignId}:${refreshKey}`;
  const currentSummaryLoad = summaryLoad.key === summaryKey ? summaryLoad : null;
  const summary = currentSummaryLoad?.summary ?? null;
  const summaryError = currentSummaryLoad?.error ?? "";
  const loadingSummary = Boolean(activeCampaignId && !currentSummaryLoad);

  useEffect(() => {
    const controller = new AbortController();
    void listOutreachCampaigns(
      department,
      { limit: PAGE_SIZE, offset: page * PAGE_SIZE, search: search || undefined },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        const nextCampaigns = result.campaigns ?? [];
        setCampaignLoad({ key: campaignKey, campaigns: nextCampaigns, total: result.total ?? 0, error: "" });
        setSelectedCampaignId((current) =>
          nextCampaigns.some((campaign) => campaign.id === current)
            ? current
            : nextCampaigns[0]?.id ?? "",
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCampaignLoad({ key: campaignKey, campaigns: [], total: 0, error: errorMessage(error) });
        setSelectedCampaignId("");
      });
    return () => controller.abort();
  }, [campaignKey, department, page, search]);

  useEffect(() => {
    if (!activeCampaignId) return;
    const controller = new AbortController();
    void getOutreachCampaignSummary(department, activeCampaignId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSummaryLoad({ key: summaryKey, summary: result, error: "" });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setSummaryLoad({ key: summaryKey, summary: null, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [activeCampaignId, department, summaryKey]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);
  const counts = summary?.counts;
  const rates = summary?.rates;

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchDraft.trim());
    setSelectedCampaignId("");
  };

  const handleDepartmentChange = (value: OutreachDepartment) => {
    setDepartment(value);
    setPage(0);
    setSearch("");
    setSearchDraft("");
    setSelectedCampaignId("");
  };

  const journey = summary
    ? [
        { label: "Sent", value: counts?.sent ?? 0, color: "bg-blue-600" },
        { label: "Estimated delivered", value: counts?.estimatedDelivered ?? 0, color: "bg-sky-500" },
        { label: "Possible opens", value: counts?.opened ?? 0, color: "bg-indigo-500" },
        { label: "Replies", value: counts?.replied ?? 0, color: "bg-emerald-500" },
      ]
    : [];

  return (
    <AdminPanelShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SettingsBackButton href="/settings" />
            <h1 className="text-2xl font-bold text-slate-900">Outreach Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">
              Campaign-level email signals from Make and Outlook.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loadingCampaigns || loadingSummary}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </header>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Choose a campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Department
                <select
                  value={department}
                  onChange={(event) => handleDepartmentChange(event.target.value as OutreachDepartment)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {outreachDepartments.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Campaign
                <select
                  value={selectedCampaignId}
                  onChange={(event) => setSelectedCampaignId(event.target.value)}
                  disabled={loadingCampaigns || campaigns.length === 0}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-slate-100"
                >
                  {campaigns.length === 0 && <option value="">No campaigns on this page</option>}
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </label>
              <form onSubmit={handleSearch} className="space-y-1.5">
                <label htmlFor="outreach-campaign-search" className="block text-sm font-medium text-slate-700">
                  Find a campaign
                </label>
                <div className="flex gap-2">
                  <input
                    id="outreach-campaign-search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Search by campaign name"
                    className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <Button type="submit" variant="outline" disabled={loadingCampaigns}>
                    <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                    Search
                  </Button>
                </div>
              </form>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>{loadingCampaigns ? "Loading campaigns…" : `${metric(total)} campaigns found`}</span>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" disabled={page === 0 || loadingCampaigns} onClick={() => { setSelectedCampaignId(""); setPage((current) => current - 1); }} aria-label="Previous campaigns page">
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span>Page {page + 1}</span>
                <Button type="button" size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= total || loadingCampaigns} onClick={() => { setSelectedCampaignId(""); setPage((current) => current + 1); }} aria-label="Next campaigns page">
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            {campaignError && <p role="alert" className="text-sm text-rose-700">Unable to load campaigns: {campaignError}</p>}
          </CardContent>
        </Card>

        {loadingSummary && <p role="status" className="text-sm text-slate-500">Loading outreach results…</p>}
        {summaryError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load outreach results: {summaryError}</p>}
        {!loadingCampaigns && !campaignError && campaigns.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">No campaigns match this selection.</p>
        )}

        {summary && selectedCampaign && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{selectedCampaign.name}</h2>
              <p className="text-sm text-slate-500">{metric(counts?.tracked)} tracked email attempts</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "Sent", value: counts?.sent, detail: `${percent(rates?.sendSuccessRate)} send success`, icon: Send },
                { label: "Estimated delivered", value: counts?.estimatedDelivered, detail: `${percent(rates?.deliveryRateEstimated)} of sent`, icon: MailCheck },
                { label: "Possible opens", value: counts?.opened, detail: `${percent(rates?.openRate)} of estimated delivered`, icon: Eye },
                { label: "Replies", value: counts?.replied, detail: `${percent(rates?.replyRate)} of estimated delivered`, icon: MessageSquareReply },
                { label: "Bounces", value: counts?.bounced, detail: `${percent(rates?.bounceRate)} of sent`, icon: ArrowDownRight },
                { label: "Failed sends", value: counts?.failed, detail: "Confirmed send failures", icon: AlertCircle },
              ].map(({ label, value, detail, icon: Icon }) => (
                <Card key={label} className="border-slate-200 shadow-sm">
                  <CardContent className="flex items-start justify-between gap-4 p-5">
                    <div>
                      <p className="text-sm font-medium text-slate-600">{label}</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">{metric(value)}</p>
                      <p className="mt-1 text-xs text-slate-500">{detail}</p>
                    </div>
                    <Icon className="h-6 w-6 shrink-0 text-blue-600" aria-hidden="true" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Delivery and engagement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {journey.map((stage) => (
                  <div key={stage.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-slate-700">{stage.label}</span>
                      <span className="font-semibold text-slate-900">{metric(stage.value)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${stage.color}`}
                        style={{ width: `${counts?.sent ? Math.min(100, stage.value / counts.sent * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs leading-5 text-slate-500">
                  Estimated delivered means sent minus detected bounces, not confirmed inbox placement.
                  A possible open is an image request; privacy tools and image blockers can affect this signal.
                  Reply counts require the Outlook reply watcher to be active.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminPanelShell>
  );
}
