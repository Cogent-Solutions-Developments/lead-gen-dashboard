import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";
import * as activity from "../lib/statusOutreachActivity.ts";

function harness(path, name, imports, props = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL("../" + path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} }, states = [], effects = [];
  let cursor = 0, tree;
  runInNewContext(code, { module: mod, exports: mod.exports, URLSearchParams, AbortController,
    document: { body: {}, activeElement: null }, ...globals, require: key => {
      if (key === "react/jsx-runtime") return jsxRuntime;
      if (key === "react") return { useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial;
        return [states[i], value => { states[i] = typeof value === "function" ? value(states[i]) : value; }]; },
        useRef: () => ({ current: null }), useCallback: fn => fn, useEffect: fn => effects.push(fn) };
      if (key in imports) return imports[key];
      return new Proxy({}, { get: (_, property) => property });
    } });
  function render(nextProps = props) { cursor = 0; tree = mod.exports[name](nextProps); return tree; }
  function all(predicate, node = tree, result = []) { if (Array.isArray(node)) { node.forEach(child => all(predicate, child ?? null, result)); return result; }
    if (!node || typeof node !== "object") return result; if (predicate(node)) result.push(node); all(predicate, node.props?.children ?? null, result); return result; }
  render();
  return { render, all, effects, find(predicate) { const node = all(predicate)[0]; assert.ok(node, "Expected UI control"); return node; } };
}

const mail = { sent: 9, sent24h: 2, awaitingConfirmation: 3, scheduledLeads: 2, needsAttention: 1, pausedLeads: 1 };
const data = { items: [{ key: "proposal-sent", label: "Proposal Sent", count: 7, updated24h: 2, lastUpdatedAt: null, mail }], events: [{ key: "summit", name: "Summit" }], total: 7, updated24h: 2, asOf: "2026-10-21T10:00:00Z", mail };
const normal = { OUTREACH_DEPARTMENTS: [{ key: "sales", label: "Sales" }], statusLabel: x => x };
test("chart filter scope resets the event and opens the selected status without navigation", () => {
  let path;
  const view = harness("components/automated-outreach/StatusActivityChart.tsx", "StatusActivityChart", {
    "@/lib/automatedOutreach": normal, "@/lib/statusOutreachActivity": activity,
    "@/hooks/useStatusActivity": { useStatusActivity: value => { path = value; return { data, previous: { ...data, items: [{ ...data.items[0], count: 5 }] }, reload() {} }; } },
  });
  const bar = view.find(node => node.props?.["aria-label"]?.startsWith("Proposal Sent:"));
  assert.match(bar.props["aria-label"], /7 leads, \+2 since previous refresh/);
  assert.match(bar.props["aria-label"], /9 confirmed emails, 3 awaiting confirmation, 1 leads needing attention/);
  assert.equal(view.find(node => node.type === "StatusMailSummary").props.mail, mail);
  bar.props.onClick(); view.render();
  assert.equal(view.find(node => node.type === "StatusActivityDrawer").props.status.key, "proposal-sent");
  view.all(node => node.type === "select")[1].props.onChange({ target: { value: "summit" } }); view.render();
  assert.match(path, /eventKey=summit/);
  view.all(node => node.type === "select")[0].props.onChange({ target: { value: "sales" } }); view.render();
  assert.match(path, /department=sales/); assert.doesNotMatch(path, /eventKey/);
  assert.equal(view.all(node => node.type === "StatusActivityDrawer").length, 0);
});

test("chart retains its last counts and marks interrupted refreshes", () => {
  const view = harness("components/automated-outreach/StatusActivityChart.tsx", "StatusActivityChart", {
    "@/lib/automatedOutreach": normal, "@/lib/statusOutreachActivity": activity,
    "@/hooks/useStatusActivity": { useStatusActivity: () => ({ data, error: "Offline", reload() {} }) },
  });
  assert.ok(view.find(node => node.props?.role === "alert"));
  assert.ok(view.find(node => node.props?.["aria-label"]?.startsWith("Proposal Sent: 7 leads")));
  assert.ok(view.find(node => Array.isArray(node.props?.children) && node.props.children.includes("Refresh interrupted")));
});

test("drawer scopes paginated search to the clicked department, event and status", () => {
  let path;
  const view = harness("components/automated-outreach/StatusActivityDrawer.tsx", "StatusActivityDrawer", {
    "@/lib/automatedOutreach": normal, "@/lib/statusOutreachActivity": activity,
    "react-dom": { createPortal: node => node },
    "@/hooks/useStatusActivity": { useStatusActivity: value => { path = value; return { data: { items: [], total: 41 }, reload() {} }; } },
  }, { status: { key: "first-call", label: "First Call" }, department: "sales", eventKey: "summit", eventName: "Summit", onClose() {} });
  view.find(node => node.type === "StatusActivityPagination").props.onChange(2); view.render();
  assert.match(path, /offset=25/);
  view.find(node => node.type === "input").props.onChange({ target: { value: " Alex " } }); view.render();
  view.find(node => node.type === "form").props.onSubmit({ preventDefault() {} }); view.render();
  const query = new URLSearchParams(path.split("?")[1]);
  assert.equal(query.get("offset"), "0"); assert.equal(query.get("search"), "Alex");
  assert.equal(query.get("department"), "sales"); assert.equal(query.get("eventKey"), "summit"); assert.equal(query.get("status"), "first-call");
});

