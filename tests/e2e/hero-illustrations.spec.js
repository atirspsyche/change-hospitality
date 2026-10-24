import { expect, test } from "@playwright/test";

const illustrations = [
  { route: "/jobs/", kind: "chef", hero: ".jobs-hero" },
  { route: "/recruit-talent/", kind: "bart", hero: ".recruit-hero" },
  { route: "/team/", kind: "salt", hero: ".team-hero" },
  { route: "/sustainability-impact/", kind: "plant", hero: ".impact-hero" },
];

async function loadIllustration(page, illustration) {
  await page.goto(illustration.route);
  await page.evaluate(() => document.fonts.ready);
  const art = page.locator(`${illustration.hero} [data-hero-illustration]`);
  await expect(art).toHaveAttribute("data-hero-illustration", illustration.kind);
  await art.locator("img").evaluate((image) => image.decode());
  return art;
}

async function moveOverArtwork(art) {
  const bounds = await art.boundingBox();
  await art.hover({ position: { x: bounds.width * 0.7, y: bounds.height * 0.4 } });
}

for (const illustration of illustrations) {
  test(`${illustration.kind} artwork is correctly mapped and fits responsive heroes`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const art = await loadIllustration(page, illustration);
    await expect(art).toHaveAttribute("aria-hidden", "true");
    await expect(art.locator("img")).toHaveAttribute("alt", "");
    await expect(art.locator("img")).toHaveAttribute("src", `/illustrations/${illustration.kind}.webp`);
    const viewports = testInfo.project.name === "mobile"
      ? [[320, 568], [390, 844], [639, 900]]
      : [[768, 1024], [1024, 768], [1440, 900], [1920, 1080], [844, 390]];

    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await art.evaluate((root) => {
        const hero = root.closest("section");
        const bounds = hero.getBoundingClientRect();
        const artwork = root.querySelector(".illustration-crop").getBoundingClientRect();
        const title = hero.querySelector("h1").getBoundingClientRect();
        const overlapsTitle = artwork.left < title.right && artwork.right > title.left
          && artwork.top < title.bottom && artwork.bottom > title.top;
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          contained: artwork.left >= bounds.left - 1 && artwork.right <= bounds.right + 1
            && artwork.top >= bounds.top - 1 && artwork.bottom <= bounds.bottom + 1,
          substantial: artwork.width >= 80 && artwork.height >= 100,
          overlapsTitle,
          loaded: root.querySelector("img").naturalWidth === 1920,
        };
      });
      expect(layout, `${illustration.route} at ${width}x${height}`).toEqual({
        overflow: 0, contained: true, substantial: true, overlapsTitle: false, loaded: true,
      });
    }
  });
}

test("both sustainability plants use the supplied artwork", async ({ page }) => {
  await page.goto("/sustainability-impact/");
  const plants = page.locator(".impact-page [data-hero-illustration='plant']");
  await expect(plants).toHaveCount(2);
  await expect(plants.nth(1).locator("img")).toHaveAttribute("loading", "lazy");
  await expect(plants.nth(1).locator("img")).toHaveAttribute("src", "/illustrations/plant.webp");
});

test("desktop hover is subtle, eased and returns to rest on every hero", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Fine-pointer desktop interaction");
  for (const illustration of illustrations) {
    const art = await loadIllustration(page, illustration);
    await moveOverArtwork(art);
    await expect.poll(() => art.evaluate((root) => root.style.getPropertyValue("--illustration-x"))).not.toBe("");
    const motion = await art.evaluate((root) => ({
      x: Number.parseFloat(root.style.getPropertyValue("--illustration-x")),
      y: Number.parseFloat(root.style.getPropertyValue("--illustration-y")),
      rotation: Number.parseFloat(root.style.getPropertyValue("--illustration-rotation")),
      duration: getComputedStyle(root.querySelector(".illustration-scene")).transitionDuration,
    }));
    expect(Math.abs(motion.x)).toBeGreaterThan(0);
    expect(Math.abs(motion.x)).toBeLessThanOrEqual(4);
    expect(Math.abs(motion.y)).toBeLessThanOrEqual(3);
    expect(Math.abs(motion.rotation)).toBeLessThanOrEqual(1);
    expect(motion.duration).toBe("0.65s");
    await page.mouse.move(5, 5);
    await expect.poll(() => art.evaluate((root) => root.style.getPropertyValue("--illustration-x"))).toBe("");
    await expect.poll(() => art.locator(".illustration-scene").evaluate((scene) => getComputedStyle(scene).transform))
      .toBe("matrix(1, 0, 0, 1, 0, 0)");
  }
});

test("Team has standalone artwork and Jobs has a larger chef on a smooth clockwise oval", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const team = await loadIllustration(page, illustrations[2]);
  await expect(team.locator(".illustration-backdrop, .illustration-marks")).toHaveCount(0);
  const chef = await loadIllustration(page, illustrations[0]);
  const backdrop = chef.locator(".illustration-backdrop");
  await expect(backdrop).toHaveCSS("border-radius", "50%");
  const angle = await backdrop.evaluate((element) => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
  });
  expect(angle).toBeCloseTo(16, 1);
  if (testInfo.project.name === "desktop") {
    const crop = await chef.locator(".illustration-crop").boundingBox();
    expect(crop.width).toBeGreaterThan(490);
    expect(crop.width).toBeLessThan(520);
  }
});

