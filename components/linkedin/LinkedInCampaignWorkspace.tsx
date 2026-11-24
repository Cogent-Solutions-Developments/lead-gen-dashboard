"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OutreachLeadTable } from "@/components/automated-outreach/OutreachLeadTable";
import { linkedInPageError, type LinkedInCampaignDetail } from "@/lib/linkedinPages";
import { getLinkedInCampaign } from "@/lib/linkedinPagesApi";
import { LinkedInCampaignEventSettings } from "./LinkedInCampaignEventSettings";
import { LinkedInImportSummary } from "./LinkedInImportSummary";

export function LinkedInCampaignWorkspace({ pageId, campaignId }: { pageId: string; campaignId: string }) {
  const [result, setResult] = useState<{ key: string; data: LinkedInCampaignDetail | null; error: string | null }>({ key: "", data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getLinkedInCampaign(pageId, campaignId, { limit: 1, offset: 0 }, controller.signal).then(
      data => { if (!controller.signal.aborted) setResult({ key: `${pageId}:${campaignId}`, data, error: null }); },
      error => { if (!controller.signal.aborted) setResult({ key: `${pageId}:${campaignId}`, data: null, error: linkedInPageError(error) }); },
    );
    return () => controller.abort();
  }, [pageId, campaignId, reloadKey]);
  if (result.key !== `${pageId}:${campaignId}`) return <p role="status" className="p-4 text-sm text-zinc-500">Loading campaign?</p>;
  if (result.error) return <div role="alert" className="space-y-3 p-4 text-sm text-red-700"><p>{result.error}</p><Button variant="outline" onClick={() => setReloadKey(value => value + 1)}>Retry</Button></div>;
  if (!result.data) return <p role="status" className="p-4 text-sm text-zinc-500">Loading campaign?</p>;
  return <div className="space-y-5"><LinkedInImportSummary campaign={result.data.campaign} /><LinkedInCampaignEventSettings key={`${campaignId}:${result.data.campaign.eventKey ?? ""}`} campaign={result.data.campaign} onSaved={() => setReloadKey(value => value + 1)} /><OutreachLeadTable key={`${campaignId}:${reloadKey}`} department="linkedin" eventKey={campaignId} title={result.data.campaign.name} backHref={`/admin/lead-intelligence/linkedin/${encodeURIComponent(pageId)}`} backLabel={result.data.page.name} /></div>;
}
