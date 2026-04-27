"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getRoleLabel,
  getStoredAuthSession,
  isSuperAdminRole,
  onAuthSessionChange,
  personaForRole,
  type AuthRole,
  type AuthSession,
} from "@/lib/auth";

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession());

  useEffect(() => {
    const sync = () => setSession(getStoredAuthSession());
    sync();
    return onAuthSessionChange(sync);
  }, []);

  return useMemo(() => {
    const role = session?.user.role ?? null;
    const isSuperAdmin = isSuperAdminRole(role);

    return {
      session,
      user: session?.user ?? null,
      role: role as AuthRole | null,
      roleLabel: getRoleLabel(role),
      isAuthenticated: Boolean(session),
      isSuperAdmin,
      isPipelineUser: Boolean(role && !isSuperAdmin),
      forcedPersona: personaForRole(role),
      canManageUsers: isSuperAdmin,
      canManageCampaignActions: isSuperAdmin,
      canUseRoleChooser: isSuperAdmin,
    };
  }, [session]);
}
