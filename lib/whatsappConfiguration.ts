import { apiClient } from "@/lib/apiClient";

export type WhatsAppConfiguration = {
  enabled: boolean;
  revision: number;
  values: Record<string, string>;
  secretFields: string[];
  configuredSecrets: string[];
  updatedAt: string | null;
};

export async function getWhatsAppConfiguration() {
  return (await apiClient.get<WhatsAppConfiguration>("/api/admin/settings/outreach/whatsapp")).data;
}

export async function saveWhatsAppConfiguration(payload: { enabled: boolean; revision: number; values: Record<string, string> }) {
  return (await apiClient.put<WhatsAppConfiguration>("/api/admin/settings/outreach/whatsapp", payload)).data;
}
