import { expect, test } from '@playwright/test';

const sectionSelector = '[data-story-instagram]';
const cardSelector = '[data-instagram-post]';
const captions = [
  'Good opportunities. Great hospitality.',
  'Between tables, behind the scenes.',
  'A day in the life of our good people.',
  'Big ideas, from the people behind them.',
  'Hello, Hampshire. Good things are happening.',
];

test('five Instagram cards sit after the letter and before the next-chapter links', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sanityRequests = [];
  page.on('request', (request) => {
    if (new URL(request.url()).hostname === 'cdn.sanity.io') sanityRequests.push(request.url());
  });
  await page.goto('/our-story/');
  const section = page.locator(sectionSelector);
  await expect(section.locator('h2')).toHaveText('Off the page. On the feed.');
  await expect(section.locator(cardSelector)).toHaveCount(5);
  await expect(section.locator('h3')).toHaveText(captions);
  expect(await section.evaluate((element) => ({
    afterLetter: element.previousElementSibling.matches('[data-our-story]'),
    beforeNextChapter: element.nextElementSibling.matches('.story-next'),
  }))).toEqual({ afterLetter: true, beforeNextChapter: true });
  await expect(section.locator('astro-island, script, button')).toHaveCount(0);

  const images = section.locator('.instagram-photo img');
  for (const [index, image] of (await images.all()).entries()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(image).toHaveAttribute('alt', /\S.+/);
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('fetchpriority', 'low');
    await expect(image).toHaveCSS('object-fit', 'contain');
    const ratio = await image.evaluate((element) => element.naturalWidth / element.naturalHeight);
    expect(ratio).toBeCloseTo([0.8, 0.5625, 0.5625, 0.75, 0.8][index], 2);
    const sources = await image.evaluate((element) => [
      element.src, ...element.srcset.split(', ').map((source) => new URL(source.split(' ')[0], location.href).href),
    ]);
    for (const source of sources) expect(new URL(source).origin).toBe(new URL(page.url()).origin);
  }
  expect(sanityRequests).toEqual([]);
});

test('cards have honest decorative actions and keyboard-accessible Instagram destinations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/our-story/');
  const section = page.locator(sectionSelector);
  const cards = section.locator(cardSelector);
  for (const card of await cards.all()) {
    await expect(card).toHaveAttribute('href', 'https://www.instagram.com/changehospitality/');
    await expect(card).toHaveAttribute('target', '_blank');
    await expect(card).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(card).toHaveAttribute('aria-label', /opens in a new tab/);
    await expect(card.locator('.instagram-reactions')).toHaveAttribute('aria-hidden', 'true');
    await expect(card.locator('.instagram-reactions svg')).toHaveCount(4);
    await expect(card.locator('button')).toHaveCount(0);
  }
  await cards.first().focus();
  await expect(cards.first()).toBeFocused();
  await expect(cards.first()).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Tab');
  await expect(cards.nth(1)).toBeFocused();
  await cards.last().focus();
  await page.keyboard.press('Tab');
  await expect(section.getByRole('link', { name: /Follow Change Hospitality/ })).toBeFocused();
  await expect(section).not.toContainText(/\d+ likes|comments disabled|coming soon/i);
});

test('section copy, captions and the follow link meet WCAG AA text contrast', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/our-story/');
  const ratios = await page.locator(sectionSelector).evaluate((section) => {
    const luminance = (color) => {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map((value) => {
        const channel = Number(value) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    return [
      [section.querySelector('.instagram-intro-copy > p'), section],
      [section.querySelector('.instagram-profile'), section],
      [section.querySelector('h3'), section.querySelector('.instagram-card')],
      [section.querySelector('.instagram-card-link'), section.querySelector('.instagram-card')],
      [section.querySelector('[data-button-variant]'), section.querySelector('[data-button-variant]')],
    ].map(([text, background]) => {
      const foreground = luminance(getComputedStyle(text).color);
      const surface = luminance(getComputedStyle(background).backgroundColor);
      return (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05);
    });
  });
  for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test('responsive scrapbook rows stay inside the viewport and honour reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/our-story/');
  const sizes = testInfo.project.name === 'mobile' ? [[320, 568], [390, 844], [599, 900]] : [[768, 1024], [1024, 768], [1440, 900]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const section = page.locator(sectionSelector);
    await section.scrollIntoViewIfNeeded();
    const layout = await section.evaluate((element) => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cards: [...element.querySelectorAll('.instagram-post')].map((card) => {
        const bounds = card.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, top: card.offsetTop, transition: getComputedStyle(card).transitionDuration };
      }),
    }));
    expect(layout.overflow, `${width}px has no horizontal page overflow`).toBe(0);
    for (const card of layout.cards) {
      expect(card.left).toBeGreaterThanOrEqual(0);
      expect(card.right).toBeLessThanOrEqual(width);
      expect(Number.parseFloat(card.transition)).toBeLessThanOrEqual(0.00001);
    }
    if (width >= 1024) {
      expect(layout.cards[0].top).toBe(layout.cards[2].top);
      expect(layout.cards[3].top).toBeGreaterThan(layout.cards[0].top);
      expect(layout.cards[3].top).toBe(layout.cards[4].top);
      expect(layout.cards[3].left).toBeGreaterThan(layout.cards[0].left);
    }
  }
});

test('the upright chick replaces both original hero drawings without covering the title', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/our-story/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.story-chef, .story-pan')).toHaveCount(0);
  const chick = page.locator('.story-chick');
  await expect(chick).toHaveAttribute('aria-hidden', 'true');
  const image = chick.locator('img');
  await expect(image).toHaveAttribute('src', '/illustrations/story-chick.webp');
  await expect(image).toHaveAttribute('alt', '');
  await image.evaluate((element) => element.decode());
  for (const [width, height] of testInfo.project.name === 'mobile' ? [[320, 568], [390, 844]] : [[1024, 768], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const result = await image.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const title = document.querySelector('#story-title').getBoundingClientRect();
      return {
        width: element.naturalWidth, height: element.naturalHeight,
        contained: bounds.left >= 0 && bounds.right <= innerWidth,
        overlapsTitle: bounds.left < title.right && bounds.right > title.left && bounds.top < title.bottom && bounds.bottom > title.top,
      };
    });
    expect(result).toEqual({ width: 212, height: 235, contained: true, overlapsTitle: false });
  }
});

test('the existing letter enhancement still initializes with all five posts below it', async ({ page }, testInfo) => {
  await page.goto('/our-story/');
  await expect(page.locator('[data-our-story]')).toHaveClass(testInfo.project.name === 'mobile' ? /is-flowing/ : /is-enhanced/);
  await expect(page.locator('[data-read-letter]')).toBeVisible();
  await expect(page.locator(cardSelector)).toHaveCount(5);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all five images, captions, links and the full letter remain available', async ({ page }) => {
    await page.goto('/our-story/');
    const section = page.locator(sectionSelector);
    await expect(section.locator(cardSelector)).toHaveCount(5);
    await expect(section.locator('h3')).toHaveText(captions);
    await expect(page.locator('[data-letter-source]')).toBeVisible();
    const image = section.locator('.instagram-photo img').last();
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(section.getByRole('link', { name: /Follow Change Hospitality/ })).toHaveAttribute('href', 'https://www.instagram.com/changehospitality/');
  });
});
