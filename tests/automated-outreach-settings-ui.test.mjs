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
  view.field("Outreach editorial guidance").props.onChange({ target: { value: "New guidance" } }); view.render();
  await view.submit(); view.render();
  assert.deepEqual(Object.keys(payload).sort(), ["maxContextChars", "maxOutputTokens", "maxRequests", "maxTokens", "model", "plannerModel", "prompt", "reasoningEffort", "reviewerModel", "revision", "writerModel"]);
  assert.equal(payload.prompt, "New guidance");
  assert.equal(view.all(node => node.props?.type === "password" || node.props?.type === "url").length, 0);
});

test("delivery saves only the global switch and has no sender or callback fields", async () => {
  let payload;
  const view = harness("Delivery", async value => { payload = value; return { ...config, revision: 5 }; });
  view.field("Enable automatic outreach delivery").props.onChange({ target: { checked: false } }); view.render();
  await view.submit();
  assert.deepEqual(Object.keys(payload).sort(), ["enabled", "revision"]);
  assert.equal(payload.enabled, false);
  assert.equal(view.all(node => ["password", "email", "url"].includes(node.props?.type)).length, 0);
});

for (const [kind, label, field] of [["Content", "Outreach editorial guidance", "prompt"], ["Delivery", "Enable automatic outreach delivery", "enabled"]]) {
  test(`${kind} retains unsaved edits on refresh and requires explicit reload after a revision conflict`, () => {
    const view = harness(kind, async () => config);
    view.field(label).props.onChange({ target: { value: "Unsaved edit", checked: false } });
    const updated = { ...config, revision: 5, [field]: kind === "Delivery" ? true : "Saved elsewhere" };
    view.render(updated);
    assert.equal(kind === "Delivery" ? view.field(label).props.checked : view.field(label).props.value, kind === "Delivery" ? false : "Unsaved edit");
    assert.equal(view.find(node => node.props?.type === "submit").props.disabled, true);
    view.find(node => node.props?.children === "Reload saved values").props.onClick(); view.render(updated);
    assert.equal(kind === "Delivery" ? view.field(label).props.checked : view.field(label).props.value, kind === "Delivery" ? true : "Saved elsewhere");
    assert.equal(view.find(node => node.props?.type === "submit").props.disabled, false);
  });
  test(`${kind} retains draft after a failed save`, async () => {
    const view = harness(kind, async () => { throw new Error("Conflict"); });
    view.field(label).props.onChange({ target: { value: "Unsaved edit", checked: false } }); view.render();
    await view.submit(); view.render();
    assert.equal(kind === "Delivery" ? view.field(label).props.checked : view.field(label).props.value, kind === "Delivery" ? false : "Unsaved edit");
    assert.ok(view.find(node => node.props?.role === "alert"));
  });
}

function componentHarness(path, exportName, imports, props = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const testModule = { exports: {} }, states = [], effects = [];
  let cursor = 0, tree;
  runInNewContext(code, { module: testModule, exports: testModule.exports, URLSearchParams, document: {body:{},activeElement:null}, require: name => {
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "react") return { Suspense: "Suspense", useEffect:fn=>effects.push(fn), useRef:()=>({current:null}), useState: initial => { const i=cursor++; if (!(i in states)) states[i]=typeof initial==='function'?initial():initial; return [states[i], value => {states[i]=typeof value==='function'?value(states[i]):value;}]; } };
    if (imports[name]) return imports[name];
    if (name === "next/link") return "a";
    if (name === "framer-motion") return { motion: { div: "div" } };
    return new Proxy({}, { get: (_, key) => key });
  }});
  function render() { cursor=0; tree=testModule.exports[exportName](props); if (tree.type==='Suspense') tree=tree.props.children.type({}); }
  function all(predicate,node=tree,result=[]) { if(Array.isArray(node)) {node.forEach(child=>all(predicate,child??null,result));return result;} if(!node||typeof node!=='object')return result; if(predicate(node))result.push(node); all(predicate,node.props?.children??null,result);return result; }
  render(); return {render,all,flushEffects:()=>effects.splice(0).forEach(fn=>fn()),find:predicate=>{const node=all(predicate)[0];assert.ok(node,'Missing UI control');return node;}};
}

