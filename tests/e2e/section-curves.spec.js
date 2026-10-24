import { expect, test } from "@playwright/test";

const pages = [
  {
    route: "/team/",
    hero: ".team-hero",
    lowerShape: ".team-hero-oval-2",
    transitions: [
      [".team-profiles-section", ".team-hero"],
    ],
    lastSurface: ".team-profiles-section",
  },
  {
    route: "/recruit-talent/",
    hero: ".recruit-hero",
    lowerShape: ".recruit-hero-oval-two",
    transitions: [
      [".division-flow", ".recruit-hero"],
      ["section.recruit-form-section", ".division-flow-item:last-child"],
      [".client-stories", "section.recruit-form-section"],
    ],
    lastSurface: ".client-stories",
  },
  {
    route: "/jobs/",
    mode: "permanent",
    hero: ".jobs-hero",
    lowerShape: ".jobs-hero-shape-one",
    transitions: [
      [".job-listings", ".jobs-hero"],
      [".candidate-stories", ".job-listings"],
      ["#gallery", ".candidate-stories"],
    ],
    lastSurface: "#gallery",
  },
  {
    route: "/jobs/",
    mode: "temporary",
    hero: ".jobs-hero",
    lowerShape: ".jobs-hero-shape-one",
    transitions: [
      [".temp-benefits", ".jobs-hero"],
      [".temp-application", ".temp-benefits"],
      [".temp-faqs", ".temp-application"],
      [".candidate-stories", ".temp-faqs"],
      ["#gallery", ".candidate-stories"],
    ],
    lastSurface: "#gallery",
  },
];

async function expectCurveColours(page, section, previousSurface) {
  const background = await previousSurface.evaluate((element) => getComputedStyle(element).backgroundColor);
  await section.evaluate((element) => {
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 160, behavior: "instant" });
  });
  const bounds = await section.boundingBox();
  const screenshot = await page.screenshot({
    clip: { x: 0, y: Math.ceil(bounds.y) + 1, width: Math.floor(bounds.width), height: 2 },
    scale: "css",
  });
  const pixels = await page.evaluate(async ({ imageData, background }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${imageData}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const left = [...context.getImageData(1, 0, 1, 1).data];
    const centre = [...context.getImageData(Math.floor(canvas.width / 2), 0, 1, 1).data];
    const right = [...context.getImageData(canvas.width - 2, 0, 1, 1).data];
    const colourPixel = (colour) => {
      context.fillStyle = colour;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    return { left, centre, right, backdrop: colourPixel(background) };
  }, { imageData: screenshot.toString("base64"), background });
  expect(pixels.left).toEqual(pixels.backdrop);
  expect(pixels.right).toEqual(pixels.backdrop);
  expect(pixels.centre).not.toEqual(pixels.backdrop);
}

for (const javaScriptEnabled of [true, false]) {
  test.describe(`section curves with JavaScript ${javaScriptEnabled ? "enabled" : "disabled"}`, () => {
    test.use({ javaScriptEnabled, reducedMotion: "reduce" });

    for (const { route, mode, hero, lowerShape, transitions, lastSurface } of pages) {
      test(`${route} ${mode || ""} matches the Story arch without seams or overflow`, async ({ page }, testInfo) => {
        test.skip(!javaScriptEnabled && mode === "temporary", "The existing mode switch requires JavaScript.");
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);
        if (mode === "temporary") {
          await page.locator('[data-jobs-mode-switch] label:has(input[value="temporary"])').click();
        }
        await expect(page.locator(hero)).toHaveCSS("border-top-left-radius", "0px");
        await expect(page.locator(`${hero} [data-hero-shape]`)).toHaveCount(1);
        await expect(page.locator(lowerShape)).toHaveCount(0);
        const widths = testInfo.project.name === "mobile" ? [320, 390] : [768, 1440, 1920];

        for (const width of widths) {
          await page.setViewportSize({ width, height: 900 });
          const heroBounds = await page.locator(hero).boundingBox();
          const accentBounds = await page.locator(`${hero} [data-hero-shape]`).boundingBox();
          expect(accentBounds.y + accentBounds.height).toBeLessThan(heroBounds.y + heroBounds.height - 48);
          for (const [selector, previousSelector] of transitions) {
            const section = page.locator(selector);
            await expect(section).toBeVisible();
            await expect(section).toHaveCSS("border-top-left-radius", "50% 48px");
            await expect(section).toHaveCSS("border-top-right-radius", "50% 48px");
            await expect(section).toHaveCSS("border-bottom-left-radius", "0px");
            await expect(section).toHaveCSS("border-bottom-right-radius", "0px");
            const bounds = await section.boundingBox();
            expect(bounds.x).toBe(0);
            expect(bounds.width).toBe(width);
            await expectCurveColours(page, section, page.locator(previousSelector));
          }
          const footer = page.locator("[data-site-footer]");
          const footerStyle = await footer.evaluate((element) => ({
            wrapped: Boolean(element.closest(".section-curve")),
            radius: getComputedStyle(element).borderTopLeftRadius,
          }));
          expect(footerStyle.wrapped).toBe(false);
          expect(footerStyle.radius).not.toContain("%");
          expect(Number.parseFloat(footerStyle.radius)).toBeCloseTo(Math.min(80, Math.max(32, width * 0.05)), 1);
          await expectCurveColours(page, footer, page.locator(lastSurface));
          expect(await page.evaluate(() =>
            document.documentElement.scrollWidth - document.documentElement.clientWidth
          )).toBe(0);
        }
      });
    }
  });
}

