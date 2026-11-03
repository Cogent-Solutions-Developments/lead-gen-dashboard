import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

function editor() {
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
        if (name === "./LibraryUploadDialog") return { LibraryUploadDialog: () => null };
        if (name === "sonner") return { toast: { success() {}, error(error) { errors.push(error); } } };
        if (name === "./api") return { label: value => value, marketing: async (...args) => { calls.push(args); return { id: "new-subtask" }; } };
        throw new Error(`Unexpected dependency: ${name}`);
      },
    });
    return compiledModule.exports;
  }
  const picker = load("SpeakerOperationPicker.tsx");
  const { RequestForm } = load("Requests.tsx", { "./SpeakerOperationPicker": picker });
  const props = { context: { manager: true }, eventId: "event", request: { id: "parent", title: "Main speaker task", kind: "speaker_update", version: 7, priority: "normal", dueAt: null, details: { speakerName: "Alex", designation: "Director", company: "Example" } }, onSave() {}, onCancel() {} };
  function render() { cursor = 0; tree = RequestForm(props); }
  function all(predicate, node = tree, found = []) {
    if (Array.isArray(node)) { node.forEach(child => all(predicate, child, found)); return found; }
    if (!node || typeof node !== "object") return found;
    if (predicate(node)) found.push(node);
    all(predicate, node.props?.children ?? null, found);
    return found;
  }
  render();
  return { all, calls, errors, props, render, choose(operation) {
    const node = all(node => node.type === picker.SpeakerOperationPicker)[0];
    assert.ok(node, "Operation picker must be present");
    node.props.onChange(operation); render();
  }, submit() { return tree.props.onSubmit({ preventDefault() {}, currentTarget: { priority: "normal", dueAt: "", speakerName: "Alex", designation: "Director", company: "Example", instructions: "Requested change" } }); } };
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
