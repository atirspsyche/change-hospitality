import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { siteLinks } from '../data/navigation.ts';
import { homeStory } from '../data/homeStory.ts';

test('menu and footer destinations share seven unique canonical routes', () => {
  assert.equal(siteLinks.length, 7);
  assert.equal(new Set(siteLinks.map(({ href }) => href)).size, 7);
  assert.equal(siteLinks.find(({ label }) => label === 'Sustainability').href, '/environmental-policy/');
  assert.equal(siteLinks.find(({ label }) => label === 'Our Story').footerLabel, 'Our story');
  assert.ok(siteLinks.every(({ label, href, meta }) => label && meta && href.startsWith('/') && href.endsWith('/')));
});

test('the story sustainability CTA uses the canonical environmental route', () => {
  const destinations = homeStory.beats.flatMap(({ overlay }) => [
    overlay?.action?.href,
    ...(overlay?.columns?.map(({ action }) => action?.href) ?? []),
  ]);
  assert.ok(destinations.includes('/environmental-policy/'));
  assert.ok(!destinations.includes('/sustainability-impact/'));
});

test('both legacy sustainability URL variants have explicit HTTP 301 redirects on Vercel', () => {
  const { redirects } = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  for (const source of ['/sustainability-impact', '/sustainability-impact/']) {
    assert.deepEqual(redirects.find((rule) => rule.source === source), {
      source,
      destination: '/environmental-policy/',
      statusCode: 301,
    });
  }
  assert.ok(!redirects.some(({ source }) => source.startsWith('/environmental-policy')));
});
