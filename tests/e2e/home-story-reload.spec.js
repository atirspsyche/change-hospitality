import { expect, test } from "@playwright/test";
import { getStoryFrameUrl, homeStory } from "../../src/data/homeStory.ts";
import { frameForProgress, mobileStoryBeats, mobileStoryTimeline, storyTimeline } from "../../src/lib/homeStoryTimeline.ts";
import { getMobileStoryScene } from "../../src/lib/homeStoryScene.ts";

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
      layout: hero.dataset.storyLayout,
      start: spacer.getBoundingClientRect().top + scrollY,
      distance: Number.parseFloat(getComputedStyle(spacer).paddingBottom)
        || (hero.dataset.storyLayout === "mobile" ? hero.clientHeight : innerHeight) * screens,
      overlays: [...hero.querySelectorAll("[data-story-overlay]")]
        .filter((overlay) => getComputedStyle(overlay).visibility === "visible" && Number(getComputedStyle(overlay).opacity) > 0.5)
        .map((overlay) => overlay.dataset.storyOverlay),
    };
  }, storyTimeline.scrollScreens);
}

async function expectNaturalSequenceFrame(page, frame, mobile = false) {
  const size = await page.locator(".story-canvas").evaluate((canvas) => ({
    width: canvas.width, height: canvas.height, position: Number(canvas.closest(".story-hero").dataset.storyFrame),
  }));
  const layer = mobile ? getMobileStoryScene(size.position, size.width, size.height).layers[0] : { y: 0, height: size.height };
  const pixels = await page.locator(".story-canvas").evaluate(async (canvas, { src, layer }) => {
    const image = await createImageBitmap(await (await fetch(src)).blob());
    const sourceWidth = image.width;
    const sourceHeight = image.height;
    const reference = document.createElement("canvas");
    reference.width = canvas.width;
    reference.height = canvas.height;
    const drawWidth = layer.height / sourceHeight * sourceWidth;
    reference.getContext("2d").drawImage(image, (canvas.width - drawWidth) / 2, layer.y, drawWidth, layer.height);
    image.close();
    const expected = reference.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const actual = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let compared = 0;
    let mismatches = 0;
    for (let pixelIndex = 0; pixelIndex < expected.length; pixelIndex += 4 * 97) {
      if (expected[pixelIndex + 3] !== 255) continue;
      compared += 1;
      if ([0, 1, 2].some((channel) => Math.abs(actual[pixelIndex + channel] - expected[pixelIndex + channel]) > 2)) {
        mismatches += 1;
      }
    }
    return { compared, mismatchRatio: mismatches / compared, sourceWidth };
  }, { src: getStoryFrameUrl(frame), layer });
  expect(pixels.compared).toBeGreaterThan(100);
  expect(pixels.sourceWidth).toBe(frame < 282 ? 2500 : 1920);
  expect(pixels.mismatchRatio, `natural-aspect pixels at frame ${frame}`).toBeLessThan(0.005);
}

function chapterMidpoint(timeline, id) {
  const chapter = timeline.overlayWindows.find((window) => window.id === id);
  return (chapter.progressStart + chapter.progressEnd) / 2;
}

async function seekMobileChapter(page, id) {
  const progress = chapterMidpoint(mobileStoryTimeline, id);
  await page.evaluate(({ progress, screens }) => {
    const hero = document.querySelector(".story-hero");
    const start = hero.parentElement.getBoundingClientRect().top + scrollY;
    const distance = Number.parseFloat(getComputedStyle(hero.parentElement).paddingBottom) || hero.clientHeight * screens;
    scrollTo({ top: start + distance * progress, behavior: "instant" });
  }, { progress, screens: mobileStoryTimeline.scrollScreens });
  const chapter = page.locator(`.story-mobile-chapter[data-story-overlay="${id}"]`);
  await expect(page.locator(".story-hero")).toHaveAttribute("data-story-mobile-chapter", id);
  await expect(chapter).toHaveCSS("opacity", "1");
  await expect.poll(async () => Math.abs((await readStory(page)).frame - frameForProgress(progress, mobileStoryTimeline))).toBeLessThan(0.002);
  return chapter;
}

