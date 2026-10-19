import { expect, test } from "@playwright/test";

const opportunityCopy = [
  "Hospitality is one of the UK's biggest employers with 3.5 million people and a sector worth £93 billion. It's also one of the most demanding to staff with the highest employee turnover of any industry in the country, at over 50%. That means constant, year-round demand for good recruitment, that doesn't disappear when the economy shifts.",
  "We've spent over 20 years turning that demand into a profitable, award-winning business - first in London, and now in Manchester and Hampshire. It works because the model works: proven systems, established processes, and a brand hospitality businesses already trust. We currently cover London, Greater Manchester and the Hampshire area, which leaves the rest of the UK wide open, and that's where you come in.",
  "What makes this different from starting out alone is that we already hold national agreements with most of the UK's biggest caterers but outside our current office areas, we can't service them. So the day you open, that work is yours. You'd be supplying demand we already have but can't yet reach.",
  "As a Change franchisee, you'd build your own hospitality recruitment agency in a location of your choice, under a name the industry already knows, using the exact systems and support that got us here. You bring the drive and the local knowledge; we bring two decades of knowing what works, and we'll be alongside you at every step.",
];

test("all original opportunity copy is readable in four numbered chapters", async ({ page }) => {
  await page.goto("/franchising/");
  await expect(page).toHaveTitle("Franchising | Change Hospitality");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const copy = await page.locator(".opportunity-copy p").allTextContents();
  expect(copy.map((paragraph) => paragraph.replace(/\s+/g, " ").trim())).toEqual(opportunityCopy);
  await expect(page.locator(".chapter-number")).toHaveText(["01", "02", "03", "04"]);
  await expect(page.locator(".location-list li strong")).toHaveText(["London", "Manchester", "Hampshire"]);
  await expect(page.locator(".franchising-page astro-island")).toHaveCount(0);
});

test("hero entrance leaves heading descenders and button hover and focus unclipped", async ({ page }) => {
  await page.goto("/franchising/");
  await page.evaluate(() => document.fonts.ready);
  const heroCopy = page.locator(".hero-copy");
  await heroCopy.evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished));
  });

  const button = heroCopy.getByRole("link", { name: "Let's talk franchising", exact: true });
  await button.hover();
  await expect(button).toHaveCSS("top", "-2px");
  expect(await button.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 1);
    return element.contains(hit);
  }), "The lifted button's top border must remain visible and interactive").toBe(true);
  await expect(page.locator("#franchise-title")).toHaveCSS("clip-path", "none");
  await expect(heroCopy.locator(".franchise-actions")).toHaveCSS("clip-path", "none");

  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await button.focus();
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS("outline-style", "solid");
  await expect(button).toHaveCSS("outline-width", "3px");
  await expect(heroCopy).toHaveCSS("overflow", "visible");
  await expect(heroCopy.locator(".franchise-actions")).toHaveCSS("overflow", "visible");
});

