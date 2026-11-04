import { expect, test } from "@playwright/test";

const photoSelector = "[data-gallery-photo]";
const liveImages = `${photoSelector} > img`;

async function scrollTo(page, top) {
  await page.evaluate((position) => window.scrollTo({ top: position, behavior: "instant" }), top);
}

async function expectLoaded(image) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
}

test("jobs arrival and mode switching download no gallery photos or Sanity images", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") requests.push(request.url());
  });
  await page.goto("/jobs/");
  await expect(page.locator("[data-jobs-mode-switch]")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(photoSelector)).toHaveCount(6);
  await expect(page.locator("#gallery-title")).toHaveText("Where your next shift could take you");
  await expect(page.locator(".storyboard-gallery-copy header p")).toHaveText("People behind great hospitality");
  await expect(page.locator(".storyboard-gallery-intro")).toHaveText(
    "Iconic London venues, stadiums, theatres, festivals and private dining rooms: a few frames of our people behind some of the best service in the country.",
  );
  expect(await page.locator("template[data-gallery-image]").evaluateAll((templates) =>
    templates.map((template) => template.content.querySelector("img").alt))).toEqual([
    "change hospitality waitress serving at wedding",
    "front of house team behind the bar at Wimbledon games",
    "change hospitality bartender mixing drinks at Bacardi arena at Wireless festival",
    "reception staff at social pantry event",
    "waitress pouring drinks at private members club",
    "chef and waiting staff for christmas at claridges",
  ]);
  const sources = await page.locator("template[data-gallery-image]").evaluateAll((templates) =>
    templates.flatMap((template) => {
      const image = template.content.querySelector("img");
      return [new URL(image.getAttribute("src"), location.href).href, ...image.srcset.split(", ").map((source) => new URL(source.split(" ")[0], location.href).href)];
    }),
  );
  expect(sources.length).toBeGreaterThan(6);
  for (const source of sources) expect(new URL(source).origin).toBe(new URL(page.url()).origin);

  for (const mode of ["permanent", "temporary"]) {
    if (mode === "temporary") {
      await page.locator('[data-jobs-mode-switch] label:has(input[value="temporary"])').click();
    }
    await page.waitForLoadState("networkidle");
    await expect(page.locator(liveImages)).toHaveCount(0);
    expect(requests.filter((url) => sources.includes(url))).toEqual([]);
    expect(requests.filter((url) => new URL(url).hostname === "cdn.sanity.io")).toEqual([]);
  }
  await expect(page.locator("#gallery")).not.toContainText(/placeholder|coming soon|photo preview/i);
});

test("desktop stack downloads the first pair, then only the current and next photos", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop-only photo stack.");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/jobs/");
  const gallery = page.locator("#gallery");
  await expect(gallery).toHaveClass(/is-stacked/);
  const start = await gallery.evaluate((section) => section.getBoundingClientRect().top + window.scrollY);
  await scrollTo(page, start - 100);
  await expect(page.locator(liveImages)).toHaveCount(2);
  await expectLoaded(page.locator(liveImages).first());
  expect(await page.locator(`${photoSelector}:nth-child(3) > img`).count()).toBe(0);

  const distance = await page.evaluate(() => innerHeight * (6 * 0.6 + 0.5));
  await scrollTo(page, start + distance * 0.25);
  await expect(page.locator(liveImages)).toHaveCount(4);
  await expectLoaded(page.locator(`${photoSelector}:nth-child(3) > img`));
  await expect(page.locator(`${photoSelector}:nth-child(5) > img`)).toHaveCount(0);
  await scrollTo(page, start + distance);
  await expect(page.locator(liveImages)).toHaveCount(6);
  await expectLoaded(page.locator(liveImages).last());

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(gallery).not.toHaveClass(/is-stacked/);
  await expect(gallery.locator(".pin-spacer")).toHaveCount(0);
  await expect(page.locator(liveImages).last()).toHaveCSS("transform", "none");
  expect(errors).toEqual([]);
});

test("a direct gallery link initializes nearby photos without a scroll gesture", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/jobs/#gallery");
  await expectLoaded(page.locator(`${photoSelector}:first-child > img`));
  if (testInfo.project.name === "desktop") {
    await expect(page.locator(liveImages)).toHaveCount(2);
    await expect(page.locator("template[data-gallery-image]")).toHaveCount(4);
  }
  expect(errors).toEqual([]);
});

test("mobile and reduced-motion grids defer distant cards and preserve image layout", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/jobs/");
  const gallery = page.locator("#gallery");
  await expect(gallery).not.toHaveClass(/is-stacked/);
  await expect(page.locator(liveImages)).toHaveCount(0);
  const photos = page.locator(photoSelector);
  await photos.first().scrollIntoViewIfNeeded();
  await expectLoaded(photos.first().locator(":scope > img"));
  expect(await page.locator(liveImages).count()).toBeLessThan(6);
  await expect(photos.last().locator(":scope > img")).toHaveCount(0);
  const bounds = await photos.first().boundingBox();
  expect(bounds.width / bounds.height).toBeCloseTo(4 / 3, 1);
  await photos.last().scrollIntoViewIfNeeded();
  await expectLoaded(photos.last().locator(":scope > img"));
  await expect(photos.last().locator(":scope > img")).toHaveAttribute("fetchpriority", "low");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test("printing loads all deferred images and failed images show an explicit explanation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/jobs/");
  const sources = await page.locator("template[data-gallery-image]").evaluateAll((templates) =>
    templates.flatMap((template) => template.content.querySelector("img").srcset.split(", ")
      .map((source) => new URL(source.split(" ")[0], location.href).href)),
  );
  await page.route((url) => sources.includes(url.href), (route) => route.abort("failed"));
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(page.locator(liveImages)).toHaveCount(6);
  await expect(page.locator("[data-gallery-error]").first()).toBeVisible();
  await expect(page.locator("[data-gallery-error]").first()).toHaveText(/could not be loaded/);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("six descriptive candidate images remain available with native lazy loading", async ({ page }) => {
    await page.goto("/jobs/");
    const images = page.locator(`${photoSelector} noscript img`);
    await expect(images).toHaveCount(6);
    for (const image of await images.all()) {
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(image).toHaveAttribute("alt", /\S.+/);
    }
    await expect(page.locator("#gallery")).not.toHaveClass(/is-stacked/);
    await images.last().scrollIntoViewIfNeeded();
    await expectLoaded(images.last());
  });
});
