import { LayoutDashboard, KanbanSquare, ListTodo, Megaphone, FileText, FolderOpen, Users, Home } from "lucide-react";
import { getAuthLandingPath, type AuthUser } from "@/lib/auth";
import { MARKETING_ROLES } from "@/lib/marketing-role-selection";

export function marketingNavigation(user: AuthUser | null | undefined, event: string | null) {
  const roles = [user?.role || "", ...(user?.departmentAssignments || [])];
  const manager = roles.some(role => ["super_admin_user", "ceo_user", "marketing_manager_user"].includes(role));
  const staff = manager || roles.some(role => MARKETING_ROLES.includes(role));
  const sections = [
    { key: "overview", name: "Marketing overview", icon: LayoutDashboard },
    { key: "requests", name: "Requests", icon: KanbanSquare },
    ...(staff ? [{ key: "my-tasks", name: "My tasks", icon: ListTodo }, { key: "social", name: "Social media", icon: Megaphone }] : []),
    { key: "agenda", name: "Agenda", icon: FileText },
    { key: "materials", name: "Materials", icon: FolderOpen },
    ...(manager ? [{ key: "team", name: "Team & activity", icon: Users }] : []),
  ];
  const items = sections.map(item => {
    const query = new URLSearchParams({ tab: item.key });
    if (event) query.set("event", event);
    return { ...item, href: `/marketing?${query}` };
  });
  const home = getAuthLandingPath(user?.role);
  return home === "/marketing" ? items : [{ key: "home", name: "Main workspace", icon: Home, href: home }, ...items];
}
