import { AdminPanelShell } from "@/components/layout/AdminPanelShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPanelShell>{children}</AdminPanelShell>;
}
