import { expect, test } from '@playwright/test';
import { storyParagraphs } from '../../src/data/ourStory.ts';

const visual = '[data-letter-visual]';
const paragraphCount = storyParagraphs.length;
const typedCount = (page) => page.locator(`${visual} .is-typed`).count();

async function seekParagraph(page, index, fraction = 0.05) {
  await page.evaluate(({ index, count, fraction }) => {
    const root = document.querySelector('[data-our-story]');
    const paragraph = root.querySelector('[data-letter-visual]').querySelectorAll('p')[index];
    const top = root.classList.contains('is-enhanced')
      ? root.getBoundingClientRect().top + scrollY
        + (root.offsetHeight - innerHeight) * (0.12 + (index + fraction) * (0.865 / count))
      : paragraph.getBoundingClientRect().top + scrollY - innerHeight * 0.82;
    const event = new CustomEvent('page-motion-scroll-immediate', {
      cancelable: true,
      detail: { top },
    });
    if (document.dispatchEvent(event)) window.scrollTo(0, top);
  }, { index, count: paragraphCount, fraction });
  const label = index === paragraphCount - 1
    ? new RegExp(`Paragraph ${paragraphCount} of ${paragraphCount}|And we’re still changing\\.`)
    : `Paragraph ${index + 1} of ${paragraphCount}`;
  await expect(page.locator('[data-progress-label]')).toHaveText(label);
}

async function expectParagraphsTyped(page, end) {
  const counts = await page.locator(`${visual} p`).evaluateAll((paragraphs, end) =>
    paragraphs.slice(0, end).map((paragraph) => ({
      total: paragraph.querySelectorAll('.story-char').length,
      typed: paragraph.querySelectorAll('.is-typed').length,
    })), end);
  expect(counts).toHaveLength(end);
  for (const count of counts) {
    expect(count.total).toBeGreaterThan(0);
    expect(count.typed).toBe(count.total);
  }
}

test('preserves every word and paragraph in one accessible original and one decorative letter', async ({ page }) => {
  await page.goto('/our-story/');
  const source = page.locator('[data-letter-source]');
  await expect(source).toHaveClass(/story-accessible/);
  expect(await source.locator('p:not(.story-signature)').allTextContents()).toEqual(storyParagraphs);
  await expect(page.locator(visual)).toHaveCount(1);
  await expect(page.locator(visual)).toHaveAttribute('aria-hidden', 'true');
  expect(await page.locator(`${visual} p`).allTextContents()).toEqual(await source.locator('p').allTextContents());
  await expect(page.locator(`${visual} .story-caret`)).toHaveCount(1);
  await expect(page.locator('[data-read-letter]')).toBeVisible();
  expect(storyParagraphs).toHaveLength(14);
});

test('characters render faster without scrolling or restarting the cursor', async ({ page }) => {
  await page.goto('/our-story/');
  await seekParagraph(page, 8);
  const caret = page.locator(`${visual} .story-caret`);
  await expect(caret).toBeVisible();
  const result = await caret.evaluate((element) => new Promise((resolve) => {
    const paragraph = element.parentElement.querySelectorAll('p')[8];
    const count = () => paragraph.querySelectorAll('.is-typed').length;
    const before = count();
    const remaining = paragraph.querySelectorAll('.story-char').length - before;
    const scrollBefore = scrollY;
    const started = performance.now();
    const animation = element.getAnimations()[0];
    const startTime = animation.startTime;
    setTimeout(() => {
      const char = [...paragraph.querySelectorAll('.is-typed')].at(-1);
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      resolve({
        added: count() - before,
        remaining,
        elapsed: (performance.now() - started) / 1000,
        scrollDelta: scrollY - scrollBefore,
        sameAnimation: element.getAnimations()[0] === animation && animation.startTime === startTime,
        timing: animation.effect.getTiming(),
        easing: getComputedStyle(element).animationTimingFunction,
        keyframeEasing: animation.effect.getKeyframes().map((frame) => frame.easing),
        caretX: matrix.m41 - char.offsetLeft - char.offsetWidth,
        caretY: matrix.m42 - char.offsetTop - 2,
      });
    }, 500);
  }));
  expect(result.remaining).toBeGreaterThan(0);
  expect(result.added).toBeGreaterThanOrEqual(Math.min(result.remaining, Math.floor(result.elapsed * 75)));
  expect(result.scrollDelta).toBe(0);
  expect(result.sameAnimation).toBe(true);
  expect(result.timing.duration).toBe(1200);
  expect(result.easing).toBe('ease-in-out');
  expect(result.keyframeEasing).toEqual(['ease-in-out', 'ease-in-out', 'ease-in-out']);
  expect(result.timing.iterations).toBe(Infinity);
  expect(Math.abs(result.caretX)).toBeLessThanOrEqual(1);
  expect(Math.abs(result.caretY)).toBeLessThanOrEqual(1);
  await expect(page.locator('[data-scroll-label]')).toHaveText(
    /The paragraph will keep writing\.|Scroll for the next paragraph\./,
  );
});

