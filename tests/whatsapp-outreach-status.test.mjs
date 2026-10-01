import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../hooks/useWhatsAppOutreach.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function harness() {
  let state = false;
  let effect;
  let cleanup;
  let interval;
  let cleared = false;
  const listeners = new Map();
  const requests = [];
  const module = { exports: {} };
  runInNewContext(code, {
    module, exports: module.exports,
    window: {
      setInterval: callback => { interval = callback; return 1; },
      clearInterval: () => { cleared = true; },
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: name => listeners.delete(name),
    },
    require: name => {
      if (name === "react") return {
        useState: () => [state, value => { state = value; }],
        useEffect: callback => { effect = callback; },
      };
      assert.equal(name, "@/lib/apiClient");
      return { apiClient: { get: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) } };
    },
  });
  const initial = module.exports.useWhatsAppOutreach();
  cleanup = effect();
  return {
    initial, requests, enabled: () => state,
    event: name => listeners.get(name)(), tick: () => interval(),
    cleanup, cleaned: () => cleared && listeners.size === 0,
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test("WhatsApp controls fail closed, refresh after configuration changes, and hide on errors", async () => {
  const view = harness();
  assert.equal(view.initial, false);
  view.requests[0].resolve({ data: { enabled: true } });
  await flush();
  assert.equal(view.enabled(), true);
  view.event("whatsapp-configuration-changed");
  view.requests[1].resolve({ data: { enabled: false } });
  await flush();
  assert.equal(view.enabled(), false);
  view.event("focus");
  view.requests[2].resolve({ data: { enabled: true } });
  await flush();
  view.tick();
  view.requests[3].reject(new Error("Unavailable"));
  await flush();
  assert.equal(view.enabled(), false);
  view.cleanup();
  assert.equal(view.cleaned(), true);
});

test("a stale enabled response cannot override a newer deactivation response", async () => {
  const view = harness();
  view.event("focus");
  view.requests[1].resolve({ data: { enabled: false } });
  await flush();
  view.requests[0].resolve({ data: { enabled: true } });
  await flush();
  assert.equal(view.enabled(), false);
  view.cleanup();
});
