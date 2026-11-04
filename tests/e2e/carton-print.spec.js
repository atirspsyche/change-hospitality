import { expect, test } from "@playwright/test";
import { getStoryFrameUrl, homeStoryRecruitmentLine } from "../../src/data/homeStory.ts";
import { mobileStoryTimeline, storyTimeline } from "../../src/lib/homeStoryTimeline.ts";
import { getMobileStoryScene, getStoryScene } from "../../src/lib/homeStoryScene.ts";

async function canvasMismatch(page, frame, mobile) {
  const size = await page.locator(".story-canvas").evaluate((canvas) => ({
    width: canvas.width,
    height: canvas.height,
    position: Number(canvas.closest(".story-hero").dataset.storyFrame),
  }));
  const scene = mobile
    ? getMobileStoryScene(size.position, size.width, size.height)
    : getStoryScene(size.position, size.width, size.height);
  return page.locator(".story-canvas").evaluate(async (canvas, { src, layer }) => {
    const image = await createImageBitmap(await (await fetch(src)).blob());
    const reference = document.createElement("canvas");
    reference.width = canvas.width;
    reference.height = canvas.height;
    const context = reference.getContext("2d");
    context.fillStyle = getComputedStyle(canvas.closest(".story-hero")).backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const width = layer.height / image.height * image.width;
    context.drawImage(image, (canvas.width - width) / 2, layer.y, width, layer.height);
    image.close();
    const expected = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const actual = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let mismatches = 0;
    let compared = 0;
    for (let offset = 0; offset < expected.length; offset += 4 * 19) {
      if ([0, 1, 2].some((channel) => Math.abs(expected[offset + channel] - actual[offset + channel]) > 2)) mismatches++;
      compared++;
    }
    return mismatches / compared;
  }, { src: getStoryFrameUrl(frame), layer: scene.layers[0] });
}

test("printed copy follows the opening, held and departing lid in either scroll direction", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-home-story-ready", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-story-loading", "");
  const mobile = testInfo.project.name === "mobile";
  const timeline = mobile ? mobileStoryTimeline : storyTimeline;
  await expect(page.locator('.story-overlays [data-story-overlay="carton-open-brand"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: homeStoryRecruitmentLine, exact: true, level: 1 })).toHaveCount(1);
  for (const frame of [16, 24, 40, 47, 54, 24]) {
    await page.evaluate(({ progress, screens }) => {
      const hero = document.querySelector(".story-hero");
      const spacer = hero.parentElement;
      const start = spacer.getBoundingClientRect().top + scrollY;
      const distance = Number.parseFloat(getComputedStyle(spacer).paddingBottom) || hero.clientHeight * screens;
      scrollTo({ top: start + distance * progress, behavior: "instant" });
    }, { progress: timeline.progressForFrame(frame), screens: timeline.scrollScreens });
    await expect.poll(() => page.locator(".story-hero").evaluate((hero) =>
      Math.round(Number(hero.dataset.storyFrame)))).toBe(frame);
    await expect.poll(() => canvasMismatch(page, frame, mobile)).toBeLessThan(0.005);
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-home-story-ready", "true");
  await expect(page.locator("html")).not.toHaveAttribute("data-story-loading", "");
  await expect.poll(() => canvasMismatch(page, 24, mobile)).toBeLessThan(0.005);
});

test("reduced motion retains the recruitment line as a readable heading", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".story-hero")).toBeHidden();
  await expect(page.locator(".story-reduced").getByRole("heading", {
    name: homeStoryRecruitmentLine, exact: true, level: 1,
  })).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the readable story retains the recruitment heading without canvas", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".story-hero")).toBeHidden();
    await expect(page.getByRole("heading", {
      name: homeStoryRecruitmentLine, exact: true, level: 1,
    })).toBeVisible();
  });
});
