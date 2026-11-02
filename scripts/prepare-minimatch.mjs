import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

// Minimatch 11 fixes GHSA-g3hv-75wg-m249. Older ESLint plugins still call
// require("minimatch") directly, so retain that API without changing matching.
const packagePath = fileURLToPath(new URL("../node_modules/minimatch/package.json", import.meta.url));
if (fs.existsSync(packagePath)) {
  const { version } = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  if (version !== "11.0.1") {
    throw new Error(`Review the ESLint minimatch compatibility fix for version ${version}.`);
  }

  const entry = require.resolve("minimatch");
  const exported = require(entry);
  if (typeof exported !== "function") {
    if (typeof exported.minimatch !== "function") {
      throw new Error("The patched minimatch package has an unexpected CommonJS API.");
    }
    fs.appendFileSync(
      entry,
      "\n// Preserve the callable CommonJS export used by legacy ESLint plugins.\n" +
        "module.exports = Object.assign(module.exports.minimatch, module.exports);\n",
    );
    console.log("Prepared minimatch 11 CommonJS compatibility for ESLint plugins.");
  }
}
