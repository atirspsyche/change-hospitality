import { expect, test } from "@playwright/test";

const assetRoot = "/client-logos/sustainability-logo/";
const bcorpLogo = `${assetRoot}EN-B-Corp-logo.png`;
const logos = [
  ["EN-B-Corp-logo.png", 781, 1153],
  ["iso-14001.webp", 300, 272],
  ["ISO_9001-2015.png", 960, 878],
  ["ecologi.svg", 393, 334],
  ["UNDO-logo.png", 1858, 977],
  ["living-wage.png", 802, 1075],
  ["The-Good-Apple-Effect.png", 1629, 966],
  ["beyond-food.svg", 1200, 630],
];

async function openSustainability(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sustainability-impact/");
}

async function decodeImages(locator) {
  return locator.evaluateAll(async (images) => {
    await Promise.all(images.map(async (image) => {
      image.loading = "eager";
      await image.decode();
    }));
    return images.map((image) => {
      const bounds = image.getBoundingClientRect();
      const cell = image.parentElement.getBoundingClientRect();
      return {
        src: image.getAttribute("src"),
        alt: image.alt,
        width: Number(image.getAttribute("width")),
        height: Number(image.getAttribute("height")),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        fit: getComputedStyle(image).objectFit,
        contained: bounds.left >= cell.left - 1 && bounds.right <= cell.right + 1
          && bounds.top >= cell.top - 1 && bounds.bottom <= cell.bottom + 1,
      };
    });
  });
}

test("all supplied partner logos load with their actual dimensions and the new B Corp mark is used everywhere", async ({ page }) => {
  await openSustainability(page);
  const garden = page.getByRole("list", { name: "Our certifications and partners" });
  await expect(garden.getByRole("listitem")).toHaveCount(8);
  const images = await decodeImages(garden.locator("img"));
  for (const [index, [file, width, height]] of logos.entries()) {
    expect(images[index]).toMatchObject({
      src: `${assetRoot}${file}`,
      width,
      height,
      fit: "contain",
      contained: true,
    });
    if (file.endsWith(".svg")) {
      expect(images[index].naturalWidth).toBeGreaterThan(0);
      expect(images[index].naturalWidth / images[index].naturalHeight).toBeCloseTo(width / height, 2);
    } else {
      expect(images[index]).toMatchObject({ naturalWidth: width, naturalHeight: height });
    }
    expect(images[index].alt.trim()).not.toBe("");
  }
  await expect(page.getByText("Logo not available")).toHaveCount(0);
  await expect(page.locator('img[src="/bcorp-logo.webp"]')).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Certified B Corporation", exact: true })).toHaveCount(3);
  for (const image of await decodeImages(page.getByRole("img", { name: "Certified B Corporation", exact: true }))) {
    expect(image).toMatchObject({ src: bcorpLogo, naturalWidth: 781, naturalHeight: 1153 });
  }

  const certifications = page.getByRole("region", { name: "Our certifications." });
  await expect(certifications.locator(`.certification-seal img[src="${bcorpLogo}"]`)).toHaveCount(1);
  for (const file of ["iso-14001.webp", "ISO_9001-2015.png"]) {
    await expect(certifications.locator(`.iso-badges img[src="${assetRoot}${file}"]`)).toHaveCount(1);
  }
  for (const image of await decodeImages(certifications.locator(".iso-badges img"))) {
    expect(image.fit).toBe("contain");
    expect(image.contained).toBe(true);
    expect(image.naturalWidth).toBeGreaterThan(0);
  }
});

