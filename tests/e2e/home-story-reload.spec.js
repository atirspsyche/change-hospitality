import { expect, test } from "@playwright/test";
import { homeStory } from "../../src/data/homeStory.ts";
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
  { name: "the new shell exit", progress: storyTimeline.progressForFrame(134) },
  { name: "the new plate entrance", progress: storyTimeline.progressForFrame(266) },
  {
    name: "the franchise map beat",
    progress: (() => {
      const beat = storyTimeline.overlayWindows.find(({ id }) => id === "plate-center-next");
      return (beat.progressStart + beat.progressEnd) / 2;
    })(),
  },
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

test("new sequence renders coded shells and holds the cleared plate for both existing reveals", async ({ page }, testInfo) => {
  const requestedFrames = new Set();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith(homeStory.desktopFramePrefix)) {
      requestedFrames.add(Number(path.slice(homeStory.desktopFramePrefix.length, -5)));
    }
  });
  await page.goto("/");
  await waitForStory(page);
  const checkpoints = [
    { name: "shell-start", frame: 130, scene: "shells" },
    { name: "shell-moving", frame: 134, scene: "shells" },
    { name: "shell-exit", frame: 138, scene: "shells" },
    { name: "plate-hand-entrance", frame: 254, scene: "sequence" },
    { name: "plate-hand-rotation", frame: 266, scene: "sequence" },
    ...["plate-center", "plate-center-next"].map((id) => {
      const overlay = storyTimeline.overlayWindows.find((beat) => beat.id === id);
      return { name: id, frame: 282, scene: "plate", progress: (overlay.progressStart + overlay.progressEnd) / 2, overlay: id };
    }),
    { name: "coded-cutlery", frame: 305, scene: "cutlery" },
  ];
  const fingerprints = new Map();
  for (const checkpoint of checkpoints) {
    const progress = checkpoint.progress ?? storyTimeline.progressForFrame(checkpoint.frame);
    await page.evaluate(({ progress, screens }) => {
      const spacer = document.querySelector(".story-hero").parentElement;
      const start = spacer.getBoundingClientRect().top + scrollY;
      scrollTo({ top: start + innerHeight * screens * progress, behavior: "instant" });
    }, { progress, screens: storyTimeline.scrollScreens });
    await expect.poll(async () => Math.abs((await readStory(page)).frame - checkpoint.frame)).toBeLessThan(0.08);
    const state = await readStory(page);
    expect(state.scene).toBe(checkpoint.scene);
    if (checkpoint.overlay) expect(state.overlays).toEqual([checkpoint.overlay]);
    const pixels = await page.locator(".story-canvas").evaluate((canvas) => {
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set();
      let fingerprint = 2166136261;
      for (let pixelIndex = 0; pixelIndex < data.length; pixelIndex += 4 * 97) {
        const color = (data[pixelIndex] << 16) | (data[pixelIndex + 1] << 8) | data[pixelIndex + 2];
        colors.add(color);
        fingerprint = Math.imul(fingerprint ^ color, 16777619) >>> 0;
      }
      return { fingerprint, colors: colors.size };
    });
    expect(pixels.colors).toBeGreaterThan(16);
    fingerprints.set(checkpoint.name, pixels.fingerprint);
    await page.screenshot({ path: testInfo.outputPath(`new-story-${checkpoint.name}.png`) });
  }
  if (testInfo.project.name === "desktop") {
    expect(fingerprints.get("shell-start")).not.toBe(fingerprints.get("shell-moving"));
    expect(fingerprints.get("shell-moving")).not.toBe(fingerprints.get("shell-exit"));
  }
  expect(fingerprints.get("plate-hand-entrance")).not.toBe(fingerprints.get("plate-hand-rotation"));
  expect(fingerprints.get("plate-center")).toBe(fingerprints.get("plate-center-next"));
  expect(fingerprints.get("plate-center-next")).not.toBe(fingerprints.get("coded-cutlery"));
  expect(requestedFrames.has(254)).toBe(true);
  expect(requestedFrames.has(266)).toBe(true);
  expect([...requestedFrames].every((frame) => !(frame >= 67 && frame <= 108)
    && !(frame >= 130 && frame <= 137) && frame <= 282)).toBe(true);
});

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
