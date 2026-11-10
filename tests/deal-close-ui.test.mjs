import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

function workspace(shared = false) {
  const source = readFileSync(new URL(shared ? "../components/leads/NormalUserEventLeadSheet.tsx" : "../components/leads/MyLeadsWorkspace.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const slots = [], effects = [], timers = [], saved = [], bells = [], errors = [], requests = [];
  let cursor = 0, tree;
  const user = { id: "employee-1", username: "amina", role: "production_user", departmentAssignments: ["delegate_sales"] };
  const lead = { id: "lead-1", employeeName: "Rejoice", company: "Tea Labs", email: "r@example.com", workflowStatus: "new", canonicalEventKey: "event-1", leadIdentityKey: "recipient-1" };
  const api = {
    listMyEvents: async () => ({ events: [{ canonicalEventKey: "event-1", canonicalEventName: "Conference" }] }),
    listMyEventLeads: async () => ({ items: [lead], total: 1, hasMore: false }),
    updateLeadWorkflowStatus: async (...args) => {
      saved.push(args);
      return { id: lead.id, workflowStatus: args[1], workflowStatusLabel: "Deal Closed", workflowComment: args[2] };
    },
  };
  api.listEventsForPersona = async (persona) => {
    requests.push(persona);
    return { events: [{ canonicalEventKey: "event-1", canonicalEventName: "Conference" }] };
  };
  api.listEventLeadsForPersona = async () => ({ event: { canonicalEventKey: "event-1", canonicalEventName: "Conference" }, items: [lead], total: 1 });
  api.listEventDocuments = async () => ({ latest: null });
  api.listEventAgendas = async () => ({ agendas: [] });
  api.listWorkflowStatusesForPersona = async () => ({ statuses: [] });
  api.createWorkflowStatusForPersona = async () => ({});
  api.updateLeadWorkflowStatusForPersona = async (persona, ...args) => {
    requests.push(persona);
    return api.updateLeadWorkflowStatus(...args);
  };
  const depsEqual = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !depsEqual(slots[i].deps, deps)) slots[i] = { value: fn(), deps };
      return slots[i].value;
    },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !depsEqual(slots[i].deps, deps)) {
        const previous = slots[i]; slots[i] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };
  const body = {};
  const mod = { exports: {} };
  const router = { replace() {} };
  const params = new URLSearchParams("event=event-1");
  runInNewContext(code, {
    module: mod, exports: mod.exports, URLSearchParams, URL, AbortController, console,
    document: { body, addEventListener() {}, removeEventListener() {} },
    window: { setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {} },
    fetch: async (url, options) => { bells.push({ url, options }); return Response.json({ detail: "Teams is unavailable" }, { status: 503 }); },
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "react-dom") return { createPortal: (children, target) => ({ type: "portal", props: { children, target } }) };
      if (name === "next/navigation") return { useRouter: () => router, usePathname: () => "/leads", useSearchParams: () => params };
      if (name === "@/hooks/useAuth") return { useAuth: () => ({ role: user.role, user, isSuperAdmin: false }) };
      if (name === "@/hooks/usePersona") return { usePersona: () => ({ persona: "delegate-sales" }) };
      if (name === "@/hooks/useWhatsAppOutreach") return { useWhatsAppOutreach: () => true };
      if (name === "@/lib/auth") return { canUserUsePersona: () => true, getAuthHeader: () => ({ Authorization: "Bearer valid" }), getCachedAuthUserDisplayName: () => "Amina", listActiveEventRegistry: async () => [] };
      if (name === "@/lib/apiRouter") return api;
      if (name === "@/lib/utils") return { cn: (...values) => values.filter(Boolean).join(" ") };
      if (name === "@/lib/dealBellMedia") return { getDailyDealBellMedia: () => ({}) };
      if (name === "@/lib/teamLeads") return { getTeamLeadRequestScope: () => null, teamLeadQueryKey: () => "" };
      if (name === "@/lib/leads/leadTypes") return { LEAD_TYPE_OPTIONS: [], LEAD_GROUP_OPTIONS: [] };
      if (name === "@/lib/leads/mergeEventLeadRows") return { mergeDuplicateEventLeadRows: rows => rows };
      if (name === "sonner") return { toast: { success() {}, error: (...args) => errors.push(args) } };
      return new Proxy({}, { get: (_, key) => key === "__esModule" ? true : key });
    },
  });
  const render = () => { cursor = 0; tree = shared ? mod.exports.NormalUserEventLeadSheet({}) : mod.exports.MyLeadsWorkspace(); };
  const all = (predicate, node = tree, result = []) => {
    if (Array.isArray(node)) { node.forEach(child => all(predicate, child ?? null, result)); return result; }
    if (!node || typeof node !== "object") return result;
    if (predicate(node)) result.push(node);
    all(predicate, node.props?.children ?? null, result);
    return result;
  };
  const text = node => Array.isArray(node) ? node.map(text).join("") : node && typeof node === "object" ? text(node.props?.children) : typeof node === "string" ? node : "";
  const find = predicate => { const node = all(predicate)[0]; assert.ok(node, "Missing UI control"); return node; };
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      render(); effects.splice(0).forEach(fn => fn());
      await new Promise(resolve => setImmediate(resolve));
      timers.splice(0).forEach(fn => fn());
      await new Promise(resolve => setImmediate(resolve));
    }
    render();
  };
  return { render, settle, all, find, text, saved, bells, errors, requests, body };
}

