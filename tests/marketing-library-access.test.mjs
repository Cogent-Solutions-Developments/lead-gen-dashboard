import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = readFileSync(new URL("../components/marketing/Library.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const apiModule = { exports: {} };
const apiSource = readFileSync(new URL("../components/marketing/api.ts", import.meta.url), "utf8");
runInNewContext(ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  module: apiModule, exports: apiModule.exports,
  require(name) { if (name.startsWith("@/lib/")) return {}; throw new Error(name); },
});
const testModule = { exports: {} };
runInNewContext(code, {
  module: testModule,
  exports: testModule.exports,
  require(name) {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
    if (name === "sonner") return { toast: { success() {} } };
    if (name === "./api") return apiModule.exports;
    if (name === "./marketing.module.css") return {};
    if (name === "./DocumentPreview") return { DocumentPreview: () => null };
    if (name === "./LibraryUploadDialog") return { LibraryUploadDialog: () => null };
    throw new Error(`Unexpected library dependency: ${name}`);
  },
});

function uploadButtons(category, viewer) {
  const context = {
    name: "Test member", userId: "member", role: "marketing_developer_user",
    roles: [], manager: false, social: false, staff: true, canUpload: true,
    events: [{ id: "event", name: "Conference" }], users: [], assignments: [], ...viewer,
  };
  const html = renderToStaticMarkup(jsxRuntime.jsx(testModule.exports.Library, {
    context, eventId: "event", category,
  }));
  return [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)]
    .map(match => match[1].replace(/<[^>]*>/g, "").trim())
    .filter(text => text.startsWith("Upload"));
}

for (const category of ["agenda", "materials"]) {
  for (const viewer of [
    { label: "developer", role: "marketing_developer_user", roles: [] },
    { label: "developer plus legacy and social", role: "marketing_developer_user", roles: ["marketing_user", "marketing_social"], social: true },
    { label: "legacy Marketing", role: "marketing_user", roles: [] },
    { label: "social member", role: "marketing_user", roles: ["marketing_social"], social: true },
    { label: "revoked server permission", role: "marketing_designer_user", roles: [], canUpload: false },
  ]) {
    test(`${category}: hides upload controls for ${viewer.label}`, () => {
      assert.deepEqual(uploadButtons(category, viewer), []);
    });
  }
  for (const viewer of [
    { label: "designer", role: "marketing_designer_user" },
    { label: "manager", role: "marketing_manager_user", manager: true },
    { label: "developer plus designer", role: "marketing_developer_user", roles: ["marketing_designer_user"] },
    { label: "developer plus manager", role: "marketing_developer_user", roles: ["marketing_manager_user"], manager: true },
  ]) {
    test(`${category}: allows upload controls for ${viewer.label}`, () => {
      assert.deepEqual(uploadButtons(category, viewer), [category === "agenda" ? "Upload new version" : "Upload material"]);
    });
  }
}
