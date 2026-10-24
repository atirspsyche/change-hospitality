import { expect, test } from "@playwright/test";

const policyLabels = ["Data Protection", "Environmental", "Equality", "Modern Day Slavery"];
const routes = ["/", "/jobs/", "/recruit-talent/", "/team/", "/our-story/", "/franchising/", "/sustainability-impact/"];

async function expectMatchingFooterCorners(page, surfaceSelector) {
  const footer = page.locator("[data-site-footer]");
  const background = await page.locator(surfaceSelector).evaluate((surface) => getComputedStyle(surface).backgroundColor);
  await expect(footer.locator("..")).toHaveCSS("background-color", background);
  await page.evaluate(() => document.fonts.ready);
  await footer.evaluate((element) => window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY - 160,
    behavior: "instant",
  }));
  const bounds = await footer.boundingBox();
  const screenshot = await page.screenshot({
    clip: { x: bounds.x, y: Math.ceil(bounds.y) + 1, width: Math.floor(bounds.width), height: 2 },
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
    const right = [...context.getImageData(canvas.width - 2, 0, 1, 1).data];
    context.fillStyle = background;
    context.fillRect(0, 0, 1, 1);
    return { left, right, expected: [...context.getImageData(0, 0, 1, 1).data] };
  }, { imageData: screenshot.toString("base64"), background });
  expect(pixels.left).toEqual(pixels.expected);
  expect(pixels.right).toEqual(pixels.expected);
}

for (const javaScriptEnabled of [true, false]) {
  test.describe(`footer corner backdrops with JavaScript ${javaScriptEnabled ? "enabled" : "disabled"}`, () => {
    test.use({ javaScriptEnabled, reducedMotion: "reduce" });

    for (const [route, surface] of [
      ["/", ".home-policy-link"],
      ["/jobs/", "#gallery"],
      ["/recruit-talent/", ".recruit-footer"],
      ["/team/", ".team-profiles-section"],
      ["/our-story/", ".story-next"],
      ["/franchising/", ".franchise-contact"],
      ["/sustainability-impact/", "#social-impact"],
    ]) {
      test(`${route} matches the final section at both rounded corners`, async ({ page }) => {
        await page.goto(route);
        await expectMatchingFooterCorners(page, surface);
      });
    }

    test("job detail corners follow the visible section, including the application form", async ({ page }) => {
      await page.goto("/jobs/");
      const jobRoutes = await page.locator('a[href^="/jobs/"]:not([href="/jobs/"])').evaluateAll((links) =>
        [...new Set(links.map((link) => link.getAttribute("href")))].filter((href) => !href.includes("#"))
      );
      expect(jobRoutes.length).toBeGreaterThan(0);
      for (const route of jobRoutes) {
        await page.goto(route);
        await expectMatchingFooterCorners(page, ".job-detail");
        const application = page.locator("[data-job-application]");
        if (javaScriptEnabled && await application.count()) {
          await page.locator("[data-open-job-application]").click();
          await expect(application).toBeVisible();
          await expectMatchingFooterCorners(page, "[data-job-application]");
        }
      }
    });
  });
}