test("the three larger certification photos retain their complete compositions without overflow", async ({ page }, testInfo) => {
  await openSustainability(page);
  const photos = page.locator(".certification-photo");
  await expect(photos).toHaveCount(3);
  const images = await decodeImages(photos.locator("img"));
  for (const [index, [width, height]] of [[1200, 900], [1200, 1200], [900, 1200]].entries()) {
    expect(images[index]).toMatchObject({
      src: `${assetRoot}sustainability-pics/0${index + 1}.webp`,
      width,
      height,
      naturalWidth: width,
      naturalHeight: height,
      fit: "contain",
      contained: true,
    });
    expect(images[index].alt.trim()).not.toBe("");
  }
  await expect(photos.locator("figcaption")).toHaveCount(3);

  const viewports = testInfo.project.name === "mobile"
    ? [[320, 568], [390, 844], [600, 900], [844, 390]]
    : [[768, 1024], [1024, 768], [1440, 900], [1920, 1080]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    const layout = await photos.evaluateAll((figures) => figures.map((figure) => {
      const image = figure.querySelector("img");
      return {
        frameWidth: figure.offsetWidth,
        imageWidth: image.clientWidth,
        ratio: image.clientWidth / image.clientHeight,
        naturalRatio: image.naturalWidth / image.naturalHeight,
      };
    }));
    for (const photo of layout) {
      expect(photo.imageWidth, `${width}px viewport`).toBeGreaterThanOrEqual(width <= 600 ? 240 : 250);
      if (width >= 1440) expect(photo.frameWidth).toBeGreaterThan(336);
      expect(photo.ratio).toBeCloseTo(photo.naturalRatio, 2);
    }
    for (const logo of await decodeImages(page.locator(".partner-logo, .iso-badges img"))) {
      expect(logo.contained, `${logo.alt} at ${width}px`).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
});

test("Social Impact uses the three matching partner logos and keeps them contained at every breakpoint", async ({ page }, testInfo) => {
  await openSustainability(page);
  const cards = page.locator("#social-impact .social-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.locator(".social-illustration, svg")).toHaveCount(0);
  const images = await decodeImages(cards.locator(".social-logo img"));
  for (const [index, [file, width, height]] of logos.slice(-3).entries()) {
    expect(images[index]).toMatchObject({
      src: `${assetRoot}${file}`,
      width,
      height,
      naturalWidth: width,
      naturalHeight: height,
      fit: "contain",
      contained: true,
    });
    expect(images[index].alt.trim()).not.toBe("");
    await expect(cards.nth(index).getByRole("heading")).toHaveText(
      ["Living Wage", "The Good Apple Effect", "Beyond Food"][index],
    );
  }

  const viewports = testInfo.project.name === "mobile"
    ? [[320, 568], [390, 844], [600, 900], [844, 390]]
    : [[601, 900], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    const frames = await cards.locator(".social-logo").evaluateAll((elements) => elements.map((element) => ({
      width: element.clientWidth,
      height: element.clientHeight,
    })));
    for (const frame of frames) {
      expect(frame.width, `logo frame at ${width}px`).toBeGreaterThanOrEqual(144);
      expect(frame.height).toBe(192);
    }
    for (const image of await decodeImages(cards.locator("img"))) {
      expect(image.contained, `${image.alt} at ${width}px`).toBe(true);
      expect(image.fit).toBe("contain");
    }
    const layout = await cards.evaluateAll((elements) => elements.map((element) => ({
      top: element.getBoundingClientRect().top,
      bottom: element.getBoundingClientRect().bottom,
      logoTop: element.querySelector(".social-logo").getBoundingClientRect().top,
      noteTop: element.querySelector(".social-note").getBoundingClientRect().top,
      headingTop: element.querySelector("h3").getBoundingClientRect().top,
      copyTop: element.querySelector(".copy").getBoundingClientRect().top,
    })));
    if (width >= 1024) {
      for (const property of ["top", "bottom", "logoTop", "noteTop", "headingTop", "copyTop"]) {
        const positions = layout.map((card) => card[property]);
        expect(Math.max(...positions) - Math.min(...positions), `${property} alignment at ${width}px`).toBeLessThan(1);
      }
    } else {
      for (let index = 1; index < layout.length; index++) {
        expect(layout[index].top, `stacked cards at ${width}px`).toBeGreaterThan(layout[index - 1].bottom);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
});

test("certification and Social Impact artwork remain available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/sustainability-impact/`);
    await expect(page.locator(".partner-logo")).toHaveCount(8);
    await expect(page.locator(".certification-photo")).toHaveCount(3);
    await expect(page.locator(".social-logo img")).toHaveCount(3);
    const images = await decodeImages(page.locator(".certification-credentials img, .certification-photo img, .social-logo img"));
    for (const image of images) expect(image.naturalWidth).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});
