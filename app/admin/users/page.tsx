"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  AUTH_ROLES,
  createAuthUser,
  deleteAuthUser,
  getRoleLabel,
  listAuthUsers,
  updateAuthUser,
  updateAuthUserPassword,
  type AuthRole,
  type AuthUser,
} from "@/lib/auth";

type UserFormState = {
  username: string;
  fullName: string;
  role: AuthRole;
  password: string;
  isActive: boolean;
};

const blankForm: UserFormState = {
  username: "",
  fullName: "",
  role: "sales_user",
  password: "",
  isActive: true,
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function roleBadgeClass(role: AuthRole) {
  if (role === "super_admin_user") return "border-blue-200 bg-blue-50 text-blue-700";
  if (role === "delegate_user") return "border-violet-200 bg-violet-50 text-violet-700";
  if (role === "production_user") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(blankForm);
  const [passwordTarget, setPasswordTarget] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await listAuthUsers());
    } catch (error) {
      toast.error("Failed to load users", { description: getErrorMessage(error) });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

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

  const stats = useMemo(() => {
    const active = users.filter((item) => item.isActive !== false).length;
    const superAdmins = users.filter((item) => item.role === "super_admin_user").length;
    return { total: users.length, active, superAdmins };
  }, [users]);

  const resetForm = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const startEdit = (item: AuthUser) => {
    setEditingId(item.id);
    setForm({
      username: item.username,
      fullName: item.fullName || "",
      role: item.role,
      password: "",
      isActive: item.isActive !== false,
    });
  };

  const submitForm = async () => {
    const username = form.username.trim();
    if (!username) {
      toast.error("Username is required");
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
          isActive: isSelf ? undefined : form.isActive,
        });
        setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("User updated", { description: updated.username });
      } else {
        const created = await createAuthUser({
          username,
          password: form.password,
          role: form.role,
          fullName: form.fullName.trim(),
          isActive: form.isActive,
        });
        setUsers((prev) => [created, ...prev]);
        toast.success("User created", { description: created.username });
      }
      resetForm();
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

  const editingSelf = Boolean(editingId && editingId === currentUser?.id);

  return (
    <div className="font-sans flex min-h-[calc(100dvh-3rem)] flex-col overflow-y-auto bg-transparent p-1">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-lg font-normal text-zinc-900">Admin Control</p>
          <h1 className="mt-0 text-2xl font-semibold tracking-tight text-zinc-900">User & Role Management</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Create users, assign pipeline roles, rotate passwords, and keep super-admin access protected.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading || saving}
          className="analytics-frost-btn h-10 px-4"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Total Users", value: stats.total, icon: UsersRound },
              { label: "Active Users", value: stats.active, icon: ShieldCheck },
              { label: "Super Admins", value: stats.superAdmins, icon: KeyRound },
            ].map((item) => (
              <Card key={item.label} className="rounded-2xl border border-zinc-200 bg-white/86 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{item.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden rounded-2xl border border-zinc-200/85 bg-white/82">
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Users</h2>
                <p className="text-sm text-zinc-500">Super admins can manage every pipeline; role users are read-only in their own pipeline.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search users"
                  className="h-10 border-zinc-200 bg-white pl-9"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="border-b border-zinc-100 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Last Login</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((item) => {
                      const isSelf = item.id === currentUser?.id;
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-zinc-50/80">
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-zinc-900">
                                {item.fullName || item.username}
                                {isSelf ? <span className="ml-2 text-xs font-medium text-zinc-400">(you)</span> : null}
                              </span>
                              <span className="text-xs text-zinc-500">{item.username}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <Badge className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-none ${roleBadgeClass(item.role)}`}>
                              {getRoleLabel(item.role)}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-semibold ${item.isActive === false ? "text-zinc-400" : "text-emerald-700"}`}>
                              {item.isActive === false ? "Inactive" : "Active"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-zinc-500">{formatDateTime(item.lastLoginAt)}</td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => startEdit(item)}
                                className="h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-700 hover:bg-zinc-50"
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setPasswordTarget(item);
                                  setNewPassword("");
                                }}
                                className="h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-700 hover:bg-zinc-50"
                              >
                                Password
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={isSelf}
                                onClick={() => setDeleteTarget(item)}
                                className="h-8 rounded-md border border-red-200 bg-white px-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Delete ${item.username}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="h-fit rounded-2xl border border-zinc-200 bg-white/88 p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">{editingId ? "Edit User" : "Add User"}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {editingId ? "Update profile and role details." : "Create a login for the right pipeline role."}
              </p>
            </div>
            {editingId ? (
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                className="h-8 w-8 rounded-md border border-zinc-200 bg-white p-0 text-zinc-500 hover:bg-zinc-50"
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                <UserPlus className="h-5 w-5" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Username</label>
              <Input
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="sales.operator"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Full Name</label>
              <Input
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="Sales Operator"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>

            {!editingId ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Initial Password</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="At least 8 characters"
                  className="h-10 border-zinc-200 bg-white"
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Role</label>
              <Select
                value={form.role}
                disabled={editingSelf}
                onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as AuthRole }))}
              >
                <SelectTrigger className="h-10 border-zinc-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 bg-white">
                  {AUTH_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingSelf ? <p className="text-xs text-zinc-400">Your own role is protected while editing.</p> : null}
            </div>

            <label className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white/80 px-3 py-3">
              <span>
                <span className="block text-sm font-semibold text-zinc-800">Active user</span>
                <span className="text-xs text-zinc-500">Inactive users cannot sign in.</span>
              </span>
              <input
                type="checkbox"
                checked={form.isActive}
                disabled={editingSelf}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 disabled:opacity-40"
              />
            </label>

            <Button
              type="button"
              onClick={submitForm}
              disabled={saving}
              className="btn-sidebar-noise h-10 w-full rounded-md"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Save User" : "Create User"}
            </Button>
          </div>
        </Card>
      </div>

      {passwordTarget ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[3px]">
          <Card className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h3 className="text-base font-semibold text-zinc-900">Reset Password</h3>
              <p className="mt-1 text-sm text-zinc-500">Set a new password for {passwordTarget.username}.</p>
            </div>
            <div className="space-y-2 px-5 py-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="h-10 border-zinc-200 bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => setPasswordTarget(null)}
                className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50"
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

      {deleteTarget ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[3px]">
          <Card className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h3 className="text-base font-semibold text-zinc-900">Delete User</h3>
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
                className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50"
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
