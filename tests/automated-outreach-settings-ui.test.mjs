import { outreachContentStates } from "../lib/outreachContentStatus.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const config = { revision: 4, model: "gpt-6-luna", modelOptions: ["gpt-6-luna"], reasoningEffort: "none", maxOutputTokens: 2200, prompt: "Original guidance", enabled: true, senderName: "Events team", senderEmail: "events@example.com", callbackBaseUrl: "https://backend.example.com", callbackSecretConfigured: true, apiKeySource: "AGENTIC_CONTENT_OPENAI_API_KEY", missingConfiguration: [], webhooks: Object.fromEntries(["sales", "delegate", "production"].map(key => [key, { configured: true, maskedUrl: "https://hook.make.com/...masked" }])) };

function harness(kind, save, initialConfig = config) {
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
  function render(current = initialConfig) { cursor = 0; tree = testModule.exports[`Outreach${kind}Form`]({ config: current, reload() {} }); }
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
  assert.equal(payload.contentMode, undefined);
  assert.equal(payload.prompt, "New guidance");
  assert.equal(view.all(node => node.props?.type === "password" || node.props?.type === "url").length, 0);
});

test("event mode changes do not invalidate unsaved agent guidance", async () => {
  let payload;
  const view=harness("Content",async value=>{payload=value;return {...config,...value,revision:6};});
  view.field("Outreach editorial guidance").props.onChange({target:{value:"Unsaved guidance"}});
  view.render({...config,revision:5,eventContentModes:{sales:{summit:"generated"}}});
  assert.equal(view.find(node=>node.props?.type==='submit').props.disabled,false);
  await view.submit();
  assert.equal(payload.prompt,'Unsaved guidance');
  assert.equal(payload.contentMode,undefined);
  assert.equal(payload.revision,5);
});

test("event template editor saves all three emails in its own scope and retains edits on conflicts", async () => {
  const calls=[];
  const templates=[1,2,3].map(step=>({subject:`Subject ${step}`,body:`Body ${step}`}));
  const props={config:{...config,templateStarters:templates},department:'sales',eventKey:'summit',eventName:'Summit',reload(){}};
  const view=componentHarness('components/automated-outreach/OutreachTemplateSettings.tsx','TemplateEditor',{
    '@/lib/automatedOutreachApi':{saveOutreachTemplates:async value=>{calls.push(JSON.parse(JSON.stringify(value)));return {...props.config,revision:5};}},
    sonner:{toast:{success(){}}},
  },props);
  view.find(node=>node.type==='EmailSequenceTemplateEditor').props.onSelect(1);view.render();
  view.find(node=>node.type==='EmailSequenceTemplateEditor').props.onBodyChange('Edited second body');view.render();
  await view.find(node=>node.type==='form').props.onSubmit({preventDefault(){}});view.render();
  assert.deepEqual(calls[0],{revision:4,department:'sales',eventKey:'summit',templates:[templates[0],{...templates[1],body:'Edited second body'},templates[2]]});
  props.config={...props.config,revision:6};view.render();
  assert.equal(view.find(node=>node.type==='EmailSequenceTemplateEditor').props.body,'Edited second body');
  assert.equal(view.find(node=>node.type==='EmailSequenceTemplateEditor').props.actions.props.children[0].props.disabled,true);
  view.find(node=>node.props?.children==='Reload saved templates').props.onClick();view.render();
  assert.equal(view.find(node=>node.type==='EmailSequenceTemplateEditor').props.body,'Body 2');
  assert.equal(view.find(node=>node.type==='EmailSequenceTemplateEditor').props.actions.props.children[0].props.disabled,false);
});

test("delivery saves only the global switch and has no sender or callback fields", async () => {
  let payload;
  const view = harness("Delivery", async value => { payload = value; return { ...config, ...value, revision: 5 }; });
  view.field("Enable automatic outreach delivery").props.onChange({ target: { checked: false } });
  await new Promise(resolve => setImmediate(resolve)); view.render();
  assert.deepEqual(Object.keys(payload).sort(), ["enabled", "revision"]);
  assert.equal(payload.enabled, false);
  assert.equal(view.field("Enable automatic outreach delivery").props.checked, false);
  assert.ok(view.find(node => node.props?.children === "Global setting saved"));
  assert.equal(view.all(node => node.props?.type === "submit").length, 0);
  assert.equal(view.all(node => ["password", "email", "url"].includes(node.props?.type)).length, 0);
});

