import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const authSource = fs.readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
const shellSource = fs.readFileSync(new URL("../components/layout/AppShell.tsx", import.meta.url), "utf8");
const signInSource = fs.readFileSync(new URL("../app/sign-in/page.tsx", import.meta.url), "utf8");
const chooserSource = fs.readFileSync(new URL("../app/choose-persona/page.tsx", import.meta.url), "utf8");

test("refresh validation preserves the cached session on transient failures", () => {
  assert.match(authSource, /status === 401/);
  assert.match(shellSource, /if \(isAuthenticationFailure\(error\)\)/);
});

test("Delegate Sales assignees choose a persona after login", () => {
  assert.match(signInSource, /hasDelegateSalesAssignment\(session\.user\)/);
  assert.match(signInSource, /requiresPersonaChoice \? "\/choose-persona"/);
  assert.match(shellSource, /router\.replace\("\/choose-persona"\)/);
  assert.match(chooserSource, /router\.push\("\/campaigns"\)/);
});
