import { FileText, FolderOpen, Home } from "lucide-react";
import { getAuthLandingPath, type AuthUser } from "@/lib/auth";

export function marketingSections() {
  return [
    { key: "agenda", name: "Agenda", icon: FileText },
    { key: "materials", name: "Materials", icon: FolderOpen },
  ];
}

export function marketingNavigation(user: AuthUser | null | undefined, event: string | null) {
  const items = marketingSections().map(item => {
    const query = new URLSearchParams({ tab: item.key });
    if (event && event !== "all") query.set("event", event);
    return { ...item, href: `/marketing?${query}` };
  });
  const home = getAuthLandingPath(user?.role);
  return home === "/marketing" ? items : [{ key: "workspace", name: "Main workspace", icon: Home, href: home }, ...items];
}