test("event control revisions do not strand an unchanged global delivery switch", async () => {
  let payload;
  const view = harness("Delivery", async value => { payload = value; return { ...config, ...value, revision: 6 }; });
  view.render({ ...config, revision: 5 });
  view.field("Enable automatic outreach delivery").props.onChange({ target: { checked: false } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(payload.revision, 5);
});

test("switching the global default on can be saved after an event changes", async () => {
  let payload;
  const initial = { ...config, enabled: false };
  const view = harness("Delivery", async value => { payload = value; return { ...initial, ...value, revision: 6 }; }, initial);
  view.render({ ...initial, revision: 5, eventOutreach: { sales: { summit: true } } });
  view.field("Enable automatic outreach delivery").props.onChange({ target: { checked: true } });
  await new Promise(resolve => setImmediate(resolve)); view.render({ ...initial, revision: 5 });
  assert.equal(payload.enabled, true);
  assert.equal(payload.revision, 5);
  assert.equal(view.field("Enable automatic outreach delivery").props.checked, true);
});

test("delivery can reload a global change made elsewhere", () => {
  const view = harness("Delivery", async () => config);
  const updated = { ...config, revision: 5, enabled: false };
  view.render(updated);
  assert.ok(view.find(node => node.props?.children === "Automatic delivery changed elsewhere."));
  view.find(node => node.props?.children === "Reload saved value").props.onClick(); view.render(updated);
  assert.equal(view.field("Enable automatic outreach delivery").props.checked, false);
});

test("delivery restores the saved switch after a failed update", async () => {
  const view = harness("Delivery", async () => { throw new Error("Conflict"); });
  view.field("Enable automatic outreach delivery").props.onChange({ target: { checked: false } });
  await new Promise(resolve => setImmediate(resolve)); view.render();
  assert.equal(view.field("Enable automatic outreach delivery").props.checked, true);
  assert.ok(view.find(node => node.props?.role === "alert"));
});

for (const [kind, label, field] of [["Content", "Outreach editorial guidance", "prompt"]]) {
  test(`${kind} retains unsaved edits on refresh and requires explicit reload after a revision conflict`, () => {
    const view = harness(kind, async () => config);
    view.field(label).props.onChange({ target: { value: "Unsaved edit", checked: false } });
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
    view.field(label).props.onChange({ target: { value: "Unsaved edit", checked: false } }); view.render();
    await view.submit(); view.render();
    assert.equal(view.field(label).props.value, "Unsaved edit");
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
  selected = "status-outreach&view=delivery"; view.render();
  assert.equal(view.find(node => node.type === "StatusOutreachControlCenter").props.view, "delivery");
  const sectionNav = view.find(node => node.type === "nav" && node.props?.["aria-label"] === "Status Outreach sections");
  assert.equal(sectionNav.props.children.length, 3);
  assert.equal(view.find(node => node.props?.href === "/settings/content-generation?tab=status-outreach&view=delivery").props["aria-current"], "page");
  assert.equal(view.find(node => node.type === "AdminPanelShell").props.statusOutreachView, undefined);
});

test("event mode toggle sends its department, event and revision without altering lead status", async () => {
  const calls=[];
  const view=componentHarness("components/automated-outreach/OutreachEvents.tsx", "OutreachEvents", {
    "@/hooks/useOutreachResource":{useOutreachResource:()=>({data:{revision:7,enabled:true,items:[{key:'summit',name:'Summit',leads:5,active:3,statuses:{'proposal-sent':5},outreachEnabled:true}]},reload(){},error:null})},
    "@/lib/automatedOutreach":{statusLabel:value=>value},
    "@/lib/automatedOutreachApi":{setEventContentMode:async(...args)=>calls.push(args),setEventOutreach:async(...args)=>calls.push(['delivery',...args])},
  },{department:'sales'});
  const control=view.find(node=>node.type==='OutreachModeToggle');
  assert.equal(control.props.value,'template');
  control.props.onChange('generated'); await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,[['sales','summit','generated',7]]);
  const switches=view.all(node=>node.type?.name==='EventSwitch');
  assert.equal(switches.length,1);
  switches[0].props.onChange(false); await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls.slice(1),[['delivery','sales','summit',false,8]]);
});

test("event outreach can be configured while global delivery is off", async () => {
  const calls=[];
  const view=componentHarness("components/automated-outreach/OutreachEvents.tsx", "OutreachEvents", {
    "@/hooks/useOutreachResource":{useOutreachResource:()=>({data:{revision:3,enabled:false,items:[{key:'summit',name:'Summit',leads:1,active:1,statuses:{},outreachEnabled:false}]},reload(){},error:null})},
    "@/lib/automatedOutreach":{statusLabel:value=>value},
    "@/lib/automatedOutreachApi":{setEventOutreach:async(...args)=>calls.push(args)},
  },{department:'sales'});
  const control=view.find(node=>node.type?.name==='EventSwitch');
  assert.equal(control.props.disabled,false);
  assert.equal(control.props.checked,false);
  control.props.onChange(true); await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,[['sales','summit',true,3]]);
});

