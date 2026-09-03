import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the admin landing page uses the lead inventory dashboard", () => {
  const page = read("app/admin/page.tsx");
  const dashboard = read("components/dashboard/AdminLeadInventoryDashboard.tsx");

  assert.match(page, /<AdminLeadInventoryDashboard\s*\/>/);
  assert.match(dashboard, /getDashboardLeadInventory/);
  assert.match(dashboard, /<LeadInventoryOverview/);
  assert.doesNotMatch(page, /adminTasks|Admin Task Flow/);
});

test("super admins have one dashboard route while department workspaces remain accessible", () => {
  const shell = read("components/layout/AdminPanelShell.tsx");
  const appShell = read("components/layout/AppShell.tsx");
  const chooser = read("app/choose-persona/page.tsx");
  const sidebar = read("components/layout/Sidebar.tsx");

  assert.match(shell, /name: "Dashboard",\s*href: "\/admin"/);
  assert.doesNotMatch(shell, /name: "Admin Dashboard"/);
  assert.match(shell, /const \[sidebarHovered, setSidebarHovered\] = useState\(false\)/);
  assert.match(shell, /onMouseEnter=\{\(\) => setSidebarHovered\(true\)\}[\s\S]*?onMouseLeave=\{\(\) => setSidebarHovered\(false\)\}/);
  assert.match(shell, /sidebarExpanded \? "w-72 px-6 py-8" : "w-24 p-6"/);
  assert.match(shell, /sidebarExpanded \? "flex-1 opacity-100" : "w-0 overflow-hidden opacity-0"/);
  assert.match(shell, /sidebarExpanded \? "lg:ml-72" : "lg:ml-24"/);
  assert.match(shell, /name: "Dashboard"[\s\S]*?name: "User & Role Management"[\s\S]*?name: "User Performance"[\s\S]*?name: "Event Registry"[\s\S]*?name: "Event Inquiries"[\s\S]*?name: "Category Registry"[\s\S]*?name: "Event Documents"[\s\S]*?name: "Knowledge Library"[\s\S]*?name: "Storage Control"[\s\S]*?name: "Lead Requests"[\s\S]*?name: "Settings"/);
  assert.doesNotMatch(shell, /name: "System Monitor"|name: "System Operations"/);
  assert.match(appShell, /isSuperAdmin && pathname === "\/dashboard"/);
  assert.match(appShell, /isSuperAdmin && pathname === "\/dashboard"[\s\S]*?router\.replace\("\/campaigns"\)/);
  assert.match(chooser, /setPersona\(next\);\s*router\.push\("\/campaigns"\)/);
  assert.match(chooser, /<Link href=\{isSuperAdmin \? "\/admin" : "\/campaigns"\}>[\s\S]*?aria-label=\{isSuperAdmin \? "Go to Admin Panel" : "Go to department workspace"\}/);
  assert.match(chooser, /bg-slate-50/);
  assert.match(chooser, /w-\[46%\] bg-blue-600\/5 \[clip-path:polygon\(18%_0,100%_0,100%_100%,0_100%\)\]/);
  assert.doesNotMatch(chooser, /PersonaRippleBackground|persona-ripple|workspace-topographic-background-matte/);
  assert.match(sidebar, /if \(isSuperAdmin\) \{\s*return item\.href !== "\/dashboard"/);
  assert.match(sidebar, /name: "Campaigns"[\s\S]*?name: "New Campaign"[\s\S]*?name: "Upload Campaign"[\s\S]*?name: "CS Database"[\s\S]*?name: "Admin Panel"/);
});

test("the CEO dashboard is isolated from the admin inventory dashboard", () => {
  const page = read("app/dashboard/page.tsx");

  assert.match(page, /const \{ user, isAdminLike, isCeo \} = useAuth\(\)/);
  assert.match(page, /const isAdminDashboard = isAdminLike && !isCeo/);
  assert.match(page, /if \(isAdminDashboard\) \{\s*return <AdminLeadInventoryDashboard \/>/);
  assert.match(page, /if \(isAdminDashboard \|\| isClientDashboard\)/);
  assert.doesNotMatch(page, /CeoWelcomeDashboard|BlockchainEventPromoconverted/);
  assert.match(page, /<CampaignHeadsUp/);
  assert.match(page, /<SalesMarathon/);
});
