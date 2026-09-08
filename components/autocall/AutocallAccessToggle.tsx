"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { setAutocallAccess, type AuthUser } from "@/lib/auth";

export function AutocallAccessToggle({ user, onChange }: { user: AuthUser; onChange?: (enabled: boolean) => void }) {
  const { isSuperAdmin } = useAuth();
  const [enabled, setEnabled] = useState(user.departmentAssignments?.includes("autocall") ?? false);
  const [busy, setBusy] = useState(false);
  if (!isSuperAdmin || user.role === "super_admin_user" || user.role === "client_user") return null;
  return <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
    <input type="checkbox" checked={enabled} disabled={busy} onChange={async (event) => {
      const next = event.target.checked;
      setBusy(true);
      try {
        await setAutocallAccess(user.id, next);
        setEnabled(next);
        onChange?.(next);
        toast.success(next ? "Autocall access assigned" : "Autocall access revoked");
      } catch { toast.error("Unable to update Autocall access. Please retry."); }
      finally { setBusy(false); }
    }} />
    {busy ? "Updating Autocall access…" : "Autocall access"}
  </label>;
}
