import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkAutocallDeployment } from "./check-autocall-deployment.mjs";

function page(baseUrl, portal = "light", allowLocalHttp = false, split = false) {
  const props = { baseUrl, portal, allowLocalHttp };
  const flight = `2:I["module",[],"AutocallLaunch"]\n3:${JSON.stringify(["$", "$L2", null, props])}\n`;
  const chunks = split ? [flight.slice(0, 70), flight.slice(70)] : [flight];
  return `<html><script>self.__next_f.push([0])</script>${chunks.map((chunk) =>
    `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`
  ).join("")}</html>`;
}

for (const portal of ["light", "heavy"]) {
  test(`accepts the ${portal} portal's deployed HTTPS configuration`, () => {
    checkAutocallDeployment(page("https://autocall.example/autocall-db", portal), portal);
  });
}

test("joins Flight chunks before parsing and accepts the supported trailing slash", () => {
  checkAutocallDeployment(page("https://autocall.example/autocall-db/", "light", false, true), "light");
});

for (const [name, value] of [
  ["missing value", ""],
  ["HTTP production URL", "http://api.infrastructuresg.com/autocall-db"],
  ["wrong path", "https://autocall.example/"],
  ["login path", "https://autocall.example/autocall-db/login"],
  ["query string", "https://autocall.example/autocall-db?next=evil"],
  ["fragment", "https://autocall.example/autocall-db#fragment"],
  ["credentials", "https://user:password@autocall.example/autocall-db"],
  ["redacted value", "[SENSITIVE]"],
  ["non-string value", null],
]) {
  test(`rejects ${name} even when the page returns HTTP 200`, () => {
    assert.throws(() => checkAutocallDeployment(page(value), "light"));
  });
}

test("rejects a login page, an error page, or a response without launch props", () => {
  for (const html of ["", "<html>Sign in to Vercel</html>", "<html>Internal Server Error</html>"]) {
    assert.throws(() => checkAutocallDeployment(html, "light"));
  }
});

test("rejects the wrong portal, development mode, and ambiguous launch props", () => {
  const html = page("https://autocall.example/autocall-db");
  assert.throws(() => checkAutocallDeployment(html, "heavy"));
  assert.throws(() => checkAutocallDeployment(html, "unknown"));
  assert.throws(() => checkAutocallDeployment(page("https://autocall.example/autocall-db", "light", true), "light"));
  assert.throws(() => checkAutocallDeployment(html + html, "light"));
});

test("does not execute script content", () => {
  assert.throws(() => checkAutocallDeployment('<script>self.__next_f.push([1,process.exit(0)])</script>', "light"));
});

test("CLI fails without leaking invalid configuration and succeeds for a valid deployment", () => {
  const directory = mkdtempSync(join(tmpdir(), "autocall-ci-"));
  const file = join(directory, "page.html");
  const script = fileURLToPath(new URL("./check-autocall-deployment.mjs", import.meta.url));
  try {
    writeFileSync(file, page("https://user:private-password@autocall.example/autocall-db"));
    const invalid = spawnSync(process.execPath, [script, file, "light"], { encoding: "utf8" });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /::error title=Invalid Autocall deployment configuration::/);
    assert.match(invalid.stderr, /AUTOCALL_PUBLIC_URL.*HTTPS/);
    assert.doesNotMatch(invalid.stderr + invalid.stdout, /private-password/);
    writeFileSync(file, page("https://autocall.example/autocall-db"));
    assert.equal(spawnSync(process.execPath, [script, file, "light"]).status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
