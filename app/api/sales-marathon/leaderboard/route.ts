import { NextRequest, NextResponse } from "next/server";
import { MarathonApiClient } from "@/lib/sales-marathon/marathonApiClient";
import { MarathonPolicy } from "@/lib/sales-marathon/marathonPolicy";
import { SalesMarathonService } from "@/lib/sales-marathon/salesMarathonService";

export const dynamic = "force-dynamic";

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
}

function getApiKey() {
  return (process.env.NEXT_PUBLIC_API_KEY || "").trim();
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const authorization = request.headers.get("authorization") || "";

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ detail: "Sales marathon API is not configured." }, { status: 500 });
  }

  if (!authorization) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const apiClient = new MarathonApiClient(baseUrl, apiKey);
  const policy = new MarathonPolicy();
  const service = new SalesMarathonService(apiClient, policy);

  const isAuthenticated = await apiClient.checkAuth(authorization);
  if (!isAuthenticated) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    // Reset time to ensure consistency (midnight) if needed, 
    // but the policy already compares components.
    // However, for "today", we should ensure we use the server's today.

    const runners = await service.getLeaderboard(targetDate);

    // API-001: Removed 'lane' property from response. Compute in UI.
    return NextResponse.json({ runners }, { status: 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Failed to load sales marathon.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