test("polling never overlaps, pauses when hidden and discards a response after cleanup", async () => {
  let interval, resolveRequest, calls = 0;
  const document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  const view = harness("hooks/useStatusActivity.ts", "useStatusActivity", {
    "@/lib/automatedOutreachApi": { OUTREACH_API: "/api" },
    "@/lib/apiClient": { apiClient: { get() { calls++; return new Promise(resolve => { resolveRequest = resolve; }); } } },
  }, "/status-activity", { document, window: { setInterval(fn) { interval = fn; return 1; }, clearInterval() {} } });
  const cleanup = view.effects.shift()();
  interval(); interval(); assert.equal(calls, 1);
  resolveRequest({ data: { total: 7 } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.render().data.total, 7);
  document.hidden = true; interval(); assert.equal(calls, 1);
  document.hidden = false; interval(); assert.equal(calls, 2);
  cleanup(); resolveRequest({ data: { total: 99 } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.render().data.total, 7);
});

test("chart scale includes the previous count and stays usable at zero", () => {
  assert.deepEqual(activity.statusChartScale([]), { maximum: 1, step: 1 });
  assert.ok(activity.statusChartScale([{ count: 2 }], [{ count: 257 }]).maximum >= 257);
  assert.deepEqual(activity.statusChartScale([{ count: 126 }]), { maximum: 150, step: 50 });
  assert.deepEqual(activity.statusChartScale([{ count: 1 }]), { maximum: 2, step: 1 });
  const query = new URLSearchParams(activity.statusActivityPath("sales", "A&B / Event"));
  assert.equal(query.get("eventKey"), "A&B / Event");
  assert.equal(activity.statusActivityTime(null), "Not recorded");
});


test("large status lists remain server-paged and page-size changes reset the offset", () => {
  let path;
  const view = harness("components/automated-outreach/StatusActivityDrawer.tsx", "StatusActivityDrawer", {
    "@/lib/automatedOutreach": normal, "@/lib/statusOutreachActivity": activity,
    "react-dom": { createPortal: node => node },
    "@/hooks/useStatusActivity": { useStatusActivity: value => { path = value; return { data: { items: [], total: 1257 }, reload() {} }; } },
  }, { status: { key: "proposal-sent", label: "Proposal Sent" }, department: "sales", eventKey: "summit", eventName: "Summit", onClose() {} });
  const pager = () => view.find(node => node.type === "StatusActivityPagination");
  assert.match(path, /limit=25/);
  pager().props.onChange(40); view.render(); assert.match(path, /offset=975/);
  pager().props.onPageSizeChange(100); view.render();
  assert.match(path, /offset=0/); assert.match(path, /limit=100/);
  pager().props.onChange(13); view.render(); assert.match(path, /offset=1200/);
});

test("opening one lead loads one detail view and changing page clears it", () => {
  const lead = { id: "lead-1", name: "Alex", department: "sales", status: "proposal-sent", updatedAt: "2026-10-21T10:00:00Z" };
  const view = harness("components/automated-outreach/StatusActivityDrawer.tsx", "StatusActivityDrawer", {
    "@/lib/automatedOutreach": normal, "@/lib/statusOutreachActivity": activity,
    "react-dom": { createPortal: node => node },
    "@/hooks/useStatusActivity": { useStatusActivity: () => ({ data: { items: [lead], total: 1257 }, reload() {} }) },
  }, { status: { key: "proposal-sent", label: "Proposal Sent" }, department: "sales", eventKey: "summit", eventName: "Summit", onClose() {} });
  assert.equal(view.all(node => node.type === "StatusLeadDetails").length, 0);
  view.find(node => node.props?.["aria-label"] === "View details for Alex").props.onClick({ currentTarget: {} }); view.render();
  assert.equal(view.all(node => node.type === "StatusLeadDetails").length, 1);
  assert.equal(view.find(node => node.type === "StatusLeadDetails").props.lead.id, "lead-1");
  view.find(node => node.type === "StatusActivityPagination").props.onChange(2); view.render();
  assert.equal(view.all(node => node.type === "StatusLeadDetails").length, 0);
});

test("direct page navigation validates limits and reaches the last page", () => {
  let requested = null;
  const view = harness("components/automated-outreach/StatusActivityPagination.tsx", "StatusActivityPagination", {},
    { page: 1, pageSize: 25, total: 1257, disabled: false, onChange: page => { requested = page; }, onPageSizeChange() {} });
  view.find(node => node.props?.["aria-label"] === "Last page").props.onClick(); assert.equal(requested, 51);
  requested = null;
  const jump = value => { view.find(node => node.type === "input").props.onChange({ target: { value } }); view.render(); view.find(node => node.type === "form").props.onSubmit({ preventDefault() {} }); };
  jump("52"); assert.equal(requested, null);
  jump("0"); assert.equal(requested, null);
  jump("40"); assert.equal(requested, 40);
});


test("live status changes return an out-of-range page to the last available page", () => {
  let total = 1257, path;
  const view = harness("components/automated-outreach/StatusActivityDrawer.tsx", "StatusActivityDrawer", {
    "@/lib/automatedOutreach": normal, "@/lib/statusOutreachActivity": activity,
    "react-dom": { createPortal: node => node },
    "@/hooks/useStatusActivity": { useStatusActivity: value => { path = value; return { data: { items: [], total }, reload() {} }; } },
  }, { status: { key: "proposal-sent", label: "Proposal Sent" }, department: "sales", eventKey: "", eventName: "All events", onClose() {} });
  view.find(node => node.type === "StatusActivityPagination").props.onChange(51); view.render();
  assert.match(path, /offset=1250/);
  total = 1220; view.render(); view.render();
  assert.match(path, /offset=1200/);
});

test("mail progress distinguishes content, handoff, confirmation and stopped delivery", () => {
  const pending = { sent: 0, nextDueAt: "2026-10-25T10:00:00Z", reason: null, messages: [{step: 1, status: "accepted", confirmedAt: null, sentAt: null, updatedAt: "2026-10-21T10:00:00Z"}] };
  assert.equal(activity.statusMailStep(pending, 1, "active").label, "Awaiting confirmation");
  assert.equal(activity.statusMailStep(pending, 1, "active").tone, "pending");
  assert.equal(activity.statusMailStep({...pending, messages: [{...pending.messages[0], status: "preview"}]}, 1, "active").label, "Content ready");
  assert.equal(activity.statusMailStep({...pending, messages: [{...pending.messages[0], status: "uncertain"}]}, 1, "attention").tone, "error");
  const sent = {...pending, sent: 1, messages: [{...pending.messages[0], status: "opened", confirmedAt: "2026-10-21T10:00:00Z"}]};
  assert.equal(activity.statusMailStep(sent, 1, "active").label, "Opened");
  assert.equal(activity.statusMailStep(sent, 2, "stopped").label, "Stopped");
  assert.equal(activity.statusMailStep(sent, 2, "paused").label, "Paused");
  assert.equal(activity.statusMailStep(sent, 2, "active").label, "Planned");
});

test("outreach lists refresh on focus, suppress overlap and discard late responses", async () => {
  let interval, resolveRequest, requestSignal, calls = 0, cleared = false;
  const listeners = new Map();
  const document = { hidden: false, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  const view = harness("hooks/useOutreachResource.ts", "useOutreachResource", {
    "@/lib/automatedOutreachApi": { OUTREACH_API: "/api" },
    "@/lib/apiClient": { apiClient: { get(path, options) {
      assert.equal(path, "/api/events?department=sales");
      requestSignal = options.signal; calls++;
      return new Promise(resolve => { resolveRequest = resolve; });
    } } },
  }, "/events?department=sales", { document,
    setInterval(fn) { interval = fn; return 1; }, clearInterval() { cleared = true; },
    window: { addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
  });
  const cleanup = view.effects.shift()();
  interval(); listeners.get("focus")(); assert.equal(calls, 1);
  resolveRequest({ data: { total: 5 } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.render().data.total, 5);
  document.hidden = true; interval(); listeners.get("visibilitychange")(); assert.equal(calls, 1);
  document.hidden = false; listeners.get("focus")(); assert.equal(calls, 2);
  resolveRequest({ data: { total: 6 } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.render().data.total, 6);
  listeners.get("visibilitychange")(); assert.equal(calls, 3);
  cleanup(); assert.equal(requestSignal.aborted, true); assert.equal(cleared, true); assert.equal(listeners.size, 0);
  resolveRequest({ data: { total: 99 } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(view.render().data.total, 6);
});

test("Sales events show refreshed registry names and counts while preserving canonical links", () => {
  let rows = [{ key: "stable-event-key", name: "Old title", leads: 1, active: 1, statuses: { "proposal-sent": 1 } }];
  let reloads = 0;
  const view = harness("components/automated-outreach/OutreachEvents.tsx", "OutreachEvents", {
    "next/link": { default: "a" }, "@/lib/automatedOutreach": normal,
    "@/hooks/useOutreachResource": { useOutreachResource(path, interval) {
      assert.equal(path, "/events?department=sales"); assert.equal(interval, 5000);
      return { data: { items: rows, revision: 1 }, refreshing: false, reload() { reloads++; } };
    } },
  }, { department: "sales" });
  view.find(node => node.props?.["aria-label"] === "Refresh events").props.onClick();
  assert.equal(reloads, 1);
  rows = [{ ...rows[0], name: "12th AIMCT Qatar", leads: 5, active: 4, statuses: { "first-call": 4, "proposal-sent": 1 } }];
  view.render();
  assert.equal(view.find(node => node.type === "h2").props.children, "12th AIMCT Qatar");
  assert.ok(view.find(node => node.type === "p" && node.props.children === "first-call 4 · proposal-sent 1"));
  assert.equal(view.all(node => node.type === "a" && node.props.href === "/admin/lead-intelligence/sales/stable-event-key").length, 2);
});
