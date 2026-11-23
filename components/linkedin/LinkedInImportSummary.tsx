import type { LinkedInCampaign } from "@/lib/linkedinPages";

export function LinkedInImportSummary({ campaign }: { campaign: LinkedInCampaign }) {
  const summary = campaign.importSummary;
  const reasons = summary.invalid_reasons ?? [];
  return <section aria-label="Lead sheet import" className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
    <h2 className="font-medium">Lead sheet import: {campaign.name}</h2>
    <p role="status" className="mt-2 text-zinc-600 dark:text-zinc-300">{campaign.totalLeads} leads imported from {summary.raw_rows} rows. {summary.invalid_rows} invalid rows skipped. {summary.duplicates_collapsed} duplicate rows combined.</p>
    {summary.invalid_rows > 0 && <div className="mt-3 text-amber-800 dark:text-amber-300">
      <p>Correct the skipped rows before uploading them in a new campaign.</p>
      {reasons.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{reasons.map((reason, index) => <li key={`${index}:${reason}`}>{reason}</li>)}</ul>}
      {summary.invalid_rows > reasons.length && <p className="mt-2">Showing {reasons.length} of {summary.invalid_rows} skipped-row reasons.</p>}
    </div>}
  </section>;
}
