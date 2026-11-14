import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { siteLinks } from '../data/navigation.ts';

const { redirects, headers } = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const mappings = [
  ['/sustainability-impact', '/environmental-policy/'],
  ['/search-jobs', '/jobs/'],
  ['/job-search', '/jobs/'],
  ['/our-company', '/our-story/'],
  ['/contact', '/team/#profiles'],
  ['/consultant/:slug', '/team/#profiles'],
  ['/success-stories', '/jobs/#candidate-testimonials'],
  ['/data-protection-policy', '/policies/data-protection/'],
  ['/modern-slavery', '/policies/modern-slavery/'],
  ['/diversity-policy', '/policies/equality-inclusion-diversity/'],
  ['/job-division/front-of-house', '/recruit-talent/#divisions'],
  ['/job-division/recruiting-for-back-of-house-roles', '/recruit-talent/#divisions'],
  ['/job-division/recruiting-sales-events-marketing-roles', '/recruit-talent/#divisions'],
  ['/job-division/recruiting-for-executive-level-roles', '/recruit-talent/#divisions'],
  ['/job-division/recruiting-for-hospitality-human-resource-roles', '/recruit-talent/#divisions'],
  ['/job-division/recruiting-office-support-roles-for-luxury-and-hospitality-organisations', '/recruit-talent/#divisions'],
  ['/job-division/recruiting-financial-staff-for-roles-in-hospitality-businesses', '/recruit-talent/#divisions'],
  ['/job-division/submit-a-vacancy', '/recruit-talent/#staffing-requirement'],
];

test('confirmed legacy routes redirect directly with HTTP 301, with and without trailing slashes', () => {
  const expected = mappings.flatMap(([source, destination]) => [
    { source, destination, statusCode: 301 },
    { source: `${source}/`, destination, statusCode: 301 },
  ]);
  expected.push({ source: '/sitemap_index.xml', destination: '/sitemap-index.xml', statusCode: 301 });
  assert.deepEqual(redirects, expected);
});

test('redirects have no duplicate sources, chains, catch-alls or canonical route collisions', () => {
  const sources = new Set(redirects.map(({ source }) => source));
  assert.equal(sources.size, redirects.length);
  for (const { source, destination } of redirects) {
    assert.match(source, /^\/[a-z0-9/_.:-]+$/);
    if (source.includes(':')) assert.match(source, /^\/consultant\/:slug\/?$/);
    assert.ok(destination.startsWith('/') && !destination.startsWith('//'));
    const target = new URL(destination, 'https://www.changehospitality.co.uk');
    assert.ok(!sources.has(target.pathname), `${source} must not introduce a redirect chain`);
  }
  for (const { href } of siteLinks) {
    assert.ok(!sources.has(href));
    if (href !== '/') assert.ok(!sources.has(href.slice(0, -1)));
  }
  assert.deepEqual(headers, [{
    source: '/_astro/(.*)',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
  }]);
});

test('unmatched jobs, content and distinct privacy notices are not redirected to unrelated pages', () => {
  for (const source of [
    '/job-search/:slug', '/job-search/:path*', '/blog', '/work-for-us',
    '/send-cv', '/foh-sign-up', '/boh-form', '/festival-sign-up',
    '/change-group-privacy-policy', '/cookies-and-privacy-policy',
  ]) {
    assert.ok(!redirects.some((rule) => rule.source === source || rule.source === `${source}/`));
  }
});

test('the redirected sustainability alias no longer generates an indexable duplicate page', () => {
  assert.ok(existsSync(new URL('../pages/environmental-policy.astro', import.meta.url)));
  assert.ok(!existsSync(new URL('../pages/sustainability-impact.astro', import.meta.url)));
});
