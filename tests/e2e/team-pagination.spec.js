import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

const pageSize = 8;

async function readTeam(directory) {
  return directory.evaluate((element) => {
    const props = JSON.parse(element.closest("astro-island").getAttribute("props"));
    return {
      office: props.officeName[1],
      members: props.members[1].map(([, member]) => ({
        name: member.name[1],
        email: member.email?.[1],
        phone: member.phone?.[1],
        sources: [member.avatarUrl?.[1], ...((member.avatarSrcSet?.[1] || "").split(", ").map((source) => source.split(" ")[0]))]
          .filter(Boolean).map((source) => new URL(source, location.href).href),
      })),
    };
  });
}

async function expectContrast(directory) {
  const contrasts = await directory.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    const luminance = (colour) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = colour;
      context.fillRect(0, 0, 1, 1);
      const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const contrast = (foreground, background) => {
      const first = luminance(foreground);
      const second = luminance(background);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    const range = element.querySelector("[data-team-page-range]");
    const results = [{
      label: "member range",
      ratio: contrast(getComputedStyle(range).color, getComputedStyle(element.closest("[data-accordion-item]")).backgroundColor),
    }];
    const nav = element.querySelector("[data-team-pagination]");
    if (nav) {
      nav.querySelectorAll("button:not(:disabled)").forEach((button) => {
        if (!button.getClientRects().length) return;
        const style = getComputedStyle(button);
        const background = button.hasAttribute("aria-current") ? style.backgroundColor : getComputedStyle(nav).backgroundColor;
        results.push({ label: button.getAttribute("aria-label"), ratio: contrast(style.color, background) });
      });
    }
    return results;
  });
  for (const { label, ratio } of contrasts) {
    expect(ratio, label).toBeGreaterThanOrEqual(4.5);
  }
}

test("team pagination renders only the current page and never downloads off-page portraits", async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/team/#profiles");
  const directories = page.locator("[data-team-directory]");
  const directory = directories.first();
  await expect(directory).toHaveAttribute("data-ready", "true");
  const team = await readTeam(directory);
  expect(team.members.length).toBeGreaterThan(pageSize);
  const grid = directory.locator("[data-team-member-grid]");
  const names = directory.locator(".team-card-name");
  const next = directory.getByRole("button", { name: `Next ${team.office} team page` });
  const previous = directory.getByRole("button", { name: `Previous ${team.office} team page` });
  await expect(names).toHaveText(team.members.slice(0, pageSize).map((member) => member.name));
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(page.locator("[data-team-accordion] astro-island")).toHaveCount(await directories.count());

  const renderedSources = new Set();
  for (const office of await directories.all()) {
    const data = await readTeam(office);
    await expect(office.locator(".team-profile-card")).toHaveCount(Math.min(pageSize, data.members.length));
    data.members.slice(0, pageSize).forEach((member) => member.sources.forEach((source) => renderedSources.add(source)));
  }
  await directory.locator(".team-card-wrap").last().scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  const offPageSources = new Set(team.members.slice(pageSize).flatMap((member) => member.sources).filter((source) => !renderedSources.has(source)));
  expect(offPageSources.size).toBeGreaterThan(0);
  expect(requests.filter((source) => offPageSources.has(source))).toEqual([]);

  const pageCount = Math.ceil(team.members.length / pageSize);
  for (let currentPage = 2; currentPage <= pageCount; currentPage += 1) {
    await next.focus();
    await next.press("Enter");
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, team.members.length);
    await expect(names).toHaveText(team.members.slice(start, end).map((member) => member.name));
    await expect(directory.locator("[data-team-page-range]")).toContainText(`Showing ${start + 1}-${end} of ${team.members.length} people`);
    await expect(grid).toBeFocused();
    await expect(directory.locator("[aria-current='page']")).toHaveText(String(currentPage).padStart(2, "0"));
    expect(await names.count()).toBeLessThanOrEqual(pageSize);
  }
  await expect(next).toBeDisabled();
  await previous.click();
  const start = (pageCount - 2) * pageSize;
  await expect(names).toHaveText(team.members.slice(start, start + pageSize).map((member) => member.name));
  expect(errors).toEqual([]);
});

