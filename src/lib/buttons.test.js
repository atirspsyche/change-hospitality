import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArrowDown, ArrowRight } from "lucide-react";
import { createServer } from "vite";

let server;
let PrimaryButton;
let SecondaryButton;

before(async () => {
  server = await createServer({
    configFile: false,
    cacheDir: fileURLToPath(new URL("../../node_modules/.vite-buttons", import.meta.url)),
    esbuild: { jsx: "automatic" },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  ({ PrimaryButton, SecondaryButton } = await server.ssrLoadModule("/src/components/Button.tsx"));
});

after(async () => {
  await server?.close();
});

const render = (Component, props = {}) =>
  renderToStaticMarkup(createElement(Component, { children: "Find work", ...props }));

test("primary buttons retain the original hero colours, shadow and decorative Lucide arrow", () => {
  const html = render(PrimaryButton);
  assert.match(html, /^<button\b/);
  assert.match(html, /type="button"/);
  assert.match(html, /data-button-variant="primary"/);
  assert.match(html, /data-button-shadow="true"/);
  assert.match(html, /--button-background:var\(--color-cream\)/);
  assert.match(html, /--button-hover-background:var\(--color-blush\)/);
  assert.match(html, /--button-border:var\(--color-ink\)/);
  assert.match(html, /data-button-label="true"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /lucide-arrow-up-right/);
  assert.match(html, /focusable="false"/);
});

test("links preserve native navigation, accessibility and page behavior hooks", () => {
  const html = render(PrimaryButton, {
    href: "/jobs/",
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": "Find hospitality work",
    "data-story-reveal": true,
    "data-astro-prefetch": "hover",
    className: "page-placement",
    shadow: false,
  });
  assert.match(html, /^<a\b/);
  assert.match(html, /href="\/jobs\/"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /aria-label="Find hospitality work"/);
  assert.match(html, /data-story-reveal="true"/);
  assert.match(html, /data-astro-prefetch="hover"/);
  assert.match(html, /class="[^"]* page-placement"/);
  assert.match(html, /data-button-shadow="false"/);
  assert.doesNotMatch(html, /type="button"/);
});

test("native form buttons preserve submit, disabled and busy states", () => {
  const html = render(PrimaryButton, {
    type: "submit",
    disabled: true,
    form: "application",
    name: "action",
    value: "apply",
    "aria-busy": true,
    "data-temp-submit": true,
    children: "Sending...",
  });
  for (const attribute of [
    'type="submit"', 'disabled=""', 'form="application"',
    'name="action"', 'value="apply"', 'aria-busy="true"', 'data-temp-submit="true"',
  ]) assert.ok(html.includes(attribute), attribute);
  assert.match(html, />Sending\.\.\.</);
});

test("story actions preserve the letter anchor, downward icon and hidden read control", () => {
  const link = render(PrimaryButton, {
    href: "#story-letter",
    "data-start-letter": true,
    icon: ArrowDown,
    children: "A letter from Jim",
  });
  assert.match(link, /^<a\b/);
  assert.match(link, /href="#story-letter"/);
  assert.match(link, /data-start-letter="true"/);
  assert.match(link, /lucide-arrow-down/);

  const button = render(PrimaryButton, {
    hidden: true,
    "data-read-letter": true,
    children: "Read full letter",
  });
  assert.match(button, /^<button\b/);
  assert.match(button, /type="button"/);
  assert.match(button, /hidden=""/);
  assert.match(button, /data-read-letter="true"/);
});

test("face, hover, text and border colours and the Lucide icon are configurable", () => {
  const html = render(PrimaryButton, {
    backgroundColor: "var(--color-cocoa)",
    hoverBackgroundColor: "var(--color-citron)",
    textColor: "var(--color-cream)",
    hoverTextColor: "var(--color-cocoa)",
    borderColor: "var(--color-cocoa)",
    icon: ArrowRight,
    style: { marginTop: "2rem" },
  });
  for (const declaration of [
    "--button-background:var(--color-cocoa)",
    "--button-hover-background:var(--color-citron)",
    "--button-text:var(--color-cream)",
    "--button-hover-text:var(--color-cocoa)",
    "--button-border:var(--color-cocoa)",
    "margin-top:2rem",
  ]) assert.ok(html.includes(declaration), declaration);
  assert.match(html, /lucide-arrow-right/);
  assert.doesNotMatch(html, /lucide-arrow-up-right/);
});

test("secondary buttons are transparent and shadowless by default with configurable hover fill", () => {
  const html = render(SecondaryButton, {
    hoverBackgroundColor: "var(--color-citron)",
    icon: null,
  });
  assert.match(html, /data-button-variant="secondary"/);
  assert.match(html, /--button-background:transparent/);
  assert.match(html, /--button-hover-background:var\(--color-citron\)/);
  assert.match(html, /data-button-shadow="false"/);
  assert.doesNotMatch(html, /<svg|aria-hidden/);
});

test("secondary links support the optional raised shadow without losing their outline variant", () => {
  const html = render(SecondaryButton, { href: "#profiles", shadow: true });
  assert.match(html, /^<a\b/);
  assert.match(html, /href="#profiles"/);
  assert.match(html, /data-button-variant="secondary"/);
  assert.match(html, /--button-background:transparent/);
  assert.match(html, /data-button-shadow="true"/);
});
