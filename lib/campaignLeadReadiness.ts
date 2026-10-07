type LeadReadiness = {
  contactReadOnly?: boolean;
  approvalStatus?: string | null;
  isSuppressed?: boolean;
  suppression?: { active?: boolean } | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  contentEmailSubject?: string | null;
  contentEmail?: string | null;
  contentLinkedin?: string | null;
  contentWhatsapp?: string | null;
  generationFailure?: { title: string; reason: string; guidance: string } | null;
};

// Selection permits content generation even when a lead has no sendable draft.
export function isCampaignLeadSelectionBlocked(lead: LeadReadiness, optedOut = false): boolean {
  return Boolean(lead.contactReadOnly || lead.approvalStatus === "suppressed" || lead.isSuppressed || lead.suppression?.active || optedOut);
}

export function hasLeadContentEdits(current: LeadReadiness, saved: LeadReadiness): boolean {
  return (["contentEmailSubject", "contentEmail", "contentLinkedin", "contentWhatsapp"] as const)
    .some((field) => (current[field] || "") !== (saved[field] || ""));
}

export function leadSendabilityReason(lead: LeadReadiness): string {
  if (isCampaignLeadSelectionBlocked(lead)) return "This lead is suppressed or read-only and cannot receive messages.";
  if (lead.generationFailure) {
    const { title, reason, guidance } = lead.generationFailure;
    return `${title}: ${reason} ${guidance}`.trim();
  }
  if (lead.email?.trim() && (!lead.contentEmailSubject?.trim() || !lead.contentEmail?.trim())) {
    return "Email needs both a subject and body. Generate content or save a complete email in Review.";
  }
  if (![lead.email, lead.phone, lead.linkedinUrl].some((value) => value?.trim())) return "This lead has no outreach contact details.";
  return "No outreach channel is ready. Check contact details, content, and campaign channel setup.";
}
