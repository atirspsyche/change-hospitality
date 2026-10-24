import { expect, test } from "@playwright/test";

async function openLogos(page, reducedMotion = "no-preference") {
  await page.emulateMedia({ reducedMotion });
  await page.goto("/recruit-talent/");
  const marquee = page.locator("[data-client-marquee]");
  await expect(marquee).toBeVisible();
  await expect(page.locator("[data-division-flow]")).toHaveAttribute("data-ready", "true");
  await marquee.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "center" }));
  return marquee;
}

test("every optimised logo preserves the source artwork and fits its own cell at all breakpoints", async ({ page }, testInfo) => {
  const marquee = await openLogos(page, "reduce");
  const group = marquee.locator(".division-client-group").first();
  const logos = await group.locator("img").evaluateAll(async (images) => {
    for (const image of images) image.loading = "eager";
    await Promise.all(images.map((image) => image.decode()));
    return images.map((image) => ({
      src: image.getAttribute("src"),
      width: image.width,
      height: image.height,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      alt: image.alt,
    }));
  });
  expect(logos.length).toBeGreaterThan(0);
  for (const logo of logos) {
    const url = new URL(logo.src, page.url());
    const source = url.searchParams.get("href");
    const dimensions = source?.match(/-(\d+)x(\d+)\./);
    expect(dimensions, `Sanity source dimensions for ${logo.src}`).not.toBeNull();
    const [, width, height] = dimensions.map(Number);
    const targetWidth = Math.min(400, width);
    const targetHeight = Math.max(1, Math.round(height * targetWidth / width));
    expect(Number(url.searchParams.get("w"))).toBe(targetWidth);
    expect(Number(url.searchParams.get("h"))).toBe(targetHeight);
    expect(url.searchParams.get("fit")).toBe("contain");
    expect(Math.abs(logo.naturalWidth - targetWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(logo.naturalHeight - targetHeight)).toBeLessThanOrEqual(1);
    expect(logo.alt).toBe("");
  }

  const viewports = testInfo.project.name === "mobile"
    ? [[320, 568], [390, 844], [639, 900], [844, 390]]
    : [[768, 1024], [1024, 768], [1440, 900], [1920, 1080], [2560, 1440]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    const layout = await group.locator("img").evaluateAll((images) => images.map((image) => {
      const cell = image.parentElement.getBoundingClientRect();
      const bounds = image.getBoundingClientRect();
      return {
        fit: getComputedStyle(image).objectFit,
        contained: bounds.left >= cell.left - 1 && bounds.right <= cell.right + 1
          && bounds.top >= cell.top - 1 && bounds.bottom <= cell.bottom + 1,
        cellWidth: cell.width,
        cellHeight: cell.height,
      };
    }));
    for (const logo of layout) {
      expect(logo, `${width}x${height}`).toEqual({ fit: "contain", contained: true, cellWidth: 160, cellHeight: 128 });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
});

test("the loop is seamless and respects visibility, manual pause, hover and keyboard focus", async ({ page }, testInfo) => {
  const marquee = await openLogos(page);
  const track = marquee.locator(".division-client-track");
  const button = page.locator("[data-logo-pause]");
  await expect(button).toHaveAttribute("aria-label", "Pause client logos");
  await page.mouse.move(0, 0);
  await expect(marquee).toHaveAttribute("data-in-view", "true");
  await expect(track).toHaveCSS("animation-play-state", "running");

  const loop = await track.evaluate((element) => {
    const [first, second] = element.children;
    const animation = element.getAnimations()[0];
    const duration = Number(animation.effect.getTiming().duration);
    animation.pause();
    animation.currentTime = 0;
    const start = first.getBoundingClientRect().left;
    animation.currentTime = duration - 0.01;
    const end = second.getBoundingClientRect().left;
    const result = {
      firstWidth: first.getBoundingClientRect().width,
      secondWidth: second.getBoundingClientRect().width,
      trackWidth: element.getBoundingClientRect().width,
      seamOffset: Math.abs(end - start),
      sourcesMatch: Array.from(first.querySelectorAll("img")).every((image, index) =>
        image.getAttribute("src") === second.querySelectorAll("img")[index].getAttribute("src")),
    };
    animation.currentTime = 0;
    animation.play();
    return result;
  });
  expect(loop.firstWidth).toBe(loop.secondWidth);
  expect(loop.trackWidth).toBe(loop.firstWidth * 2);
  expect(loop.seamOffset).toBeLessThan(1);
  expect(loop.sourcesMatch).toBe(true);
  await expect(marquee.locator(".division-client-group")).toHaveCount(2);
  await expect(marquee.locator(".division-client-group").first()).toHaveAttribute("aria-hidden", "true");

  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-label", "Resume client logos");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(track).toHaveCSS("animation-play-state", "paused");
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(track).toHaveCSS("animation-play-state", "running");
  await page.keyboard.press("Tab");
  await expect(marquee).toBeFocused();
  await expect(track).toHaveCSS("animation-play-state", "paused");
  await marquee.evaluate((element) => element.blur());
  if (testInfo.project.name === "desktop") {
    await marquee.hover();
    await expect(track).toHaveCSS("animation-play-state", "paused");
    await page.mouse.move(0, 0);
    await expect(track).toHaveCSS("animation-play-state", "running");
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(marquee).toHaveAttribute("data-in-view", "false");
  await expect(track).toHaveCSS("animation-play-state", "paused");
  await marquee.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "center" }));
  await expect(marquee).toHaveAttribute("data-in-view", "true");
  await expect(track).toHaveCSS("animation-play-state", "running");
});

test("reduced motion stops the animation and allows the complete list to be scrolled", async ({ page }) => {
  const marquee = await openLogos(page, "reduce");
  await expect(marquee.locator(".division-client-track")).toHaveCSS("animation-name", "none");
  await expect(marquee).toHaveCSS("overflow-x", "auto");
  await expect(page.locator("[data-logo-pause]")).toBeHidden();
  await expect(marquee.locator(".division-client-group").nth(1)).toBeHidden();
  await marquee.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => marquee.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const end = await marquee.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    const last = element.querySelector(".division-client-group").lastElementChild.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    return { left: last.left, right: last.right, viewportLeft: bounds.left, viewportRight: bounds.right };
  });
  expect(end.left).toBeGreaterThanOrEqual(end.viewportLeft);
  expect(end.right).toBeLessThanOrEqual(end.viewportRight);
});