test("the shared footer keeps its buttons, page links, policies and branding", async ({ page }) => {
  await page.goto("/our-story/");
  const footer = page.locator("[data-site-footer]");
  await expect(footer.getByRole("heading", { level: 2 })).toHaveText(/Good things\s+start here\./);
  await expect(footer.locator("astro-island")).toHaveCount(0);
  const actions = footer.locator(".footer-actions");
  await expect(actions.getByRole("link", { name: "Find talent", exact: true })).toHaveAttribute("data-button-variant", "primary");
  await expect(actions.getByRole("link", { name: "Find talent", exact: true })).toHaveAttribute("href", "/recruit-talent/");
  await expect(actions.getByRole("link", { name: "Find work", exact: true })).toHaveAttribute("data-button-variant", "secondary");
  await expect(actions.getByRole("link", { name: "Find work", exact: true })).toHaveAttribute("href", "/jobs/");
  const navigation = footer.getByRole("navigation", { name: "Footer navigation" });
  expect(await navigation.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(routes);
  for (const label of ["Home", "Jobs", "Recruit", "Team", "Our story", "Franchising", "Sustainability"]) {
    await expect(navigation.getByRole("link", { name: label, exact: true })).toHaveCount(1);
  }
  const policies = footer.getByRole("navigation", { name: "Policy documents" }).getByRole("link");
  await expect(policies).toHaveCount(4);
  for (const [index, label] of policyLabels.entries()) {
    await expect(policies.nth(index)).toHaveAccessibleName(`${label} (opens in a new tab)`);
    await expect(policies.nth(index)).toHaveAttribute("href", /^https:\/\/drive\.google\.com\/file\/d\//);
    await expect(policies.nth(index)).toHaveAttribute("target", "_blank");
    await expect(policies.nth(index)).toHaveAttribute("rel", "noopener noreferrer");
  }
  await expect(footer.getByRole("link", { name: "Change Hospitality home" })).toBeVisible();
  const logo = footer.locator(".footer-brand").getByRole("img", { name: "Change Hospitality" });
  await expect(logo).toHaveAttribute("src", "/CH_LOGO.svg");
  await logo.scrollIntoViewIfNeeded();
  await expect.poll(() => logo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  const logoRatio = await logo.evaluate((image) => image.clientWidth / image.clientHeight);
  expect(logoRatio).toBeCloseTo(314 / 276, 1);
  await expect(footer.locator(".footer-brand-name")).toHaveText("Change Hospitality");
});

test("the entire footer and its content fit exactly one viewport", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/our-story/");
  await page.evaluate(() => document.fonts.ready);
  const viewports = testInfo.project.name === "mobile"
    ? [[320, 480], [320, 568], [390, 844], [639, 900]]
    : [[768, 1024], [1024, 768], [1366, 768], [1440, 900], [1920, 1080], [844, 390], [667, 375]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const layout = await page.locator("[data-site-footer]").evaluate((footer) => {
      const viewport = document.documentElement.clientWidth;
      const css = getComputedStyle(footer);
      const bounds = footer.getBoundingClientRect();
      const shell = footer.querySelector(".footer-shell");
      const hero = footer.querySelector(".footer-welcome").getBoundingClientRect();
      const menu = footer.querySelector(".footer-page-links").getBoundingClientRect();
      const menuLinks = [...footer.querySelectorAll(".footer-page-links a")].map((element) => element.getBoundingClientRect());
      const policyHeading = footer.querySelector(".footer-policies h3").getBoundingClientRect();
      const policies = footer.querySelector(".footer-policies").getBoundingClientRect();
      const policyLinks = [...footer.querySelectorAll(".footer-policies a")].map((element) => element.getBoundingClientRect());
      const policyColumns = getComputedStyle(footer.querySelector(".footer-policies nav")).gridTemplateColumns.split(" ").length;
      const contact = footer.querySelector(".footer-contact").getBoundingClientRect();
      const logo = footer.querySelector(".footer-brand").getBoundingClientRect();
      const targets = [...footer.querySelectorAll("a, h2, .footer-art, .footer-intro-copy, .footer-colophon")];
      return {
        overflow: document.documentElement.scrollWidth - viewport,
        viewportSize: Math.abs(bounds.width - viewport) < 1 && Math.abs(bounds.height - innerHeight) < 1,
        shellOverflow: shell.scrollHeight - shell.clientHeight,
        clipped: targets.filter((element) => {
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return false;
          return rect.left < bounds.left - 1 || rect.right > bounds.right + 1
            || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1
            || (!element.matches(".footer-art") && element.scrollWidth > element.clientWidth + 1);
        }).map((element) => element.textContent.trim()),
        heroClipped: [...footer.querySelectorAll("h2, .footer-actions, .footer-eyebrow, .footer-intro-copy, .footer-art")].filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.height && (rect.top < hero.top - 1 || rect.bottom > hero.bottom + 1);
        }).map((element) => element.className),
        smallLinks: [...footer.querySelectorAll("a")].filter((element) => element.getBoundingClientRect().height < 24).length,
        compactPolicies: policyLinks.every((link) => link.height >= 24 && link.height <= 44),
        twoColumns: menu.right < policyHeading.left && Math.abs(menu.top - policyHeading.top) < 1,
        verticalNavigation: menuLinks.every((link, index) => Math.abs(link.left - menuLinks[0].left) < 1
          && (!index || link.top >= menuLinks[index - 1].bottom)),
        largeMenu: viewport < 1024 || innerHeight <= 600 || parseFloat(getComputedStyle(footer.querySelector(".footer-playful-link")).fontSize) >= 30,
        alignedPolicies: policyLinks.every((link, index) => Math.abs(link.left - policyLinks[index % policyColumns].left) < 1
          && Math.abs(link.width - policyLinks[0].width) < 1),
        alignedDetails: Math.abs(contact.left - policyHeading.left) < 1 && Math.abs(logo.right - policies.right) < 1,
        groupedContact: viewport < 640 ? contact.bottom <= logo.top : Math.abs(contact.bottom - logo.bottom) < 1,
        containedArt: !footer.querySelector(".footer-art").getBoundingClientRect().width
          || Math.abs(footer.querySelector(".footer-art").getBoundingClientRect().right - shell.getBoundingClientRect().right) < 1,
        rightColumnOrder: policies.bottom <= Math.min(contact.top, logo.top),
        curved: parseFloat(css.borderTopLeftRadius) >= 32 && parseFloat(css.borderTopRightRadius) >= 32,
        citron: css.backgroundColor === getComputedStyle(document.documentElement).getPropertyValue("--color-citron").trim()
          || css.backgroundColor === "rgb(204, 207, 90)",
      };
    });
    expect(layout, `Footer layout at ${width}x${height}`).toEqual({
      overflow: 0, viewportSize: true, shellOverflow: 0, clipped: [], heroClipped: [],
      smallLinks: 0, compactPolicies: true, twoColumns: true, verticalNavigation: true, largeMenu: true,
      alignedPolicies: true, alignedDetails: true, groupedContact: true, containedArt: true, rightColumnOrder: true, curved: true, citron: true,
    });
  }
});