const positions = [
  { name: "the first frame", progress: 0 },
  { name: "the frame-70 hold", progress: 0.25, mobileProgress: chapterMidpoint(mobileStoryTimeline, "egg-in-hand") },
  { name: "halfway through the animation", progress: 0.5 },
  { name: "the plate copy", progress: 0.8, mobileProgress: chapterMidpoint(mobileStoryTimeline, "plate-center-1") },
  { name: "the closing animation", progress: 0.97 },
  { name: "the new shell exit", progress: storyTimeline.progressForFrame(134), mobileProgress: mobileStoryTimeline.progressForFrame(134) },
  { name: "the new plate entrance", progress: storyTimeline.progressForFrame(266), mobileProgress: mobileStoryTimeline.progressForFrame(266) },
  {
    name: "the franchise map beat",
    progress: (() => {
      const beat = storyTimeline.overlayWindows.find(({ id }) => id === "plate-center-next");
      return (beat.progressStart + beat.progressEnd) / 2;
    })(),
    mobileProgress: chapterMidpoint(mobileStoryTimeline, "plate-center-next"),
  },
  { name: "the footer", selector: ".site-footer" },
];

for (const position of positions) {
  test(`reload preserves ${position.name} before any scroll input`, async ({ page }, testInfo) => {
    const progress = testInfo.project.name === "mobile" ? position.mobileProgress ?? position.progress : position.progress;
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
        : document.querySelector(".story-hero").clientHeight * screens * progress;
      scrollTo({ top, behavior: "instant" });
    }, { ...position, progress, screens: storyTimeline.scrollScreens });
    if (position.progress !== 0) await page.mouse.wheel(0, 1);
    await expect(page.locator("html")).not.toHaveClass(/lenis-scrolling/);

    await expect.poll(async () => {
      const state = await readStory(page);
      return Math.abs(state.frame - frameForProgress((state.y - state.start) / state.distance,
        state.layout === "mobile" ? mobileStoryTimeline : storyTimeline));
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
      return Math.abs(state.frame - frameForProgress((state.y - state.start) / state.distance,
        state.layout === "mobile" ? mobileStoryTimeline : storyTimeline));
    }).toBeLessThan(0.1);
    const afterWheel = await readStory(page);
    expect(Math.abs(afterWheel.y - restored.y)).toBeLessThanOrEqual(12);
    expect(Math.abs(afterWheel.frame - restored.frame)).toBeLessThan(2);
  });
}

