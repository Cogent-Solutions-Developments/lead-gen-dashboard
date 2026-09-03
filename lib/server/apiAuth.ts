import { getLocalDevNgrokHeaders } from "@/lib/devNgrok";

export type VerifiedBackendUser = {
  id: string;
  username: string;
  fullName: string;
  role: string;
};

export class ApiAuthenticationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiAuthenticationError";
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function cleanText(value: unknown, maxLength = 180) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

async function responsePayload(response: Response) {
  const body = await response.text();
  if (!body) return {};
  try { return asRecord(JSON.parse(body)); } catch { return {}; }
}

export async function verifyBackendUser(request: Request): Promise<VerifiedBackendUser> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    throw new ApiAuthenticationError("An authenticated session is required.", 401);
  }

  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!baseUrl) throw new ApiAuthenticationError("Authentication service is not configured.", 503);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: authorization,
        ...getLocalDevNgrokHeaders(),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiAuthenticationError("Authentication service is unavailable.", 503);
  }

  const payload = await responsePayload(response);
  if (!response.ok) {
    const status = response.status === 401 || response.status === 403 ? response.status : 503;
    throw new ApiAuthenticationError(
      status === 403 ? "This account is not allowed to perform this action."
        : status === 401 ? "The authenticated session is invalid or expired."
          : "Authentication service is unavailable.",
      status
    );
  }

  const user = asRecord(payload.user);
  const verified = {
    id: cleanText(user.id, 120),
    username: cleanText(user.username, 160),
    fullName: cleanText(user.fullName ?? user.full_name ?? user.username),
    role: cleanText(user.role, 80),
  };
  if (!verified.id || !verified.username || !verified.role) {
    throw new ApiAuthenticationError("The authenticated user response is invalid.", 401);
  }
  return verified;
}

export function apiAuthenticationFailure(error: unknown) {
  if (error instanceof ApiAuthenticationError) return { detail: error.message, status: error.status };
  return { detail: "Authentication could not be verified.", status: 503 };
}
