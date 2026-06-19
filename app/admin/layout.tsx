import { AdminPanelShell } from "@/components/layout/AdminPanelShell";
import "./admin-ui.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPanelShell>{children}</AdminPanelShell>;
}
