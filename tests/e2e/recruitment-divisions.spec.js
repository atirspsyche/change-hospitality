import { expect, test } from "@playwright/test";

const names = ["Front of House", "Back of House", "Events & Commercial"];
const photos = [
  "/recruit-talent-images/foh.png",
  "/recruit-talent-images/boh2.png",
  "/recruit-talent-images/event2.png",
];

async function openDivisions(page, reducedMotion = "no-preference") {
  await page.emulateMedia({ reducedMotion });
  await page.goto("/recruit-talent/");
  const section = page.locator("[data-division-flow]");
  await expect(section).toHaveAttribute("data-ready", "true");
  await page.mouse.move(0, 0);
  await section.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "start" }));
  await expect(section).toHaveClass(/is-visible/);
  await page.evaluate(() => document.fonts.ready);
  return section.locator("[data-division-item]");
}

function widthsFor(testInfo) {
  return testInfo.project.name === "mobile" ? [320, 390, 639] : [640, 768, 1024, 1440, 1920];
}

test("division headings stay static with one left-side photo at every breakpoint", async ({ page }, testInfo) => {
  const items = await openDivisions(page);
  await expect(items).toHaveCount(3);
  await expect(page.locator(".division-flow-marquee, .division-flow-track, .division-flow-track-group")).toHaveCount(0);

  for (const [index, name] of names.entries()) {
    const item = items.nth(index);
    await expect(item.getByRole("heading", { name, exact: true, level: 3 })).toHaveCount(1);
    await expect(item.getByRole("button", { name, exact: true })).toHaveCount(1);
    await expect(item.locator(".division-flow-name")).toHaveText(name);
    await expect(item.locator(".division-flow-image")).toHaveCount(1);
    await expect(item.locator(".division-flow-image")).toHaveAttribute("src", photos[index]);
    await item.locator(".division-flow-image").evaluateAll(async (images) => {
      for (const image of images) image.loading = "eager";
      await Promise.all(images.map((image) => image.decode()));
    });
  }

  for (const width of widthsFor(testInfo)) {
    await page.setViewportSize({ width, height: 900 });
    const rows = await items.evaluateAll((elements) => elements.map((element) => {
      const heading = element.querySelector(".division-flow-name");
      const title = heading.getBoundingClientRect();
      const images = [...element.querySelectorAll(".division-flow-image")];
      const left = images[0].getBoundingClientRect();
      const trigger = element.querySelector("[data-division-trigger]").getBoundingClientRect();
      return {
        leftImageRight: left.right,
        titleLeft: title.left,
        contained: left.left >= trigger.left && left.right <= trigger.right,
        textOverflow: heading.scrollWidth - heading.clientWidth,
        animation: getComputedStyle(heading).animationName,
        transform: getComputedStyle(heading).transform,
        loaded: images.every((image) => image.naturalWidth > 0 && image.alt === ""),
        infiniteAnimations: element.querySelector(".division-flow-title").getAnimations({ subtree: true })
          .filter((animation) => animation.effect.getTiming().iterations === Infinity).length,
      };
    }));
    for (const row of rows) {
      expect(row.leftImageRight, `${width}px: left photo`).toBeLessThanOrEqual(row.titleLeft);
      expect(row.contained, `${width}px: photo stays in the row`).toBe(true);
      expect(row.textOverflow, `${width}px: complete division name`).toBeLessThanOrEqual(1);
      expect(row.animation).toBe("none");
      expect(row.transform).toBe("none");
      expect(row.loaded).toBe(true);
      expect(row.infiniteAnimations).toBe(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
});

test("division descriptions are larger and align with stationary headings when expanded by keyboard", async ({ page }, testInfo) => {
  const items = await openDivisions(page, "reduce");

  for (const width of widthsFor(testInfo)) {
    await page.setViewportSize({ width, height: 900 });
    for (const [index, name] of names.entries()) {
      const item = items.nth(index);
      const trigger = item.getByRole("button", { name, exact: true });
      const heading = item.locator(".division-flow-name");
      const before = await heading.boundingBox();
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(item.locator(".division-flow-panel")).toHaveAttribute("aria-hidden", "false");
      await expect(heading).toBeVisible();

      const layout = await item.evaluate((element) => {
        const heading = element.querySelector(".division-flow-name").getBoundingClientRect();
        const description = element.querySelector(".division-flow-copy > p");
        const panel = getComputedStyle(element.querySelector(".division-flow-panel-inner"));
        return {
          headingLeft: heading.left,
          descriptionLeft: description.getBoundingClientRect().left,
          fontSize: Number.parseFloat(getComputedStyle(description).fontSize),
          paddingTop: Number.parseFloat(panel.paddingTop),
          paddingBottom: Number.parseFloat(panel.paddingBottom),
        };
      });
      expect(layout.headingLeft, `${width}px: heading does not move`).toBeCloseTo(before.x, 1);
      expect(layout.descriptionLeft, `${width}px: description alignment`).toBeCloseTo(layout.headingLeft, 1);
      expect(layout.fontSize).toBeGreaterThanOrEqual(width >= 1024 ? 24 : 20);
      expect(layout.paddingTop).toBeGreaterThanOrEqual(40);
      expect(layout.paddingBottom).toBeGreaterThanOrEqual(48);
      await expect(item.locator(".division-flow-image")).toHaveCount(1);
      await expect(item.locator(".division-flow-panel ul li")).not.toHaveCount(0);

      await page.keyboard.press("Space");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(item.locator(".division-flow-panel")).toHaveAttribute("aria-hidden", "true");
      expect((await heading.boundingBox()).x).toBeCloseTo(before.x, 1);
    }
  }
});

test("division accordions open only on activation, close from the cross and keep one panel open", async ({ page }, testInfo) => {
  const items = await openDivisions(page);
  const first = items.nth(0).locator("[data-division-trigger]");
  const second = items.nth(1).locator("[data-division-trigger]");
  const third = items.nth(2).locator("[data-division-trigger]");
  const title = items.nth(0).locator(".division-flow-title");
  await expect(title).toHaveCSS("transition-property", "background-color, color");
  await expect(title).toHaveCSS("transition-duration", "0.5s, 0.5s");

  if (testInfo.project.name === "desktop") {
    await first.hover();
    await expect(first).toHaveAttribute("aria-expanded", "false");
  }
  await first.focus();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await first.locator(".division-flow-action").click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(items.nth(0).locator(".division-flow-panel")).toHaveAttribute("aria-hidden", "true");

  await first.click();
  await second.click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(second).toHaveAttribute("aria-expanded", "true");
  await expect(items.nth(1).locator(".division-flow-panel")).toHaveAttribute("aria-hidden", "false");
  await page.mouse.move(0, 0);
  await third.focus();
  await expect(second).toHaveAttribute("aria-expanded", "true");
  await expect(third).toHaveAttribute("aria-expanded", "false");
  if (testInfo.project.name === "desktop") {
    await third.hover();
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(third).toHaveAttribute("aria-expanded", "false");
  }
  await page.keyboard.press("Enter");
  await expect(second).toHaveAttribute("aria-expanded", "false");
  await expect(third).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(third).toHaveAttribute("aria-expanded", "false");
});
