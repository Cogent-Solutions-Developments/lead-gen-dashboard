"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getRoleLabel,
  getStoredAuthSession,
  isAdminLikeRole,
  isCeoRole,
  isClientRole,
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
    const isCeo = isCeoRole(role);
    const isAdminLike = isAdminLikeRole(role);
    const isClient = isClientRole(role);

    return {
      session,
      user: session?.user ?? null,
      role: role as AuthRole | null,
      roleLabel: getRoleLabel(role),
      isAuthenticated: Boolean(session),
      isSuperAdmin,
      isCeo,
      isAdminLike,
      isClient,
      isPipelineUser: Boolean(role && !isAdminLike && !isClient),
      forcedPersona: personaForRole(role),
      canManageUsers: isAdminLike,
      canManageCampaignActions: isSuperAdmin,
      canUseRoleChooser: isSuperAdmin,
    };
  }, [session]);
}
