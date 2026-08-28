import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin settings exposes only organized outreach and opt-out cards", () => {
  const page = read("app/settings/page.tsx");

  assert.match(page, /Outreach Configuration/);
  assert.match(page, /Marketing Opt-out/);
  assert.match(page, /<OutreachMailWebhookSettings/);
  assert.match(page, /<MarketingOptOutSettings/);
  assert.doesNotMatch(page, />Profile</);
  assert.doesNotMatch(page, />API Keys</);
  assert.doesNotMatch(page, /Save Changes/);
});

test("mail webhook API client follows the admin backend contract", () => {
  const api = read("lib/api.ts");
  const router = read("lib/apiRouter.ts");

  assert.match(api, /export type OutreachDepartment = "sales" \| "delegate" \| "production"/);
  assert.match(api, /\/api\/admin\/settings\/outreach\/mail-webhooks/);
  assert.match(api, /export async function createDepartmentMailWebhook/);
  assert.match(api, /export async function updateDepartmentMailWebhook/);
  assert.match(api, /export async function deleteDepartmentMailWebhook/);
  assert.match(router, /export const listDepartmentMailWebhooks = sales\.listDepartmentMailWebhooks/);
});

test("mail webhook settings supports department routing lifecycle and rotation guidance", () => {
  const settings = read("components/settings/OutreachMailWebhookSettings.tsx");

  assert.match(settings, /value: "sales"/);
  assert.match(settings, /value: "delegate"/);
  assert.match(settings, /value: "production"/);
  assert.match(settings, /createDepartmentMailWebhook/);
  assert.match(settings, /updateDepartmentMailWebhook/);
  assert.match(settings, /deleteDepartmentMailWebhook/);
  assert.match(settings, /rotate through them sequentially/);
  assert.match(settings, /cannot be registered twice in one department/);
  assert.match(settings, /webhookUrlMasked/);
});

test("the settings route remains super-admin-only", () => {
  const shell = read("components/layout/AppShell.tsx");

  assert.match(shell, /pathname === "\/settings"/);
  assert.match(shell, /!isSuperAdmin && isSuperOnlyPath\(pathname\)/);
});