test('each reveal stops at one paragraph, finishes within three seconds, and includes the final signature', async ({ page }) => {
  await page.goto('/our-story/');
  await seekParagraph(page, 0);
  const firstLength = await page.locator(`${visual} p`).first().locator('.story-char').count();
  await expect.poll(() => typedCount(page), { timeout: 3000, intervals: [50, 100] }).toBe(firstLength);
  await expectParagraphsTyped(page, 1);
  await expect(page.locator(`${visual} p`).nth(1).locator('.is-typed')).toHaveCount(0);
  await expect(page.locator('[data-scroll-label]')).toHaveText('Scroll for the next paragraph.');
  const completed = await typedCount(page);
  await page.waitForTimeout(300);
  expect(await typedCount(page)).toBe(completed);
  const timing = await page.evaluate((count) => new Promise((resolve) => {
    const root = document.querySelector('[data-our-story]');
    const paragraph = root.querySelector('[data-letter-visual]').querySelectorAll('p')[8];
    const total = paragraph.querySelectorAll('.story-char').length;
    const top = root.classList.contains('is-enhanced')
      ? root.getBoundingClientRect().top + scrollY
        + (root.offsetHeight - innerHeight) * (0.12 + 8.05 * (0.865 / count))
      : paragraph.getBoundingClientRect().top + scrollY - innerHeight * 0.82;
    const started = performance.now();
    const event = new CustomEvent('page-motion-scroll-immediate', { cancelable: true, detail: { top } });
    if (document.dispatchEvent(event)) window.scrollTo(0, top);
    const sample = () => {
      const typed = paragraph.querySelectorAll('.is-typed').length;
      const elapsed = performance.now() - started;
      if (typed === total || elapsed > 3100) resolve({ elapsed, typed, total });
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }), paragraphCount);
  expect(timing.typed).toBe(timing.total);
  expect(timing.elapsed).toBeLessThan(3000);
  const longest = page.locator(`${visual} p`).nth(8);
  await expect(longest.locator('.story-char').last()).toHaveCSS('opacity', '1', { timeout: 300 });
  await expect(page.locator(`${visual} p`).nth(9).locator('.is-typed')).toHaveCount(0);
  await seekParagraph(page, 13);
  await expectParagraphsTyped(page, 13);
  const fullLength = await page.locator(`${visual} .story-char`).count();
  await expect.poll(() => typedCount(page), { timeout: 3000, intervals: [50, 100] }).toBe(fullLength);
  await expectParagraphsTyped(page, 15);
  await expect(page.locator(`${visual} .story-caret`)).toBeHidden();
  await expect(page.locator('[data-progress-label]')).toHaveText('And we’re still changing.');
});

test('all fourteen paragraph boundaries remain readable when scrolling back', async ({ page }) => {
  await page.goto('/our-story/');
  for (let index = 0; index < paragraphCount; index++) {
    await seekParagraph(page, index);
    await expectParagraphsTyped(page, index);
  }
  const before = await typedCount(page);
  await seekParagraph(page, 4);
  await page.waitForTimeout(350);
  expect(await typedCount(page)).toBeGreaterThanOrEqual(before);
  await expectParagraphsTyped(page, 13);
  await page.locator('[data-story-instagram]').scrollIntoViewIfNeeded();
  const fullLength = await page.locator(`${visual} .story-char`).count();
  await expect.poll(() => typedCount(page), { timeout: 3000, intervals: [50, 100] }).toBe(fullLength);
  await expectParagraphsTyped(page, 15);
});

test('skipping ahead gently settles earlier paragraphs without queuing later ones', async ({ page }) => {
  await page.goto('/our-story/');
  await seekParagraph(page, 8);
  await expectParagraphsTyped(page, 8);
  await expect(page.locator(`${visual} .is-settling`).first()).toHaveCSS('transition-duration', '0.45s');
  await expect(page.locator(`${visual} p`).nth(9).locator('.is-typed')).toHaveCount(0);
  await seekParagraph(page, 13);
  await expectParagraphsTyped(page, 13);
});

test('desktop paragraph movement glides rather than snapping between blocks', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Compact screens have no translated or pinned letter.');
  await page.goto('/our-story/');
  await seekParagraph(page, 13);
  const fullLength = await page.locator(`${visual} .story-char`).count();
  await expect.poll(() => typedCount(page), { timeout: 3000 }).toBe(fullLength);
  await seekParagraph(page, 0);
  await page.waitForTimeout(300);
  const movement = await page.locator(visual).evaluate((element) => new Promise((resolve) => {
    const root = document.querySelector('[data-our-story]');
    const before = new DOMMatrix(getComputedStyle(element).transform).m42;
    const top = root.getBoundingClientRect().top + scrollY
      + (root.offsetHeight - innerHeight) * (0.12 + 8.5 * (0.865 / 14));
    document.dispatchEvent(new CustomEvent('page-motion-scroll-immediate', { cancelable: true, detail: { top } }));
    const samples = [];
    const sample = () => {
      samples.push(new DOMMatrix(getComputedStyle(element).transform).m42);
      if (samples.length < 24) requestAnimationFrame(sample);
      else resolve({ before, samples });
    };
    requestAnimationFrame(sample);
  }));
  await page.waitForTimeout(600);
  const final = await page.locator(visual).evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42);
  const distance = Math.abs(final - movement.before);
  expect(distance).toBeGreaterThan(100);
  expect(movement.samples.some((value) => {
    const travelled = Math.abs(value - movement.before);
    return travelled > distance * 0.05 && travelled < distance * 0.95;
  })).toBe(true);
  for (let index = 1; index < movement.samples.length; index++) {
    expect(Math.abs(movement.samples[index] - movement.samples[index - 1])).toBeLessThan(distance * 0.3);
  }
});

