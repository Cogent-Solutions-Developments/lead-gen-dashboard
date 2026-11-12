import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

function editor(creating = false, manager = true) {
  const states = [], calls = [], errors = [];
  let cursor = 0, tree;
  const react = { useState(initial) {
    const index = cursor++;
    if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
    return [states[index], value => { states[index] = value; }];
  }};
  function load(filename, dependencies = {}) {
    const source = readFileSync(new URL(`../components/marketing/${filename}`, import.meta.url), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const compiledModule = { exports: {} };
    runInNewContext(code, {
      module: compiledModule, exports: compiledModule.exports, crypto: { randomUUID },
      FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key] ?? null; } },
      require(name) {
        if (name in dependencies) return dependencies[name];
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return jsxRuntime;
        if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
        if (name === "./marketing.module.css") return {};
        if (name === "./SpeakerChanges") return { SpeakerChanges: () => null };
        if (name === "./LibraryUploadDialog") return { LibraryUploadDialog: () => null };
        if (name === "sonner") return { toast: { success() {}, error(error) { errors.push(error); } } };
        if (name === "./api") return { label: value => value, taskLabel: value => value, marketing: async (...args) => { calls.push(args); return { id: "new-subtask" }; } };
        throw new Error(`Unexpected dependency: ${name}`);
      },
    });
    return compiledModule.exports;
  }
  const picker = load("SpeakerOperationPicker.tsx");
  const otherPicker = load("OtherOperationPicker.tsx");
  const { RequestForm } = load("Requests.tsx", { "./SpeakerOperationPicker": picker, "./OtherOperationPicker": otherPicker });
  const props = { context: { manager, role: "production_user", events: [{id:"event",name:"Conference"}] }, eventId: "event", request: creating ? undefined : { id: "parent", title: "Main speaker task", kind: "speaker_update", version: 7, priority: "normal", dueAt: null, details: { speakerName: "Alex", designation: "Director", company: "Example" } }, onSave() {}, onCancel() {} };
  function render() { cursor = 0; tree = RequestForm(props); }
  function all(predicate, node = tree, found = []) {
    if (Array.isArray(node)) { node.forEach(child => all(predicate, child, found)); return found; }
    if (!node || typeof node !== "object") return found;
    if (predicate(node)) found.push(node);
    all(predicate, node.props?.children ?? null, found);
    return found;
  }
  render();
  return { all, calls, errors, props, render, chooseOther(operation) {
    all(node => node.type === "select" && node.props.value === "web_design")[0].props.onChange({target:{value:"other"}}); render();
    const node = all(node => node.type === otherPicker.OtherOperationPicker)[0];
    assert.ok(node, "Other checkbox choices must be visible");
    const radioTree = otherPicker.OtherOperationPicker(node.props);
    if (!manager) assert.equal(all(item => item.type === "input" && item.props.value === "custom", radioTree).length, 0);
    node.props.onChange(Array.isArray(operation) ? operation : [operation]); render();
  }, choose(operation) {
    const node = all(node => node.type === picker.SpeakerOperationPicker)[0];
    assert.ok(node, "Operation picker must be present");
    node.props.onChange(operation); render();
  }, submit() { return tree.props.onSubmit({ preventDefault() {}, currentTarget: { title:"Other marketing work", eventId:"event", priority: "normal", dueAt: "", speakerName: "Alex", designation: "Director", company: "Example", instructions: "Requested change" } }); } };
}

for (const operation of ["website", "agenda", "website_agenda", "update_post", "delete_post", "republish_post"]) {
  test(`speaker ${operation}: preserves parent task name and submits only the selected operation`, async () => {
    const view = editor();
    assert.equal(view.all(node => node.type === "input" && node.props.name === "title").length, 0);
    view.choose(operation);
    await view.submit();
    assert.equal(view.errors.length, 0);
    assert.equal(view.calls.length, 1);
    const [path, method, payload] = view.calls[0];
    assert.equal(path, "/requests/parent");
    assert.equal(method, "PATCH");
    assert.equal(payload.operation, operation);
    assert.equal(payload.title, "Main speaker task");
    assert.equal(payload.version, 7);
    assert.equal(payload.postAction, undefined);
    assert.match(payload.followUpId, /^[0-9a-f-]{36}$/);
  });
}

for (const operation of ["website", "materials", "agenda"]) {
  test(`department requesters can route Other ${operation} without custom-stage access`, async () => {
    const view=editor(true,false);
    assert.equal(view.all(node=>node.type==="option" && node.props.value==="other").length,1);
    view.chooseOther(operation);
    await view.submit();
    assert.equal(view.errors.length,0);
    const [path,method,payload]=view.calls[0];
    assert.equal(path,"/requests"); assert.equal(method,"POST");
    assert.equal(payload.kind,"other"); assert.deepEqual(Array.from(payload.operations),[operation]); assert.equal(payload.operation,undefined);
    assert.equal(payload.taskKinds,undefined);
  });
}
test("Marketing Managers retain custom delivery stages",async()=>{
  const view=editor(true,true); view.chooseOther("custom"); await view.submit();
  const payload=view.calls[0][2];
  assert.ok(Array.isArray(payload.taskKinds)); assert.equal(payload.operation,undefined);
});

for (const operations of [["website","materials"],["website","agenda"],["materials","agenda"],["website","materials","agenda"]]) {
  test(`Other combines selected work: ${operations.join(", ")}`,async()=>{
    const view=editor(true,false); view.chooseOther(operations); await view.submit();
    assert.equal(view.errors.length,0);
    assert.deepEqual(Array.from(view.calls[0][2].operations),operations);
    assert.equal(view.calls[0][2].taskKinds,undefined);
  });
}
test("Other requires at least one checkbox",async()=>{
  const view=editor(true,false); view.chooseOther([]); await view.submit();
  assert.equal(view.calls.length,0); assert.match(view.errors[0],/Select at least one/);
});
