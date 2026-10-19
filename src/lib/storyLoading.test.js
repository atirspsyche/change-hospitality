import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../components/StoryLoadingScreen.astro", import.meta.url), "utf8");
const script = source.match(/<script is:inline data-astro-rerun>([\s\S]*?)<\/script>/)[1];

function setup({ ready = false, reducedMotion = false } = {}) {
  const root = {
    dataset: ready ? { homeStoryReady: "true" } : {},
    attributes: new Set(),
    setAttribute(name) { this.attributes.add(name); },
    removeAttribute(name) { this.attributes.delete(name); },
  };
  const content = {
    inert: false,
    attributes: new Set(),
    setAttribute(name) { this.attributes.add(name); },
    removeAttribute(name) { this.attributes.delete(name); },
  };
  const progress = {
    attributes: {},
    style: { setProperty(name, value) { this[name] = value; } },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const percent = { textContent: "" };
  const status = { textContent: "" };
  const screen = {
    hidden: false,
    classList: { add() {} },
    querySelector(selector) {
      return { "[data-loading-progress]": progress, "[data-loading-percent]": percent, "[data-loading-status]": status }[selector];
    },
  };
  let resolveFonts;
  const document = Object.assign(new EventTarget(), {
    documentElement: root,
    fonts: { ready: new Promise((resolve) => { resolveFonts = resolve; }) },
    querySelector(selector) {
      return { "[data-story-loading-screen]": screen, "[data-site-content]": content }[selector];
    },
  });
  const window = new EventTarget();
  const timers = new Map();
  let timerId = 0;
  const warnings = [];
  runInNewContext(script, {
    document, window, Event, AbortController,
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    console: { warn(message) { warnings.push(message); } },
  });
  const runTimer = (delay) => {
    const [id, timer] = [...timers].find(([, entry]) => entry.delay === delay) ?? [];
    assert.ok(timer, `Expected a ${delay}ms timer`);
    timers.delete(id);
    timer.callback();
  };
  return { root, content, progress, percent, status, screen, document, window, timers, warnings, resolveFonts, runTimer };
}

test("loading locks background controls, wheel, touch and scroll keys", () => {
  const state = setup();
  assert.ok(state.root.attributes.has("data-story-loading"));
  assert.equal(state.content.inert, true);
  assert.ok(state.content.attributes.has("aria-busy"));
  for (const type of ["wheel", "touchmove"]) {
    const event = new Event(type, { cancelable: true });
    state.window.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true, type);
  }
  const key = Object.assign(new Event("keydown", { cancelable: true }), { key: "PageDown" });
  state.window.dispatchEvent(key);
  assert.equal(key.defaultPrevented, true);
});

test("the progressbar reflects actual story progress and clamps its values", () => {
  const state = setup();
  for (const [value, expected] of [["43", "43"], ["120", "100"], ["-5", "0"], ["invalid", "0"]]) {
    state.root.dataset.homeStoryProgress = value;
    state.document.dispatchEvent(new Event("home-story-progress"));
    assert.equal(state.progress.attributes["aria-valuenow"], expected);
    assert.equal(state.progress.style["--loading-progress"], `${expected}%`);
    assert.equal(state.percent.textContent, `${expected}%`);
  }
});

test("the screen waits for both the story and fonts, then releases all locks", async () => {
  const state = setup();
  state.document.dispatchEvent(new Event("home-story-ready"));
  await Promise.resolve();
  assert.equal(state.content.inert, true);
  assert.equal([...state.timers.values()].some(({ delay }) => delay === 420), false);
  state.resolveFonts();
  await setImmediate();
  state.runTimer(420);
  assert.equal(state.screen.hidden, true);
  assert.equal(state.content.inert, false);
  assert.equal(state.root.attributes.has("data-story-loading"), false);
  assert.equal(state.timers.size, 0);
  const wheel = new Event("wheel", { cancelable: true });
  state.window.dispatchEvent(wheel);
  assert.equal(wheel.defaultPrevented, false);
});

test("reduced motion and an already-ready story do not impose an exit animation", async () => {
  const state = setup({ ready: true, reducedMotion: true });
  state.resolveFonts();
  await setImmediate();
  state.runTimer(0);
  assert.equal(state.content.inert, false);
});

test("a stalled load cancels animation work and releases into a readable fallback", () => {
  const state = setup();
  let cancelled = false;
  state.document.addEventListener("home-story-cancel", () => { cancelled = true; });
  state.runTimer(15000);
  assert.equal(cancelled, true);
  assert.equal(state.root.dataset.homeStoryFallback, "true");
  assert.equal(state.root.dataset.homeStoryReady, "true");
  assert.equal(state.content.inert, false);
  assert.equal(state.screen.hidden, true);
  assert.equal(state.warnings.length, 1);
  assert.equal(state.timers.size, 0);
});

test("navigation cancels pending release work without touching the next page", async () => {
  const state = setup();
  state.root.dataset.homeStoryProgress = "63";
  state.document.dispatchEvent(new Event("home-story-ready"));
  state.document.dispatchEvent(new Event("astro:before-swap"));
  state.resolveFonts();
  await setImmediate();
  assert.equal(state.timers.size, 0);
  assert.equal(state.content.inert, false);
  assert.deepEqual(state.root.dataset, {});
});

test("navigation clears completed and failed story state before a return visit", async () => {
  for (const fallback of [false, true]) {
    const state = setup({ ready: !fallback, reducedMotion: true });
    if (fallback) {
      state.runTimer(15000);
    } else {
      state.resolveFonts();
      await setImmediate();
      state.runTimer(0);
    }
    state.root.dataset.homeStoryProgress = "100";
    state.document.dispatchEvent(new Event("astro:before-swap"));
    assert.deepEqual(state.root.dataset, {});
  }
});
