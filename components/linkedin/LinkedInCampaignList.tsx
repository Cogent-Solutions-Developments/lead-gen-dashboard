"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Linkedin, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignPageHeader, campaignListShellClassName, campaignListRowClassName } from "@/components/campaigns/CampaignListPresentation";
import { OutreachPagination } from "@/components/automated-outreach/OutreachPagination";
import { linkedInPageError, type LinkedInCampaign, type LinkedInCampaignList as CampaignListData, type LinkedInPage } from "@/lib/linkedinPages";
import { listLinkedInCampaigns } from "@/lib/linkedinPagesApi";
import { UploadLinkedInCampaignDialog } from "./UploadLinkedInCampaignDialog";

const PAGE_SIZE = 6;

export function LinkedInCampaignList({ page }: { page: LinkedInPage }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [result, setResult] = useState<{ data: CampaignListData | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const sequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++sequence.current;
    listLinkedInCampaigns(page.id, { limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE }, controller.signal).then(
      (data) => { if (!controller.signal.aborted && request === sequence.current) setResult({ data, loading: false, error: null }); },
      (error) => { if (!controller.signal.aborted && request === sequence.current) setResult((previous) => ({ ...previous, loading: false, error: linkedInPageError(error) })); },
    );
    return () => controller.abort();
  }, [page.id, currentPage, reloadKey]);

  function reload() {
    setResult((previous) => ({ ...previous, loading: true, error: null }));
    setReloadKey((value) => value + 1);
  }

  function changePage(value: number) {
    if (value === currentPage) return;
    sequence.current++;
    setResult({ data: null, loading: true, error: null });
    setCurrentPage(value);
  }

  function uploaded(campaign: LinkedInCampaign) {
    sequence.current++;
    setCurrentPage(1);
    setResult((previous) => ({ data: { campaigns: [campaign], total: (previous.data?.total ?? 0) + 1, hasMore: (previous.data?.total ?? 0) > 0 }, loading: true, error: null }));
    setReloadKey((value) => value + 1);
  }

  return <div className="space-y-6">
    <CampaignPageHeader title={page.name} description="Campaigns and leads from this LinkedIn page.">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline"><a href={page.url} target="_blank" rel="noopener noreferrer"><Linkedin className="size-4" aria-hidden="true" />Open page<span className="sr-only"> (opens in a new tab)</span></a></Button>
        <Button type="button" variant="outline" disabled={result.loading} onClick={reload}><RefreshCw className={`size-4 ${result.loading ? "animate-spin" : ""}`} aria-hidden="true" />Refresh</Button>
        <Button type="button" onClick={() => setShowUpload(true)}><UploadCloud className="size-4" aria-hidden="true" />Upload Campaign</Button>
      </div>
    </CampaignPageHeader>
    {result.error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><span>{result.error}</span><Button type="button" variant="outline" onClick={reload}>Retry</Button></div>}
    <section aria-label="LinkedIn campaigns" className={campaignListShellClassName}>
      <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] gap-6 border-b border-zinc-300/75 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:grid"><span>Campaign</span><span>Metrics</span><span>Actions</span></div>
      {result.loading && !result.data && <p role="status" className="inline-flex items-center gap-2 px-6 py-10 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading campaigns…</p>}
      {result.data?.campaigns.map((campaign) => {
        const href = `/admin/lead-intelligence/linkedin/${encodeURIComponent(page.id)}/campaigns/${encodeURIComponent(campaign.id)}`;
        return <article key={campaign.id} className={campaignListRowClassName}>
          <div className="grid gap-5 px-6 py-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0"><Link href={href} className="text-base font-semibold text-zinc-900 hover:text-blue-700 dark:text-zinc-100"><h2 className="break-words">{campaign.name}</h2></Link><p className="mt-2 break-words text-sm text-zinc-500">{campaign.fileName}</p><p className="mt-1 text-sm text-zinc-500">{new Date(campaign.createdAt).toLocaleString()} · {campaign.createdBy}</p></div>
            <div className="flex flex-wrap items-center gap-6"><div><p className="text-xs text-zinc-500">Total leads</p><p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{campaign.totalLeads.toLocaleString()}</p></div><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">Uploaded</span></div>
            <Button asChild variant="outline" className="w-fit"><Link href={href}>View Leads<ChevronRight className="size-4" aria-hidden="true" /></Link></Button>
          </div>
        </article>;
      })}
      {!result.loading && !result.error && !result.data?.campaigns.length && <div className="px-6 py-14 text-center"><UploadCloud className="mx-auto mb-4 size-9 text-blue-500" aria-hidden="true" /><h2 className="text-lg font-medium">No campaigns yet</h2><p className="mt-2 text-sm text-zinc-500">Upload a lead sheet to create the first campaign for this page.</p><Button type="button" className="mt-5" onClick={() => setShowUpload(true)}>Upload Campaign</Button></div>}
      {result.data && <OutreachPagination page={currentPage} pageSize={PAGE_SIZE} total={result.data.total} onChange={changePage} />}
    </section>
    {showUpload && <UploadLinkedInCampaignDialog page={page} onClose={() => setShowUpload(false)} onSaved={uploaded} />}
  </div>;
}