test("hero corner shapes move gently and return to rest", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Fine-pointer desktop interaction");
  for (const illustration of illustrations.slice(0, 3)) {
    await loadIllustration(page, illustration);
    const hero = page.locator(illustration.hero);
    const shapes = hero.locator("[data-hero-shape]");
    await expect(shapes).toHaveCount(1);
    await expect(hero.locator("[data-pointer-motion-layer]")).toHaveCount(1);
    const rotations = await shapes.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).transform));
    const bounds = await hero.boundingBox();
    await hero.hover({ position: { x: bounds.width * 0.9, y: Math.min(bounds.height * 0.75, 800) } });
    await expect.poll(() => shapes.first().evaluate((element) => Math.abs(Number.parseFloat(element.style.getPropertyValue("--pointer-motion-x")))))
      .toBeGreaterThan(4);
    const offsets = await shapes.evaluateAll((elements) => elements.map((element) => {
      const css = getComputedStyle(element);
      const translate = css.translate.split(" ").map(Number.parseFloat);
      return {
        x: Number.parseFloat(css.getPropertyValue("--pointer-motion-x")),
        y: Number.parseFloat(css.getPropertyValue("--pointer-motion-y")),
        actualX: translate[0],
        actualY: translate[1] - (Number.parseFloat(css.getPropertyValue("--page-motion-y")) || 0),
        rotation: css.transform,
        direction: Number(element.dataset.heroShape),
      };
    }));
    for (const [index, offset] of offsets.entries()) {
      expect(offset.x * offset.direction).toBeGreaterThan(0);
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(6);
      expect(Math.abs(offset.y)).toBeLessThanOrEqual(4);
      expect(Math.abs(offset.actualX)).toBeLessThanOrEqual(6);
      expect(Math.abs(offset.actualY)).toBeLessThanOrEqual(4.01);
      expect(offset.rotation).toBe(rotations[index]);
    }
    await page.mouse.move(-10, -10);
    await expect.poll(() => shapes.evaluateAll((elements) => elements.every((element) => {
      const x = Number.parseFloat(element.style.getPropertyValue("--pointer-motion-x"));
      const y = Number.parseFloat(element.style.getPropertyValue("--pointer-motion-y"));
      return Math.abs(x) < 0.01 && Math.abs(y) < 0.01;
    }))).toBe(true);
  }
});

test("reduced motion and touch keep the artwork static", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const illustration of illustrations) {
    const art = await loadIllustration(page, illustration);
    await art.dispatchEvent("pointermove", { pointerType: "mouse", clientX: 500, clientY: 300 });
    await expect(art).not.toHaveAttribute("style", /--illustration-/);
    const scene = art.locator(".illustration-scene");
    expect(await scene.evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.001);
    await expect(scene).toHaveCSS("transform", "none");
    const hero = page.locator(illustration.hero);
    await hero.dispatchEvent("pointermove", { pointerType: "mouse", clientX: 500, clientY: 300 });
    await expect(hero.locator("[data-hero-shape][data-pointer-motion-layer]")).toHaveCount(0);
    await expect(hero.locator("[data-hero-shape][style*='--pointer-motion']")).toHaveCount(0);
    if (testInfo.project.name === "mobile") {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await art.dispatchEvent("pointermove", { pointerType: "touch", clientX: 100, clientY: 200 });
      await expect(art).not.toHaveAttribute("style", /--illustration-/);
      await expect(scene).toHaveCSS("transition-duration", "0s");
      await hero.dispatchEvent("pointermove", { pointerType: "touch", clientX: 100, clientY: 200 });
      await expect(hero.locator("[data-hero-shape][data-pointer-motion-layer]")).toHaveCount(0);
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
  }
});

test("changing motion preferences cleans up an active hover", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Fine-pointer desktop interaction");
  const art = await loadIllustration(page, illustrations[0]);
  await moveOverArtwork(art);
  await expect(art).toHaveAttribute("style", /--illustration-x/);
  await expect(page.locator(".jobs-hero [data-pointer-motion-layer]")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(art).not.toHaveAttribute("style", /--illustration-/);
  await expect(art.locator(".illustration-scene")).toHaveCSS("transform", "none");
  await expect(page.locator(".jobs-hero [data-pointer-motion-layer]")).toHaveCount(0);
  await expect(page.locator(".jobs-hero [data-hero-shape][style*='--pointer-motion']")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await moveOverArtwork(art);
  await expect(art).toHaveAttribute("style", /--illustration-x/);
  await expect(page.locator(".jobs-hero [data-pointer-motion-layer]")).toHaveCount(1);
});

test("artwork interaction reinitializes after Astro client navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Fine-pointer desktop interaction");
  await loadIllustration(page, illustrations[0]);
  await page.evaluate(() => { window.illustrationNavigationMarker = true; });
  for (const illustration of [...illustrations.slice(1), illustrations[0]]) {
    await page.locator(`[data-site-footer] .footer-page-links a[href="${illustration.route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${illustration.route}$`));
    const art = page.locator(`${illustration.hero} [data-hero-illustration]`);
    await expect(art).toHaveAttribute("data-hero-illustration", illustration.kind);
    expect(await page.evaluate(() => window.illustrationNavigationMarker)).toBe(true);
    await moveOverArtwork(art);
    await expect(art).toHaveAttribute("style", /--illustration-x/);
    if (illustration.kind !== "plant") {
      const shapes = page.locator(`${illustration.hero} [data-pointer-motion-layer]`);
      await expect(shapes).toHaveCount(1);
      await expect.poll(() => shapes.first().evaluate((element) => Math.abs(Number.parseFloat(element.style.getPropertyValue("--pointer-motion-x")))))
        .toBeGreaterThan(0.1);
    }
    await page.mouse.move(5, 5);
  }
});

test("all supplied illustrations remain visible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    for (const illustration of illustrations) {
      const art = await loadIllustration(page, illustration);
      await expect(art).toBeVisible();
      await expect(art.locator(".illustration-crop")).toBeVisible();
    }
  } finally {
    await context.close();
  }
});
