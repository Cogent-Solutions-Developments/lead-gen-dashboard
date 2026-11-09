import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { ESLint } from "eslint";
import { Minimatch, minimatch } from "minimatch";

const require = createRequire(import.meta.url);

test("patched minimatch supports older lint plugins' callable CommonJS API", () => {
  const legacy = require("minimatch");
  assert.equal(typeof legacy, "function");
  assert.equal(legacy("components/leads/Status.tsx", "**/*.{ts,tsx}"), true);
  assert.equal(legacy("components/leads/Status.css", "**/*.{ts,tsx}"), false);
  assert.equal(new legacy.Minimatch("components/**").match("components/leads/Status.tsx"), true);
});

test("patched minimatch preserves modern named exports", () => {
  assert.equal(minimatch("components/leads/Status.tsx", "**/*.tsx"), true);
  assert.equal(new Minimatch("**/*.tsx").match("components/leads/Status.css"), false);
});

test("React lint rules honor configured glob exceptions", { timeout: 30_000 }, async () => {
  const eslint = new ESLint({
    overrideConfig: {
      rules: { "react/jsx-pascal-case": ["error", { ignore: ["Ignored_*"] }] },
    },
  });
  const [ignored] = await eslint.lintText(
    "export default function Probe() { return <Ignored_component />; }",
    { filePath: "components/GlobProbe.tsx" },
  );
  const [reported] = await eslint.lintText(
    "export default function Probe() { return <Invalid_component />; }",
    { filePath: "components/GlobProbe.tsx" },
  );
  assert.equal(ignored.fatalErrorCount, 0);
  assert.equal(ignored.messages.filter((message) => message.ruleId === "react/jsx-pascal-case").length, 0);
  assert.equal(reported.messages.filter((message) => message.ruleId === "react/jsx-pascal-case").length, 1);
});

test("lint ignores generated files while checking application components", async () => {
  const eslint = new ESLint();
  assert.equal(await eslint.isPathIgnored(".next/types/routes.ts"), true);
  assert.equal(await eslint.isPathIgnored("components/leads/MyLeadsWorkspace.tsx"), false);
});