test("content settings tabs mount only their own control center and retain direct links", () => {
  let selected = "control-center";
  const view = componentHarness("app/settings/content-generation/page.tsx", "default", {
    "next/navigation": { useSearchParams: () => new URLSearchParams(`tab=${selected}`) },
  });
  assert.equal(view.all(node => node.type === "ContentGenerationControlCenter").length, 1);
  assert.equal(view.all(node => node.type === "StatusOutreachControlCenter").length, 0);
  assert.ok(view.find(node => node.props?.href === "/settings/content-generation?tab=status-outreach"));
  selected = "status-outreach"; view.render();
  assert.equal(view.all(node => node.type === "ContentGenerationControlCenter").length, 0);
  assert.equal(view.all(node => node.type === "StatusOutreachControlCenter").length, 1);
});

test("event switch sends its department, event and revision without altering lead status", async () => {
  const calls=[];
  const view=componentHarness("components/automated-outreach/OutreachEvents.tsx", "OutreachEvents", {
    "@/hooks/useOutreachResource":{useOutreachResource:()=>({data:{revision:7,items:[{key:'summit',name:'Summit',leads:5,active:3,statuses:{'proposal-sent':5},outreachEnabled:true}]},reload(){},error:null})},
    "@/lib/automatedOutreach":{statusLabel:value=>value},
    "@/lib/automatedOutreachApi":{setEventOutreach:async(...args)=>calls.push(args)},
  },{department:'sales'});
  const control=view.find(node=>node.props?.role==='switch');
  assert.equal(control.props.checked,true);
  control.props.onChange(); await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,[['sales','summit',false,7]]);
});

test("run monitoring offers recovery only for recoverable generation failures", async () => {
  const calls=[];
  const usage={requests:3,inputTokens:100,outputTokens:50,unmeasuredRequests:0,reservedTokens:0};
  const run={id:'failed-run',eventName:'Summit',leadName:'Person',department:'sales',step:1,state:'failed',stage:'writer',completedStages:['planner'],usage,error:'Writer failed',recoverable:true,updatedAt:null};
  const view=componentHarness("components/automated-outreach/StatusOutreachControlCenter.tsx", "StatusOutreachControlCenter", {
    "@/hooks/useOutreachResource":{useOutreachResource:()=>({data:{states:{failed:1},usage,total:2,daily:[],stages:[],items:[run,{...run,id:'handed-off',state:'completed',recoverable:false}]},reload(){},error:null})},
    "@/lib/automatedOutreach":{statusLabel:value=>value,outreachDate:()=>''},
    "@/lib/automatedOutreachApi":{recoverStatusOutreachRun:async id=>calls.push(id)},
  });
  const recovery=view.all(node=>node.type==='Button'&&node.props?.children?.[1]==='Recover');
  assert.equal(recovery.length,1);
  recovery[0].props.onClick(); await new Promise(resolve=>setImmediate(resolve));view.render();
  assert.deepEqual(calls,['failed-run']);
  assert.ok(view.find(node=>node.props?.role==='status'));
});

test("delivery tracking and history remain available below content runs", () => {
  const view = componentHarness("components/automated-outreach/StatusOutreachControlCenter.tsx", "StatusOutreachControlCenter", {
    "@/hooks/useOutreachResource": {useOutreachResource: () => ({data:null,error:"Unavailable",reload(){}})},
  });
  assert.equal(view.all(node => node.type === "OutreachOperations").length, 1);
  const tracking = componentHarness("components/automated-outreach/OutreachOperations.tsx", "OutreachOperations", {});
  assert.equal(tracking.all(node => node.type === "OutreachDeliverySettings").length, 0);
  const sections = tracking.all(node => node.type === "details");
  assert.equal(sections.length, 1);
  sections.forEach(node => node.props.onToggle({currentTarget:{open:true}}));
  tracking.render();
  assert.equal(tracking.all(node => node.type === "OutreachLeadTable").length, 1);
  assert.equal(tracking.all(node => node.type === "OutreachAuditLog").length, 0);
});

