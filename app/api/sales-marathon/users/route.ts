import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type BackendUser = {
  id?: string;
  username?: string;
  fullName?: string;
  full_name?: string;
  role?: string;
  isActive?: boolean;
  is_active?: boolean;
};

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
}

function getApiKey() {
  return (process.env.NEXT_PUBLIC_API_KEY || "").trim();
}

function normalizeSalesUser(user: BackendUser) {
  const id = String(user.id || "").trim();
  const username = String(user.username || "").trim();
  const fullName = String(user.fullName || user.full_name || "").trim();
  const role = String(user.role || "").trim();
  const isActive = user.isActive ?? user.is_active;

  if (!id || role !== "sales_user" || isActive === false) return null;
  return {
    id,
    username,
    fullName,
    role,
    isActive: true,
  };
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const authorization = request.headers.get("authorization") || "";

  if (!baseUrl || !apiKey) {
    return jsonResponse({ detail: "Sales marathon API is not configured." }, 500);
  }

  if (!authorization) {
    return jsonResponse({ detail: "Authentication required." }, 401);
  }

  const authCheck = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      Authorization: authorization,
      "x-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!authCheck.ok) {
    return jsonResponse({ detail: "Authentication required." }, authCheck.status);
  }

  const usersResponse = await fetch(`${baseUrl}/api/auth/users`, {
    headers: {
      "x-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!usersResponse.ok) {
    const detail = await usersResponse.text().catch(() => "");
    return jsonResponse({ detail: detail || "Failed to load sales users." }, usersResponse.status);
  }

  const data = await usersResponse.json().catch(() => ({ users: [] }));
  const users = Array.isArray(data.users)
    ? data.users.map((user: BackendUser) => normalizeSalesUser(user)).filter(Boolean)
    : [];

  return jsonResponse({ users }, 200);
}
