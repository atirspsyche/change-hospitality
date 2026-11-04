import { expect, test } from '@playwright/test';

const policies = [
  { slug: 'data-protection', title: 'Data Protection Policy', theme: 'mist', ending: 'Freedom from discrimination [Article 14]' },
  { slug: 'environmental-sustainability', title: 'Environmental Sustainability Policy', theme: 'bcorp-green', ending: 'supports both people and planet.' },
  { slug: 'equality-inclusion-diversity', title: 'Equality, Inclusion and Diversity Policy', theme: 'cocoa', ending: 'greater equality of opportunities to all applicants and staff.' },
  { slug: 'modern-slavery', title: 'Modern Slavery Statement', theme: 'citron', ending: 'section 54 of the Act.' },
];

async function expectUniqueTransitionNames(page) {
  const names = await page.locator('*').evaluateAll((elements) => elements
    .map((element) => getComputedStyle(element).viewTransitionName)
    .filter((name) => name && name !== 'none'));
  expect(new Set(names).size).toBe(names.length);
}

test.describe('policy pages without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all four policy pages serve indexable HTML and full content', async ({ page }) => {
    for (const policy of policies) {
      const path = `/policies/${policy.slug}/`;
      const response = await page.goto(path);
      expect(response.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(policy.title);
      await expect(page.locator('[data-policy-copy]')).toContainText(policy.ending);
      await expect(page.locator('[data-policy-copy] astro-island')).toHaveCount(0);
      await expect(page.locator('[data-policy-theme]')).toHaveAttribute('data-policy-theme', policy.theme);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://www.changehospitality.co.uk${path}`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
      expect((await page.locator('meta[name="description"]').getAttribute('content')).length).toBeGreaterThan(0);
      expect(await response.text()).toContain(policy.ending);
      const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(schema.map((value) => JSON.parse(value))).toContainEqual(expect.objectContaining({
        '@type': 'WebPage', name: policy.title, url: `https://www.changehospitality.co.uk${path}`,
      }));
      await expect(page.locator(`[data-policy-link="${policy.slug}"]`)).toHaveAttribute('aria-current', 'page');
    }
  });
});

test('policy footer links use the job-style shared opening transition and browser history', async ({ page }) => {
  await page.goto('/our-story/');
  await page.evaluate(() => { window.policyNavigationMarker = 'same-document'; });
  const equality = page.locator('[data-policy-link="equality-inclusion-diversity"]');
  await equality.scrollIntoViewIfNeeded();
  const shellName = await equality.evaluate((element) => getComputedStyle(element).viewTransitionName);
  const titleName = await equality.locator('span').evaluate((element) => getComputedStyle(element).viewTransitionName);
  expect(shellName).not.toBe('none');
  expect(titleName).not.toBe('none');
  await equality.focus();
  await equality.press('Enter');
  await expect(page).toHaveURL(/\/policies\/equality-inclusion-diversity\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-policy-cover]')).toHaveCSS('view-transition-name', shellName);
  await expect(page.locator('#policy-title')).toHaveCSS('view-transition-name', titleName);
  expect(await page.evaluate(() => window.policyNavigationMarker)).toBe('same-document');
  await expectUniqueTransitionNames(page);

  await page.locator('[data-policy-link="modern-slavery"]').click();
  await expect(page).toHaveURL(/\/policies\/modern-slavery\/$/);
  await expectUniqueTransitionNames(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/policies\/equality-inclusion-diversity\/$/);
  await expectUniqueTransitionNames(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/our-story\/$/);
  expect(await page.evaluate(() => window.policyNavigationMarker)).toBe('same-document');
});

test('policy covers and body text meet AA contrast and fit desktop and mobile widths', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const colours = new Set();
  for (const policy of policies) {
    await page.goto(`/policies/${policy.slug}/`);
    await page.evaluate(() => document.fonts.ready);
    const contrast = await page.locator('[data-policy-content]').evaluate((article) => {
      const luminance = (colour) => {
        const channels = colour.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const ratio = (foreground, background) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      const cover = getComputedStyle(article.querySelector('[data-policy-cover]'));
      const copy = getComputedStyle(article.querySelector('[data-policy-copy]'));
      return {
        background: cover.backgroundColor,
        cover: ratio(cover.color, cover.backgroundColor),
        copy: ratio(copy.color, getComputedStyle(article).backgroundColor),
      };
    });
    colours.add(contrast.background);
    expect(contrast.cover).toBeGreaterThanOrEqual(4.5);
    expect(contrast.copy).toBeGreaterThanOrEqual(4.5);
    for (const width of testInfo.project.name === 'mobile' ? [320, 390] : [768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.locator('#policy-title').evaluate((title) => ({
        right: title.getBoundingClientRect().right,
        left: title.getBoundingClientRect().left,
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.left).toBeGreaterThanOrEqual(0);
      expect(layout.right).toBeLessThanOrEqual(layout.viewport + 1);
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport + 1);
    }
  }
  expect(colours.size).toBe(4);
});

test('policy content keeps list numbering, nested formatting, contact breaks and keyboard access with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/policies/equality-inclusion-diversity/');
  const skip = page.getByRole('link', { name: 'Skip to policy content' });
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#policy-copy')).toBeFocused();
  await expect(page.locator('[data-policy-copy] h2')).toHaveCount(4);
  await expect(page.locator('[data-policy-copy] ol[start="7"] > li')).toHaveCount(5);
  await expect(page.locator('[data-policy-copy] ol ol')).toHaveCSS('list-style-type', 'lower-alpha');
  await expect(page.locator('[data-policy-copy] strong').first()).toHaveText('Equality');
  await page.goto('/policies/data-protection/');
  await expect(page.locator('[data-policy-copy] br')).toHaveCount(5);
  await expect(page.getByRole('link', { name: 'info@thechangegroup.com', exact: true })).toHaveAttribute('href', 'mailto:info@thechangegroup.com');
  await page.goto('/policies/modern-slavery/');
  await expect(page.locator('[data-policy-copy] hr')).toHaveCount(1);
  await expect(page.locator('[data-policy-copy] > p').last()).toContainText("\u00b9 'Modern slavery'");
});