test("team offices remember their pages and keep keyboard, biographies, and contacts working", async ({ page }) => {
  await page.goto("/team/#profiles");
  const offices = page.locator("[data-accordion-item]");
  const triggers = page.locator("[data-accordion-trigger]");
  const directory = offices.first().locator("[data-team-directory]");
  await expect(directory).toHaveAttribute("data-ready", "true");
  const team = await readTeam(directory);
  await directory.getByRole("button", { name: `Next ${team.office} team page` }).click();
  const currentNames = team.members.slice(pageSize, pageSize * 2).map((member) => member.name);

  await triggers.nth(1).click();
  await expect(triggers.first()).toHaveAttribute("aria-expanded", "false");
  await expect(offices.first().locator("[data-accordion-panel]")).toHaveAttribute("inert", "");
  const secondDirectory = offices.nth(1).locator("[data-team-directory]");
  await expect(secondDirectory).toHaveAttribute("data-ready", "true");
  const secondTeam = await readTeam(secondDirectory);
  await expect(secondDirectory.locator(".team-card-name")).toHaveText(secondTeam.members.slice(0, pageSize).map((member) => member.name));
  await expectContrast(secondDirectory);
  if (secondTeam.members.length <= pageSize) {
    await expect(secondDirectory.locator("[data-team-pagination]")).toHaveCount(0);
  }

  await triggers.first().click();
  await expect(directory.locator(".team-card-name")).toHaveText(currentNames);
  await expect(directory.locator("[aria-current='page']")).toHaveText("02");
  await triggers.first().press("ArrowDown");
  await expect(triggers.nth(1)).toBeFocused();
  await triggers.nth(1).press("Enter");
  await expect(triggers.nth(1)).toHaveAttribute("aria-expanded", "true");
  await triggers.nth(1).press("Home");
  await expect(triggers.first()).toBeFocused();
  await triggers.first().press("Enter");
  await expect(directory.locator(".team-card-name")).toHaveText(currentNames);

  const card = directory.locator(".team-card-wrap").filter({
    has: page.locator(".team-note-toggle"),
  }).first();
  const name = await card.locator(".team-card-name").textContent();
  const more = card.getByRole("button", { name: `Show more about ${name}` });
  await more.click();
  await expect(card.locator("[data-team-note-sheet]")).toHaveAttribute("data-open", "true");
  await expect(card.getByRole("region", { name: `About ${name}` })).toBeVisible();
  await card.getByRole("button", { name: `Show less about ${name}` }).press("Escape");
  await expect(card.locator("[data-team-note-sheet]")).toHaveAttribute("data-open", "false");
  await expect(more).toBeFocused();
  const member = team.members.find((person) => person.name === name);
  if (member.email?.trim()) {
    await expect(card.locator(".team-contact-links--icons a[href^='mailto:']")).toHaveAttribute("href", `mailto:${member.email.trim()}`);
  }
  const dialNumber = member.phone?.trim().replace(/[^+\d]/g, "");
  if (dialNumber) {
    await expect(card.locator(".team-contact-links--icons a[href^='tel:']")).toHaveAttribute("href", `tel:${dialNumber}`);
  }
});

test("team pagination fits narrow screens, keeps touch targets, and meets AA text contrast", async ({ page }, testInfo) => {
  await page.goto("/team/#profiles");
  const directory = page.locator("[data-team-directory]").first();
  await expect(directory).toHaveAttribute("data-ready", "true");
  await expectContrast(directory);
  const nav = directory.locator("[data-team-pagination]");
  await nav.evaluate((element) => {
    const pages = element.querySelector(".team-pagination-pages");
    const sample = pages.querySelector("button");
    while (pages.children.length < 7) {
      const button = sample.cloneNode(true);
      button.removeAttribute("aria-current");
      button.textContent = "1250";
      pages.append(button);
    }
  });
  const widths = testInfo.project.name === "mobile" ? [320, 390, 639] : [640, 768, 1024, 1280, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await nav.scrollIntoViewIfNeeded();
    const layout = await nav.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const parent = element.closest("[data-team-directory]").getBoundingClientRect();
      return {
        left: bounds.left - parent.left,
        right: parent.right - bounds.right,
        overflow: element.scrollWidth - element.clientWidth,
        targets: [...element.querySelectorAll("button")].filter((button) => button.getClientRects().length)
          .map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
      };
    });
    expect(layout.left, `${width}px left edge`).toBeGreaterThanOrEqual(11);
    expect(layout.right, `${width}px right edge`).toBeGreaterThanOrEqual(11);
    expect(layout.overflow, `${width}px pagination overflow`).toBeLessThanOrEqual(1);
    for (const target of layout.targets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }
});

test.describe("team pagination without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("team fallback keeps every profile available without activating pagination", async ({ page }) => {
    await page.goto("/team/");
    const office = page.locator("[data-accordion-item]").first();
    const total = Number(await office.locator(".team-accordion-count").textContent());
    await expect(office.locator(".team-profile-card")).toHaveCount(total);
    const directory = office.locator("[data-team-directory]");
    await expect(directory).toHaveAttribute("data-ready", "false");
    for (const button of await directory.locator("[data-team-pagination] button").all()) {
      await expect(button).toBeDisabled();
    }
    for (const image of await office.locator(".team-card-avatar").all()) {
      await expect(image).toHaveAttribute("loading", "lazy");
    }
  });
});
