import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
function load(file, dependencies = {}) {
  const source = readFileSync(new URL(`../components/marketing/${file}`, import.meta.url), "utf8");
  const compiled = { exports: {} };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    module: compiled, exports: compiled.exports, AbortController,
    require(name) {
      if (name in dependencies) return dependencies[name];
      if (name === "react") return React;
      if (name === "react/jsx-runtime") return jsx;
      if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
      if (name === "./marketing.module.css") return {};
      if (name === "./api") return {};
      throw new Error(name);
    },
  });
  return compiled.exports;
}
const diff = load("wordDiff.ts");
const { SpeakerChanges } = load("SpeakerChanges.tsx", { "./wordDiff": diff });
for (const [before, after] of [["", "Added"], ["Removed", ""], ["Same", "Same"], ["Hello, Alex!", "Hello, Dr. Alex!"], ["නම Alex", "නම Amina"], ["a b c", "a c b"]]) {
  test(`comparison preserves exact text: ${before} → ${after}`, () => {
    const result = diff.wordDiff(before, after);
    assert.equal(result.before.map(part => part.text).join(""), before);
    assert.equal(result.after.map(part => part.text).join(""), after);
  });
}
test("long biography comparison retains both values and common context", () => {
  const before = "Same start " + "old ".repeat(3500) + " shared end";
  const after = "Same start " + "new ".repeat(3500) + " shared end";
  const result = diff.wordDiff(before, after);
  assert.equal(result.before.map(part => part.text).join(""), before);
  assert.equal(result.after.map(part => part.text).join(""), after);
  assert.equal(result.before[0].changed, false);
  assert.equal(result.after.at(-1).changed, false);
});
const render = comparison => renderToStaticMarkup(jsx.jsx(SpeakerChanges, { comparison, requestId: "child" }));
test("Light renders removed and added words while hiding unchanged fields", () => {
  const html = render({ available: true, fields: [{ field: "designation", before: "Director", after: "CEO" }, { field: "company", before: "Example", after: "Example" }] });
  assert.match(html, /<del[^>]*>Director<\/del>/);
  assert.match(html, /<ins[^>]*>CEO<\/ins>/);
  assert.doesNotMatch(html, /Company comparison/);
  assert.match(html, /Show unchanged fields/);
});
test("Light distinguishes missing history from an unchanged operation", () => {
  assert.match(render({ available: false, fields: [] }), /original comparison is unavailable/);
  assert.match(render({ available: true, fields: [] }), /No speaker fields changed/);
});
test("speaker content remains escaped text", () => {
  const html = render({ available: true, fields: [{ field: "bio", before: "Safe", after: "<script>alert(1)</script>" }] });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;/);
});
