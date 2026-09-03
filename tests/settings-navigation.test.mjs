import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { buildSettingsHref, parseSettingsSection } from "../lib/settingsNavigation.ts";

const pageSource = readFileSync(new URL("../app/settings/page.tsx", import.meta.url), "utf8");
const pageCode = ts.transpileModule(pageSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
}).outputText;

function settingsBrowser(initialHref = "/settings") {
  const history = [initialHref];
  let position = 0;
  const actions = new Map();
  const element = (tag) => function MockElement({ children, onClick, ...props }) {
    if (onClick) actions.set(props["aria-label"], onClick);
    return React.createElement(tag, null, children);
  };
  const sectionView = (section) => function MockSettingsSection({ onBack }) {
    actions.set("All settings", onBack);
    return React.createElement("section", { "data-settings-section": section });
  };
  const pageModule = { exports: {} };
  const dependencies = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "next/link": element("a"),
    "next/navigation": {
      useSearchParams: () => new URL(history[position], "https://example.test").searchParams,
      useRouter: () => ({
        push: (href) => {
          history.splice(position + 1);
          history.push(href);
          position += 1;
        },
      }),
    },
    "framer-motion": { motion: { div: element("div"), button: element("button") } },
    "lucide-react": { ChevronRight: () => null, Webhook: () => null },
    "@/components/layout/AdminPanelShell": { AdminPanelShell: element("main") },
    "@/components/settings/MarketingOptOutSettings": { MarketingOptOutSettings: sectionView("opt-out") },
    "@/components/settings/OutreachMailWebhookSettings": { OutreachMailWebhookSettings: sectionView("outreach") },
    "@/components/ui/button": { Button: element("button") },
    "@/components/ui/card": { Card: element("div") },
    "@/lib/settingsNavigation": { buildSettingsHref, parseSettingsSection },
  };
  runInNewContext(pageCode, {
    module: pageModule,
    exports: pageModule.exports,
    require: (name) => {
      if (name.startsWith("@phosphor-icons/react/dist/csr/")) {
        return { [`${name.split("/").at(-1)}Icon`]: () => null };
      }
      assert.ok(name in dependencies, `Unexpected page dependency: ${name}`);
      return dependencies[name];
    },
  });
  return {
    href: () => history[position],
    render: () => {
      actions.clear();
      return renderToStaticMarkup(React.createElement(pageModule.exports.default));
    },
    click: (label) => {
      assert.ok(actions.has(label), `Missing settings control: ${label}`);
      actions.get(label)();
    },
    back: () => { position = Math.max(0, position - 1); },
    forward: () => { position = Math.min(history.length - 1, position + 1); },
  };
}

test("each settings section can be restored from its URL after refresh", () => {
  for (const section of ["outreach", "opt-out"]) {
    const href = buildSettingsHref("", section);
    assert.equal(href, `/settings?section=${section}`);

    const refreshedUrl = new URL(href, "https://example.test");
    assert.equal(parseSettingsSection(refreshedUrl.searchParams.get("section")), section);
  }
});

test("returning to all settings clears the section while preserving other query parameters", () => {
  assert.equal(buildSettingsHref("section=outreach", null), "/settings");
  assert.equal(buildSettingsHref("section=opt-out&source=admin", null), "/settings?source=admin");
  assert.equal(buildSettingsHref("source=admin&section=opt-out", "outreach"), "/settings?source=admin&section=outreach");
  assert.equal(buildSettingsHref("section=outreach&section=opt-out", null), "/settings");
});

test("missing or unsupported settings sections safely show the overview", () => {
  for (const value of [null, "", "unknown", "content-generation", "https://example.test"]) {
    assert.equal(parseSettingsSection(value), null);
  }
});

for (const [section, label] of [["outreach", "Open Outreach Configuration"], ["opt-out", "Open Marketing Opt-out"]]) {
  test(`${section} navigation survives refresh and browser history`, () => {
    const browser = settingsBrowser();
    assert.match(browser.render(), /Content Generation/);
    browser.click(label);
    assert.equal(browser.href(), `/settings?section=${section}`);
    assert.ok(browser.render().includes(`data-settings-section="${section}"`));

    const refreshed = settingsBrowser(browser.href());
    assert.ok(refreshed.render().includes(`data-settings-section="${section}"`));
    refreshed.click("All settings");
    assert.equal(refreshed.href(), "/settings");
    assert.match(refreshed.render(), /Content Generation/);

    browser.back();
    assert.match(browser.render(), /Content Generation/);
    browser.forward();
    assert.ok(browser.render().includes(`data-settings-section="${section}"`));
  });
}
