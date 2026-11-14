import { expect, test } from "@playwright/test";
import { homeStory } from "../../src/data/homeStory.ts";
import { mobileStoryTimeline, storyTimeline } from "../../src/lib/homeStoryTimeline.ts";

const offices = [
  { name: "London", address: "Arch 4, 1 Crucifix Lane, SE1 3JW", phone: "020 8050 6312" },
  { name: "Greater Manchester", address: "Neo Building, 9 Charlotte Street, M1 4ET", phone: "0161 399 8575" },
  { name: "Hampshire & Isle of Wight", address: "Cell 4, 194 Victory Gate Lodge, The Hard, Charles Dickens, Portsmouth, PO1 3PU", phone: "02393 553506" },
];
const officeNames = offices.map(({ name }) => name);

async function showMapBeat(page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-home-story-ready", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-story-loading", "");
  if (await page.locator(".story-hero").isHidden()) {
    return page.locator(".story-reduced .story-fallback-beat--locations");
  }
  const mobile = await page.locator(".story-hero").getAttribute("data-story-layout") === "mobile";
  const timeline = mobile ? mobileStoryTimeline : storyTimeline;
  const beatWindow = timeline.overlayWindows.find(({ id }) => id === "plate-center-next");
  const beatProgress = (beatWindow.progressStart + beatWindow.progressEnd) / 2;
  await page.evaluate(({ progress, screens }) => {
    const hero = document.querySelector(".story-hero");
    const spacer = hero.parentElement;
    const start = spacer.getBoundingClientRect().top + scrollY;
    const distance = Number.parseFloat(getComputedStyle(spacer).paddingBottom) || hero.clientHeight * screens;
    scrollTo({ top: start + distance * progress, behavior: "instant" });
  }, { progress: beatProgress, screens: timeline.scrollScreens });
  const chapter = page.locator(`${mobile ? ".story-mobile-overlays" : ".story-overlays"} [data-story-overlay="plate-center-next"]`);
  await expect(chapter).toHaveCSS("opacity", "1");
  await expect(page.locator(".story-hero")).toHaveAttribute("data-story-frame", homeStory.animation.plate.sourceFrame.toFixed(3));
  return mobile ? page.locator(".story-hero") : chapter;
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

async function expectEggOutlineAligned(egg) {
  const geometry = await egg.evaluate((element) => {
    const svg = element.querySelector("svg").getBoundingClientRect();
    const whitePath = element.querySelector(".office-marker__egg-white");
    const white = whitePath.getBoundingClientRect();
    const shape = whitePath.getBBox();
    const yolk = element.querySelector(".office-marker__egg-yolk");
    const outline = element.querySelector(".office-marker__egg-outline").getBoundingClientRect();
    const marker = element.getBoundingClientRect();
    return {
      svgWidth: svg.width,
      svgHeight: svg.height,
      markerWidth: marker.width,
      markerHeight: marker.height,
      whiteWidth: shape.width,
      whiteHeight: shape.height,
      yolkCenterOffset: Math.hypot(
        yolk.cx.baseVal.value - shape.x - shape.width / 2,
        yolk.cy.baseVal.value - shape.y - shape.height / 2,
      ),
      centerOffset: Math.hypot(
        outline.x + outline.width / 2 - white.x - white.width / 2,
        outline.y + outline.height / 2 - white.y - white.height / 2,
      ),
      horizontalGap: (outline.width - white.width) / 2,
      verticalGap: (outline.height - white.height) / 2,
    };
  });
  expect(geometry.svgWidth).toBeCloseTo(geometry.markerWidth, 1);
  expect(geometry.svgHeight).toBeCloseTo(geometry.markerHeight, 1);
  expect(geometry.whiteHeight).toBeGreaterThan(geometry.whiteWidth * 1.25);
  expect(geometry.yolkCenterOffset).toBeLessThan(0.1);
  expect(geometry.centerOffset).toBeLessThan(0.5);
  expect(geometry.horizontalGap).toBeGreaterThan(0.5);
  expect(geometry.horizontalGap).toBeLessThan(3);
  expect(geometry.verticalGap).toBeGreaterThan(0.5);
  expect(geometry.verticalGap).toBeLessThan(3);
}