test("policy buttons have hand-drawn outlines, smooth focus effects and reduced-motion support", async ({ page }, testInfo) => {
  await page.goto("/our-story/");
  const footer = page.locator("[data-site-footer]");
  const policies = footer.getByRole("navigation", { name: "Policy documents" }).getByRole("link");
  const policy = policies.first();
  await expect(footer.locator(".footer-divider")).toHaveCount(3);
  for (const selector of [".footer-directory", ".footer-details", ".footer-colophon"]) {
    const widths = await footer.locator(selector).evaluate((element) => {
      const css = getComputedStyle(element);
      return [css.borderTopWidth, css.borderLeftWidth, css.borderBottomWidth];
    });
    expect(widths).toEqual(["0px", "0px", "0px"]);
  }
  await expect(policy.locator(".footer-policy-outline")).toHaveAttribute("aria-hidden", "true");
  expect(await policy.evaluate((element) => getComputedStyle(element, "::before").opacity)).toBe("0");
  await policy.focus();
  await expect(policy).toBeFocused();
  await expect(policy).toHaveCSS("outline-style", "solid");
  await expect.poll(() => policy.evaluate((element) => getComputedStyle(element, "::before").opacity)).toBe("1");
  expect(await policy.evaluate((element) => getComputedStyle(element, "::before").transitionDuration)).toBe("0.3s, 0.45s");
  await page.keyboard.press("Tab");
  await expect(policies.nth(1)).toBeFocused();
  if (testInfo.project.name === "desktop") {
    await policy.hover();
    await expect.poll(() => policy.evaluate((element) => getComputedStyle(element, "::before").opacity)).toBe("1");
    await expect.poll(() => policy.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
    await page.mouse.move(0, 0);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await policy.focus();
  expect(await policy.evaluate((element) => getComputedStyle(element, "::before").transitionDuration)).toBe("0s");
  await expect(policy.locator(".footer-policy-arrow")).toHaveCSS("transform", "none");
  const social = footer.getByRole("navigation", { name: "Social media" }).getByRole("link").first();
  await social.focus();
  await expect(social).toBeFocused();
  await expect(social).toHaveCSS("outline-style", "solid");
  await expect(social.locator("svg")).toHaveCSS("transform", "none");
});

test("the supplied hand replaces the old characters and stars animate on entry", async ({ page }) => {
  await page.goto("/our-story/");
  const footer = page.locator("[data-site-footer]");
  await expect(footer).not.toHaveAttribute("data-footer-in-view");
  await footer.locator(".footer-art").scrollIntoViewIfNeeded();
  await expect(footer).toHaveAttribute("data-footer-in-view", "");
  await expect(footer.locator(".footer-hand")).toHaveAttribute("src", "/illustrations/hand.webp");
  expect(await footer.locator(".footer-hand").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(footer.locator(".serving-cloche, .serving-egg, .serving-cup, .serving-plate")).toHaveCount(0);
  const spark = footer.locator(".serving-spark-one");
  await expect(spark).toHaveCSS("animation-name", "footer-spark-arrive");
  expect(await footer.evaluate((element) =>
    element.getAnimations({ subtree: true }).every((animation) => animation.effect.getTiming().iterations !== Infinity)
  )).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(spark).toHaveCSS("animation-name", "none");
  await expect(footer.getByRole("heading", { level: 2 })).toHaveCSS("opacity", "1");
});

test("hover moves the stars smoothly without moving the supplied artwork", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Hover decoration is reserved for fine pointers.");
  await page.goto("/our-story/");
  const art = page.locator(".footer-illustration");
  await art.scrollIntoViewIfNeeded();
  await art.evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished));
  });
  const spark = art.locator(".serving-spark-one");
  await page.mouse.move(0, 0);
  await expect(spark).toHaveCSS("transform", "none");
  await art.hover();
  await expect.poll(() => spark.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
  await expect(art.locator(".footer-hand")).toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(spark).toHaveCSS("transform", "none");
});

