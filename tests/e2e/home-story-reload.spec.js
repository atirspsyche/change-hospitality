import { expect, test } from "@playwright/test";
import { frameForProgress, storyTimeline } from "../../src/lib/homeStoryTimeline.ts";

async function waitForStory(page) {
  await expect(page.locator("html")).toHaveAttribute("data-home-story-ready", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-story-loading", "");
  await expect(page.locator(".story-experience")).not.toHaveClass(/is-failed/);
}

async function readStory(page) {
  return page.evaluate((screens) => {
    const hero = document.querySelector(".story-hero");
    const spacer = hero.parentElement;
    return {
      y: scrollY,
      frame: Number(hero.dataset.storyFrame),
      scene: hero.dataset.storyScene,
      start: spacer.getBoundingClientRect().top + scrollY,
      distance: innerHeight * screens,
      overlays: [...hero.querySelectorAll("[data-story-overlay]")]
        .filter((overlay) => getComputedStyle(overlay).visibility === "visible" && Number(getComputedStyle(overlay).opacity) > 0.5)
        .map((overlay) => overlay.dataset.storyOverlay),
    };
  }, storyTimeline.scrollScreens);
}

const positions = [
  { name: "the first frame", progress: 0 },
  { name: "the frame-70 hold", progress: 0.25 },
  { name: "halfway through the animation", progress: 0.5 },
  { name: "the plate copy", progress: 0.8 },
  { name: "the closing animation", progress: 0.97 },
  { name: "the locations section", selector: "#locations" },
  { name: "the footer", selector: ".site-footer" },
];

for (const position of positions) {
  test(`reload preserves ${position.name} before any scroll input`, async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener("story-loading-end", () => {
        window.__storyAtUnlock = {
          y: scrollY,
          frame: Number(document.querySelector(".story-hero")?.dataset.storyFrame),
        };
      });
    });
    await page.goto("/");
    await waitForStory(page);
    await page.evaluate(({ progress, selector, screens }) => {
      const top = selector
        ? document.querySelector(selector).getBoundingClientRect().top + scrollY + 50
        : innerHeight * screens * progress;
      scrollTo({ top, behavior: "instant" });
    }, { ...position, screens: storyTimeline.scrollScreens });
    if (position.progress !== 0) await page.mouse.wheel(0, 1);
    await expect(page.locator("html")).not.toHaveClass(/lenis-scrolling/);

    await expect.poll(async () => {
      const state = await readStory(page);
      return Math.abs(state.frame - frameForProgress((state.y - state.start) / state.distance));
    }).toBeLessThan(0.05);
    await expect.poll(() => page.evaluate(() => Math.abs((history.state?.scrollY ?? 0) - scrollY))).toBeLessThanOrEqual(1);
    const before = await readStory(page);

    await page.reload();
    await waitForStory(page);
    const restored = await readStory(page);
    expect(Math.abs(restored.y - before.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(restored.frame - before.frame)).toBeLessThan(0.1);
    expect(restored.scene).toBe(before.scene);
    expect(restored.overlays).toEqual(before.overlays);
    const unlocked = await page.evaluate(() => window.__storyAtUnlock);
    expect(Math.abs(unlocked.y - before.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(unlocked.frame - before.frame)).toBeLessThan(0.1);

    await page.mouse.wheel(0, 10);
    await expect.poll(() => page.evaluate((y) => {
      const target = Math.min(y + 10, document.documentElement.scrollHeight - innerHeight);
      return Math.abs(scrollY - target);
    }, restored.y)).toBeLessThanOrEqual(1);
    await expect.poll(async () => {
      const state = await readStory(page);
      return Math.abs(state.frame - frameForProgress((state.y - state.start) / state.distance));
    }).toBeLessThan(0.1);
    const afterWheel = await readStory(page);
    expect(Math.abs(afterWheel.y - restored.y)).toBeLessThanOrEqual(12);
    expect(Math.abs(afterWheel.frame - restored.frame)).toBeLessThan(2);
  });
}

test("reduced motion keeps the readable story without reserved pin space", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await waitForStory(page);
  await expect(page.locator(".story-hero")).toBeHidden();
  await expect(page.locator(".story-reduced")).toBeVisible();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  expect(await page.locator(".story-experience").evaluate((element) => getComputedStyle(element).minHeight)).toBe("0px");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the readable story has no reserved pin space or loading overlay", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".story-hero")).toBeHidden();
    await expect(page.locator(".story-reduced")).toBeVisible();
    await expect(page.locator("[data-story-loading-screen]")).toBeHidden();
    expect(await page.locator(".story-experience").evaluate((element) => getComputedStyle(element).minHeight)).toBe("0px");
  });
});

test("failed story assets release the reserved space into the readable fallback", async ({ page }) => {
  await page.route("**/story_sequence/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-home-story-fallback", "true");
  await expect(page.locator("html")).toHaveAttribute("data-home-story-ready", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-story-loading", "");
  await expect(page.locator(".story-hero")).toBeHidden();
  await expect(page.locator(".story-reduced")).toBeVisible();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  expect(await page.locator(".story-experience").evaluate((element) => getComputedStyle(element).minHeight)).toBe("0px");
});
