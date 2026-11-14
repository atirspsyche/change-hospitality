import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const origin = 'https://www.changehospitality.co.uk';
const descriptions = [
  ['/', 'People-first hospitality recruitment across London, Manchester and Hampshire. Find your next role or hire great people with Change Hospitality.'],
  ['/jobs/', 'Find permanent, temporary and contract hospitality jobs in London, Manchester and Hampshire. Explore opportunities with Change Hospitality.'],
  ['/recruit-talent/', 'Hire front of house, back of house, events and commercial talent through face-to-face hospitality recruitment. Send your staffing brief.'],
  ['/our-story/', 'Discover the story behind Change Hospitality: more than 20 years of building hospitality careers and teams through personal relationships.'],
  ['/team/', 'Meet the hospitality recruitment specialists behind Change Hospitality and connect with your local team in London, Manchester or Hampshire.'],
  ['/franchising/', "Build your own hospitality recruitment business with Change Hospitality's experience, established systems and national client relationships."],
  ['/environmental-policy/', "Explore Change Hospitality's B Corp credentials, environmental commitments and community partnerships. People first. Planet too."],
];

test.use({ javaScriptEnabled: false });

test('all seven pages render their agreed descriptions and matching social metadata without JavaScript', async ({ page }) => {
  expect(new Set(descriptions.map(([, description]) => description)).size).toBe(descriptions.length);
  for (const [path, description] of descriptions) {
    const response = await page.goto(path);
    expect(response.status(), path).toBe(200);
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) {
      await expect(page.locator(selector)).toHaveCount(1);
      await expect(page.locator(selector)).toHaveAttribute('content', description);
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}${path}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  }
});

test('every configured redirect destination and section anchor exists', async ({ page }) => {
  const { redirects } = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const destinations = [...new Set(redirects.map(({ destination }) => destination))]
    .filter((destination) => !destination.endsWith('.xml'));
  for (const destination of destinations) {
    const url = new URL(destination, origin);
    await page.goto('about:blank');
    const response = await page.goto(`${url.pathname}${url.hash}`);
    expect(response.status(), destination).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}${url.pathname}`);
    if (url.hash) {
      const target = page.locator(url.hash);
      await expect(target).toHaveCount(1);
      await expect(target).toBeVisible();
    }
  }
});
