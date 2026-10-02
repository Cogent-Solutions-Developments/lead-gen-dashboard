import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

function harness(file, exportName, api) {
  const source = readFileSync(new URL(`../components/settings/${file}.tsx`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const states = [];
  let cursor = 0;
  let effect;
  const events = [];
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, Event: class { constructor(type) { this.type = type; } }, window: { dispatchEvent: event => events.push(event.type) }, require: name => {
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "react") return {
      useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }]; },
      useCallback: callback => callback,
      useEffect: callback => { effect = callback; },
    };
    if (name === "@/lib/whatsappConfiguration") return { configurationError: error => error.message, ...api };
    if (name === "sonner") return { toast: { success: () => {} } };
    if (name === "next/link") return "a";
    return new Proxy({}, { get: (_, key) => key });
  }});
  let tree;
  function render() { cursor = 0; tree = module.exports[exportName]({ onBack: () => {} }); return tree; }
  function all(predicate, node = tree, found = []) {
    if (Array.isArray(node)) { node.forEach(child => all(predicate, child, found)); return found; }
    if (!node || typeof node !== "object") return found;
    if (predicate(node)) found.push(node);
    all(predicate, node.props?.children ?? null, found);
    return found;
  }
  const find = predicate => { const match = all(predicate)[0]; assert.ok(match, "Missing UI control"); return match; };
  render();
  return { render, find, events, mount: async () => { effect(); await new Promise(resolve => setImmediate(resolve)); render(); } };
}

test("top toggle unlocks editing, activation waits for save, and disabling immediately locks", async () => {
  let config = { enabled: false, revision: 0, values: { WHATSAPP_PROVIDER: "d360", D360_ENV: "sandbox" }, credentialRefs: {}, credentials: [] };
  const calls = [];
  const view = harness("OutreachWhatsAppSettings", "OutreachWhatsAppSettings", {
    getWhatsAppConfiguration: async () => config,
    saveWhatsAppConfiguration: async payload => { calls.push(payload); config = { ...config, ...payload, revision: config.revision + 1 }; return config; },
  });
  await view.mount();
  assert.equal(view.find(node => node.type === "fieldset").props.disabled, true);
  await view.find(node => node.props?.role === "switch").props.onClick();
  view.render();
  assert.equal(view.find(node => node.type === "fieldset").props.disabled, false);
  assert.equal(config.enabled, false);
  assert.equal(calls.length, 0);
  await view.find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  view.render();
  assert.equal(calls[0].enabled, true);
  assert.equal(config.enabled, true);
  await view.find(node => node.props?.role === "switch").props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  view.render();
  assert.equal(calls[1].enabled, false);
  assert.equal(Object.keys(calls[1].values).length, 0);
  assert.equal(view.find(node => node.type === "fieldset").props.disabled, true);
  assert.equal(view.find(node => node.props?.type === "submit").props.disabled, true);
  assert.deepEqual(view.events, ["whatsapp-configuration-changed", "whatsapp-configuration-changed"]);
});

test("invalid activation leaves delivery paused and displays the server error", async () => {
  const view = harness("OutreachWhatsAppSettings", "OutreachWhatsAppSettings", {
    getWhatsAppConfiguration: async () => ({ enabled: false, revision: 0, values: {}, credentialRefs: {}, credentials: [] }),
    saveWhatsAppConfiguration: async () => { throw new Error("Select a valid connection"); },
  });
  await view.mount();
  view.find(node => node.props?.role === "switch").props.onClick(); view.render();
  await view.find(node => node.type === "form").props.onSubmit({ preventDefault() {} }); view.render();
  assert.equal(view.find(node => node.props?.role === "alert").props.children, "Select a valid connection");
  assert.equal(view.events.length, 0);
});

test("credential edit preserves blank secrets and sends explicit clear separately", async () => {
  const saved = { id: "connection", name: "Marketing", provider: "d360", accountSid: "", revision: 2, configuredFields: ["D360_API_KEY"], inUse: false };
  const calls = [];
  const view = harness("OutreachCredentialSettings", "OutreachCredentialSettings", {
    listWhatsAppCredentials: async () => [saved],
    saveWhatsAppCredential: async payload => { calls.push(payload); return { ...saved, revision: 3 }; },
  });
  await view.mount();
  view.find(node => node.props?.["aria-label"] === "Edit Marketing").props.onClick(); view.render();
  assert.equal(view.find(node => node.props?.id === "secret-D360_API_KEY").props.value, "");
  await view.find(node => node.type === "form").props.onSubmit({ preventDefault() {} }); view.render();
  assert.equal(Object.keys(calls[0].secrets).length, 0);
  view.find(node => node.props?.["aria-label"] === "Edit Marketing").props.onClick(); view.render();
  view.find(node => node.props?.type === "checkbox").props.onChange({ target: { checked: true } }); view.render();
  await view.find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(calls[1].secrets.D360_API_KEY, "");
});