test("new sequence renders coded shells and holds the cleared plate for both existing reveals", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  const timeline = mobile ? mobileStoryTimeline : storyTimeline;
  const requestedFrames = new Set();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith(homeStory.desktopFramePrefix)) {
      const frame = Number(path.slice(homeStory.desktopFramePrefix.length, -5));
      if (Number.isInteger(frame)) requestedFrames.add(frame);
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
    { name: "plate-hand-extended-sleeve", frame: 280, scene: "sequence" },
    { name: "plate-hand-last-wide-frame", frame: 281, scene: "sequence" },
    { name: "plate-cleared-boundary", frame: 282, scene: "plate" },
    ...(mobile ? ["plate-center-1", "plate-center-2", "plate-center-next"] : ["plate-center", "plate-center-next"]).map((id) => {
      const overlay = timeline.overlayWindows.find((beat) => beat.id === id);
      return { name: id, frame: 282, scene: "plate", progress: (overlay.progressStart + overlay.progressEnd) / 2, overlay: id };
    }),
    { name: "coded-cutlery", frame: 305, scene: "cutlery" },
  ];
  const fingerprints = new Map();
  for (const checkpoint of checkpoints) {
    const progress = checkpoint.progress ?? timeline.progressForFrame(checkpoint.frame);
    await page.evaluate(({ progress, screens }) => {
      const spacer = document.querySelector(".story-hero").parentElement;
      const start = spacer.getBoundingClientRect().top + scrollY;
      const height = document.querySelector(".story-hero").clientHeight;
      const distance = Number.parseFloat(getComputedStyle(spacer).paddingBottom) || height * screens;
      scrollTo({ top: Math.ceil(start + distance * progress), behavior: "instant" });
    }, { progress, screens: timeline.scrollScreens });
    await expect.poll(async () => {
      const state = await readStory(page);
      return Math.abs(state.frame - frameForProgress((state.y - state.start) / state.distance, timeline));
    }).toBeLessThan(0.002);
    const state = await readStory(page);
    expect(Math.abs(state.frame - checkpoint.frame)).toBeLessThan(mobile ? 0.2 : 0.08);
    expect(state.scene).toBe(checkpoint.scene);
    if (checkpoint.overlay) expect(state.overlays).toEqual([checkpoint.overlay]);
    if (checkpoint.frame >= 249 && checkpoint.frame <= 282) await expectNaturalSequenceFrame(page, checkpoint.frame, mobile);
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
  expect(fingerprints.get(mobile ? "plate-center-1" : "plate-center")).toBe(fingerprints.get("plate-center-next"));
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

test.describe("mobile story composition", () => {
  test.skip(({ isMobile }) => !isMobile, "Phone-specific layout and touch checks");

  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    test(`${viewport.width}x${viewport.height}: every chapter reserves readable copy, artwork and reachable actions`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await waitForStory(page);
      await expect(page.locator(".story-hero")).toHaveAttribute("data-story-layout", "mobile");
      await expect(page.locator('.story-mobile-chapter[data-story-overlay="carton-open-brand"]')).toHaveCSS("opacity", "1");
      await expect(page.getByRole("heading", { level: 1, name: "Specialists in hospitality recruitment and staffing" })).toBeVisible();
      for (const window of mobileStoryTimeline.overlayWindows) {
        const chapter = await seekMobileChapter(page, window.id);
        await expect(chapter.getByRole("heading")).toBeVisible();
        const bounds = await chapter.evaluate((element) => {
          const box = (target) => {
            const rect = target.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height };
          };
          const canvas = document.querySelector(".story-canvas");
          const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
          const colors = new Set();
          for (let index = 0; index < data.length; index += 388) colors.add(`${data[index]},${data[index + 1]},${data[index + 2]}`);
          return {
            lead: box(element.querySelector(".story-mobile-lead")),
            stage: box(canvas),
            details: box(element.querySelector(".story-mobile-details")),
            header: box(document.querySelector(".funmenu-bar")),
            hero: box(document.querySelector(".story-hero")),
            overflow: document.documentElement.scrollWidth > innerWidth,
            colors: colors.size,
          };
        });
        expect(bounds.lead.top).toBeGreaterThanOrEqual(bounds.header.bottom);
        expect(bounds.stage.top - bounds.lead.bottom).toBeGreaterThanOrEqual(11);
        expect(bounds.details.top - bounds.stage.bottom).toBeGreaterThanOrEqual(11);
        expect(bounds.details.bottom).toBeLessThanOrEqual(bounds.hero.bottom - 19);
        expect(bounds.stage.height).toBeGreaterThanOrEqual(96);
        expect(bounds.overflow).toBe(false);
        expect(bounds.colors).toBeGreaterThan(16);
        const contrast = await chapter.evaluate((element) => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const context = canvas.getContext("2d");
          const luminance = (color) => {
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
              .map((channel) => channel / 255)
              .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          };
          const background = luminance(getComputedStyle(document.querySelector(".story-hero")).backgroundColor);
          return [...element.querySelectorAll(".story-mobile-heading, .story-mobile-body, .story-mobile-eyebrow")].map((text) => {
            const foreground = luminance(getComputedStyle(text).color);
            return { ratio: (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05), minimum: text.matches(".story-mobile-heading") ? 3 : 4.5 };
          });
        });
        for (const text of contrast) expect(text.ratio).toBeGreaterThanOrEqual(text.minimum);
        const action = mobileStoryBeats.find((beat) => beat.id === window.id).overlay.action;
        if (action) {
          await expect(chapter.locator("a")).toHaveAttribute("href", action.href);
          const button = await chapter.locator("a").boundingBox();
          expect(button.height).toBeGreaterThanOrEqual(44);
          expect(button.y + button.height).toBeLessThanOrEqual(viewport.height - 19);
        }
        if (window.id === "plate-center-next") {
          const offices = page.locator(".story-mobile-map .office-marker__button");
          await expect(offices).toHaveCount(3);
          for (const office of await offices.all()) {
            const hit = await office.evaluate((button) => {
              const rect = button.getBoundingClientRect();
              return { top: rect.top, bottom: rect.bottom, height: rect.height, reachable: button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) };
            });
            expect(hit.reachable).toBe(true);
            expect(hit.height).toBeGreaterThanOrEqual(44);
            expect(hit.top).toBeGreaterThanOrEqual(bounds.stage.top);
            expect(hit.bottom).toBeLessThanOrEqual(bounds.stage.bottom);
            await office.tap();
            await expect(office).toHaveAttribute("aria-expanded", "true");
            const panel = page.locator(".story-mobile-map .office-marker__card[aria-hidden='false']");
            await expect(panel).toBeVisible();
            const panelBounds = await panel.boundingBox();
            expect(panelBounds.y).toBeGreaterThanOrEqual(bounds.stage.top);
            expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(bounds.stage.bottom);
            await page.keyboard.press("Escape");
            await expect(office).toHaveAttribute("aria-expanded", "false");
          }
        }
        await page.screenshot({ path: testInfo.outputPath(`mobile-${window.id}.png`), animations: "disabled" });
      }
      expect(errors).toEqual([]);
    });
  }

  test("browser toolbars and notch safe areas leave the CTA reachable and reload correctly", async ({ page }) => {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
    await page.goto("/");
    await waitForStory(page);
    await session.send("Emulation.setSmallViewportHeightDifferenceOverride", { difference: 120 });
    await expect(page.locator(".story-hero")).toHaveCSS("height", "724px");
    const chapter = await seekMobileChapter(page, "final-plate");
    const button = await chapter.locator("a").boundingBox();
    expect(button.y + button.height).toBeLessThanOrEqual(724 - 34 - 20);
    const before = await readStory(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await session.send("Emulation.setSmallViewportHeightDifferenceOverride", { difference: 120 });
    await waitForStory(page);
    const restored = await readStory(page);
    expect(Math.abs(restored.y - before.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(restored.frame - before.frame)).toBeLessThan(0.1);
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
  });

  test("touch scrolling advances the sequence and the job CTA supports keyboard navigation", async ({ page }) => {
    await page.goto("/");
    await waitForStory(page);
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: 650 }] });
    for (const position of [550, 450, 350, 250]) {
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 190, y: position }] });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(async () => (await readStory(page)).frame).toBeGreaterThan(1);
    const chapter = await seekMobileChapter(page, "egg-transition-2");
    const scrollBeforeMenu = await page.evaluate(() => scrollY);
    const toggle = page.locator("[data-funmenu-toggle]");
    await toggle.click();
    await expect(page.locator("[data-funmenu-overlay]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(page.locator("[data-funmenu-overlay]")).toBeHidden();
    expect(Math.abs(await page.evaluate(() => scrollY) - scrollBeforeMenu)).toBeLessThanOrEqual(1);
    await chapter.locator("a").focus();
    await expect(chapter.locator("a")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/jobs\/$/);
    await page.goBack();
    await waitForStory(page);
    await expect(page.locator(".story-hero")).toHaveAttribute("data-story-layout", "mobile");
  });

  test("switching between phone and desktop removes stale map state and duplicate pins", async ({ page }) => {
    await page.goto("/");
    await waitForStory(page);
    await seekMobileChapter(page, "plate-center-next");
    await expect(page.locator(".story-canvas")).toHaveCSS("opacity", "0");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator(".story-hero")).toHaveAttribute("data-story-layout", "desktop");
    await expect(page.locator(".story-canvas")).toHaveCSS("opacity", "1");
    await expect(page.locator(".story-mobile-overlays")).toBeHidden();
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".story-hero")).toHaveAttribute("data-story-layout", "mobile");
    await seekMobileChapter(page, "egg-in-hand");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
  });

  test("short landscape screens use the readable story instead of clipping the controls", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await waitForStory(page);
    await expect(page.locator("html")).toHaveAttribute("data-home-story-fallback", "true");
    await expect(page.locator(".story-hero")).toBeHidden();
    await expect(page.locator(".story-reduced")).toBeVisible();
    await expect(page.locator(".story-fallback-notice")).toBeHidden();
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
  });

  test("enlarged text releases the pin into the readable story", async ({ page }) => {
    await page.goto("/");
    await waitForStory(page);
    await page.addStyleTag({ content: "html { font-size: 32px !important; }" });
    await expect(page.locator("html")).toHaveAttribute("data-home-story-fallback", "true");
    await expect(page.locator(".story-hero")).toBeHidden();
    await expect(page.locator(".story-reduced")).toBeVisible();
    await expect(page.locator(".story-fallback-notice")).toBeHidden();
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
  });
});
