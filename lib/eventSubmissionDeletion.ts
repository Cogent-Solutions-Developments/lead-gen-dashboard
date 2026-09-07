export function isInquiryDeleteConfirmed(value: string): boolean {
  return value === "DELETE";
}

export function canDeleteEventInquiry(isSuperAdmin: boolean, pathname: string): boolean {
  return isSuperAdmin && pathname === "/admin/event-submissions";
}
