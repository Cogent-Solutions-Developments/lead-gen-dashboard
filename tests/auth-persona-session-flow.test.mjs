import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const authSource = fs.readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
const shellSource = fs.readFileSync(new URL("../components/layout/AppShell.tsx", import.meta.url), "utf8");
const sidebarSource = fs.readFileSync(new URL("../components/layout/Sidebar.tsx", import.meta.url), "utf8");
const signInSource = fs.readFileSync(new URL("../app/sign-in/page.tsx", import.meta.url), "utf8");
const chooserSource = fs.readFileSync(new URL("../app/select-workspace/page.tsx", import.meta.url), "utf8");
const adminChooserSource = fs.readFileSync(new URL("../app/choose-persona/page.tsx", import.meta.url), "utf8");

test("refresh validation preserves the cached session on transient failures", () => {
  assert.match(authSource, /status === 401/);
  assert.match(shellSource, /validateSessionOnReload/);
  assert.match(shellSource, /refresh: fetchCurrentAuthUser/);
});

test("assigned users land in their primary workspace after login", () => {
  assert.match(signInSource, /forcedPersonaForUser\(session\.user\) \?\? personaForRole\(session\.user\.role\)/);
  assert.doesNotMatch(signInSource, /router\.replace\("\/select-workspace"\)/);
  assert.doesNotMatch(shellSource, /router\.replace\("\/select-workspace"\)/);
  assert.match(chooserSource, /router\.replace\("\/campaigns"\)/);
  assert.doesNotMatch(adminChooserSource, /availablePersonasForUser/);
  assert.match(adminChooserSource, /isSuperAdmin \? workspaceCards : \[\]/);
});

test("normal users switch assigned workspaces from the light sidebar", () => {
  assert.match(sidebarSource, /availablePersonasForUser\(user\)/);
  assert.match(sidebarSource, /availablePersonas\.length > 1/);
  assert.match(sidebarSource, /Current workspace:/);
  assert.match(sidebarSource, /Switch to \$\{workspaceLabels\[workspace\]\}/);
  assert.match(sidebarSource, /delegate-sales.*Megaphone/s);
  assert.match(sidebarSource, /delegates.*Handshake/s);
});
