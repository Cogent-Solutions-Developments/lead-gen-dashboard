import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const config = { revision: 4, model: "gpt-6-luna", modelOptions: ["gpt-6-luna"], reasoningEffort: "none", maxOutputTokens: 2200, prompt: "Original guidance", enabled: true, senderName: "Events team", senderEmail: "events@example.com", callbackBaseUrl: "https://backend.example.com", callbackSecretConfigured: true, apiKeySource: "AGENTIC_CONTENT_OPENAI_API_KEY", missingConfiguration: [], webhooks: Object.fromEntries(["sales", "delegate", "production"].map(key => [key, { configured: true, maskedUrl: "https://hook.make.com/...masked" }])) };

function harness(kind, save) {
  const source = readFileSync(new URL(`../components/automated-outreach/Outreach${kind}Settings.tsx`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const states = [];
  let cursor = 0, tree;
  const testModule = { exports: {} };
  runInNewContext(code, { module: testModule, exports: testModule.exports, require: name => {
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "react") return { useState: initial => { const index = cursor++; if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial; return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }]; } };
    if (name === "@/lib/automatedOutreachApi") return { [`saveOutreach${kind}Configuration`]: save };
    if (name === "@/lib/automatedOutreach") return { outreachDate: () => "Today", OUTREACH_DEPARTMENTS: ["sales", "delegate", "production"].map(key => ({ key, label: key[0].toUpperCase() + key.slice(1) })) };
    if (name === "sonner") return { toast: { success() {} } };
    if (name === "next/link") return "a";
    return new Proxy({}, { get: (_, key) => key });
  }});
  function render(current = config) { cursor = 0; tree = testModule.exports[`Outreach${kind}Form`]({ config: current, reload() {} }); }
  function all(predicate, node = tree, found = []) {
    if (Array.isArray(node)) { node.forEach(child => all(predicate, child, found)); return found; }
    if (!node || typeof node !== "object") return found;
    if (predicate(node)) found.push(node);
    all(predicate, node.props?.children ?? null, found);
    return found;
  }
  function find(predicate) { const match = all(predicate)[0]; assert.ok(match, "Missing form control"); return match; }
  render();
  return { render, all, find, field: label => find(node => node.props?.["aria-label"] === label), submit: () => find(node => node.type === "form").props.onSubmit({ preventDefault() {} }) };
}

test("content saves only content fields and never includes delivery controls", async () => {
  let payload;
  const view = harness("Content", async value => { payload = value; return { ...config, ...value, revision: 5 }; });
  view.field("Follow-up editorial guidance").props.onChange({ target: { value: "New guidance" } }); view.render();
  await view.submit(); view.render();
  assert.deepEqual(Object.keys(payload).sort(), ["maxOutputTokens", "model", "prompt", "reasoningEffort", "revision"]);
  assert.equal(payload.prompt, "New guidance");
  assert.equal(view.all(node => node.props?.type === "password" || node.props?.type === "url").length, 0);
});

test("delivery saves only delivery fields and preserves blank saved secrets and endpoints", async () => {
  let payload;
  const view = harness("Delivery", async value => { payload = value; return { ...config, revision: 5 }; });
  view.field("Follow-up sender name").props.onChange({ target: { value: "Follow-up team" } }); view.render();
  await view.submit();
  assert.deepEqual(Object.keys(payload).sort(), ["callbackBaseUrl", "callbackSecret", "clearCallbackSecret", "enabled", "revision", "senderEmail", "senderName", "webhooks"]);
  assert.equal(payload.senderName, "Follow-up team");
  assert.equal(payload.callbackSecret, "");
  assert.equal(payload.clearCallbackSecret, false);
  assert.equal(Object.keys(payload.webhooks).length, 0);
  assert.equal(view.all(node => node.props?.["aria-label"] === "Follow-up model").length, 0);
});

for (const [kind, label, field] of [["Content", "Follow-up editorial guidance", "prompt"], ["Delivery", "Follow-up sender name", "senderName"]]) {
  test(`${kind} retains unsaved edits on refresh and requires explicit reload after a revision conflict`, () => {
    const view = harness(kind, async () => config);
    view.field(label).props.onChange({ target: { value: "Unsaved edit" } });
    const updated = { ...config, revision: 5, [field]: "Saved elsewhere" };
    view.render(updated);
    assert.equal(view.field(label).props.value, "Unsaved edit");
    assert.equal(view.find(node => node.props?.type === "submit").props.disabled, true);
    view.find(node => node.props?.children === "Reload saved values").props.onClick(); view.render(updated);
    assert.equal(view.field(label).props.value, "Saved elsewhere");
    assert.equal(view.find(node => node.props?.type === "submit").props.disabled, false);
  });
  test(`${kind} retains draft after a failed save`, async () => {
    const view = harness(kind, async () => { throw new Error("Conflict"); });
    view.field(label).props.onChange({ target: { value: "Unsaved edit" } }); view.render();
    await view.submit(); view.render();
    assert.equal(view.field(label).props.value, "Unsaved edit");
    assert.ok(view.find(node => node.props?.role === "alert"));
  });
}
