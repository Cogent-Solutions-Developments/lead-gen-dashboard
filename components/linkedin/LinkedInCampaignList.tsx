"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutreachEvents } from "@/components/automated-outreach/OutreachEvents";
import type { LinkedInPage } from "@/lib/linkedinPages";
import { UploadLinkedInCampaignDialog } from "./UploadLinkedInCampaignDialog";

export function LinkedInCampaignList({ page }: { page: LinkedInPage }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [version, setVersion] = useState(0);
  return <>
    <OutreachEvents key={version} department="linkedin" linkedinPageId={page.id} title="LinkedIn campaigns" description={page.name} backHref="/admin/lead-intelligence/linkedin" backLabel="All LinkedIn pages" actions={<Button type="button" onClick={() => setUploadOpen(true)} className="h-9"><UploadCloud className="h-4 w-4" />Upload Campaign</Button>} />
    {uploadOpen && <UploadLinkedInCampaignDialog page={page} onClose={() => setUploadOpen(false)} onSaved={() => setVersion(value => value + 1)} />}
  </>;
}
