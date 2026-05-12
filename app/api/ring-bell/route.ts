import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cleanUserName(value: unknown) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text || "A supernizo user";
}

function getTeamsWebhookUrl() {
  return (process.env.TEAMS_DEAL_BELL_WEBHOOK_URL || "").trim();
}

export async function POST(request: NextRequest) {
  const webhookUrl = getTeamsWebhookUrl();
  if (!webhookUrl) {
    return jsonResponse({ detail: "TEAMS_DEAL_BELL_WEBHOOK_URL is not configured." }, 500);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const source = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const userName = cleanUserName(source.userName);
  const firstName = userName.split(/\s+/)[0] || userName;
  const message = `${firstName} successfully closed a deal`;
  const teamsMessage = `Hey team, ${firstName} just closed a deal. Huge congratulations. Let’s keep the momentum going.`;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: message,
      themeColor: "111111",
      title: "🔔 Deal bell",
      text: teamsMessage,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return jsonResponse(
      { detail: text || "Failed to send Teams bell notification." },
      response.status
    );
  }

  const data = await response.text().catch(() => "");
  return jsonResponse({ ok: true, message, provider: data }, 200);
}
