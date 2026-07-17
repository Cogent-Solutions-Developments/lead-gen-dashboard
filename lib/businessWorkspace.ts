import { downloadProtectedFile, getAuthHeader, type AdminEventItem } from "@/lib/auth";
import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";

export type BusinessWorkspaceSlug = "operations" | "marketing" | "finance";
export type WorkspaceAsset = { id: string; assetType: string; title: string; note: string | null; textContent: string | null; downloadUrl: string | null };
export type OperationsDetails = { venueName: string | null; venueAddress: string | null; venueStatus: string; specialNotes: string | null };
export type FinanceSummary = { totalAmount: number | null; paidAmount: number; remainingAmount: number | null; currency: string; paymentStatus: string; notes: string | null };
export type Payment = { id: string; paymentStage: string; amount: number; paidOn: string | null; note: string | null; receiptAssetId: string | null };
export type WorkspaceDashboard = { workspace: BusinessWorkspaceSlug; events: Array<{ event: AdminEventItem; operations?: OperationsDetails; materialCount?: number; finance?: FinanceSummary; paymentCount?: number }> };
export type WorkspaceDetail = { event: AdminEventItem; operations?: OperationsDetails; documents?: WorkspaceAsset[]; materials?: WorkspaceAsset[]; finance?: FinanceSummary; payments?: Payment[] };

function baseUrl() {
  const value = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!value) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  return value;
}

async function request<T>(path: string, init: RequestInit = {}) {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}), ...getAuthHeader(), ...getLocalDevNgrokHeaders(), ...(init.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof data?.detail === "string" ? data.detail : response.statusText || "Request failed") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}

export function getBusinessWorkspaceDashboard(workspace: BusinessWorkspaceSlug) { return request<WorkspaceDashboard>(`/api/business/${workspace}/dashboard`); }
export function getBusinessWorkspaceEvent(workspace: BusinessWorkspaceSlug, eventId: string) { return request<WorkspaceDetail>(`/api/business/${workspace}/events/${encodeURIComponent(eventId)}`); }
export function saveOperations(eventId: string, payload: OperationsDetails) { return request<{ operations: OperationsDetails }>(`/api/business/operations/events/${encodeURIComponent(eventId)}`, { method: "PUT", body: JSON.stringify(payload) }); }
export function saveFinanceProfile(eventId: string, payload: { totalAmount: number | null; currency: string; notes: string | null }) { return request<WorkspaceDetail>(`/api/business/finance/events/${encodeURIComponent(eventId)}/profile`, { method: "PUT", body: JSON.stringify(payload) }); }
export function addPayment(eventId: string, payload: { paymentStage: string; amount: number; paidOn: string; note: string | null }) { return request<{ payment: Payment; finance: FinanceSummary }>(`/api/business/finance/events/${encodeURIComponent(eventId)}/payments`, { method: "POST", body: JSON.stringify(payload) }); }
export async function uploadOperationsDocument(eventId: string, file: File, note: string, title: string) { const body = new FormData(); body.set("file", file); body.set("note", note); body.set("title", title); return request<{ document: WorkspaceAsset }>(`/api/business/operations/events/${encodeURIComponent(eventId)}/documents`, { method: "POST", body }); }
export async function addMarketingMaterial(eventId: string, payload: { assetType: string; title: string; note: string; textContent: string; file?: File | null }) { const body = new FormData(); body.set("assetType", payload.assetType); body.set("title", payload.title); body.set("note", payload.note); body.set("textContent", payload.textContent); if (payload.file) body.set("file", payload.file); return request<{ material: WorkspaceAsset }>(`/api/business/marketing/events/${encodeURIComponent(eventId)}/materials`, { method: "POST", body }); }
export async function uploadPaymentReceipt(paymentId: string, file: File, note: string) { const body = new FormData(); body.set("file", file); body.set("note", note); return request<{ payment: Payment }>(`/api/business/finance/payments/${encodeURIComponent(paymentId)}/receipt`, { method: "POST", body }); }
export function deleteWorkspaceAsset(assetId: string) { return request<{ deleted: boolean }>(`/api/business/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" }); }
export function downloadWorkspaceAsset(asset: WorkspaceAsset, filename?: string) { if (!asset.downloadUrl) throw new Error("This item has no document to download."); return downloadProtectedFile(asset.downloadUrl, filename || asset.title || "event-document"); }
export function downloadWorkspaceAssetById(assetId: string, filename = "payment-receipt") { return downloadProtectedFile(`/api/business/assets/${encodeURIComponent(assetId)}/download`, filename); }
