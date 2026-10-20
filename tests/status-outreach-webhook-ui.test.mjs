import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

test("Status Outreach stays after Production with the existing webhook form when API summaries omit it", async () => {
  const source = readFileSync(new URL("../components/settings/OutreachMailWebhookSettings.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const states = [], effects = [], created = [];
  let cursor = 0, tree;
  const module = {exports:{}};
  const summaries = ["sales", "delegate", "production"].map(value => ({value,label:value[0].toUpperCase()+value.slice(1),webhookCount:2,activeWebhookCount:1,suggestedWebhookName:`${value} webhook 3`}));
  runInNewContext(code, {module,exports:module.exports,URL,require: name => {
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "react") return {
      useState: initial => {const i=cursor++; if(!(i in states)) states[i]=typeof initial==="function"?initial():initial;return [states[i],value=>{states[i]=typeof value==="function"?value(states[i]):value;}];},
      useEffect: fn => effects.push(fn), useMemo: fn => fn(), useCallback: fn => fn,
    };
    if (name === "@/lib/apiRouter") return {
      listDepartmentMailWebhooks: async () => ({departments:summaries,items:[]}),
      createDepartmentMailWebhook: async payload => {created.push(payload);return {};},
    };
    if (name === "framer-motion") return {motion:{div:"div"}};
    if (name === "sonner") return {toast:{success(){},error(){}}};
    return new Proxy({}, {get:(_,key)=>key});
  }});
  function render(){cursor=0;tree=module.exports.OutreachMailWebhookSettings({onBack(){}});}
  function all(predicate,node=tree,result=[]){if(Array.isArray(node)){node.forEach(child=>all(predicate,child,result));return result;}if(!node||typeof node!=="object")return result;if(predicate(node))result.push(node);all(predicate,node.props?.children ?? null,result);return result;}
  function text(node){if(Array.isArray(node))return node.map(text).join("");if(node&&typeof node==="object")return text(node.props?.children);return typeof node==="string"||typeof node==="number"?String(node):"";}
  render();
  effects.splice(0).forEach(fn=>fn());
  await new Promise(resolve=>setImmediate(resolve));
  render();
  const tabs=all(node=>node.props?.role==="tab");
  assert.equal(tabs.length,4);
  assert.match(text(tabs[2]),/^Production/);
  assert.match(text(tabs[3]),/^Status Outreach/);
  tabs[3].props.onClick();render();
  assert.ok(all(node=>node.type==="h3").some(node=>text(node)==="Add Status Outreach webhook"));
  all(node=>node.props?.id==="mail-webhook-name")[0].props.onChange({target:{value:"Status Outreach Mail Webhook 1"}});
  all(node=>node.props?.id==="mail-webhook-url")[0].props.onChange({target:{value:"https://hook.make.com/status-route"}});
  render();
  await all(node=>node.type==="form")[0].props.onSubmit({preventDefault(){}});
  assert.equal(created.length,1);
  assert.equal(created[0].department,"status-outreach");
  assert.equal(created[0].webhookUrl,"https://hook.make.com/status-route");
  assert.equal(created[0].isActive,true);
});
