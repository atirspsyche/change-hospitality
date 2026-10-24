import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/jobs/");
  await expect(page.locator("[data-jobs-mode-switch]")).toHaveAttribute("data-ready", "true");
});

test("job modes keep native radio selection, keyboard access and the matching content", async ({ page }) => {
  const group = page.getByRole("group", { name: "What kind of work suits you?" });
  const permanent = group.getByRole("radio", { name: "Permanent", exact: true });
  const temporary = group.getByRole("radio", { name: "Temporary", exact: true });
  const permanentPanel = page.locator('[data-jobs-mode-panel="permanent"]');
  const temporaryPanel = page.locator('[data-jobs-mode-panel="temporary"]');

  await expect(permanent).toBeChecked();
  await expect(permanentPanel).toBeVisible();
  await expect(temporaryPanel).toBeHidden();
  await group.locator('label:has(input[value="temporary"])').click();
  await expect(temporary).toBeChecked();
  await expect(permanent).not.toBeChecked();
  await expect(temporaryPanel).toBeVisible();
  await expect(permanentPanel).toBeHidden();

  await temporary.focus();
  await temporary.press("ArrowLeft");
  await expect(permanent).toBeFocused();
  await expect(permanent).toBeChecked();
  await expect(permanent.locator("+ .jobs-mode-choice")).toHaveCSS("outline-style", "solid");
  await expect(permanentPanel).toBeVisible();
  await expect(temporaryPanel).toBeHidden();
});

test("job mode choices use the footer palette, readable states and responsive touch targets", async ({ page }, testInfo) => {
  await page.evaluate(() => document.fonts.ready);
  const choices = page.locator(".jobs-mode-choice");
  const selected = choices.first();
  const unselected = choices.last();
  const palette = await page.locator("[data-site-footer]").evaluate((footer) => {
    const css = getComputedStyle(footer);
    const swatch = document.createElement("span");
    footer.append(swatch);
    swatch.style.color = "var(--color-cream)";
    const cream = getComputedStyle(swatch).color;
    swatch.remove();
    return { accent: css.backgroundColor, text: css.color, cream };
  });
  await expect(selected).toHaveCSS("background-color", palette.accent);
  await expect(unselected).toHaveCSS("background-color", palette.cream);
  for (const choice of [selected, unselected]) {
    await expect(choice).toHaveCSS("color", palette.text);
    const transitionDuration = await choice.evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
    expect(transitionDuration).toBeLessThanOrEqual(0.00001);
    await expect(choice).toHaveCSS("transform", "none");
    await expect(choice.locator(".jobs-mode-outline")).toHaveAttribute("aria-hidden", "true");
    const contrast = await choice.evaluate((element) => {
      const css = getComputedStyle(element);
      const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3)
        .map((channel) => Number(channel) / 255)
        .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
        .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const text = luminance(css.color);
      const background = luminance(css.backgroundColor);
      return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
  await expect(selected.locator(".jobs-mode-indicator svg")).toHaveCSS("opacity", "1");
  await expect(unselected.locator(".jobs-mode-indicator svg")).toHaveCSS("opacity", "0");

  const widths = testInfo.project.name === "mobile" ? [320, 390, 639] : [768, 1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await choices.evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    }));
    expect(bounds[0].right).toBeLessThan(bounds[1].left);
    for (const rect of bounds) {
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(width);
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
  }
});