test("franchising pairs one CTA with the upright three-office map", async ({ page }, testInfo) => {
  const beat = await showMapBeat(page);
  await expect(beat.getByRole("heading", { level: 2 })).toHaveText("Build your own recruitment business");
  await expect(beat.getByRole("link")).toHaveCount(1);
  await expect(beat.getByRole("link")).toHaveAttribute("href", "/franchising/");
  await expect(beat.getByRole("button")).toHaveCount(3);
  const mapElement = beat.locator("[data-franchise-map]:visible");
  await expect(mapElement.locator("image")).toHaveAttribute("href", "/illustrations/map.webp");
  await expect(mapElement.locator("image")).toHaveAttribute("transform", "translate(813 -546) rotate(90)");
  await expect(mapElement.locator(".office-marker__hq")).toHaveText("Head office");
  const copy = await beat.locator(".story-copy:visible, .story-mobile-lead:visible").boundingBox();
  const map = await mapElement.boundingBox();
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

test("halved egg markers have centered yolks and close, aligned borders at desktop and compact sizes", async ({ page }, testInfo) => {
  const beat = await showMapBeat(page);
  const map = beat.locator("[data-franchise-map]:visible");
  await expect(map.locator(".office-marker__egg")).toHaveCount(offices.length);
  for (const name of officeNames) {
    const button = map.getByRole("button", { name: new RegExp(`^${name}`) });
    const egg = button.locator(".office-marker__egg");
    const white = egg.locator(".office-marker__egg-white");
    const outline = egg.locator(".office-marker__egg-outline");
    await expect(outline).toHaveAttribute("d", await white.getAttribute("d"));
    await expect(outline).toHaveAttribute("pathLength", "1");
    await expect(outline).toHaveCSS("stroke-dashoffset", /^1(?:px)?$/);
    await expectEggOutlineAligned(egg);
    if (testInfo.project.name === "mobile") await button.tap();
    else await button.hover();
    await expect(outline).toHaveCSS("stroke-dashoffset", /^0(?:px)?$/);
    await expectEggOutlineAligned(egg);
    const target = await button.boundingBox();
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Escape");
    await page.mouse.move(0, 0);
    await expect(outline).toHaveCSS("stroke-dashoffset", /^1(?:px)?$/);
  }
});

test("office cards toggle by keyboard or touch and dismiss with Escape or an outside click", async ({ page }) => {
  const beat = await showMapBeat(page);
  for (const name of officeNames) {
    const button = beat.getByRole("button", { name: new RegExp(`^${name}`) });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const card = beat.locator(".office-marker__card").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card).toHaveAttribute("aria-hidden", "false");
    const office = offices.find((entry) => entry.name === name);
    await expect(card).toContainText(office.address);
    await expect(card.getByRole("link")).toHaveText(office.phone);
    await expect(card.getByRole("link")).toHaveAttribute("href", `tel:${office.phone.replace(/\s/g, "")}`);
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
  await expect(beat.getByRole("link", { name: /^Call London/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(beat.getByRole("button", { name: /^Greater Manchester/ })).toBeFocused();
  await expect(london).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Space");
  await expect(beat.getByRole("button", { name: /^Greater Manchester/ })).toHaveAttribute("aria-expanded", "true");
  const outside = await beat.getByRole("heading", { level: 2 }).boundingBox();
  await page.mouse.click(outside.x + outside.width / 2, outside.y + outside.height / 2);
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
    if (await page.locator(".story-hero").isHidden()) {
      await beat.locator("[data-franchise-map]").scrollIntoViewIfNeeded();
      await expect(beat.locator("[data-franchise-map]")).toBeVisible();
      await expect(beat.getByRole("button")).toHaveCount(3);
      continue;
    }
    await expectContained(beat.locator(".story-copy:visible, .story-mobile-lead:visible"), page);
    await expectContained(beat.locator("[data-franchise-map]:visible"), page);
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
  const durations = await map.locator(".office-marker__egg, .office-marker__egg-outline, .office-marker__card")
    .evaluateAll((elements) => elements.flatMap((element) =>
      getComputedStyle(element).transitionDuration.split(",").map(Number.parseFloat)));
  for (const duration of durations) expect(duration).toBeLessThanOrEqual(0.001);
  await expectEggOutlineAligned(button.locator(".office-marker__egg"));
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the readable story lists all offices, approved addresses and telephone links", async ({ page }) => {
    await page.goto("/");
    const map = page.locator(".story-reduced [data-franchise-map]");
    await map.scrollIntoViewIfNeeded();
    await expect(map).toBeVisible();
    await expect(map.locator(".franchise-map__directory li")).toHaveCount(3);
    await expect(map.locator(".franchise-map__directory")).toContainText("London (Head office)");
    for (const name of officeNames) await expect(map.locator(".franchise-map__directory")).toContainText(name);
    await expect(map.locator(".franchise-map__directory li")).toContainText(offices.map(({ address }) => address));
    await expect(map.locator(".franchise-map__directory a")).toHaveText(offices.map(({ phone }) => phone));
  });
});
