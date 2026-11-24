import { LinkedInPageWorkspace } from "@/components/linkedin/LinkedInPageWorkspace";

export default async function LinkedInPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  return <LinkedInPageWorkspace key={pageId} pageId={pageId} />;
}
