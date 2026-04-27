import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import type { Persona } from "@/lib/persona";

export type AuthRole =
  | "super_admin_user"
  | "sales_user"
  | "delegate_user"
  | "production_user";

export type AuthUser = {
  id: string;
  username: string;
  role: AuthRole;
  fullName?: string;
  isActive?: boolean;
  authType?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
};

export type AuthSession = {
  accessToken: string;
  tokenType: "bearer" | string;
  expiresIn: number;
  expiresAt: number;
  user: AuthUser;
};

export type AuthUserCreateInput = {
  username: string;
  password: string;
  role: AuthRole;
  fullName?: string;
  isActive?: boolean;
};

export type AuthUserUpdateInput = {
  username?: string;
  role?: AuthRole;
  fullName?: string;
  isActive?: boolean;
};

export type AdminEventItem = {
  id: string;
  eventKey: string;
  eventName: string;
  location?: string | null;
  category?: string | null;
  date?: string | null;
  isActive: boolean;
  createdByUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminEventCreateInput = {
  eventName: string;
  eventKey: string;
  location: string;
  date: string;
  isActive: boolean;
};

export type AdminEventUpdateInput = {
  eventName?: string;
  eventKey?: string;
  location?: string;
  date?: string;
  isActive?: boolean;
  syncLinkedCampaigns?: boolean;
};

type AuthError = Error & {
  status?: number;
  data?: unknown;
};

const STORAGE_KEY = "leadgen.auth.session";
const AUTH_CHANGE_EVENT = "leadgen-auth-change";

const ROLE_ALIASES: Record<string, AuthRole> = {
  super_admin_user: "super_admin_user",
  super_admin: "super_admin_user",
  superadmin: "super_admin_user",
  admin: "super_admin_user",
  sales_user: "sales_user",
  sales: "sales_user",
  sale_user: "sales_user",
  salate_user: "sales_user",
  delegate_user: "delegate_user",
  delegate: "delegate_user",
  delegate_usert: "delegate_user",
  delegagate_user: "delegate_user",
  delegagate_usert: "delegate_user",
  production_user: "production_user",
  production: "production_user",
  production_usert: "production_user",
};

export const AUTH_ROLES: AuthRole[] = [
  "super_admin_user",
  "sales_user",
  "delegate_user",
  "production_user",
];

export function normalizeAuthRole(role: unknown): AuthRole {
  const value = String(role || "").trim().toLowerCase();
  return ROLE_ALIASES[value] ?? "sales_user";
}

export function getRoleLabel(role: AuthRole | null | undefined) {
  if (role === "super_admin_user") return "Super Admin";
  if (role === "delegate_user") return "Delegate";
  if (role === "production_user") return "Production";
  return "Sales";
}

export function isSuperAdminRole(role: AuthRole | null | undefined) {
  return role === "super_admin_user";
}

export function personaForRole(role: AuthRole | null | undefined): Persona | null {
  if (role === "sales_user") return "sales";
  if (role === "delegate_user") return "delegates";
  if (role === "production_user") return "production";
  return null;
}

export function canRoleUsePersona(role: AuthRole | null | undefined, persona: Persona | null) {
  if (!role || !persona) return false;
  if (isSuperAdminRole(role)) return true;
  return personaForRole(role) === persona;
}

export function getAuthLandingPath(role: AuthRole | null | undefined) {
  return isSuperAdminRole(role) ? "/choose-persona" : "/dashboard";
}

function getBaseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  return base.replace(/\/+$/, "");
}

function normalizeUser(raw: unknown): AuthUser {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: String(source.id || ""),
    username: String(source.username || ""),
    role: normalizeAuthRole(source.role),
    fullName: source.fullName == null ? "" : String(source.fullName),
    isActive: typeof source.isActive === "boolean" ? source.isActive : undefined,
    authType: source.authType == null ? undefined : String(source.authType),
    createdAt: source.createdAt == null ? undefined : String(source.createdAt),
    updatedAt: source.updatedAt == null ? undefined : String(source.updatedAt),
    lastLoginAt: source.lastLoginAt == null ? null : String(source.lastLoginAt),
  };
}

function emitAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.user) return null;
    if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
      clearAuthSession();
      return null;
    }
    return {
      ...parsed,
      user: normalizeUser(parsed.user),
    };
  } catch {
    clearAuthSession();
    return null;
  }
}

