import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("job titles use the full card content width at every breakpoint", async ({ page }, testInfo) => {
  await page.goto("/jobs/");
  await page.evaluate(() => document.fonts.ready);
  const viewports = testInfo.project.name === "mobile"
    ? [320, 390, 719]
    : [720, 768, 1024, 1280, 1440];

  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    const headings = page.locator("[data-job-card]:visible h3");
    expect(await headings.count()).toBeGreaterThan(0);
    const layouts = await headings.evaluateAll((elements) => elements.map((heading) => {
      const card = heading.closest("[data-job-card]");
      const style = getComputedStyle(card);
      const contentWidth = parseFloat(style.width) - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      return {
        title: heading.textContent,
        contentWidth,
        headingWidth: heading.getBoundingClientRect().width,
      };
    }));
    for (const layout of layouts) {
      expect(Math.abs(layout.headingWidth - layout.contentWidth), `${width}px: ${layout.title}`).toBeLessThan(1);
    }
  }
});

test("sample titles avoid unnecessary lines and long words still wrap", async ({ page }, testInfo) => {
  await page.goto("/jobs/");
  await page.evaluate(() => document.fonts.ready);
  const heading = page.locator("[data-job-card]:visible h3").first();
  const titles = ["[Test] Senior Sous Chef", "[Test] Private Members Club Manager"];
  for (const [index, title] of titles.entries()) {
    await heading.evaluate((element, text) => { element.textContent = text; }, title);
    const layout = await heading.evaluate((element) => ({
      lines: element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight),
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
    if (testInfo.project.name === "desktop") {
      expect(layout.lines).toBeCloseTo(index + 1, 1);
    }
  }

  await heading.evaluate((element) => { element.textContent = "Hospitality".repeat(20); });
  const layout = await heading.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(element).lineHeight),
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(layout.height).toBeGreaterThan(layout.lineHeight);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
});
