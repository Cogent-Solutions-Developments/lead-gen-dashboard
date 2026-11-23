import type { LinkedInCampaign } from "@/lib/linkedinPages";

export function LinkedInImportSummary({ campaign }: { campaign: LinkedInCampaign }) {
  const summary = campaign.importSummary;
  return <section aria-label="Lead sheet import" className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
    <h2 className="font-medium">Lead sheet import: {campaign.name}</h2>
    <p role="status" className="mt-2 text-zinc-600 dark:text-zinc-300">{campaign.totalLeads} leads imported from {summary.raw_rows} rows. {summary.invalid_rows} invalid rows skipped. {summary.duplicates_collapsed} duplicate rows combined.</p>
  </section>;
}
