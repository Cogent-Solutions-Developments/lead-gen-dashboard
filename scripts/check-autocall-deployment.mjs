import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { autocallBaseUrl } from "../lib/autocall-access.ts";

export function checkAutocallDeployment(html, portal) {
  if (portal !== "light" && portal !== "heavy") {
    throw new Error("Expected the light or heavy Autocall portal.");
  }

  // Read Next.js's serialized server props, not the loading screen's HTTP 200.
  // Parse JSON only: never execute JavaScript returned by the deployment.
  let flight = "";
  for (const match of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)/g)) {
    let chunk;
    try {
      chunk = JSON.parse(match[1]);
    } catch {
      throw new Error("The Autocall page returned unreadable server props.");
    }
    if (chunk[0] === 1 && typeof chunk[1] === "string") flight += chunk[1];
  }

  const launches = [];
  function visit(value) {
    if (Array.isArray(value)) {
      const props = value[3];
      if (
        value[0] === "$" && props && typeof props === "object" &&
        Object.hasOwn(props, "baseUrl") && Object.hasOwn(props, "portal")
      ) launches.push(props);
      for (const child of value) visit(child);
    } else if (value && typeof value === "object") {
      for (const child of Object.values(value)) visit(child);
    }
  }

  for (const row of flight.split("\n")) {
    const payload = row.slice(row.indexOf(":") + 1);
    // Other Flight records describe imports, hints, or text rather than props.
    if (!payload.startsWith("[") && !payload.startsWith("{")) continue;
    let value;
    try {
      value = JSON.parse(payload);
    } catch {
      throw new Error("The Autocall page returned unreadable server props.");
    }
    visit(value);
  }

  if (launches.length !== 1 || launches[0].portal !== portal) {
    throw new Error("The response did not contain the expected Autocall launch page.");
  }
  const props = launches[0];
  if (props.allowLocalHttp !== false || typeof props.baseUrl !== "string") {
    throw new Error("The deployed Autocall launch configuration is invalid.");
  }
  // Reuse the application's HTTPS, path, credentials, and query-string rules.
  try {
    autocallBaseUrl(props.baseUrl);
  } catch {
    throw new Error("Set AUTOCALL_PUBLIC_URL in the target Vercel environment to an HTTPS URL ending in /autocall-db, without credentials, query strings, or fragments, then redeploy.");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [file, portal] = process.argv.slice(2);
    if (!file) throw new Error("Provide the saved Autocall HTML response and portal.");
    let html;
    try {
      html = readFileSync(file, "utf8");
    } catch {
      throw new Error("Could not read the saved Autocall page response.");
    }
    checkAutocallDeployment(html, portal);
    console.log("Autocall deployment configuration passed: HTTPS URL and /autocall-db path.");
  } catch (error) {
    console.error(`::error title=Invalid Autocall deployment configuration::${error.message}`);
    process.exitCode = 1;
  }
}
