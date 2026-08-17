import { NextRequest } from "next/server";
import { apiAuthenticationFailure, verifyBackendUser } from "@/lib/server/apiAuth";

function getBackendConfig() {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.NEXT_PUBLIC_API_KEY || "").trim();
  return { baseUrl, apiKey };
}

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  });
}

export async function GET(request: NextRequest) {
  const { baseUrl, apiKey } = getBackendConfig();
  if (!baseUrl) {
    return jsonResponse({ detail: "NEXT_PUBLIC_API_BASE_URL is not configured." }, 500);
  }
  if (!apiKey) {
    return jsonResponse({ detail: "NEXT_PUBLIC_API_KEY is not configured." }, 500);
  }

  let user;
  try {
    user = await verifyBackendUser(request);
  } catch (error) {
    const failure = apiAuthenticationFailure(error);
    return jsonResponse({ detail: failure.detail }, failure.status);
  }

  if (user.role !== "super_admin_user") {
    return jsonResponse({ detail: "Only super admins can access WhatsApp messages." }, 403);
  }

  const personId = request.nextUrl.searchParams.get("person_id")?.trim();
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);
  const limit = String(Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50);

  if (!personId) {
    return jsonResponse({ detail: "person_id is required." }, 400);
  }
  if (personId.length > 120) {
    return jsonResponse({ detail: "person_id is invalid." }, 400);
  }

  const upstreamUrl = `${baseUrl}/api/whatsapp/inbound?person_id=${encodeURIComponent(
    personId
  )}&limit=${encodeURIComponent(limit)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: request.headers.get("authorization") || "",
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upstream error";
    return jsonResponse({ detail: `Upstream request failed: ${message}` }, 502);
  }
}