test('reverse scrolling works continuously within a paragraph and follows the mouse wheel', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Compact screens use natural document flow.');
  await page.goto('/our-story/');
  await seekParagraph(page, 13);
  const fullLength = await page.locator(`${visual} .story-char`).count();
  await expect.poll(() => typedCount(page), { timeout: 3000 }).toBe(fullLength);
  const offsets = [];
  for (const fraction of [0.85, 0.45, 0.15, 0.85]) {
    await seekParagraph(page, 9, fraction);
    const expected = await page.locator(visual).evaluate((element, fraction) => {
      const paragraphs = element.querySelectorAll('p');
      const line = Math.min(80, element.parentElement.clientHeight / 4);
      const from = Math.max(0, paragraphs[8].offsetTop - line);
      const to = Math.max(0, paragraphs[9].offsetTop - line);
      return -(from + (to - from) * fraction);
    }, fraction);
    await expect.poll(() => page.locator(visual).evaluate((element, expected) =>
      Math.abs(new DOMMatrix(getComputedStyle(element).transform).m42 - expected), expected),
    { timeout: 2000, intervals: [50, 100] }).toBeLessThan(2);
    offsets.push(expected);
  }
  expect(offsets[1]).toBeGreaterThan(offsets[0]);
  expect(offsets[2]).toBeGreaterThan(offsets[1]);
  expect(offsets[3]).toBe(offsets[0]);
  await page.mouse.wheel(0, -100);
  await expect.poll(() => page.locator(visual).evaluate((element) =>
    new DOMMatrix(getComputedStyle(element).transform).m42)).toBeGreaterThan(offsets[3] + 10);
  expect(await typedCount(page)).toBe(fullLength);
});

