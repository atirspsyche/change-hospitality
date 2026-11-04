import { expect, test } from "@playwright/test";

async function expectStableToggle(trigger, input = "pointer") {
  await trigger.evaluate((element) => {
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 180, behavior: "instant" });
  });
  await expect(trigger).toBeInViewport({ ratio: 1 });

  const observation = await trigger.evaluateHandle((element) => {
    const initialY = window.scrollY;
    return {
      finished: new Promise((resolve) => {
        element.addEventListener("click", () => {
          const positions = [window.scrollY];
          const start = performance.now();
          const sample = (now) => {
            positions.push(window.scrollY);
            if (now - start >= 750) {
              resolve({ initialY, minY: Math.min(...positions), maxY: Math.max(...positions) });
            } else {
              requestAnimationFrame(sample);
            }
          };
          requestAnimationFrame(sample);
        }, { once: true });
      }),
    };
  });

  try {
    if (input === "keyboard") await trigger.press("Enter");
    else await trigger.click();
    const { initialY, minY, maxY } = await observation.evaluate((result) => result.finished);
    expect(initialY).toBeGreaterThan(200);
    expect(minY).toBeGreaterThanOrEqual(initialY - 2);
    expect(maxY).toBeLessThanOrEqual(initialY + 2);
  } finally {
    await observation.dispose();
  }
}

for (const viaHome of [false, true]) {
  test(`temporary FAQs preserve scroll after ${viaHome ? "homepage navigation" : "a direct visit"}`, async ({ page }) => {
    if (viaHome) {
      await page.goto("/");
      await expect(page.locator("html")).not.toHaveAttribute("data-story-loading");
      const timeOrigin = await page.evaluate(() => performance.timeOrigin);
      await page.locator("[data-funmenu-toggle]").click();
      await page.locator("[data-funmenu-overlay]").getByRole("link", { name: /Jobs/ }).click();
      await expect(page).toHaveURL(/\/jobs\/$/);
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
    } else {
      await page.goto("/jobs/");
    }

    await expect(page.locator("[data-jobs-mode-switch]")).toHaveAttribute("data-ready", "true");
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("radio", { name: "Temporary", exact: true }).check();
    await expect(page.locator("#temporary-work-title")).toBeFocused();
    await expect(page.locator("html")).toHaveClass(/\blenis\b/);
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");

    const first = page.locator(".temp-faq").first();
    await expectStableToggle(first.locator("summary"));
    await expect(first).toHaveJSProperty("open", true);
    await expectStableToggle(first.locator("summary"), "keyboard");
    await expect(first).toHaveJSProperty("open", false);

    const last = page.locator(".temp-faq").last();
    await expectStableToggle(last.locator("summary"));
    await expect(last).toHaveJSProperty("open", true);
  });
}

test("recruiter divisions and FAQs preserve scroll with motion enabled", async ({ page }) => {
  await page.goto("/recruit-talent/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await page.mouse.move(0, 0);

  const division = page.locator("[data-division-trigger]").first();
  await expectStableToggle(division, "keyboard");
  await expect(division).toHaveAttribute("aria-expanded", "true");
  await expectStableToggle(division, "keyboard");
  await expect(division).toHaveAttribute("aria-expanded", "false");

  const faq = page.locator("#recruitment-faqs details").first();
  await expectStableToggle(faq.locator("summary"));
  await expect(faq).toHaveJSProperty("open", true);
  await expectStableToggle(faq.locator("summary"));
  await expect(faq).toHaveJSProperty("open", false);
});

test("reduced motion retains native disclosures without Lenis", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/recruit-talent/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  const faq = page.locator("#recruitment-faqs details").first();
  await expectStableToggle(faq.locator("summary"), "keyboard");
  await expect(faq).toHaveJSProperty("open", true);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("native disclosures retain the default scroll behavior", async ({ page }) => {
    await page.goto("/recruit-talent/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
    const faq = page.locator("#recruitment-faqs details").first();
    await faq.locator("summary").evaluate((element) => {
      window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 180, behavior: "instant" });
    });
    const initialY = await page.evaluate(() => window.scrollY);
    await faq.locator("summary").click();
    await expect(faq).toHaveJSProperty("open", true);
    await expect.poll(() => page.evaluate((y) => Math.abs(window.scrollY - y), initialY)).toBeLessThanOrEqual(2);
  });
});