test("delegate-sales status review opens confirmation, Cancel keeps details, and bell failure keeps the saved deal", async () => {
  const view = workspace();
  await view.settle();
  view.find(node => node.type === "Select" && node.props.value === "new").props.onValueChange("deal-closed");
  view.render();
  view.find(node => node.type === "Input" && node.props.type === "number").props.onChange({ target: { value: "7999" } });
  view.find(node => node.type === "Textarea" && node.props.maxLength === 2000).props.onChange({ target: { value: "Paid" } });
  view.render();
  view.find(node => node.type === "Button" && view.text(node).trim() === "Update Status").props.onClick();
  view.render();
  assert.equal(view.all(node => node.type === "Input" && node.props.type === "number").length, 0);
  assert.equal(view.find(node => node.type === "portal").props.target, view.body);
  assert.ok(view.find(node => node.props?.role === "dialog" && node.props["aria-label"] === "Ring the deal bell?"));
  view.find(node => node.type === "Button" && view.text(node) === "Cancel").props.onClick();
  view.render();
  assert.equal(view.find(node => node.type === "Input" && node.props.type === "number").props.value, "7999");
  assert.equal(view.find(node => node.type === "Textarea" && node.props.maxLength === 2000).props.value, "Paid");
  assert.equal(view.saved.length, 0);
  view.find(node => node.type === "Button" && view.text(node).trim() === "Update Status").props.onClick();
  view.render();
  view.find(node => node.type === "Button" && view.text(node).trim() === "Ring bell").props.onClick();
  await view.settle();
  assert.deepEqual(Array.from(view.saved[0]), ["lead-1", "deal-closed", "Paid", "7999"]);
  assert.equal(view.saved.length, 1);
  assert.equal(view.bells.length, 1);
  assert.ok(view.errors.some(([message]) => message === "Bell failed"));
  assert.equal(view.all(node => node.props?.role === "dialog" && node.props["aria-label"] === "Ring the deal bell?").length, 0);
  assert.ok(view.find(node => node.type === "Select" && node.props.value === "deal-closed"));
});

test("the shared lead sheet keeps delegate-sales routing and submits the required amount", async () => {
  const view = workspace(true);
  await view.settle();
  assert.ok(view.requests.length > 0);
  assert.ok(view.requests.every(persona => persona === "delegate-sales"));
  view.find(node => node.type === "Select" && node.props.value === "new").props.onValueChange("deal-closed");
  view.render();
  view.find(node => node.type === "Input" && node.props.type === "number").props.onChange({ target: { value: "7999" } });
  view.render();
  view.find(node => node.type === "Button" && view.text(node).trim() === "Update Status").props.onClick();
  view.render();
  assert.equal(view.all(node => node.type === "Input" && node.props.type === "number").length, 0);
  assert.equal(view.find(node => node.type === "portal").props.target, view.body);
  view.find(node => node.type === "Button" && view.text(node).trim() === "Ring bell").props.onClick();
  await view.settle();
  assert.equal(view.saved.length, 1);
  assert.deepEqual(Array.from(view.saved[0]), ["lead-1", "deal-closed", undefined, "7999"]);
});
