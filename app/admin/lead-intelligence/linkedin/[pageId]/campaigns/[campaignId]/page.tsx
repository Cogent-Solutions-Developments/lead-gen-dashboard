import { LinkedInCampaignWorkspace } from "@/components/linkedin/LinkedInCampaignWorkspace";

export default async function LinkedInCampaignPage({ params }: { params: Promise<{ pageId: string; campaignId: string }> }) {
  const { pageId, campaignId } = await params;
  return <LinkedInCampaignWorkspace key={`${pageId}:${campaignId}`} pageId={pageId} campaignId={campaignId} />;
}