test('hidden tabs pause typing and resume without a catch-up burst', async ({ page }) => {
  await page.goto('/our-story/');
  await seekParagraph(page, 8);
  const result = await page.locator(visual).evaluate((element) => new Promise((resolve) => {
    const paragraph = element.querySelectorAll('p')[8];
    const total = paragraph.querySelectorAll('.story-char').length;
    const rate = total / Math.min(2.6, Math.max(0.55, total / 100));
    const count = () => paragraph.querySelectorAll('.is-typed').length;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    const before = count();
    setTimeout(() => {
      const paused = count();
      delete document.hidden;
      const resumedAt = performance.now();
      setTimeout(() => resolve({
        before, paused, resumed: count(), rate, elapsed: (performance.now() - resumedAt) / 1000,
      }), 500);
    }, 1000);
  }));
  expect(result.paused).toBe(result.before);
  expect(result.resumed - result.paused).toBeGreaterThan(0);
  expect(result.resumed - result.paused).toBeLessThanOrEqual(Math.ceil(result.elapsed * result.rate) + 20);
});

test('resizing, reduced motion and printing preserve readable text without duplicate animations', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/our-story/');
  await seekParagraph(page, 0);
  await page.waitForTimeout(500);
  let previous = await typedCount(page);
  for (const [width, height] of [[900, 500], [1440, 900], [320, 568], [1024, 600]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(visual)).toHaveCount(1);
    await expect.poll(() => typedCount(page)).toBeGreaterThanOrEqual(previous);
    previous = await typedCount(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator(visual)).toHaveCount(0);
  await expect(page.locator('[data-letter-source]')).not.toHaveClass(/story-accessible/);
  await expect(page.locator('[data-our-story]')).not.toHaveClass(/is-enhanced|is-flowing/);
  await expect(page.locator('[data-read-letter]')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator(visual)).toHaveCount(1);
  await expectParagraphsTyped(page, 15);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator(visual)).toHaveCount(0);
  await expect(page.locator('[data-letter-source]')).not.toHaveClass(/story-accessible/);
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator(visual)).toHaveCount(1);
  await expectParagraphsTyped(page, 15);
  expect(errors).toEqual([]);
});

test('Read full letter works from later paragraphs with keyboard focus and no remaining typing', async ({ page }) => {
  await page.goto('/our-story/');
  await seekParagraph(page, 8);
  const button = page.locator('[data-read-letter]');
  await expect(button).toBeInViewport();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(visual)).toHaveCount(0);
  await expect(page.locator('#story-letter')).toBeFocused();
  await expect(page.locator('#story-letter')).toBeInViewport();
  await expect(page.locator('[data-letter-source]')).not.toHaveClass(/story-accessible/);
  await expect(button).toBeHidden();
  expect(await page.locator('[data-letter-source] p:not(.story-signature)').allTextContents()).toEqual(storyParagraphs);
});

test('client navigation cleans up the old letter and initializes exactly one new visual', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/our-story/');
  await seekParagraph(page, 0);
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '/franchising/';
    link.textContent = 'Navigate away';
    document.body.append(link);
    link.click();
  });
  await expect(page).toHaveURL(/\/franchising\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/our-story\/$/);
  await expect(page.locator(visual)).toHaveCount(1);
  await expect(page.locator(`${visual} .story-caret`)).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('no-JavaScript and initially reduced-motion visitors receive the complete original letter', async ({ browser, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/our-story/');
  await expect(page.locator(visual)).toHaveCount(0);
  expect(await page.locator('[data-letter-source] p:not(.story-signature)').allTextContents()).toEqual(storyParagraphs);
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await context.newPage();
  await plain.goto(page.url());
  await expect(plain.locator(visual)).toHaveCount(0);
  await expect(plain.locator('[data-read-letter]')).toBeHidden();
  expect(await plain.locator('[data-letter-source] p:not(.story-signature)').allTextContents()).toEqual(storyParagraphs);
  await expect(plain.locator('.story-signature')).toHaveText('Jim O’BrienCEO and Founder');
  await context.close();
});