test("shared buttons navigate to and focus the opportunity and contact sections", async ({ page }) => {
  await page.goto("/franchising/");
  const opportunity = page.locator(".hero-copy").getByRole("link", { name: "The opportunity", exact: true });
  await expect(opportunity).toHaveAttribute("data-button-variant", "secondary");
  await opportunity.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#the-opportunity$/);
  await expect(page.locator("#the-opportunity")).toBeFocused();

  await page.locator(".hero-copy").getByRole("link", { name: "Let's talk franchising", exact: true }).click();
  await expect(page).toHaveURL(/#lets-talk$/);
  await expect(page.locator("#lets-talk")).toBeFocused();
  const email = page.locator(".contact-actions").getByRole("link", { name: "Let's talk franchising" });
  await expect(email).toHaveAttribute("data-button-variant", "primary");
  await expect(email).toHaveAttribute("href", "mailto:info@changehospitality.co.uk?subject=Franchising%20with%20Change%20Hospitality");
  await expect(page.locator(".contact-actions").getByRole("link", { name: "Call 020 8050 6312" })).toHaveAttribute("href", "tel:+442080506312");
  await page.getByRole("link", { name: "Back to top" }).click();
  await expect(page.locator("#franchise-title")).toBeFocused();
});

test("the unconfigured film is an honest, responsive coming-soon feature", async ({ page }, testInfo) => {
  await page.goto("/franchising/");
  const film = page.locator("[data-franchise-film]");
  await film.scrollIntoViewIfNeeded();
  await expect(film.getByText("Film coming soon")).toBeVisible();
  await expect(film.locator("video, button, [role=button]")).toHaveCount(0);
  await expect(film.locator("figcaption")).toContainText("Our people. Our places. One Change.");
  const size = await film.locator(".franchise-film-screen").boundingBox();
  expect(size).not.toBeNull();
  const ratio = testInfo.project.name === "mobile" ? 4 / 5 : 16 / 9;
  expect(Math.abs(size.width / size.height - ratio)).toBeLessThan(0.01);
});

test("desktop parallax is lazy, and reduced motion removes all motion layers", async ({ page }, testInfo) => {
  await page.goto("/franchising/");
  const heroCard = page.locator(".franchise-hero-card");
  const filmArt = page.locator(".franchise-film-art");
  if (testInfo.project.name === "desktop") {
    await expect(heroCard).toHaveAttribute("data-page-motion-layer", "");
    await expect(filmArt).not.toHaveAttribute("data-page-motion-layer", "");
    await page.evaluate(() => scrollTo({ top: 300, behavior: "instant" }));
    await expect.poll(() => heroCard.evaluate((element) => parseFloat(element.style.getPropertyValue("--page-motion-y")))).toBeLessThan(-1);
    await page.locator("[data-franchise-film]").scrollIntoViewIfNeeded();
    await expect(filmArt).toHaveAttribute("data-page-motion-layer", "");
  } else {
    await expect(heroCard).not.toHaveAttribute("data-page-motion-layer", "");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-page-motion-layer]")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test("content and buttons fit narrow, tablet and desktop viewports", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/franchising/");
  const widths = testInfo.project.name === "mobile" ? [320, 390, 767] : [768, 1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      const targets = [...document.querySelectorAll(".franchising-page h1, .franchising-page h2, .opportunity-copy, [data-button-variant], .contact-email")];
      const status = document.querySelector(".film-status").getBoundingClientRect();
      const art = document.querySelector(".franchise-film-art").getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - viewport,
        clipped: targets.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > viewport + 1 || element.scrollWidth > element.clientWidth + 1;
        }).map((element) => element.textContent.trim()),
        smallButtons: [...document.querySelectorAll("[data-button-variant]")].filter((element) => element.getBoundingClientRect().height < 44).length,
        filmStatusOverlap: status.left < art.right && status.right > art.left && status.top < art.bottom && status.bottom > art.top,
      };
    });
    expect(layout, `Layout at ${width}px`).toEqual({ overflow: 0, clipped: [], smallButtons: 0, filmStatusOverlap: false });
  }
});

test("Astro navigation back to franchising restores its own motion and anchors", async ({ page }) => {
  await page.goto("/franchising/");
  await page.locator(".franchise-text-link").click();
  await expect(page).toHaveURL(/\/our-story\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/franchising\/$/);
  await expect(page.locator("[data-page-motion]")).toHaveAttribute("data-page-motion", "franchising");
  await page.locator(".hero-copy").getByRole("link", { name: "The opportunity", exact: true }).click();
  await expect(page.locator("#the-opportunity")).toBeFocused();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every chapter, contact action and film status is available", async ({ page }) => {
    await page.goto("/franchising/");
    for (const paragraph of await page.locator(".opportunity-copy p").all()) {
      await expect(paragraph).toBeVisible();
      expect(await paragraph.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    }
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Film coming soon")).toBeVisible();
    await page.locator(".hero-copy").getByRole("link", { name: "The opportunity", exact: true }).click();
    await expect(page).toHaveURL(/#the-opportunity$/);
    await expect(page.locator(".contact-actions a")).toHaveCount(2);
  });
});