test("run monitoring offers recovery only for recoverable generation failures", async () => {
  const calls=[];
  const usage={requests:3,inputTokens:100,outputTokens:50,unmeasuredRequests:0,reservedTokens:0};
  const run={id:'failed-run',eventName:'Summit',leadName:'Person',department:'sales',step:1,state:'failed',stage:'writer',completedStages:['planner'],usage,error:'Writer failed',recoverable:true,updatedAt:null};
  const view=componentHarness("components/automated-outreach/StatusOutreachRuns.tsx", "StatusOutreachRuns", {
    "@/lib/automatedOutreach":{statusLabel:value=>value,outreachDate:()=>''},
  },{data:{states:{failed:1,completed:1},total:2,itemTotal:2,items:[run,{...run,id:'handed-off',state:'completed',recoverable:false}]},page:1,onPage(){},filter:'all',onFilter(){},search:'',onSearch(){},recovering:null,onRecover:id=>calls.push(id),actionError:null,notice:null});
  const recovery=view.all(node=>node.type==='Button'&&node.props?.children?.some?.(child=>child==='Recover'));
  assert.equal(recovery.length,1);
  recovery[0].props.onClick();
  assert.deepEqual(calls,['failed-run']);
  assert.ok(view.find(node=>node.props?.['aria-label']==='Filter runs'));
});

test("delivery tracking has its own Status Outreach view", () => {
  const view = componentHarness("components/automated-outreach/StatusOutreachControlCenter.tsx", "StatusOutreachControlCenter", {
    "@/hooks/useOutreachResource": {useOutreachResource: () => ({data:null,error:"Unavailable",reload(){}})},
  },{view:'delivery'});
  assert.equal(view.all(node => node.type === "OutreachOperations").length, 1);
  const tracking = componentHarness("components/automated-outreach/OutreachOperations.tsx", "OutreachOperations", {});
  assert.equal(tracking.all(node => node.type === "OutreachDeliverySettings").length, 0);
  assert.equal(tracking.all(node => node.type === "details").length, 0);
  assert.equal(tracking.all(node => node.type === "OutreachLeadTable").length, 1);
  assert.equal(tracking.all(node => node.type === "OutreachAuditLog").length, 0);
});

test("Status Outreach analytics uses the same three-line spend and usage pattern as Control Center", () => {
  const usage={requests:3,inputTokens:1000,outputTokens:200,unmeasuredRequests:0,reservedTokens:0};
  const view=componentHarness("components/automated-outreach/StatusOutreachAnalytics.tsx","StatusOutreachAnalytics",{
    "@/lib/automatedOutreach":{statusLabel:value=>value},
  },{data:{states:{completed:1},usage,total:1,leads:1,totalEnrolledLeads:8,rangeEnrolledLeads:2,estimatedSpendUsd:.01,unpricedRequests:0,pricingSnapshot:'test',daily:[{date:'2026-10-22',requests:2,inputTokens:500,outputTokens:100,leads:1,enrolledLeads:1,completed:0,failed:1,estimatedSpendUsd:.005},{date:'2026-10-23',requests:3,inputTokens:1000,outputTokens:200,leads:1,enrolledLeads:2,completed:1,failed:0,estimatedSpendUsd:.01}],stages:[]},start:'2026-10-22',end:'2026-10-23'});
  assert.ok(view.all(node=>node.props?.children==='Total enrolled leads').length);
  const plotted = view.all(node=>node.type==='Line').map(node=>node.props.dataKey);
  assert.deepEqual(Array.from(plotted).sort(),['estimatedSpendUsd','leads','requests']);
  const days=view.find(node=>node.type==='LineChart').props.data;
  assert.equal(days[0].estimatedSpendUsd,.005);
  assert.equal(days[1].requests,3);
  assert.equal(view.all(node=>node.type==='YAxis').length,2);
  assert.equal(view.all(node=>node.props?.['aria-label']==='Chart metric').length,0);
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
    "@/lib/outreachContentStatus":{outreachContentStates},
  },{lead:{id:"lead",lead:{name:"Person"},email:"person@example.com",state:"active",workflowStatus:"proposal-sent",sentCount:0,messages:[]},number:1,reload(){}});
  const button=view.find(node=>node.props?.["aria-label"]==="View messages for Person");
  assert.ok(button.props.children.includes("View"));
  button.props.onClick();view.render();
  assert.equal(view.find(node=>node.type==="OutreachLeadReview").props.initialView,"content");
});

