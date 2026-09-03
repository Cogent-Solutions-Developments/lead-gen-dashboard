import { NextRequest } from "next/server";
import { apiAuthenticationFailure, verifyBackendUser } from "@/lib/server/apiAuth";

export const dynamic = "force-dynamic";

function getBackendConfig() {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
  return { baseUrl };
}

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  });
}

export async function GET(request: NextRequest) {
  const { baseUrl } = getBackendConfig();
  if (!baseUrl) {
    return jsonResponse({ detail: "NEXT_PUBLIC_API_BASE_URL is not configured." }, 500);
  }

  let user;
  try {
    user = await verifyBackendUser(request);
  } catch (error) {
    const failure = apiAuthenticationFailure(error);
    return jsonResponse({ detail: failure.detail }, failure.status);
  }

  if (user.role !== "super_admin_user") {
    return jsonResponse({ detail: "Only super admins can access WhatsApp events." }, 403);
  }

  const upstreamUrl = `${baseUrl}/api/whatsapp/events`;
  const authorization = request.headers.get("authorization") || "";
  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: authorization,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(text || "Failed to connect SSE upstream", {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") || "text/plain; charset=utf-8",
        },
      });
    }

    if (!upstream.body) {
      return jsonResponse({ detail: "SSE upstream returned no body." }, 502);
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upstream error";
    return jsonResponse({ detail: `Failed to open SSE upstream: ${message}` }, 502);
  }
}
