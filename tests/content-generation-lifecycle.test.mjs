import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { generationStatus } from "../lib/contentGenerationState.ts";
import { getLocalDevNgrokHeaders } from "../lib/devNgrok.ts";

test("saved generation lifecycle distinguishes pausing, paused and terminal states", () => {
  for (const state of ["PENDING", "QUEUED", "STARTED", "PROGRESS", "RETRY"]) assert.equal(generationStatus({ state }), "running");
  assert.equal(generationStatus({ state: "PAUSING" }), "stopping");
  assert.equal(generationStatus({ state: "PROGRESS", pause_requested: true }), "stopping");
  assert.equal(generationStatus({ state: "PAUSED", pauseRequested: true }), "paused");
  for (const state of ["CANCELLED", "FAILURE", "SUCCESS"]) assert.equal(generationStatus({ state, pause_requested: true }), "idle");
});

test("built previews bypass ngrok warnings only for configured ngrok hosts", () => {
  const previousBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const previousMode = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    for (const url of ["https://example.ngrok-free.app", "https://example.ngrok.app"]) {
      process.env.NEXT_PUBLIC_API_BASE_URL = url;
      assert.deepEqual(getLocalDevNgrokHeaders(), { "ngrok-skip-browser-warning": "true" });
    }
    for (const url of ["https://api.example.com", "https://ngrok.app.attacker.example", "http://localhost:8000", "invalid", ""]) {
      process.env.NEXT_PUBLIC_API_BASE_URL = url;
      assert.deepEqual(getLocalDevNgrokHeaders(), {});
    }
  } finally {
    if (previousBase === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousBase;
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  }
});

test("both campaign views resume saved jobs and recognize reused active runs", () => {
  for (const path of ["app/campaigns/page.tsx", "app/campaigns/[id]/page.tsx"]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /controlGenerationJob\([^;]+"pause"\)/);
    assert.match(source, /controlGenerationJob\([^;]+"resume"\)/);
    assert.match(source, /response\?\.reusedActiveRun/);
  }
});

test("browser clients cannot inject a public service credential", () => {
  for (const path of ["lib/apiClient.ts", "lib/api.ts", "lib/apidele.ts", "lib/apiproduction.ts", "lib/peopleApi.ts", "lib/server/apiAuth.ts"]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /NEXT_PUBLIC_API_KEY/);
  }
});

test("server integration keys cannot authenticate an invalid user session", () => {
  for (const path of ["lib/sales-marathon/marathonApiClient.ts", "app/api/delegate-kpi/leaderboard/route.ts", "app/api/production-kpi/leaderboard/route.ts", "app/api/sales-marathon/users/route.ts"]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const authRequest = source.match(/fetch\(`\$\{(?:this\.)?baseUrl\}\/api\/auth\/me`, \{([\s\S]*?)\n\s*\}\);/);
    assert.ok(authRequest, `Missing authentication check in ${path}`);
    assert.match(authRequest[1], /Authorization: authorization/);
    assert.doesNotMatch(authRequest[1], /x-api-key/);
  }
});
