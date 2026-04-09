import type { CampaignImportSummary } from "@/lib/api";

const CAMPAIGN_UPLOAD_SUMMARY_PREFIX = "campaign-upload-summary:";

function storageKey(campaignId: string) {
  return `${CAMPAIGN_UPLOAD_SUMMARY_PREFIX}${campaignId}`;
}

function toNonNegativeInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function normalizeCampaignImportSummary(value: unknown): CampaignImportSummary | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;
  const fileName = typeof raw.fileName === "string" ? raw.fileName.trim() : "";
  if (!fileName) return null;

  return {
    fileName,
    importedLeads: toNonNegativeInt(raw.importedLeads),
    companies: toNonNegativeInt(raw.companies),
    invalidRows: toNonNegativeInt(raw.invalidRows),
    duplicatesCollapsed: toNonNegativeInt(raw.duplicatesCollapsed),
    rejectedRows: toNonNegativeInt(raw.rejectedRows),
  };
}

export function persistCampaignUploadSummary(
  campaignId: string,
  summary: CampaignImportSummary
) {
  if (!campaignId || typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey(campaignId), JSON.stringify(summary));
  } catch {
    // Ignore storage failures and let the flow continue.
  }
}

export function consumeCampaignUploadSummary(campaignId: string) {
  if (!campaignId || typeof window === "undefined") return null;

  const key = storageKey(campaignId);

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    window.sessionStorage.removeItem(key);

    return normalizeCampaignImportSummary(JSON.parse(raw));
  } catch {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore cleanup failures.
    }

    return null;
  }
}
