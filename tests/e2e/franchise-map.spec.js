import { expect, test } from "@playwright/test";
import { storyTimeline } from "../../src/lib/homeStoryTimeline.ts";

const beatWindow = storyTimeline.overlayWindows.find(({ id }) => id === "plate-center-next");
const beatProgress = (beatWindow.progressStart + beatWindow.progressEnd) / 2;
const officeNames = ["London", "Manchester", "Hampshire"];

async function showMapBeat(page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-home-story-ready", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-story-loading", "");
  await page.evaluate(({ progress, screens }) => {
    scrollTo({ top: innerHeight * screens * progress, behavior: "instant" });
  }, { progress: beatProgress, screens: storyTimeline.scrollScreens });
  const beat = page.locator('[data-story-overlay="plate-center-next"]');
  await expect(beat).toHaveCSS("opacity", "1");
  await expect(page.locator(".story-hero")).toHaveAttribute("data-story-frame", /^256(?:\.0+)?$/);
  return beat;
}

async function expectContained(locator, page) {
  const rect = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(rect).not.toBeNull();
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 1);
}

test("franchising pairs one CTA with the upright three-office map", async ({ page }, testInfo) => {
  const beat = await showMapBeat(page);
  await expect(beat.getByRole("heading", { level: 2 })).toHaveText("Build something of your own");
  await expect(beat.getByRole("link")).toHaveCount(1);
  await expect(beat.getByRole("link")).toHaveAttribute("href", "/franchising/");
  await expect(beat.getByRole("button")).toHaveCount(3);
  await expect(beat.locator("image")).toHaveAttribute("href", "/illustrations/map.webp");
  await expect(beat.locator("image")).toHaveAttribute("transform", "translate(813 -546) rotate(90)");
  await expect(beat.locator(".office-marker__hq")).toHaveText("Head office");
  const copy = await beat.locator(".story-copy").boundingBox();
  const map = await beat.locator("[data-franchise-map]").boundingBox();
  if (testInfo.project.name === "desktop") {
    expect(map.x).toBeGreaterThan(copy.x + copy.width);
    expect(copy.x + copy.width).toBeLessThan(page.viewportSize().width * 0.34);
    expect(map.x).toBeGreaterThan(page.viewportSize().width * 0.6);
  }
  else expect(map.y).toBeGreaterThan(copy.y + copy.height);
  await expectContained(beat.getByRole("link"), page);

  const ids = await page.locator(".office-marker__card").evaluateAll((cards) => cards.map(({ id }) => id));
  expect(new Set(ids).size).toBe(ids.length);
});

test("office cards toggle by keyboard or touch and dismiss with Escape or an outside click", async ({ page }) => {
  const beat = await showMapBeat(page);
  for (const name of officeNames) {
    const button = beat.getByRole("button", { name: new RegExp(`^${name}`) });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const card = beat.locator(".office-marker__card").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card).toHaveAttribute("aria-hidden", "false");
    await expect(card).toContainText("Office address to be confirmed");
    await expectContained(card, page);
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(card).toBeHidden();
    await expect(button).toBeFocused();
    await page.mouse.move(0, 0);
  }
  const london = beat.getByRole("button", { name: /^London/ });
  await london.focus();
  await page.keyboard.press("Enter");
  await expect(london).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(beat.getByRole("button", { name: /^Manchester/ })).toBeFocused();
  await expect(london).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Space");
  await expect(beat.getByRole("button", { name: /^Manchester/ })).toHaveAttribute("aria-expanded", "true");
  await beat.getByRole("heading", { level: 2 }).click();
  await expect(beat.locator('[aria-expanded="true"]')).toHaveCount(0);
});

test("hover previews remain open over the card and Escape dismisses without moving the pointer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Touch uses the click/tap popover instead of hover.");
  const beat = await showMapBeat(page);
  const london = beat.getByRole("button", { name: /^London/ });
  await london.hover();
  const card = beat.locator(".office-marker__card").filter({ has: page.getByRole("heading", { name: "London", exact: true }) });
  await expect(card).toHaveAttribute("aria-hidden", "false");
  await card.hover();
  await expect(card).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
  await page.mouse.move(0, 0);
  await london.hover();
  await expect(card).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(card).toBeHidden();
});

test("small, tablet and landscape layouts keep copy, markers and cards in the viewport", async ({ page }, testInfo) => {
  const viewports = testInfo.project.name === "mobile"
    ? [{ width: 320, height: 568 }, { width: 844, height: 390 }]
    : [{ width: 768, height: 1024 }, { width: 1024, height: 600 }, { width: 2560, height: 1440 }];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const beat = await showMapBeat(page);
    await expectContained(beat.locator(".story-copy"), page);
    await expectContained(beat.locator("[data-franchise-map]"), page);
    if (viewport.width >= 1024) {
      const copy = await beat.locator(".story-copy").boundingBox();
      const map = await beat.locator("[data-franchise-map]").boundingBox();
      expect(copy.x + copy.width).toBeLessThan(viewport.width * 0.34);
      expect(map.x).toBeGreaterThan(viewport.width * 0.6);
    }
    for (const name of officeNames) {
      const button = beat.getByRole("button", { name: new RegExp(`^${name}`) });
      await expectContained(button, page);
      await expectContained(button.locator(".office-marker__label"), page);
      await button.click();
      const card = beat.locator(".office-marker__card").filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(card).toHaveAttribute("aria-hidden", "false");
      await expectContained(card, page);
      await page.keyboard.press("Escape");
      await page.mouse.move(0, 0);
    }
  }
});

test("reduced motion retains an interactive map without the pinned story", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const map = page.locator(".story-reduced [data-franchise-map]");
  await map.scrollIntoViewIfNeeded();
  await expect(map).toBeVisible();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  const button = map.getByRole("button", { name: /^London/ });
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  expect(await map.locator(".office-marker__card").first().evaluate((element) =>
    parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.001);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the readable story lists all offices and honest address placeholders", async ({ page }) => {
    await page.goto("/");
    const map = page.locator(".story-reduced [data-franchise-map]");
    await map.scrollIntoViewIfNeeded();
    await expect(map).toBeVisible();
    await expect(map.locator(".franchise-map__directory li")).toHaveCount(3);
    await expect(map.locator(".franchise-map__directory")).toContainText("London (Head office)");
    for (const name of officeNames) await expect(map.locator(".franchise-map__directory")).toContainText(name);
    await expect(map.locator(".franchise-map__directory li")).toContainText([
      "Office address to be confirmed", "Office address to be confirmed", "Office address to be confirmed",
    ]);
  });
});
