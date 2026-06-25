"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EventRegistryPicker } from "@/components/events/EventRegistryPicker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  AUTH_ROLES,
  createAdminClientCredential,
  createAuthUser,
  deleteAuthUser,
  getRoleLabel,
  listAdminClientCredentials,
  listAdminEvents,
  listAuthUsers,
  recoverAuthUserAccount,
  revokeAdminClientCredential,
  resetAuthUserMfa,
  updateAuthUser,
  updateAuthUserPassword,
  updateStoredAuthUser,
  type AdminClientCredential,
  type AdminEventItem,
  type AuthRole,
  type AuthUser,
} from "../admin-api";

type AdminUsersTab = "users" | "add-user" | "client-access";
type UserStatusValue = "active" | "inactive";

type UserFormState = {
  username: string;
  fullName: string;
  role: AuthRole | "";
  password: string;
  status: UserStatusValue | "";
};

type DepartmentDefinition = {
  id: string;
  label: string;
  description: string;
  roles: AuthRole[];
  icon: typeof UsersRound;
};

const blankForm: UserFormState = {
  username: "",
  fullName: "",
  role: "",
  password: "",
  status: "",
};

const departmentDefinitions: DepartmentDefinition[] = [
  {
    id: "administration",
    label: "Administration",
    description: "Protected platform operators and ownership roles.",
    roles: ["super_admin_user", "ceo_user"],
    icon: Crown,
  },
  {
    id: "sales",
    label: "Sales",
    description: "Sales managers and outreach operators.",
    roles: ["sales_manager_user", "sales_user"],
    icon: BriefcaseBusiness,
  },
  {
    id: "delegate",
    label: "Delegate",
    description: "Delegate managers and validation operators.",
    roles: ["delegate_manager_user", "delegate_user"],
    icon: UserCog,
  },
  {
    id: "production",
    label: "Production",
    description: "Production managers and campaign execution users.",
    roles: ["production_manager_user", "production_user"],
    icon: Building2,
  },
  {
    id: "client",
    label: "Client",
    description: "Event dashboard credentials created for client access.",
    roles: ["client_user"],
    icon: KeyRound,
  },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function eventTypeLabel(value?: string | null) {
  return value === "boardroom" ? "Boardroom" : "Conference";
}

function isManagerRole(role: AuthRole) {
  return role === "super_admin_user" || role === "ceo_user" || role.includes("_manager_");
}

function UserCard({
  item,
  isSelf,
  onEdit,
  onPassword,
  onResetMfa,
  onRecover,
  onDelete,
}: {
  item: AuthUser;
  isSelf: boolean;
  onEdit: () => void;
  onPassword: () => void;
  onResetMfa: () => void;
  onRecover: () => void;
  onDelete: () => void;
}) {
  const manager = isManagerRole(item.role);

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-[0_16px_30px_-28px_rgba(37,99,235,0.28)] ${
        manager ? "border-blue-300 ring-1 ring-blue-100" : "border-zinc-200"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${
                manager ? "border-blue-200 bg-blue-50 text-blue-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"
              }`}
            >
              {manager ? <ShieldCheck className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {item.fullName || item.username}
                {isSelf ? <span className="ml-2 text-xs font-medium text-zinc-400">(you)</span> : null}
              </p>
              <p className="truncate text-xs text-zinc-500">{item.username}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className={manager ? "font-semibold text-blue-700" : "font-medium text-zinc-600"}>
              {getRoleLabel(item.role)}
            </span>
            <span className="text-zinc-300">|</span>
            <span className={manager ? "font-semibold text-blue-700" : "font-medium text-zinc-600"}>
              {manager ? "Manager" : "Normal User"}
            </span>
            <span className="text-zinc-300">|</span>
            <span className={`font-semibold ${item.isActive === false ? "text-zinc-400" : "text-emerald-700"}`}>
              {item.isActive === false ? "Inactive" : "Active"}
            </span>
            <span className="text-zinc-300">|</span>
            <span className={`font-semibold ${item.mfaEnabled ? "text-emerald-700" : "text-zinc-400"}`}>
              {item.mfaEnabled ? "MFA enabled" : "MFA off"}
            </span>
          </div>

          <p className="mt-3 text-xs text-zinc-500">Last login: {formatDateTime(item.lastLoginAt)}</p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onEdit}
            className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onPassword}
            className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Password
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!item.mfaEnabled}
            onClick={onResetMfa}
            className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            MFA Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSelf}
            onClick={onRecover}
            className="h-8 rounded-md border border-blue-200 bg-white px-3 text-xs text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Recover
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSelf}
            onClick={onDelete}
            className="h-8 rounded-md border border-red-200 bg-white px-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Delete ${item.username}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const isCeo = String(currentUser?.role || "") === "ceo_user";
  const [activeTab, setActiveTab] = useState<AdminUsersTab>("users");
  const [activeDepartmentId, setActiveDepartmentId] = useState(departmentDefinitions[0]?.id || "");
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(blankForm);
  const [passwordTarget, setPasswordTarget] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [mfaResetTarget, setMfaResetTarget] = useState<AuthUser | null>(null);
  const [recoveryTarget, setRecoveryTarget] = useState<AuthUser | null>(null);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);

  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [credentials, setCredentials] = useState<AdminClientCredential[]>([]);
  const [eventId, setEventId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [clientUsername, setClientUsername] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [clientFullName, setClientFullName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listAuthUsers());
    } catch (error) {
      toast.error("Failed to load users", { description: getErrorMessage(error) });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === eventId) || null,
    [eventId, events]
  );

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const rows = await listAdminEvents(true);
      setEvents(rows);
      setEventId((current) => (rows.some((event) => event.id === current) ? current : ""));
    } catch (error) {
      toast.error("Failed to load events", { description: getErrorMessage(error) });
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadCredentials = useCallback(async () => {
    if (!eventId) {
      setCredentials([]);
      return;
    }
    setLoadingCredentials(true);
    try {
      const rows = await listAdminClientCredentials({ eventId, includeInactive: true });
      setCredentials(rows);
    } catch (error) {
      toast.error("Failed to load client access", { description: getErrorMessage(error) });
      setCredentials([]);
    } finally {
      setLoadingCredentials(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadUsers();
    void loadEvents();
  }, [loadEvents, loadUsers]);

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((item) => {
      return (
        item.username.toLowerCase().includes(query) ||
        String(item.fullName || "").toLowerCase().includes(query) ||
        getRoleLabel(item.role).toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  const visibleDepartments = useMemo(
    () => departmentDefinitions.filter((department) => !(isCeo && department.id === "administration")),
    [isCeo]
  );

  const roleOptions = useMemo(
    () =>
      AUTH_ROLES.filter((role) => {
        if (isCeo && (role === "super_admin_user" || role === "ceo_user")) return false;
        if (role === "client_user" && form.role !== "client_user") return false;
        return true;
      }),
    [form.role, isCeo]
  );

  useEffect(() => {
    if (visibleDepartments.some((department) => department.id === activeDepartmentId)) return;
    setActiveDepartmentId(visibleDepartments[0]?.id || "");
  }, [activeDepartmentId, visibleDepartments]);

  const stats = useMemo(() => {
    const active = users.filter((item) => item.isActive !== false).length;
    const superAdmins = users.filter((item) => item.role === "super_admin_user").length;
    return { total: users.length, active, superAdmins };
  }, [users]);

  const departmentGroups = useMemo(
    () =>
      visibleDepartments.map((department) => {
        const rows = filteredUsers.filter((item) => department.roles.includes(item.role));
        const managers = rows.filter((item) => isManagerRole(item.role));
        const normalUsers = rows.filter((item) => !isManagerRole(item.role));
        return { ...department, rows, managers, normalUsers };
      }),
    [filteredUsers, visibleDepartments]
  );

  const selectedDepartment = useMemo(
    () =>
      departmentGroups.find((department) => department.id === activeDepartmentId) ||
      departmentGroups[0] || {
        id: "departments",
        label: "Departments",
        description: "No departments available.",
        roles: [],
        icon: UsersRound,
        rows: [],
        managers: [],
        normalUsers: [],
      },
    [activeDepartmentId, departmentGroups]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const startCreate = () => {
    resetForm();
    setActiveTab("add-user");
  };

  const startEdit = (item: AuthUser) => {
    setEditingId(item.id);
    setForm({
      username: item.username,
      fullName: item.fullName || "",
      role: item.role,
      password: "",
      status: item.isActive === false ? "inactive" : "active",
    });
  };

  const submitForm = async () => {
    const username = form.username.trim();
    if (!username) {
      toast.error("Username is required");
      return;
    }
    if (!form.role) {
      toast.error("Role is required");
      return;
    }
    if (!form.status) {
      toast.error("User status is required");
      return;
    }
    if (!editingId && form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const isSelf = editingId === currentUser?.id;
        const updated = await updateAuthUser(editingId, {
          username,
          fullName: form.fullName.trim(),
          role: isSelf ? undefined : form.role,
          isActive: isSelf ? undefined : form.status === "active",
        });
        setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        if (isSelf) updateStoredAuthUser(updated);
        toast.success("User updated", { description: updated.username });
      } else {
        const created = await createAuthUser({
          username,
          password: form.password,
          role: form.role,
          fullName: form.fullName.trim(),
          isActive: form.status === "active",
        });
        setUsers((prev) => [created, ...prev]);
        toast.success("User created", { description: created.username });
      }
      resetForm();
      if (!editingId) setActiveTab("users");
    } catch (error) {
      toast.error(editingId ? "Update failed" : "Create failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async () => {
    if (!passwordTarget) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAuthUserPassword(passwordTarget.id, newPassword);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Password updated", { description: passwordTarget.username });
      setPasswordTarget(null);
      setNewPassword("");
    } catch (error) {
      toast.error("Password update failed", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteAuthUser(deleteTarget.id);
      setUsers((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success("User deleted", { description: deleteTarget.username });
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Delete failed", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const confirmMfaReset = async () => {
    if (!mfaResetTarget) return;
    setSaving(true);
    try {
      const result = await resetAuthUserMfa(mfaResetTarget.id);
      setUsers((prev) => prev.map((item) => (item.id === result.user.id ? result.user : item)));
      toast.success("MFA reset", {
        description: `${mfaResetTarget.username} must set up Microsoft Authenticator again.`,
      });
      setMfaResetTarget(null);
    } catch (error) {
      toast.error("MFA reset failed", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const submitAccountRecovery = async () => {
    if (!recoveryTarget) return;
    if (recoveryPassword.length < 8) {
      toast.error("Recovery password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const result = await recoverAuthUserAccount(recoveryTarget.id, recoveryPassword);
      setUsers((prev) => prev.map((item) => (item.id === result.user.id ? result.user : item)));
      toast.success("Account recovered", {
        description: `${recoveryTarget.username} can sign in with the new password. MFA was cleared.`,
      });
      setRecoveryTarget(null);
      setRecoveryPassword("");
    } catch (error) {
      toast.error("Account recovery failed", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateClientAccess = async () => {
    if (!selectedEvent) {
      toast.error("Select an event first");
      return;
    }
    if (!companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!clientUsername.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!clientPassword.trim()) {
      toast.error("Password is required");
      return;
    }
    if (!expiresAt) {
      toast.error("Expiry date is required");
      return;
    }

    setClientSaving(true);
    try {
      const response = await createAdminClientCredential({
        eventId: selectedEvent.id,
        companyName: companyName.trim(),
        username: clientUsername.trim(),
        password: clientPassword,
        fullName: clientFullName.trim(),
        eventType: selectedEvent.eventType || "conference",
        expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString(),
        isActive: true,
      });
      toast.success("Client access created", {
        description: `${response.credential.user?.username || clientUsername} can open ${selectedEvent.eventName}.`,
      });
      setClientUsername("");
      setClientPassword("");
      setClientFullName("");
      setExpiresAt("");
      await loadCredentials();
      await loadUsers();
    } catch (error) {
      toast.error("Failed to create client access", { description: getErrorMessage(error) });
    } finally {
      setClientSaving(false);
    }
  };

  const handleRevokeClientAccess = async (credential: AdminClientCredential) => {
    setRevokingId(credential.id);
    try {
      await revokeAdminClientCredential(credential.id);
      toast.success("Client access revoked", {
        description: credential.user?.username || credential.companyName,
      });
      await loadCredentials();
      await loadUsers();
    } catch (error) {
      toast.error("Failed to revoke client access", { description: getErrorMessage(error) });
    } finally {
      setRevokingId(null);
    }
  };

  const refreshCurrentTab = () => {
    if (activeTab === "client-access") {
      void loadEvents();
      void loadCredentials();
      return;
    }
    void loadUsers();
  };

  const editingSelf = Boolean(editingId && editingId === currentUser?.id);
  const clientFormDisabled = !selectedEvent || loadingEvents || clientSaving;

  return (
    <div className="admin-page flex min-h-[calc(100dvh-3rem)] flex-col bg-transparent">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div>
              <p className="admin-eyebrow">Admin Control</p>
              <h1 className="admin-title">User & Role Management</h1>
            </div>

            <div className="admin-actions xl:justify-end">
              <Link href={isCeo ? "/dashboard" : "/choose-persona"}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-zinc-300 bg-white/90 px-4 text-zinc-700 hover:bg-zinc-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {isCeo ? "Dashboard" : "Workspaces"}
                </Button>
              </Link>

              <Button
                type="button"
                onClick={refreshCurrentTab}
                disabled={loading || saving || loadingEvents || loadingCredentials || clientSaving}
                className="analytics-frost-btn h-10 px-4"
              >
                <RefreshCw className={`h-4 w-4 ${loading || loadingEvents || loadingCredentials ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Total Users", value: stats.total, icon: UsersRound },
              { label: "Active Users", value: stats.active, icon: ShieldCheck },
              { label: "Super Admins", value: stats.superAdmins, icon: KeyRound },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-200 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{item.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-1 shadow-[0_16px_38px_-34px_rgba(15,23,42,0.6)]">
        <div className="grid gap-1 sm:grid-cols-3">
          {[
            { id: "users" as const, label: "Users", icon: UsersRound },
            { id: "add-user" as const, label: "Add User", icon: UserPlus },
            { id: "client-access" as const, label: "Client Access", icon: KeyRound },
          ].map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "add-user" && activeTab !== "add-user") resetForm();
                  setActiveTab(tab.id);
                }}
                className={`flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
                  selected ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "text-zinc-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "users" ? (
        <Card className="admin-card mt-5 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Users by Department</h2>
              <p className="text-sm text-zinc-500">Managers and normal users are separated inside each department.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search users"
                  className="h-10 border-zinc-300 bg-white pl-9"
                  autoComplete="off"
                />
              </div>
              <Button type="button" onClick={startCreate} className="btn-sidebar-noise h-10 px-4">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          <div className="grid h-[min(40rem,calc(100dvh-20rem))] min-h-[32rem] overflow-hidden lg:grid-cols-[16rem_minmax(0,1fr)]">
            {loading ? (
              <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-500 lg:col-span-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-500 lg:col-span-2">
                No users found.
              </div>
            ) : (
              <>
                <aside className="min-h-0 overflow-hidden border-b border-zinc-100 bg-zinc-50/70 p-3 lg:border-b-0 lg:border-r">
                  <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:h-full lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    {departmentGroups.map((department) => {
                      const DepartmentIcon = department.icon;
                      const selected = department.id === selectedDepartment.id;
                      return (
                        <button
                          key={department.id}
                          type="button"
                          onClick={() => setActiveDepartmentId(department.id)}
                          className={`flex min-w-52 items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors lg:min-w-0 ${
                            selected
                              ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm"
                              : "border-transparent bg-transparent text-zinc-600 hover:border-blue-100 hover:bg-white hover:text-blue-700"
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/70 bg-white text-blue-700">
                            <DepartmentIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{department.label}</span>
                            <span className="mt-0.5 block text-xs text-zinc-500">
                              {department.rows.length} users, {department.managers.length} managers
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <section className="flex min-h-0 min-w-0 flex-col">
                  <div className="shrink-0 border-b border-zinc-100 px-5 py-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{selectedDepartment.label}</h3>
                        <p className="mt-1 text-sm text-zinc-500">{selectedDepartment.description}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center text-xs sm:w-80">
                        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
                          <p className="font-semibold">{selectedDepartment.managers.length}</p>
                          <p>Managers</p>
                        </div>
                        <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-600">
                          <p className="font-semibold">{selectedDepartment.normalUsers.length}</p>
                          <p>Users</p>
                        </div>
                        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700">
                          <p className="font-semibold">
                            {selectedDepartment.rows.filter((item) => item.isActive !== false).length}
                          </p>
                          <p>Active</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {selectedDepartment.rows.length ? (
                      [...selectedDepartment.managers, ...selectedDepartment.normalUsers].map((item) => (
                        <UserCard
                          key={item.id}
                          item={item}
                          isSelf={item.id === currentUser?.id}
                          onEdit={() => startEdit(item)}
                          onPassword={() => {
                            setPasswordTarget(item);
                            setNewPassword("");
                          }}
                          onResetMfa={() => setMfaResetTarget(item)}
                          onRecover={() => {
                            setRecoveryTarget(item);
                            setRecoveryPassword("");
                          }}
                          onDelete={() => setDeleteTarget(item)}
                        />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-5 text-sm text-zinc-500">
                        No users in this department yet.
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </Card>
      ) : null}

      {activeTab === "add-user" ? (
        <Card className="admin-card mt-5 overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Add User</h2>
              <p className="text-sm text-zinc-500">Create a login for the right pipeline role.</p>
            </div>
          </div>

          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Username</label>
                <Input
                  name="admin-user-username"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="Enter username"
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Full Name</label>
                <Input
                  name="admin-user-full-name"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Enter full name"
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Initial Password</label>
                <Input
                  name="admin-user-new-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Enter password"
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Role</label>
                <Select
                  value={form.role}
                  disabled={editingSelf}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as AuthRole }))}
                >
                  <SelectTrigger className="h-10 border-zinc-300 bg-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-300 bg-white">
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingSelf ? <p className="text-xs text-zinc-400">Your own role is protected while editing.</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Status</label>
                <Select
                  value={form.status}
                  disabled={editingSelf}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as UserStatusValue }))}
                >
                  <SelectTrigger className="h-10 border-zinc-300 bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-300 bg-white">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">Form Preview</h3>
              <div className="mt-3 space-y-2 text-sm text-zinc-600">
                <p>User: {form.fullName.trim() || form.username.trim() || "Not set"}</p>
                <p>Role: {form.role ? getRoleLabel(form.role) : "Not set"}</p>
                <p>Status: {form.status ? form.status : "Not set"}</p>
              </div>
              <Button
                type="button"
                onClick={submitForm}
                disabled={saving}
                className="btn-sidebar-noise mt-5 h-10 w-full rounded-md"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create User
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === "client-access" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.52fr)]">
          <Card className="admin-card p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">Primary Action</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Create Client Access</h2>
                <p className="mt-1 text-sm text-zinc-500">Create event dashboard credentials for a client company.</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                <UserPlus className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Event</label>
                <EventRegistryPicker
                  events={events}
                  value={eventId}
                  onValueChange={setEventId}
                  loading={loadingEvents}
                  disabled={clientSaving}
                  placeholder="Select event"
                  loadingLabel="Loading events..."
                />
                <p className="text-xs text-zinc-500">
                  {selectedEvent
                    ? `${eventTypeLabel(selectedEvent.eventType)} | ${formatDate(selectedEvent.date)}`
                    : "Choose an event before entering client details."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Company Name</label>
                <Input
                  name="client-access-company"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Enter company name"
                  disabled={clientFormDisabled}
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Username</label>
                <Input
                  name="client-access-username"
                  value={clientUsername}
                  onChange={(event) => setClientUsername(event.target.value)}
                  placeholder="Enter username"
                  disabled={clientFormDisabled}
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Display Name</label>
                <Input
                  name="client-access-full-name"
                  value={clientFullName}
                  onChange={(event) => setClientFullName(event.target.value)}
                  placeholder="Optional display name"
                  disabled={clientFormDisabled}
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Password</label>
                <div className="relative">
                  <Input
                    name="client-access-password"
                    type={showClientPassword ? "text" : "password"}
                    value={clientPassword}
                    onChange={(event) => setClientPassword(event.target.value)}
                    placeholder="Enter password"
                    disabled={clientFormDisabled}
                    className="h-10 border-zinc-300 bg-white pr-11"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label={showClientPassword ? "Hide password" : "Show password"}
                    disabled={clientFormDisabled}
                    onClick={() => setShowClientPassword((value) => !value)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {showClientPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Expiry Date</label>
                <Input
                  name="client-access-expiry"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  disabled={clientFormDisabled}
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
              <div className="grid gap-3 text-sm text-blue-900 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <p>
                  {selectedEvent
                    ? `Ready to create credentials for ${selectedEvent.eventName}.`
                    : "Select an event first, then complete the client credentials."}
                </p>
                <Button
                  type="button"
                  onClick={() => void handleCreateClientAccess()}
                  disabled={clientSaving || loadingEvents || !selectedEvent}
                  className="h-10 bg-blue-600 px-5 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {clientSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Create Client Access
                </Button>
              </div>
            </div>
          </Card>

          <Card className="admin-card overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Current Access</h2>
                <p className="text-sm text-zinc-500">
                  {selectedEvent
                    ? `${credentials.length} records for ${selectedEvent.eventName}.`
                    : "Select an event to review credentials."}
                </p>
              </div>
              <KeyRound className="h-5 w-5 text-blue-600" />
            </div>

            <div className="admin-list-panel divide-y divide-zinc-100">
              {loadingCredentials ? (
                <div className="flex min-h-40 items-center justify-center px-5 py-10 text-sm text-zinc-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading client access...
                </div>
              ) : credentials.length ? (
                credentials.map((credential) => (
                  <div key={credential.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {credential.user?.fullName || credential.user?.username || credential.userId}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">{credential.user?.username || credential.userId}</p>
                      <p className="mt-3 truncate text-sm font-medium text-zinc-600">{credential.companyName}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="text-left text-xs sm:text-right">
                        <p className={credential.isUsable ? "font-semibold text-emerald-700" : "font-semibold text-zinc-500"}>
                          {credential.isUsable ? "Active" : "Expired or revoked"}
                        </p>
                        <p className="mt-1 text-zinc-500">Expires {formatDate(credential.expiresAt)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={revokingId === credential.id || !credential.isActive}
                        onClick={() => void handleRevokeClientAccess(credential)}
                        className="h-9 border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {revokingId === credential.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-zinc-500">
                  {selectedEvent ? "No client credentials for this event." : "No event selected."}
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {editingId ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-blue-950/35 p-4 backdrop-blur-[3px]">
          <Card className="admin-modal-panel w-full max-w-2xl overflow-hidden rounded-2xl border border-blue-100 bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">User Details</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Update User</h3>
                <p className="mt-1 text-sm text-zinc-500">Update profile, role, and account status without leaving the Users tab.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                className="h-8 w-8 rounded-md border border-zinc-300 bg-white p-0 text-zinc-500 hover:bg-blue-50 hover:text-blue-700"
                aria-label="Close edit form"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Username</label>
                <Input
                  name="admin-user-edit-username"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="Enter username"
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Full Name</label>
                <Input
                  name="admin-user-edit-full-name"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Enter full name"
                  className="h-10 border-zinc-300 bg-white"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Role</label>
                <Select
                  value={form.role}
                  disabled={editingSelf}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as AuthRole }))}
                >
                  <SelectTrigger className="h-10 border-zinc-300 bg-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-300 bg-white">
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingSelf ? <p className="text-xs text-zinc-400">Your own role is protected while editing.</p> : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500">Status</label>
                <Select
                  value={form.status}
                  disabled={editingSelf}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as UserStatusValue }))}
                >
                  <SelectTrigger className="h-10 border-zinc-300 bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-300 bg-white">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={resetForm}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={submitForm} className="h-9 rounded-md bg-blue-600 px-4 text-white hover:bg-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save User
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {passwordTarget ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-blue-950/35 p-4 backdrop-blur-[3px]">
          <Card className="admin-modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-zinc-300 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Reset Password</h3>
              <p className="mt-1 text-sm text-zinc-500">Set a new password for {passwordTarget.username}.</p>
            </div>
            <div className="space-y-2 px-5 py-4">
              <label className="text-xs font-semibold uppercase text-zinc-500">New Password</label>
              <Input
                name="admin-password-reset"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                className="h-10 border-zinc-300 bg-white"
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => setPasswordTarget(null)}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={submitPassword} className="btn-sidebar-noise h-9 px-3.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Update Password
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {mfaResetTarget ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-blue-950/35 p-4 backdrop-blur-[3px]">
          <Card className="admin-modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-zinc-300 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Reset MFA</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Remove Microsoft Authenticator from {mfaResetTarget.username}. Their next login will use password only
                until they set up MFA again.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => setMfaResetTarget(null)}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={confirmMfaReset}
                className="h-9 rounded-md bg-blue-600 px-3.5 text-white hover:bg-blue-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Reset MFA
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {recoveryTarget ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-blue-950/35 p-4 backdrop-blur-[3px]">
          <Card className="admin-modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-zinc-300 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Recover Account</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Set a new password for {recoveryTarget.username} and remove MFA from the account.
              </p>
            </div>
            <div className="space-y-2 px-5 py-4">
              <label className="text-xs font-semibold uppercase text-zinc-500">New Recovery Password</label>
              <Input
                name="admin-account-recovery-password"
                type="password"
                value={recoveryPassword}
                onChange={(event) => setRecoveryPassword(event.target.value)}
                placeholder="Enter new password"
                className="h-10 border-zinc-300 bg-white"
                autoComplete="new-password"
              />
              <p className="text-xs text-zinc-500">
                Existing sessions will be revoked. The user can set up MFA again from their profile.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setRecoveryTarget(null);
                  setRecoveryPassword("");
                }}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={submitAccountRecovery}
                className="h-9 rounded-md bg-blue-600 px-3.5 text-white hover:bg-blue-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Recover Account
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-blue-950/35 p-4 backdrop-blur-[3px]">
          <Card className="admin-modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-zinc-300 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Delete User</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Delete {deleteTarget.username}? This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => setDeleteTarget(null)}
                className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={confirmDelete}
                className="h-9 rounded-md border border-red-700 bg-red-600 px-3.5 text-white hover:bg-red-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete User
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
