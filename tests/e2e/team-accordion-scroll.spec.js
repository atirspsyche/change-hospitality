import { expect, test } from "@playwright/test";

async function expectAnchoredToggle(trigger, activate) {
  await trigger.evaluate((element) => {
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 180, behavior: "instant" });
  });
  await expect.poll(() => trigger.evaluate((element) => Math.abs(element.getBoundingClientRect().top - 180)))
    .toBeLessThanOrEqual(2);
  await expect(trigger).toBeInViewport({ ratio: 1 });

  const observation = await trigger.evaluateHandle((element) => {
    const initialTop = element.getBoundingClientRect().top;
    const initialY = window.scrollY;
    return {
      finished: new Promise((resolve) => {
        element.addEventListener("click", () => {
          const tops = [element.getBoundingClientRect().top];
          const start = performance.now();
          const afterFrame = () => {
            requestAnimationFrame((now) => setTimeout(() => sample(now), 0));
          };
          const sample = (now) => {
            tops.push(element.getBoundingClientRect().top);
            if (now - start >= 900) {
              resolve({ initialTop, initialY, finalY: window.scrollY, minTop: Math.min(...tops), maxTop: Math.max(...tops) });
            } else {
              afterFrame();
            }
          };
          afterFrame();
        }, { once: true });
      }),
    };
  });

  try {
    await activate();
    const result = await observation.evaluate((value) => value.finished);
    expect(result.minTop).toBeGreaterThanOrEqual(result.initialTop - 2);
    expect(result.maxTop).toBeLessThanOrEqual(result.initialTop + 2);
    return result;
  } finally {
    await observation.dispose();
  }
}

for (const reducedMotion of ["no-preference", "reduce"]) {
  test.describe(`office scrolling with ${reducedMotion} motion`, () => {
    test.use({ reducedMotion });

    for (const input of ["pointer", "keyboard"]) {
      test(`switching a tall office keeps the clicked heading visible with ${input} input`, async ({ page }) => {
        await page.goto("/team/#profiles");
        await page.evaluate(() => document.fonts.ready);
        const offices = page.locator("[data-accordion-item]");
        const first = offices.first();
        await expect(first.locator("[data-team-directory]")).toHaveAttribute("data-ready", "true");
        expect(await first.locator("[data-accordion-panel]").evaluate((element) => element.getBoundingClientRect().height))
          .toBeGreaterThan(page.viewportSize().height);
        if (reducedMotion === "no-preference") {
          await expect(page.locator("html")).toHaveClass(/\blenis\b/);
        } else {
          await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
        }

        const next = offices.nth(1).locator("[data-accordion-trigger]");
        const activateNext = () => input === "keyboard" ? next.press("Enter") : next.click();
        const result = await expectAnchoredToggle(next, activateNext);
        expect(result.initialY - result.finalY).toBeGreaterThan(200);
        await expect(next).toHaveAttribute("aria-expanded", "true");
        await expect(next).toBeFocused();
        await expect(first.locator("[data-accordion-trigger]")).toHaveAttribute("aria-expanded", "false");
        await expect(first.locator("[data-accordion-panel]")).toHaveAttribute("inert", "");
        await expect(offices.nth(1).locator("[data-team-directory]")).toHaveAttribute("data-ready", "true");

        await expectAnchoredToggle(next, activateNext);
        await expect(next).toHaveAttribute("aria-expanded", "false");

        const previous = first.locator("[data-accordion-trigger]");
        await expectAnchoredToggle(previous, () => input === "keyboard" ? previous.press("Enter") : previous.click());
        await expect(previous).toHaveAttribute("aria-expanded", "true");
      });
    }
  });
}

test("quickly reversing an office transition keeps the heading anchored", async ({ page }) => {
  await page.goto("/team/#profiles");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-team-directory]").first()).toHaveAttribute("data-ready", "true");
  const trigger = page.locator("[data-accordion-trigger]").nth(1);
  await expectAnchoredToggle(trigger, async () => {
    await trigger.click();
    await page.waitForTimeout(80);
    await trigger.press("Enter");
  });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("manual scrolling interrupts heading anchoring during an office transition", async ({ page }) => {
  await page.goto("/team/#profiles");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-team-directory]").first()).toHaveAttribute("data-ready", "true");
  const triggers = page.locator("[data-accordion-trigger]");
  const next = triggers.nth(1);
  await expectAnchoredToggle(next, () => next.click());

  const previous = triggers.first();
  await previous.evaluate((element) => {
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 180, behavior: "instant" });
  });
  await previous.click();
  await page.waitForTimeout(100);
  const initialY = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate((y) => window.scrollY - y, initialY)).toBeGreaterThan(200);
  await page.waitForTimeout(700);
  expect(await page.evaluate((y) => window.scrollY - y, initialY)).toBeGreaterThan(200);
  await expect(previous).toHaveAttribute("aria-expanded", "true");
});
