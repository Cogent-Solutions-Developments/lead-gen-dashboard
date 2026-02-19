import { NextRequest } from "next/server";

function getBackendConfig() {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.NEXT_PUBLIC_API_KEY || "").trim();
  return { baseUrl, apiKey };
}

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
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

  const personId = request.nextUrl.searchParams.get("person_id");
  const limit = request.nextUrl.searchParams.get("limit") || "50";

  if (!personId) {
    return jsonResponse({ detail: "person_id is required." }, 400);
  }

  const upstreamUrl = `${baseUrl}/api/whatsapp/inbound?person_id=${encodeURIComponent(
    personId
  )}&limit=${encodeURIComponent(limit)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
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