test("tracking filters scope API requests and clear dependent filters when department changes", () => {
  let requested;
  const view = componentHarness("components/automated-outreach/OutreachLeadTable.tsx", "OutreachLeadTable", {
    "@/hooks/useOutreachResource": {useOutreachResource: path => {requested = path;return {data:{items:[],total:0,tabs:[{key:"proposal-sent",label:"Proposal sent",count:3}],events:[{key:"summit",name:"Summit"}]},reload(){}};}},
    "@/lib/automatedOutreach": {OUTREACH_DEPARTMENTS:[{key:"sales",label:"Sales"},{key:"production",label:"Production"}],statusLabel:value=>value},
    "@/lib/outreachActivity": {deliveryStateLabels:{active:"Active",paused:"Paused"}},
  });
  const change = (label, value) => {view.find(node=>node.props?.["aria-label"]===label).props.onChange({target:{value}});view.render();};
  change("Filter by department", "sales");
  change("Filter by event or campaign", "summit");
  change("Filter by lead status", "proposal-sent");
  change("Filter outreach state", "paused");
  let params = new URLSearchParams(requested.split("?")[1]);
  assert.equal(params.get("eventKey"), "summit");
  assert.equal(params.get("department"), "sales");
  assert.equal(params.get("workflowStatus"), "proposal-sent");
  assert.equal(params.get("state"), "paused");
  assert.equal(view.all(node=>node.type==="nav"&&node.props?.["aria-label"]==="Lead status").length,0);
  assert.ok(view.all(node=>node.type==="th").some(node=>node.props.children==="Event / campaign"));
  change("Filter by department", "production");
  params = new URLSearchParams(requested.split("?")[1]);
  assert.equal(params.get("eventKey"), null);
  assert.equal(params.get("workflowStatus"), null);
  assert.equal(params.get("offset"), "0");
});

test("outreach timeline lets users inspect every email including sent emails", () => {
  const selected=[];
  const view=componentHarness("components/automated-outreach/OutreachDeliveryTimeline.tsx", "OutreachDeliveryTimeline", {
    "@/lib/outreachDeliveryTimeline":{outreachDeliverySteps:()=>[1,2,3].map(step=>({step,label:`Email ${step}`,state:step===1?"Sent":"Waiting",confirmed:step===1,needsAttention:false,date:null})),outreachTimelineDate:()=>""},
  },{lead:{sentCount:1},selectedStep:"2",onSelect:value=>selected.push(value)});
  const steps=view.all(node=>node.type==="button");
  assert.equal(steps.length,3);
  assert.equal(steps[1].props["aria-pressed"],true);
  steps[0].props.onClick();
  steps[2].props.onClick();
  assert.deepEqual(selected,["1","3"]);
});

test("Status Outreach View opens the content dialog", () => {
  const view=componentHarness("components/automated-outreach/OutreachLeadRow.tsx","OutreachLeadRow",{
    "@/lib/automatedOutreach":{outreachActions:()=>[],outreachDate:()=>"",statusLabel:value=>value},
    "@/lib/outreachActivity":{deliveryStateLabels:{active:"Active"}},
  },{lead:{id:"lead",lead:{name:"Person"},state:"active",workflowStatus:"proposal-sent",sentCount:0},number:1,reload(){}});
  const button=view.find(node=>node.props?.["aria-label"]==="View messages for Person");
  assert.ok(button.props.children.includes("View"));
  button.props.onClick();view.render();
  assert.equal(view.find(node=>node.type==="OutreachLeadReview").props.initialView,"content");
});

test("content dialog prepares previews and displays each selected email subject and body", async () => {
  const prepared=[];
  const messages=[1,2,3].map(step=>({id:`message-${step}`,step,status:"preview",subject:`Subject ${step}`,body:`Body ${step}`,tracking:{},updatedAt:"2026-10-20T10:00:00Z"}));
  const view=componentHarness("components/automated-outreach/OutreachLeadReview.tsx","OutreachLeadReview",{
    "react-dom":{createPortal:node=>node},
    "@/hooks/useOutreachResource":{useOutreachResource:()=>({data:{messages},reload(){}})},
    "@/lib/automatedOutreachApi":{prepareOutreachContent:async id=>prepared.push(id)},
    "@/lib/automatedOutreach":{outreachDate:()=>"today",statusLabel:value=>value},
  },{lead:{id:"lead",lead:{name:"Person"},messages:[],sentCount:0,eventName:"Summit",department:"sales",workflowStatus:"proposal-sent"},initialView:"content",onClose(){}});
  view.flushEffects(); await new Promise(resolve=>setImmediate(resolve));view.render();
  assert.deepEqual(prepared,["lead"]);
  for(const step of ["1","2","3"]) {
    view.find(node=>node.type==="OutreachDeliveryTimeline").props.onSelect(step);view.render();
    assert.ok(view.all(node=>node.type==="p").some(node=>node.props.children===`Subject ${step}`));
    assert.ok(view.all(node=>node.type==="div").some(node=>node.props.children===`Body ${step}`));
  }
});