test("a lead without an email is shown read-only with no outreach controls", () => {
  const view=componentHarness("components/automated-outreach/OutreachLeadRow.tsx","OutreachLeadRow",{
    "@/lib/automatedOutreach":{outreachActions:()=>[],outreachDate:()=>"",statusLabel:value=>value},
    "@/lib/outreachActivity":{deliveryStateLabels:{blocked:"Blocked"}},
    "@/lib/outreachContentStatus":{outreachContentStates},
  },{lead:{id:"lead",lead:{name:"Person"},email:null,state:"blocked",workflowStatus:"first-call",sentCount:0,messages:[]},number:1,reload(){}});
  assert.equal(view.all(node=>node.props?.["aria-label"]?.includes?.("outreach for Person")).length,0);
  assert.equal(view.all(node=>node.props?.["aria-label"]==="View messages for Person").length,0);
  assert.ok(view.all(node=>node.type==="span").some(node=>node.props?.children==="Actions unavailable"));
});

test("content dialog is read-only and displays each automatically prepared email", async () => {
  const prepared=[];
  const messages=[1,2,3].map(step=>({id:`message-${step}`,step,status:"preview",subject:`Subject ${step}`,body:`Body ${step}`,tracking:{},updatedAt:"2026-10-20T10:00:00Z"}));
  const view=componentHarness("components/automated-outreach/OutreachLeadReview.tsx","OutreachLeadReview",{
    "react-dom":{createPortal:node=>node},
    "@/hooks/useOutreachResource":{useOutreachResource:()=>({data:{messages},reload(){}})},
    "@/lib/automatedOutreachApi":{prepareOutreachContent:async id=>prepared.push(id)},
    "@/lib/automatedOutreach":{outreachDate:()=>"today",statusLabel:value=>value},
  },{lead:{id:"lead",lead:{name:"Person"},messages:[],sentCount:0,eventName:"Summit",department:"sales",workflowStatus:"proposal-sent"},initialView:"content",onClose(){}});
  view.flushEffects(); await new Promise(resolve=>setImmediate(resolve));view.render();
  assert.deepEqual(prepared,[]);
  for(const step of ["1","2","3"]) {
    view.find(node=>node.type==="OutreachDeliveryTimeline").props.onSelect(step);view.render();
    assert.ok(view.all(node=>node.type==="p").some(node=>node.props.children===`Subject ${step}`));
    assert.ok(view.all(node=>node.type==="div").some(node=>node.props.children===`Body ${step}`));
  }
});

test("Status Outreach content indicators show each email and prioritize ready content", () => {
  const lead={id:"lead",lead:{name:"Person"},email:"person@example.com",state:"active",workflowStatus:"proposal-sent",sentCount:0,messages:[{step:1,status:"preview_generating"},{step:2,status:"preview_failed"}]};
  const view=componentHarness("components/automated-outreach/OutreachLeadRow.tsx","OutreachLeadRow",{
    "@/lib/automatedOutreach":{outreachActions:()=>[],outreachDate:()=>"",statusLabel:value=>value},
    "@/lib/outreachActivity":{deliveryStateLabels:{active:"Active"}},
    "@/lib/outreachContentStatus":{outreachContentStates},
  },{lead,number:1,reload(){}});
  const button=()=>view.find(node=>node.props?.["aria-label"]==="View messages for Person");
  assert.match(button().props.className,/bg-yellow-50/);
  assert.equal(view.all(node=>node.props?.role==="img").length,3);
  for(const label of ["Email 1 content: Processing","Email 2 content: Failed","Email 3 content: Not started"]) {
    assert.ok(view.find(node=>node.props?.["aria-label"]===label));
  }
  lead.messages.push({step:3,status:"preview",subject:"Subject",body:"Body"});
  view.render();
  assert.match(button().props.className,/bg-emerald-50/);
  assert.match(view.find(node=>node.props?.["aria-label"]==="Email 3 content: Complete").props.className,/bg-emerald-500/);
});
