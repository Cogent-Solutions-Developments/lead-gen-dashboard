import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";
const source = fs.readFileSync(new URL("../lib/contentPreview.ts", import.meta.url), "utf8")
  .replace('import { getStoredAuthSession } from "@/lib/auth";', 'const getStoredAuthSession = () => ({ user: { id: "unit-user" } });');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { generateDurablePreview } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const result = { contentEmail: "Saved personalized content" };
const ready = { jobId: "job", state: "SUCCESS", platform: "email", result };
test("restores existing content without a new generation", async () => {
  const client = { get: async () => ({ data: ready }), post: () => assert.fail("must not regenerate") };
  assert.deepEqual(await generateDurablePreview(client, "/previews", { platform: "email" }), result);
});
test("revisions include user edits and feedback", async () => {
  let submitted;
  const client = { get: async () => ({ data: ready }), post: async (_path, data) => { submitted = data; return { data: ready }; } };
  await generateDurablePreview(client, "/previews", { platform: "email", feedback: "More direct", parentJobId: "job", previousContent: { email_body: "My version" } });
  assert.equal(submitted.previousContent.email_body, "My version");
  assert.equal(submitted.feedback, "More direct");
  assert.match(submitted.requestId, /^[0-9a-f-]{36}$/);
});
test("an explicit retry continues the saved job", async () => {
  let called;
  const client = { get: async () => ({ data: { ...ready, state: "FAILURE", result: null, canContinue: true } }), post: async path => { called = path; return { data: ready }; } };
  await generateDurablePreview(client, "/previews", { platform: "email" });
  assert.equal(called, "/previews/job/continue");
});
test("budget pauses do not create another job", async () => {
  const client = { get: async () => ({ data: { ...ready, state: "PAUSED", result: null, budgetExhausted: true } }), post: () => assert.fail("must not bypass budget") };
  await assert.rejects(generateDurablePreview(client, "/previews", { platform: "email" }), /administrator/);
});
