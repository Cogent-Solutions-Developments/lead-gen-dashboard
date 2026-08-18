import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("event document API keeps each document stream isolated", () => {
  const api = read("lib/api.ts");
  assert.match(api, /documentType: EventDocumentType/);
  assert.match(api, /\/api\/event-documents\?/);
  assert.match(api, /formData\.append\("documentType", documentType\)/);
  assert.match(api, /\/api\/admin\/event-documents/);
  assert.match(api, /\/api\/event-documents\/" \+ encodeURIComponent\(documentId\)/);
});

test("admin library provides isolated agenda, speaker, and delegate version tabs", () => {
  const page = read("app/admin/event-documents/page.tsx");
  const legacyPage = read("app/admin/agendas/page.tsx");
  const shell = read("components/layout/AdminPanelShell.tsx");
  for (const type of ["agenda", "speaker_list", "delegate_list"]) {
    assert.match(page, new RegExp(`type: "${type}"`));
  }
  assert.match(page, /role="tablist"/);
  assert.match(page, /response\.documents/);
  assert.match(page, /uploadEventDocument/);
  assert.match(page, /deleteEventDocument/);
  assert.match(legacyPage, /redirect\("\/admin\/event-documents"\)/);
  assert.match(shell, /name: "Event Documents"/);
});

test("normal and manager lead sheets render isolated agenda-pattern speaker and delegate cards", () => {
  const page = read("components/leads/NormalUserEventLeadSheet.tsx");
  assert.match(page, /documentType: "speaker_list"/);
  assert.match(page, /documentType: "delegate_list"/);
  assert.match(page, /Invited and confirmed speaker list/);
  assert.match(page, /Invited and confirmed delegate list/);
  assert.match(page, /handleEventListView/);
  assert.match(page, /Download latest/);
  assert.doesNotMatch(page, /Confirmed event lists/);
});