export function setAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...session,
      user: normalizeUser(session.user),
    })
  );
  emitAuthChange();
}

export function updateStoredAuthUser(user: AuthUser) {
  const session = getStoredAuthSession();
  if (!session) return;
  setAuthSession({ ...session, user: normalizeUser(user) });
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitAuthChange();
}

export function onAuthSessionChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => cb();
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) cb();
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handler);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handler);
    window.removeEventListener("storage", onStorage);
  };
}

export function getAuthToken() {
  return getStoredAuthSession()?.accessToken ?? "";
}

export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function attachAuthToken(config: InternalAxiosRequestConfig) {
  const token = getAuthToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (response.ok) return data as T;

  const detail = data?.detail;
  const message =
    typeof detail === "string"
      ? detail
      : typeof data?.message === "string"
        ? data.message
        : response.statusText || "Request failed";
  const error = new Error(message) as AuthError;
  error.status = response.status;
  error.data = data;
  throw error;
}

async function authRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const requestHeaders: Record<string, string> = {
    ...(rest.body ? { "Content-Type": "application/json" } : {}),
    ...(auth ? getAuthHeader() : {}),
    ...(headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...rest,
    headers: requestHeaders,
  });
  return parseResponse<T>(response);
}

export async function loginWithPassword(username: string, password: string) {
  const data = await authRequest<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: AuthUser;
  }>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ username, password }),
  });

  const session: AuthSession = {
    accessToken: data.accessToken,
    tokenType: data.tokenType,
    expiresIn: Number(data.expiresIn || 0),
    expiresAt: Date.now() + Number(data.expiresIn || 0) * 1000,
    user: normalizeUser(data.user),
  };
  setAuthSession(session);
  return session;
}

export async function fetchCurrentAuthUser() {
  const data = await authRequest<{ user: AuthUser }>("/api/auth/me");
  const user = normalizeUser(data.user);
  updateStoredAuthUser(user);
  return user;
}

export async function listAuthUsers() {
  const data = await authRequest<{ users: AuthUser[] }>("/api/auth/users");
  return Array.isArray(data.users) ? data.users.map(normalizeUser) : [];
}

export async function createAuthUser(payload: AuthUserCreateInput) {
  const data = await authRequest<{ user: AuthUser }>("/api/auth/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeUser(data.user);
}

export async function updateAuthUser(userId: string, payload: AuthUserUpdateInput) {
  const data = await authRequest<{ user: AuthUser }>(`/api/auth/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeUser(data.user);
}

export async function updateAuthUserPassword(userId: string, password: string) {
  const data = await authRequest<{ user: AuthUser }>(`/api/auth/users/${userId}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  return normalizeUser(data.user);
}

export async function deleteAuthUser(userId: string) {
  await authRequest<{ deleted: boolean; user: AuthUser }>(`/api/auth/users/${userId}`, {
    method: "DELETE",
  });
}

function normalizeAdminEvent(raw: unknown): AdminEventItem {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: String(source.id || ""),
    eventKey: String(source.eventKey || ""),
    eventName: String(source.eventName || ""),
    location: source.location == null ? null : String(source.location),
    category: source.category == null ? null : String(source.category),
    date: source.date == null ? null : String(source.date),
    isActive: Boolean(source.isActive),
    createdByUserId: source.createdByUserId == null ? null : String(source.createdByUserId),
    createdAt: source.createdAt == null ? null : String(source.createdAt),
    updatedAt: source.updatedAt == null ? null : String(source.updatedAt),
  };
}

export async function listAdminEvents(includeInactive = true) {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await authRequest<{ events: AdminEventItem[] }>(`/api/admin/events${suffix}`);
  return Array.isArray(data.events) ? data.events.map(normalizeAdminEvent) : [];
}

export async function listActiveEventRegistry() {
  const data = await authRequest<{ events: AdminEventItem[] }>("/api/event-registry/active");
  return Array.isArray(data.events) ? data.events.map(normalizeAdminEvent) : [];
}

export async function createAdminEvent(payload: AdminEventCreateInput) {
  const data = await authRequest<{ event: AdminEventItem }>("/api/admin/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeAdminEvent(data.event);
}

export async function updateAdminEvent(eventId: string, payload: AdminEventUpdateInput) {
  const data = await authRequest<{ event: AdminEventItem }>(`/api/admin/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeAdminEvent(data.event);
}