test("playful lettering is keyboard accessible and disabled for reduced motion", async ({ page }) => {
  await page.goto("/our-story/");
  const footer = page.locator("[data-site-footer]");
  const navigation = footer.getByRole("navigation", { name: "Footer navigation" });
  const home = navigation.getByRole("link", { name: "Home", exact: true });
  await home.focus();
  await expect(home).toBeFocused();
  await expect(home).toHaveCSS("outline-style", "solid");
  await expect(home.locator(".footer-link-letters > span").first()).toHaveCSS("animation-name", "footer-letter-hop");
  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("link", { name: "Jobs", exact: true })).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await home.focus();
  await expect(home.locator(".footer-link-letters > span").first()).toHaveCSS("animation-name", "none");
});

test("footer text and shared button colours meet AA contrast", async ({ page }) => {
  await page.goto("/our-story/");
  const footer = page.locator("[data-site-footer]");
  const contrast = await footer.evaluate((element) => {
    const luminance = (rgb) => {
      const values = rgb.match(/[\d.]+/g).slice(0, 3).map((value) => {
        const channel = Number(value) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const ratio = (foreground, background) => {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const css = getComputedStyle(element);
    const button = getComputedStyle(element.querySelector('[data-button-variant="primary"]'));
    return {
      body: ratio(css.color, css.backgroundColor),
      button: ratio(button.color, button.backgroundColor),
    };
  });
  expect(contrast.body).toBeGreaterThanOrEqual(4.5);
  expect(contrast.button).toBeGreaterThanOrEqual(4.5);
});

test("franchising retains its back-to-top action", async ({ page }) => {
  await page.goto("/franchising/");
  const footer = page.locator("[data-site-footer]");
  await footer.getByRole("link", { name: "Back to top" }).click();
  await expect(page.locator("#franchise-title")).toBeFocused();
  await expect(page).toHaveURL(/#franchise-title$/);
});

test("all main pages share the footer and Astro navigation reinitializes it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/jobs/", "/team/", "/recruit-talent/", "/franchising/", "/sustainability-impact/", "/"]) {
    await page.goto(route);
    await expect(page.locator("[data-site-footer]")).toHaveCount(1);
    await expect(page.locator("[data-site-footer]").getByRole("navigation", { name: "Policy documents" }).getByRole("link")).toHaveCount(4);
  }
  await page.goto("/franchising/");
  await page.locator("[data-site-footer]").getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Our story", exact: true }).click();
  await expect(page).toHaveURL(/\/our-story\/$/);
  const art = page.locator("[data-site-footer] .footer-art");
  await art.scrollIntoViewIfNeeded();
  await expect(page.locator("[data-site-footer]")).toHaveAttribute("data-footer-in-view", "");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("all footer content remains visible and functional", async ({ page }) => {
    await page.goto("/our-story/");
    const footer = page.locator("[data-site-footer]");
    await expect(footer.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(footer.locator(".footer-art")).toBeVisible();
    await expect(footer.getByRole("navigation", { name: "Policy documents" }).getByRole("link")).toHaveCount(4);
    await footer.locator(".footer-actions").getByRole("link", { name: "Find work", exact: true }).click();
    await expect(page).toHaveURL(/\/jobs\/$/);
  });
});
