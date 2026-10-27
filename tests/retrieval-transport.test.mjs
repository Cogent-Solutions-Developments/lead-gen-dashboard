import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import test from "node:test";

function loadApi(relativePath) {
  const calls = [];
  const client = {
    get: async (url, config) => {
      calls.push({ url, config });
      if (config.signal?.aborted) throw new Error("cancelled");
      return { data: { items: [], total: 0 } };
    },
    interceptors: { request: { use() {} }, response: { use() {} } },
  };
  const exported = {};
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, {
    exports: exported,
    process: { env: {} },
    require(name) {
      if (name === "axios") return { __esModule: true, default: { create: () => client } };
      if (name.endsWith("apiClient") || name.endsWith("/client")) return { apiClient: client };
      if (name.endsWith("/auth")) return { attachAuthToken: value => value };
      if (name.endsWith("/devNgrok")) return { getLocalDevNgrokHeaders: () => ({}) };
      if (name.endsWith("/baseUrl")) return { getApiBaseUrl: () => "https://example.test" };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { api: exported, calls };
}

for (const apiPath of ["../lib/api.ts", "../lib/apidele.ts", "../lib/apidelegatesales.ts", "../lib/apiproduction.ts"]) {
  for (const method of ["listEventLeads", "listMyEventLeads"]) {
    test(`${apiPath}: ${method} preserves cancellation and server pagination`, async () => {
      const { api, calls } = loadApi(apiPath);
      const controller = new AbortController();
      await api[method]("energy/expo", { signal: controller.signal, limit: 50, offset: 100, category: "Energy" });
      assert.equal(calls[0].config.signal, controller.signal);
      assert.equal(calls[0].config.params.limit, 50);
      assert.equal(calls[0].config.params.offset, 100);
      assert.equal(calls[0].config.params.category, "Energy");
      assert.equal(calls[0].config.params.signal, undefined);
      assert.ok(calls[0].url.includes("energy%2Fexpo"));
      controller.abort();
      await assert.rejects(api[method]("energy/expo", { signal: controller.signal }), /cancelled/);
    });
  }
}
