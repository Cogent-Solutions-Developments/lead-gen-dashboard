import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

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

  const upstreamUrl = `${baseUrl}/api/whatsapp/events`;
  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "x-api-key": apiKey,
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