test("Team's profile anchor and office accordions still work", async ({ page }) => {
  await page.goto("/team/");
  await page.getByRole("link", { name: "Meet the team", exact: true }).click();
  await expect(page).toHaveURL(/#profiles$/);
  const offices = page.locator("[data-accordion-trigger]");
  await expect(offices.first()).toHaveAttribute("aria-expanded", "true");
  await offices.nth(1).click();
  await expect(offices.nth(1)).toHaveAttribute("aria-expanded", "true");
  const panelId = await offices.nth(1).getAttribute("aria-controls");
  await expect(page.locator(`#${panelId}`)).toBeVisible();
});

test("Recruit's division accordion and staffing-brief anchor still work", async ({ page }) => {
  await page.goto("/recruit-talent/");
  const divisions = page.locator("[data-division-trigger]");
  await divisions.last().click();
  await expect(divisions.last()).toHaveAttribute("aria-expanded", "true");
  const panelId = await divisions.last().getAttribute("aria-controls");
  await expect(page.locator(`#${panelId}`)).toBeVisible();
  await page.getByRole("link", { name: "Get in touch", exact: true }).click();
  await expect(page).toHaveURL(/#staffing-brief$/);
  await expect(page.locator("#staffing-brief")).toBeInViewport();
});

test("Recruit's final division joins the staffing curve without a divider or side capsule", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/recruit-talent/");
  const items = page.locator(".division-flow-item");
  const trigger = items.last().locator("[data-division-trigger]");
  const formSection = page.locator("section.recruit-form-section");
  await expect(page.locator(".recruit-form-shape")).toHaveCount(0);
  await expect(items.nth(0)).toHaveCSS("border-bottom-width", "1px");
  await expect(items.nth(1)).toHaveCSS("border-bottom-width", "1px");
  await expect(items.last()).toHaveCSS("border-bottom-width", "0px");
  const widths = testInfo.project.name === "mobile" ? [320, 390] : [768, 1440, 1920];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const expanded of [true, false]) {
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(trigger).toHaveAttribute("aria-expanded", String(expanded));
      const boundary = await formSection.evaluate((element) => ({
        top: element.getBoundingClientRect().top,
        previousBottom: document.querySelector(".division-flow").getBoundingClientRect().bottom,
      }));
      expect(boundary.top).toBeCloseTo(boundary.previousBottom, 1);
      await expectCurveColours(page, formSection, items.last());
      expect(await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      )).toBe(0);
    }
  }
});

test("Jobs curve backdrops follow both work modes and unpublished testimonials", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/jobs/");
  const testimonials = page.locator(".candidate-stories");
  const backdrop = testimonials.locator("..");

  for (const mode of ["temporary", "permanent", "temporary"]) {
    await page.locator(`[data-jobs-mode-switch] label:has(input[value="${mode}"])`).click();
    const precedingSurface = page.locator(mode === "temporary" ? ".temp-faqs" : ".job-listings");
    const background = await precedingSurface.evaluate((element) => getComputedStyle(element).backgroundColor);
    await expect(backdrop).toHaveCSS("background-color", background);
    await expectCurveColours(page, testimonials, precedingSurface);
    await testimonials.evaluate((element) => { element.hidden = true; });
    await expectCurveColours(page, page.locator("#gallery"), precedingSurface);
    await testimonials.evaluate((element) => { element.hidden = false; });
  }
});
