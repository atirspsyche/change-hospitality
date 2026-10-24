import { expect, test } from "@playwright/test";

const toggleSelector = "[data-funmenu-toggle]";
const overlaySelector = "[data-funmenu-overlay]";

async function tokenColours(page, tokens) {
  return page.evaluate((tokens) => {
    const probe = document.createElement("span");
    probe.style.setProperty("transition", "none", "important");
    document.body.append(probe);
    const colours = Object.fromEntries(tokens.map((token) => {
      probe.style.color = `var(--color-${token})`;
      return [token, getComputedStyle(probe).color];
    }));
    probe.remove();
    return colours;
  }, tokens);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/our-story/");
  await page.evaluate(() => document.fonts.ready);
});

test("the illustrated seal opens the existing drawer and becomes an anchored close icon", async ({ page }) => {
  const toggle = page.locator(toggleSelector);
  const overlay = page.locator(overlaySelector);
  await expect(toggle).toHaveAccessibleName("The Menu, open navigation");
  await expect(toggle.locator(".funmenu-toggle-label")).toHaveText("The\u00a0Menu");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(overlay).toBeHidden();
  const initialIcon = await toggle.locator(".funmenu-toggle-bars").boundingBox();
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Close menu");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveClass(/is-open/);
  await expect(overlay.getByRole("navigation", { name: "Site navigation" }).getByRole("link")).toHaveCount(7);
  await expect(overlay.locator(".funmenu-link-text")).toHaveText([
    "Home", "Jobs", "Recruit", "Team", "Our Story", "Franchising", "Sustainability",
  ]);
  await expect(toggle.locator(".funmenu-toggle-label")).toHaveCSS("opacity", "0");
  await expect(toggle.locator(".funmenu-toggle-seal")).toHaveCSS("opacity", "1");
  await expect.poll(() => toggle.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    return Math.abs(bounds.width - bounds.height);
  })).toBeLessThan(0.1);
  const closeIcon = await toggle.locator(".funmenu-toggle-bars").boundingBox();
  expect(closeIcon.x).toBeCloseTo(initialIcon.x, 1);
  expect(closeIcon.y).toBeCloseTo(initialIcon.y, 1);
  const closeBounds = await toggle.boundingBox();
  expect(closeBounds.width).toBeGreaterThanOrEqual(44);
  expect(closeBounds.height).toBeGreaterThanOrEqual(44);
  expect(closeBounds.width).toBeCloseTo(closeBounds.height, 1);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(overlay).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("one opaque surface continuously contracts and expands instead of swapping controls", async ({ page }) => {
  const samples = await page.locator(toggleSelector).evaluate(async (button) => {
    const surface = button.querySelector(".funmenu-toggle-seal");
    const shape = button.querySelector(".funmenu-toggle-outline");
    const initialOutline = shape.getAttribute("d");
    const initialWidth = button.getBoundingClientRect().width;
    const frames = [];
    const record = async () => {
      const start = performance.now();
      await new Promise((resolve) => {
        const sample = () => {
          const icon = button.querySelector(".funmenu-toggle-bars").getBoundingClientRect();
          frames.push({
            width: button.getBoundingClientRect().width,
            iconX: icon.x,
            opacity: getComputedStyle(surface).opacity,
            sameSurface: button.querySelector(".funmenu-toggle-seal") === surface,
            outline: shape.getAttribute("d"),
          });
          if (performance.now() - start >= 600) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
    };
    button.click();
    await record();
    const openWidth = button.getBoundingClientRect().width;
    const opening = frames.splice(0);
    button.click();
    await record();
    return { initialWidth, openWidth, finalWidth: button.getBoundingClientRect().width, initialOutline, finalOutline: shape.getAttribute("d"), opening, closing: frames };
  });
  expect(samples.openWidth).toBeLessThan(samples.initialWidth - 50);
  expect(samples.finalWidth).toBeCloseTo(samples.initialWidth, 1);
  expect(samples.finalOutline).toBe(samples.initialOutline);
  for (const frames of [samples.opening, samples.closing]) {
    expect(frames.some((frame) => frame.width > samples.openWidth + 5 && frame.width < samples.initialWidth - 5)).toBe(true);
    expect(frames.every((frame) => frame.opacity === "1" && frame.sameSurface)).toBe(true);
    expect(new Set(frames.map((frame) => frame.outline)).size).toBeGreaterThan(3);
    expect(Math.max(...frames.map((frame) => frame.iconX)) - Math.min(...frames.map((frame) => frame.iconX))).toBeLessThan(0.1);
  }
});

test("the original SVG contour is preserved and the drawer cannot flash before entering", async ({ page }) => {
  const toggle = page.locator(toggleSelector);
  await expect(toggle.locator(".funmenu-toggle-outline")).toHaveAttribute("d", "M33 5C66 2 119 4 150 5C168 5 179 15 179 31C180 48 168 58 150 59C113 61 69 58 33 59C15 60 5 50 5 33C4 16 15 5 33 5Z");
  const initial = await toggle.evaluate((button) => {
    button.click();
    const overlay = document.querySelector("[data-funmenu-overlay]");
    return { left: overlay.getBoundingClientRect().left, viewport: innerWidth, alreadyOpen: overlay.classList.contains("is-open") };
  });
  expect(initial.alreadyOpen).toBe(false);
  expect(initial.left).toBeGreaterThanOrEqual(initial.viewport);
  await expect(page.locator(overlaySelector)).toHaveClass(/is-open/);
});

test("keyboard focus reveals the seal and Escape restores focus without scrolling", async ({ page }) => {
  const toggle = page.locator(toggleSelector);
  await page.keyboard.press("Tab");
  await toggle.focus();
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await expect(toggle).toHaveCSS("outline-width", "2px");
  await expect(toggle.locator(".funmenu-toggle-trace")).toHaveCSS("stroke-dashoffset", "0px");
  const scrollY = await page.evaluate(() => scrollY);
  await page.keyboard.press("Enter");
  await expect(page.locator(overlaySelector).getByRole("link", { name: /Home/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAccessibleName("The Menu, open navigation");
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});

test("desktop hover rolls the lettering and draws the outline without moving the target", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Touch devices intentionally have no hover animation.");
  const toggle = page.locator(toggleSelector);
  const bounds = await toggle.boundingBox();
  await toggle.hover();
  await expect(toggle.locator(".funmenu-toggle-trace")).toHaveCSS("stroke-dashoffset", "0px");
  await expect(toggle.locator(".funmenu-toggle-trace")).toHaveCSS("opacity", "0.7");
  await expect.poll(() => toggle.locator(".funmenu-toggle-letter").first().evaluate((letter) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(letter).transform);
    return Math.abs(matrix.m42 + letter.getBoundingClientRect().height);
  })).toBeLessThan(0.1);
  expect(await toggle.boundingBox()).toEqual(bounds);
  await page.mouse.move(0, 200);
  await expect(toggle.locator(".funmenu-toggle-trace")).toHaveCSS("stroke-dashoffset", "1px");
  await expect(toggle.locator(".funmenu-toggle-letter").first()).toHaveCSS("transform", "none");
});

test("the hand-drawn frame forms the outer edge without an inset border or shadow", async ({ page }) => {
  const colours = await tokenColours(page, ["cream", "cocoa"]);
  await page.locator(toggleSelector).click();
  const overlay = page.locator(overlaySelector);
  await expect(overlay).toHaveCSS("border-top-width", "0px");
  await expect(overlay).toHaveCSS("outline-style", "none");
  await expect(overlay).toHaveCSS("box-shadow", "none");
  const frame = overlay.locator(".funmenu-frame");
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("aria-hidden", "true");
  await expect(frame).toHaveCSS("pointer-events", "none");
  await expect(frame.locator(".funmenu-frame-ink")).toHaveCSS("stroke", colours.cocoa);
  await expect(frame.locator(".funmenu-frame-paper")).toHaveCSS("stroke", colours.cream);
  await expect(frame.locator(".funmenu-frame-ink")).toHaveCSS("vector-effect", "non-scaling-stroke");
  const geometry = await overlay.evaluate((drawer) => {
    const bounds = drawer.getBoundingClientRect();
    const frame = drawer.querySelector(".funmenu-frame").getBoundingClientRect();
    const surface = drawer.querySelector(".funmenu-surface").getBoundingClientRect();
    return [frame, surface].every((element) =>
      Math.abs(element.left - bounds.left) < 0.1 &&
      Math.abs(element.top - bounds.top) < 0.1 &&
      Math.abs(element.width - bounds.width) < 0.1 &&
      Math.abs(element.height - bounds.height) < 0.1
    );
  });
  expect(geometry).toBe(true);
  await expect(overlay.locator(".funmenu-surface")).toHaveCSS("clip-path", /funmenu-surface-clip/);
  const clipOutline = await frame.locator("clipPath path").getAttribute("d");
  await expect(frame.locator(".funmenu-frame-ink")).toHaveAttribute("d", clipOutline);
});

test("every navigation palette keeps both shapes distinct from the background", async ({ page }) => {
  const palettes = [
    ["flame", "blush", "cocoa"],
    ["citron", "cocoa", "flame"],
    ["mint", "flame", "cocoa"],
    ["blush", "cocoa", "flame"],
    ["mist", "cocoa", "flame"],
  ];
  const colours = await tokenColours(page, ["flame", "blush", "cocoa", "citron", "mint", "mist"]);
  const luminance = (colour) => colour.match(/\d+/g).slice(0, 3).map(Number)
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const contrast = (first, second) => {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  await page.locator(toggleSelector).focus();
  await page.keyboard.press("Enter");
  const overlay = page.locator(overlaySelector);
  const links = overlay.locator("[data-funmenu-link]");
  for (let index = 0; index < 7; index += 1) {
    const [background, upper, lower] = palettes[index % palettes.length];
    await links.nth(index).focus();
    await expect(overlay.locator(".funmenu-surface")).toHaveCSS("background-color", colours[background]);
    await expect(overlay.locator(".funmenu-blob-1")).toHaveCSS("background-color", colours[upper]);
    await expect(overlay.locator(".funmenu-blob-2")).toHaveCSS("background-color", colours[lower]);
    expect(contrast(colours[background], colours[upper])).toBeGreaterThanOrEqual(1.5);
    expect(contrast(colours[background], colours[lower])).toBeGreaterThanOrEqual(1.5);
    expect(upper).not.toBe(lower);
  }
  await page.keyboard.press("Escape");
  await expect(overlay).toBeHidden();
  await page.locator(toggleSelector).click();
  await expect(overlay.locator(".funmenu-surface")).toHaveCSS("background-color", colours.flame);
  await expect(overlay.locator(".funmenu-blob-1")).toHaveCSS("background-color", colours.blush);
  await expect(overlay.locator(".funmenu-blob-2")).toHaveCSS("background-color", colours.cocoa);
});

test("current-page markers follow Franchising and Home through client navigation", async ({ page }) => {
  await page.evaluate(() => { window.__menuNavigationMarker = true; });
  await page.locator(toggleSelector).click();
  let overlay = page.locator(overlaySelector);
  await expect(overlay.locator("[aria-current]")).toHaveCount(1);
  await expect(overlay.locator('[aria-current="page"]')).toHaveAttribute("href", "/our-story/");
  const colours = await tokenColours(page, ["citron", "ink"]);
  await expect(overlay.locator("[aria-current]")).toHaveCSS("background-color", colours.citron);
  await expect(overlay.locator("[aria-current]")).toHaveCSS("border-top-color", colours.ink);
  await expect(overlay.locator(".funmenu-current-badge")).toHaveText("You're here");
  await expect(overlay.locator(".funmenu-current-badge")).toBeVisible();
  await overlay.getByRole("link", { name: /Franchising/ }).click();
  await expect(page).toHaveURL(/\/franchising\/$/);
  expect(await page.evaluate(() => window.__menuNavigationMarker)).toBe(true);
  await page.locator(toggleSelector).click();
  overlay = page.locator(overlaySelector);
  await expect(overlay.locator("[aria-current]")).toHaveCount(1);
  await expect(overlay.locator('[aria-current="page"]')).toHaveAttribute("href", "/franchising/");
  await expect(overlay.locator(".funmenu-current-badge")).toBeVisible();
  await overlay.getByRole("link", { name: /Home/ }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await page.locator(toggleSelector).click();
  await expect(page.locator(`${overlaySelector} [aria-current]`)).toHaveCount(1);
  await expect(page.locator(`${overlaySelector} [aria-current="page"]`)).toHaveAttribute("href", "/");
  await expect(page.locator(`${overlaySelector} .funmenu-current-badge`)).toBeVisible();
});

test("the current row and stamp stay prominent without overlapping long labels", async ({ page }, testInfo) => {
  await page.goto("/sustainability-impact/");
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(toggleSelector).focus();
  await page.keyboard.press("Enter");
  const current = page.locator(`${overlaySelector} [aria-current="page"]`);
  await expect(current).toHaveAttribute("href", "/sustainability-impact/");
  const colours = await tokenColours(page, ["citron", "ink", "cream", "cocoa"]);
  const sizes = testInfo.project.name === "mobile"
    ? [[320, 568], [390, 844]]
    : [[768, 720], [1440, 900]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await current.focus();
    await expect(current).toHaveCSS("background-color", colours.citron);
    await expect(current).toHaveCSS("color", colours.ink);
    await expect(current.locator(".funmenu-current-badge")).toHaveCSS("background-color", colours.cream);
    await expect(current.locator(".funmenu-current-badge")).toHaveCSS("color", colours.cocoa);
    await expect(current.locator(".funmenu-current-badge")).toHaveCSS("border-top-left-radius", "999px");
    await expect(current.locator(".funmenu-current-badge")).toHaveCSS("transform", "none");
    const geometry = await current.evaluate((row) => {
      const bounds = row.getBoundingClientRect();
      const label = row.querySelector(".funmenu-link-text").getBoundingClientRect();
      const badge = row.querySelector(".funmenu-current-badge").getBoundingClientRect();
      const arrow = row.querySelector(".funmenu-link-arrow").getBoundingClientRect();
      return {
        noOverlap: label.right <= badge.left || label.bottom <= badge.top,
        labelFits: label.right <= arrow.left && label.left >= bounds.left,
        badgeFits: badge.left >= bounds.left && badge.right <= bounds.right && badge.top >= bounds.top && badge.bottom <= bounds.bottom,
        badgeHeight: badge.height,
      };
    });
    expect(geometry.noOverlap, `Current page label/stamp at ${width}x${height}`).toBe(true);
    expect(geometry.labelFits, `Current page label at ${width}x${height}`).toBe(true);
    expect(geometry.badgeFits, `Current page stamp at ${width}x${height}`).toBe(true);
    expect(geometry.badgeHeight).toBeGreaterThan(16);
    if (testInfo.project.name === "desktop") {
      await current.hover();
      await expect(current).toHaveCSS("background-color", colours.citron);
      await expect(current).toHaveCSS("color", colours.ink);
    }
  }
});

test("directional arrows respond to keyboard focus and desktop hover", async ({ page }, testInfo) => {
  await page.locator(toggleSelector).focus();
  await page.keyboard.press("Enter");
  const overlay = page.locator(overlaySelector);
  const home = overlay.getByRole("link", { name: /Home/ });
  const jobs = overlay.getByRole("link", { name: /Jobs/ });
  await expect(home).toBeFocused();
  await expect(home.locator(".funmenu-link-arrow")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Tab");
  await expect(jobs).toBeFocused();
  await expect(jobs.locator(".funmenu-link-arrow")).toHaveCSS("opacity", "1");
  await expect(jobs.locator(".funmenu-link-arrow")).toHaveCSS("transform", "none");
  await expect(home.locator(".funmenu-link-arrow")).toHaveCSS("opacity", "0");
  if (testInfo.project.name === "desktop") {
    await page.locator(toggleSelector).focus();
    const franchise = overlay.getByRole("link", { name: /Franchising/ });
    await franchise.hover();
    await expect(franchise.locator(".funmenu-link-arrow")).toHaveCSS("opacity", "1");
    await expect(franchise.locator(".funmenu-link-arrow")).toHaveCSS("transform", "none");
  }
});

test("seven balanced rows fit normal screens and stay reachable on short screens", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(toggleSelector).click();
  const sizes = testInfo.project.name === "mobile"
    ? [[320, 568], [360, 640], [390, 844], [767, 900]]
    : [[768, 720], [1024, 768], [1440, 900]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const overlay = page.locator(overlaySelector);
    const geometry = await overlay.evaluate((drawer) => {
      const bounds = drawer.getBoundingClientRect();
      const inner = drawer.querySelector(".funmenu-overlay-inner");
      return {
        inViewport: bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight,
        noHorizontalOverflow: inner.scrollWidth <= inner.clientWidth + 1,
        fitsWithoutScrolling: inner.scrollHeight <= inner.clientHeight + 1,
        links: [...drawer.querySelectorAll("[data-funmenu-link]")].map((link) => {
          const row = link.getBoundingClientRect();
          const label = link.querySelector(".funmenu-link-text").getBoundingClientRect();
          const arrow = link.querySelector(".funmenu-link-arrow").getBoundingClientRect();
          return {
            largeTarget: row.height >= 44,
            textFits: label.left >= row.left && label.right <= arrow.left,
            withinDrawer: row.left >= bounds.left && row.right <= bounds.right,
          };
        }),
      };
    });
    expect(geometry.inViewport, `Drawer at ${width}x${height}`).toBe(true);
    expect(geometry.noHorizontalOverflow, `Horizontal fit at ${width}x${height}`).toBe(true);
    expect(geometry.links, `Navigation rows at ${width}x${height}`).toEqual(
      Array.from({ length: 7 }, () => ({ largeTarget: true, textFits: true, withinDrawer: true })),
    );
    if ((width === 390 && height === 844) || (width === 1440 && height === 900)) {
      expect(geometry.fitsWithoutScrolling, `Seven rows fit at ${width}x${height}`).toBe(true);
    }
    const last = overlay.getByRole("link", { name: /Sustainability/ });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
    const email = overlay.locator(".funmenu-footer a");
    await email.scrollIntoViewIfNeeded();
    await expect(email).toBeInViewport({ ratio: 1 });
  }
});

test("rapid open and close reversals settle to the last requested state", async ({ page }) => {
  const toggle = page.locator(toggleSelector);
  const overlay = page.locator(overlaySelector);
  await toggle.evaluate(async (button) => {
    for (let index = 0; index < 7; index += 1) {
      button.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(overlay).toHaveClass(/is-open/);
  await expect(overlay).toBeVisible();
  await expect.poll(() => overlay.evaluate((element) => element.inert)).toBe(false);
  await toggle.click();
  await expect(overlay).toBeHidden();
  await expect(overlay).not.toHaveClass(/is-open/);
  await expect(page.locator("body")).not.toHaveClass(/funmenu-open/);
  await toggle.evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(overlay).toBeHidden();
  await expect(overlay).not.toHaveClass(/is-open/);
});

test("reduced motion removes every trigger transition and the letter roll", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const toggle = page.locator(toggleSelector);
  await page.keyboard.press("Tab");
  await toggle.focus();
  const motion = await toggle.evaluate((button) => [...button.querySelectorAll("*"), button].map((element) => ({
    duration: getComputedStyle(element).transitionDuration,
    delay: getComputedStyle(element).transitionDelay,
    animation: getComputedStyle(element).animationName,
  })));
  expect(motion.every((item) => item.duration.split(",").every((duration) => parseFloat(duration) <= 0.000001))).toBe(true);
  expect(motion.every((item) => item.delay.split(",").every((delay) => parseFloat(delay) === 0))).toBe(true);
  expect(motion.every((item) => item.animation === "none")).toBe(true);
  await expect(toggle.locator(".funmenu-toggle-letter").first()).toHaveCSS("transform", "none");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAccessibleName("Close menu");
  const drawerMotion = await page.locator(overlaySelector).evaluate((drawer) => [drawer, ...drawer.querySelectorAll("*")].map((element) => ({
    duration: getComputedStyle(element).transitionDuration,
    delay: getComputedStyle(element).transitionDelay,
  })));
  expect(drawerMotion.every((item) => item.duration.split(",").every((duration) => parseFloat(duration) <= 0.000001))).toBe(true);
  expect(drawerMotion.every((item) => item.delay.split(",").every((delay) => parseFloat(delay) === 0))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(overlaySelector)).toBeHidden();
});

test("the seal fits narrow screens and retains page colours after client navigation", async ({ page }, testInfo) => {
  const widths = testInfo.project.name === "mobile" ? [320, 360, 390, 767] : [768, 1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.locator("[data-funmenu-bar]").evaluate((bar) => {
      const brand = bar.querySelector(".funmenu-brand").getBoundingClientRect();
      const button = bar.querySelector("[data-funmenu-toggle]");
      const bounds = button.getBoundingClientRect();
      const label = button.querySelector(".funmenu-toggle-label");
      const icon = button.querySelector(".funmenu-toggle-bars span").getBoundingClientRect();
      return {
        inViewport: bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0,
        noOverlap: brand.right <= bounds.left,
        labelFits: label.scrollWidth <= label.clientWidth + 1 && label.getBoundingClientRect().right <= icon.left + 1,
        largeTarget: bounds.height >= 44,
      };
    });
    expect(geometry, `Menu layout at ${width}px`).toEqual({
      inViewport: true, noOverlap: true, labelFits: true, largeTarget: true,
    });
  }
  await page.setViewportSize({ width: testInfo.project.name === "mobile" ? 390 : 1440, height: 900 });
  await page.evaluate(() => { window.__menuNavigationMarker = true; });
  await page.locator(toggleSelector).click();
  await page.locator(overlaySelector).getByRole("link", { name: /Jobs/ }).click();
  await expect(page).toHaveURL(/\/jobs\/$/);
  expect(await page.evaluate(() => window.__menuNavigationMarker)).toBe(true);
  await expect(page.locator(toggleSelector)).toHaveAccessibleName("The Menu, open navigation");
  const paper = page.locator(".funmenu-toggle-paper");
  expect(await paper.evaluate((element) => {
    const expected = getComputedStyle(document.documentElement).getPropertyValue("--color-cocoa").trim();
    const probe = document.createElement("span");
    probe.style.color = expected;
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(element).fill === colour;
  })).toBe(true);
  await page.locator(toggleSelector).click();
  await expect(page.locator(overlaySelector)).toBeVisible();
  await expect(page.locator(`${overlaySelector} [aria-current="page"]`)).toHaveAttribute("href", "/jobs/");
  await page.keyboard.press("Escape");
  await expect(page.locator(overlaySelector)).toBeHidden();
});
