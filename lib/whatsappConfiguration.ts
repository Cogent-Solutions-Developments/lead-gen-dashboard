import { apiClient } from "@/lib/apiClient";

export type WhatsAppCredential = {
  id: string;
  name: string;
  provider: "d360" | "twilio";
  accountSid: string;
  configuredFields: string[];
  revision: number;
  inUse: boolean;
  updatedAt: string;
};

export type WhatsAppConfiguration = {
  enabled: boolean;
  revision: number;
  values: Record<string, string>;
  credentialRefs: Record<string, string>;
  credentials: WhatsAppCredential[];
  updatedAt: string | null;
};

export type CredentialPayload = {
  name: string;
  provider: "d360" | "twilio";
  accountSid: string;
  secrets: Record<string, string>;
  revision?: number;
};

export function configurationError(error: unknown) {
  const detail = (error as { data?: { detail?: unknown } })?.data?.detail;
  return typeof detail === "string" ? detail : error instanceof Error ? error.message : "Unable to complete the request";
}

export async function getWhatsAppConfiguration() {
  return (await apiClient.get<WhatsAppConfiguration>("/api/admin/settings/outreach/whatsapp")).data;
}

export async function saveWhatsAppConfiguration(payload: { enabled: boolean; revision: number; values: Record<string, string>; credentialRefs?: Record<string, string> }) {
  return (await apiClient.put<WhatsAppConfiguration>("/api/admin/settings/outreach/whatsapp", payload)).data;
}

export async function listWhatsAppCredentials() {
  return (await apiClient.get<{ items: WhatsAppCredential[] }>("/api/admin/settings/outreach/whatsapp/credentials")).data.items;
}

export async function saveWhatsAppCredential(payload: CredentialPayload, id?: string) {
  const path = "/api/admin/settings/outreach/whatsapp/credentials";
  return (id ? await apiClient.put<WhatsAppCredential>(`${path}/${encodeURIComponent(id)}`, payload) : await apiClient.post<WhatsAppCredential>(path, payload)).data;
}

export async function deleteWhatsAppCredential(credential: WhatsAppCredential) {
  await apiClient.delete(`/api/admin/settings/outreach/whatsapp/credentials/${encodeURIComponent(credential.id)}`, { params: { revision: credential.revision } });
}
