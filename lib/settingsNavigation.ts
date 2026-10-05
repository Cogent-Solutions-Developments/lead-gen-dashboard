export type SettingsSection = "outreach" | "whatsapp" | "credentials" | "opt-out" | null;

export function parseSettingsSection(value: string | null): SettingsSection {
  return value === "outreach" || value === "whatsapp" || value === "credentials" || value === "opt-out" ? value : null;
}

export function buildSettingsHref(search: string, section: SettingsSection): string {
  const params = new URLSearchParams(search);
  if (section) {
    params.set("section", section);
  } else {
    params.delete("section");
  }
  const query = params.toString();
  return query ? `/settings?${query}` : "/settings";
}
