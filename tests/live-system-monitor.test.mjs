import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as monitor from "../lib/systemMonitor.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const compile = (path) => ts.transpileModule(read(path), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

test("capacity readings distinguish missing measurements, idle, and over-capacity", () => {
  assert.equal(monitor.utilization(null, 10), null);
  assert.equal(monitor.utilization(1, 0), null);
  assert.equal(monitor.utilization(Infinity, 10), null);
  assert.equal(monitor.utilization(0, 10), 0);
  assert.equal(monitor.utilization(12, 10), 120);
  assert.equal(monitor.pressureLevel(null), "Unknown");
  assert.equal(monitor.pressureLevel(59), "Normal");
  assert.equal(monitor.pressureLevel(60), "Busy");
  assert.equal(monitor.pressureLevel(85), "High");
});

test("provider acceptance and final delivery remain separate across channels", () => {
  const rows = [
    { channel: "email", status: "queued", count: 2 },
    { channel: "email", status: "retry", count: 1 },
    { channel: "email", status: "locked", count: 1 },
    { channel: "email", status: "sending", count: 2 },
    { channel: "email", status: "delivered_to_make", count: 5 },
    { channel: "email", status: "sent", count: 3 },
    { channel: "email", status: "failed", count: 4 },
    { channel: "whatsapp", status: "sent", count: 20 },
  ];
  assert.deepEqual(monitor.deliveryDistribution(rows, "email").map(({ value }) => value), [3, 3, 5, 3, 4]);
  assert.equal(monitor.deliveryDistribution(rows, "whatsapp").find(({ label }) => label === "Confirmed").value, 20);
});

test("advanced dashboard links reject credentials and unsafe URL protocols", () => {
  for (const value of [null, "", "javascript:alert(1)", "data:text/html,bad", "https://admin:password@example.test", "/relative"]) {
    assert.equal(monitor.safeDashboardLink(value), null);
  }
  assert.equal(monitor.safeDashboardLink("http://127.0.0.1:3001"), "http://127.0.0.1:3001/");
});

test("Settings owns both tools while old Operations links keep working", () => {
  const settings = read("app/settings/page.tsx");
  const sidebar = read("components/layout/AdminPanelShell.tsx");
  assert.match(settings, /href="\/settings\/system-monitor"/);
  assert.match(settings, /href="\/settings\/system-operations"/);
  assert.doesNotMatch(sidebar, /name: "System Monitor"|name: "System Operations"/);
  assert.match(sidebar, /pathname\.startsWith\("\/settings\/"\)/);
  assert.match(read("app/admin/system-operations/page.tsx"), /redirect\("\/settings\/system-operations"\)/);
  assert.match(read("components/settings/SystemOperations.tsx"), /if \(!isSuperAdmin\)/);
  assert.match(read("app/settings/system-monitor/page.tsx"), /isSuperAdmin[\s\S]*?<AdminPanelShell><LiveSystemMonitor/);
  assert.match(read("app/settings/system-monitor/page.tsx"), /<LegacySystemMonitorPage/);
});

function renderMonitor({ traffic = null, health = null, error = null, suspended = null, live = true } = {}) {
  const module = { exports: {} };
  let pollIndex = 0;
  let stateIndex = 0;
  const element = (tag) => ({ children, ...props }) => React.createElement(tag, props, children);
  const dependencies = {
    react: { ...React, useState: (initial) => React.useState(stateIndex++ === 0 ? live : initial) },
    "react/jsx-runtime": jsxRuntime,
    "next/link": element("a"),
    "lucide-react": new Proxy({}, { get: () => () => null }),
    recharts: new Proxy({}, { get: () => () => null }),
    "@/components/ui/card": { Card: element("section") },
    "@/components/ui/button": { Button: element("button") },
    "@/lib/auth": { fetchLiveSystemMonitor: () => {}, fetchSystemMonitorSnapshot: () => {} },
    "@/lib/systemMonitor": monitor,
    "@/hooks/useMonitorPolling": { useMonitorPolling: () => ({ data: pollIndex++ === 0 ? traffic : health, pending: false, error, suspended }) },
  };
  runInNewContext(compile("components/settings/LiveSystemMonitor.tsx"), {
    module, exports: module.exports,
    require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; },
  });
  return renderToStaticMarkup(React.createElement(module.exports.default));
}

const measured = {
  generatedAt: "2026-09-03T12:00:00Z", refreshSeconds: 5,
  audience: { status: "ok", activeUsers: 4, windowSeconds: 120, byRole: [] },
  database: { status: "ok", used: 5, limit: 100 },
  traffic: { status: "ok", inFlight: 2, concurrencyTarget: 10, points: [],
    lastMinute: { requests: 8, acceptedWrites: 2, serverErrors: 1, clientErrors: 1, accepted: 6, avgResponseMs: 200, observedSeconds: 60 } },
};

