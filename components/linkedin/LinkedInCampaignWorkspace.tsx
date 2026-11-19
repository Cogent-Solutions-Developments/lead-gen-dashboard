"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignPageHeader } from "@/components/campaigns/CampaignListPresentation";
import { OutreachPagination } from "@/components/automated-outreach/OutreachPagination";
import { linkedInPageError, type LinkedInCampaignDetail } from "@/lib/linkedinPages";
import { getLinkedInCampaign } from "@/lib/linkedinPagesApi";

const PAGE_SIZE = 25;

export function LinkedInCampaignWorkspace({ pageId, campaignId }: { pageId: string; campaignId: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ data: LinkedInCampaignDetail | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    getLinkedInCampaign(pageId, campaignId, { limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE }, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ data, loading: false, error: null }); },
      (error) => { if (!controller.signal.aborted) setResult((previous) => ({ ...previous, loading: false, error: linkedInPageError(error) })); },
    );
    return () => controller.abort();
  }, [pageId, campaignId, currentPage, reloadKey]);

  function reload() {
    setResult((previous) => ({ ...previous, loading: true, error: null }));
    setReloadKey((value) => value + 1);
  }

  function changePage(value: number) {
    if (value === currentPage) return;
    setResult({ data: null, loading: true, error: null });
    setCurrentPage(value);
  }

  const data = result.data;
  return <div className="space-y-6 p-1 font-sans">
    <Link href={`/admin/lead-intelligence/linkedin/${encodeURIComponent(pageId)}`} className="inline-flex min-h-10 items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:hover:text-zinc-100"><ArrowLeft className="size-4" aria-hidden="true" />Back to campaigns</Link>
    {result.error && <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><p>{result.error}</p><Button type="button" variant="outline" onClick={reload}>Retry</Button></div>}
    {result.loading && !data && <p role="status" className="inline-flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading campaign leads…</p>}
    {data && <>
      <CampaignPageHeader title={data.campaign.name} description={data.page.name}>
        <Button type="button" variant="outline" onClick={reload} disabled={result.loading}><RefreshCw className={`size-4 ${result.loading ? "animate-spin" : ""}`} aria-hidden="true" />Refresh</Button>
      </CampaignPageHeader>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300/80 bg-white/32 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/30">
        <p className="inline-flex items-center gap-2 font-medium"><Users className="size-5 text-blue-600" aria-hidden="true" />{data.total.toLocaleString()} imported leads</p>
        <p className="text-sm text-zinc-500">{data.campaign.importSummary.invalid_rows} rows skipped · {data.campaign.importSummary.duplicates_collapsed} duplicates merged</p>
      </div>
      <section aria-label="Campaign leads" className="overflow-hidden rounded-2xl border border-zinc-300/80 bg-white/32 dark:border-zinc-700 dark:bg-zinc-900/30">
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-zinc-300/80 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700"><tr>{["Name", "Job title", "Company", "Email", "Phone"].map((label) => <th key={label} scope="col" className="px-5 py-4 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{data.items.map((lead) => <tr key={lead.id} className="border-b border-zinc-200/80 last:border-0 dark:border-zinc-800"><th scope="row" className="px-5 py-4 font-medium">{lead.name}</th><td className="px-5 py-4">{lead.jobTitle || "—"}</td><td className="px-5 py-4">{lead.company || "—"}</td><td className="break-all px-5 py-4">{lead.email || "—"}</td><td className="px-5 py-4">{lead.phone || "—"}</td></tr>)}</tbody>
        </table></div>
        <OutreachPagination page={currentPage} pageSize={PAGE_SIZE} total={data.total} onChange={changePage} />
      </section>
    </>}
  </div>;
}
