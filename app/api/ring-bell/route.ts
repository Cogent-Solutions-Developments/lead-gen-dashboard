import { NextRequest } from "next/server";
import { apiAuthenticationFailure, verifyBackendUser } from "@/lib/server/apiAuth";

export const dynamic = "force-dynamic";

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await verifyBackendUser(request);
  } catch (error) {
    const failure = apiAuthenticationFailure(error);
    return jsonResponse({ detail: failure.detail }, failure.status);
  }

  if (user.role !== "sales_user" && user.role !== "sales_manager_user") {
    return jsonResponse({ detail: "Only sales users can ring the deal bell." }, 403);
  }

  const webhookUrl = (process.env.TEAMS_DEAL_BELL_WEBHOOK_URL || "").trim();
  if (!webhookUrl) return jsonResponse({ detail: "TEAMS_DEAL_BELL_WEBHOOK_URL is not configured." }, 500);

  const userName = String(user.fullName || user.username || "A supernizo user").trim().replace(/\s+/g, " ");
  const firstName = userName.split(/\s+/)[0] || userName;
  const message = `${firstName} successfully closed a deal`;
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: message,
      themeColor: "111111",
      title: "🔔 Deal bell",
      text: `Hey team, ${firstName} just closed a deal. Huge congratulations. Let's keep the momentum going.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return jsonResponse({ detail: detail || "Failed to send Teams bell notification." }, response.status);
  }
  const provider = await response.text().catch(() => "");
  return jsonResponse({ ok: true, message, provider }, 200);
}
