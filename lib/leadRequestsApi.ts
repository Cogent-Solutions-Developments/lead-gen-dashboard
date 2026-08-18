import { api } from "@/lib/api";

export type LeadRequestStatus = "pending" | "done" | "rejected";

export type LeadRequestItem = {
  id: string;
  requesterUserId: string;
  requesterUsername?: string | null;
  requesterName?: string | null;
  eventRegistryId: string;
  eventKey?: string | null;
  eventName: string;
  pipeline: string;
  leadsPerCompany?: number | null;
  companyList?: string | null;
  icp?: string | null;
  targetDesignation?: string | null;
  location?: string | null;
  status: LeadRequestStatus;
  adminNote?: string | null;
  uploadedCampaignId?: string | null;
  processedByName?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  rejectedAt?: string | null;
};

export type CreateLeadRequestInput = {
  eventRegistryId: string;
  leadsPerCompany?: number;
  companyList?: string;
  icp?: string;
  targetDesignation?: string;
  location?: string;
};

type LeadRequestResponse = { request: LeadRequestItem };
type LeadRequestListResponse = { requests: LeadRequestItem[]; total: number };

export async function createLeadRequest(input: CreateLeadRequestInput) {
  const { data } = await api.post<LeadRequestResponse>("/api/lead-requests", input);
  return data.request;
}

export async function listMyLeadRequests() {
  const { data } = await api.get<LeadRequestListResponse>("/api/lead-requests");
  return data;
}

export async function listAdminLeadRequests(status?: LeadRequestStatus) {
  const { data } = await api.get<LeadRequestListResponse>("/api/admin/lead-requests", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function updateAdminLeadRequestStatus(
  requestId: string,
  status: Exclude<LeadRequestStatus, "done">,
  adminNote?: string,
) {
  const { data } = await api.patch<LeadRequestResponse>(
    `/api/admin/lead-requests/${encodeURIComponent(requestId)}/status`,
    { status, adminNote: adminNote || undefined },
  );
  return data.request;
}

export async function uploadAdminLeadRequest(
  requestId: string,
  file: File,
  adminNote?: string,
) {
  const form = new FormData();
  form.append("leadSheet", file);
  if (adminNote?.trim()) form.append("adminNote", adminNote.trim());
  const { data } = await api.post<LeadRequestResponse & { campaign: { id: string } }>(
    `/api/admin/lead-requests/${encodeURIComponent(requestId)}/upload`,
    form,
    { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 },
  );
  return data;
}

export async function downloadAdminLeadRequestTemplate(requestId: string) {
  const { data, headers } = await api.get<Blob>(
    `/api/admin/lead-requests/${encodeURIComponent(requestId)}/template`,
    { responseType: "blob" },
  );
  const disposition = String(headers["content-disposition"] || "");
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "lead-request-upload-template.xlsx";
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
