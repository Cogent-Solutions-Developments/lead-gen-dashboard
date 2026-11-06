import { LayoutDashboard, FileText, FolderOpen, Home } from "lucide-react";
import { getAuthLandingPath, type AuthUser } from "@/lib/auth";

export function hasMarketingLanding(user: AuthUser | null | undefined) {
  return [user?.role || "", ...(user?.departmentAssignments || [])].some(role =>
    ["marketing_user", "marketing_manager_user", "marketing_designer_user", "marketing_developer_user", "super_admin_user", "ceo_user"].includes(role),
  );
}

export function marketingSections(landing = false) {
  return [
    ...(landing ? [{ key: "home", name: "Marketing home", icon: LayoutDashboard }] : []),
    { key: "agenda", name: "Agenda", icon: FileText },
    { key: "materials", name: "Materials", icon: FolderOpen },
  ];
}

export function marketingNavigation(user: AuthUser | null | undefined, event: string | null) {
  const items = marketingSections(hasMarketingLanding(user)).map(item => {
    const query = new URLSearchParams({ tab: item.key });
    if (event && event !== "all") query.set("event", event);
    return { ...item, href: `/marketing?${query}` };
  });
  const home = getAuthLandingPath(user?.role);
  return home === "/marketing" ? items : [{ key: "workspace", name: "Main workspace", icon: Home, href: home }, ...items];
}