test("dashboard renders real measurements with plain-language limitations", () => {
  const html = renderMonitor({ traffic: measured });
  assert.match(html, /Active users/);
  assert.match(html, /Unique users active within 120 seconds/);
  assert.match(html, /200 ms/);
  assert.match(html, /not completed background jobs/);
  assert.match(html, /Live · 5s/);
  assert.match(html, /not a CPU measurement/);
});

test("missing data, offline readings, errors and manual pause are explicit", () => {
  assert.match(renderMonitor(), /No zero counts are assumed/);
  assert.match(renderMonitor(), /Waiting for capacity readings/);
  const offline = renderMonitor({ traffic: measured, suspended: "offline" });
  assert.match(offline, /Offline/);
  assert.match(offline, /not current readings/);
  assert.doesNotMatch(offline, /Live · 5s/);
  assert.match(renderMonitor({ traffic: measured, error: "Service unavailable" }), /Update interrupted/);
  const failedInitialLoad = renderMonitor({ error: "Live monitoring requires the updated backend API" });
  assert.match(failedInitialLoad, /Request telemetry is unavailable/);
  assert.doesNotMatch(failedInitialLoad, /Collecting live request history/);
  assert.match(renderMonitor({ traffic: measured, live: false }), /Paused/);
});

// Exercise the hook's effect and timer lifecycle without a browser or network.
const settle = () => new Promise((resolve) => setImmediate(resolve));
function pollingHarness({ live = true, online = true, visibility = "visible", load } = {}) {
  const states = [];
  let effect;
  let stateIndex = 0;
  let nextTimer = 0;
  const timers = new Map();
  const listeners = new Map();
  const navigation = { onLine: online };
  const document = { visibilityState: visibility, addEventListener: (event, callback) => listeners.set(event, callback), removeEventListener: (event) => listeners.delete(event) };
  const module = { exports: {} };
  runInNewContext(compile("hooks/useMonitorPolling.ts"), {
    module, exports: module.exports, AbortController, Date, Error, navigator: navigation, document,
    window: { addEventListener: (event, callback) => listeners.set(event, callback), removeEventListener: (event) => listeners.delete(event) },
    setTimeout: (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
    clearTimeout: (id) => timers.delete(id),
    require: () => ({ useState: (initial) => { const index = stateIndex++; states[index] = initial; return [initial, (value) => { states[index] = value; }]; }, useEffect: (callback) => { effect = callback; } }),
  });
  module.exports.useMonitorPolling(load, 5000, live, 0);
  const cleanup = effect();
  return { states, timers, listeners, cleanup, document, navigation,
    tick: async (delay) => { const found = [...timers].find(([, timer]) => timer.delay === delay); assert.ok(found, `No ${delay}ms timer`); timers.delete(found[0]); found[1].callback(); await settle(); },
    emit: async (event) => { listeners.get(event)?.(); await settle(); },
  };
}

test("polling has no overlapping requests and cancels work on unmount", async () => {
  let calls = 0;
  let resolve;
  let signal;
  const harness = pollingHarness({ load: (value) => { calls++; signal = value; return new Promise((done) => { resolve = done; }); } });
  await harness.emit("online");
  await harness.emit("visibilitychange");
  assert.equal(calls, 1);
  assert.equal(harness.states[2], true);
  harness.cleanup();
  assert.equal(signal.aborted, true);
  resolve("late value");
  await settle();
  assert.equal(harness.states[0], null);
  assert.equal(harness.timers.size, 0);
  assert.equal(harness.listeners.size, 0);
});

test("hidden and offline tabs stop polling, then resume when visible and online", async () => {
  let calls = 0;
  const harness = pollingHarness({ visibility: "hidden", load: async () => ++calls });
  assert.equal(calls, 0);
  harness.document.visibilityState = "visible";
  await harness.emit("visibilitychange");
  assert.equal(calls, 1);
  harness.navigation.onLine = false;
  await harness.emit("offline");
  assert.equal(harness.states[4], "offline");
  assert.equal(harness.timers.size, 0);
  harness.navigation.onLine = true;
  await harness.emit("online");
  assert.equal(calls, 2);
  harness.cleanup();
});

test("poll failures preserve the last snapshot and expose the error", async () => {
  let calls = 0;
  const harness = pollingHarness({ load: async () => { if (++calls === 1) return "last good value"; throw new Error("Network interrupted"); } });
  await settle();
  await harness.tick(5000);
  assert.equal(harness.states[0], "last good value");
  assert.equal(harness.states[1], "Network interrupted");
  harness.cleanup();
});

test("manual pause fetches once but never schedules another poll", async () => {
  const harness = pollingHarness({ live: false, load: async () => "snapshot" });
  await settle();
  assert.equal(harness.states[0], "snapshot");
  assert.equal(harness.timers.size, 0);
  harness.cleanup();
});
