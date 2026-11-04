import assert from 'node:assert/strict';
import test from 'node:test';
import { policyHref, policyThemes, requirePolicies } from './policies.ts';
import { renderPolicyMarkdown } from './policyMarkdown.ts';
import { seedPolicies } from '../../studio/data/policies.ts';

test('all four supplied policies have stable internal URLs, distinct brand themes and complete Markdown bodies', () => {
  assert.equal(requirePolicies(seedPolicies), seedPolicies);
  assert.deepEqual(seedPolicies.map(({ _id }) => _id), ['policy-1', 'policy-2', 'policy-3', 'policy-4']);
  assert.deepEqual(seedPolicies.map(({ slug }) => policyHref(slug.current)), [
    '/policies/data-protection/',
    '/policies/environmental-sustainability/',
    '/policies/equality-inclusion-diversity/',
    '/policies/modern-slavery/',
  ]);
  assert.deepEqual(seedPolicies.map(({ theme }) => theme), Object.keys(policyThemes));
  for (const policy of seedPolicies) assert.doesNotMatch(policy.body, /^# /m);
  assert.match(seedPolicies[0].body, /Data Protection Act 1998/);
  assert.match(seedPolicies[0].body, /Freedom from discrimination \[Article 14\]$/);
  assert.match(seedPolicies[1].body, /supports both people and planet\.$/);
  assert.match(seedPolicies[2].body, /greater equality of opportunities to all applicants and staff\.$/);
  assert.match(seedPolicies[3].body, /31st December 2026/);
  assert.match(seedPolicies[3].body, /section 54 of the Act\.$/);
});

test('missing, malformed and duplicate policy pages fail explicitly instead of reverting to PDF links', () => {
  for (const value of [undefined, null, {}, []]) assert.throws(() => requirePolicies(value), /Policy pages are missing/);
  for (const field of ['_id', 'label', 'title', 'description', 'body']) {
    assert.throws(() => requirePolicies([{ ...seedPolicies[0], [field]: '   ' }]), /Invalid Sanity policy page/);
  }
  for (const slug of [null, {}, { current: '../data' }, { current: 'Data Protection' }, { current: '-data' }, { current: 'a'.repeat(97) }]) {
    assert.throws(() => requirePolicies([{ ...seedPolicies[0], slug }]), /Invalid Sanity policy page/);
  }
  for (const theme of ['#4D2525', 'constructor', '__proto__', null]) {
    assert.throws(() => requirePolicies([{ ...seedPolicies[0], theme }]), /Invalid Sanity policy page/);
  }
  assert.throws(() => requirePolicies([{ ...seedPolicies[0], description: 'a'.repeat(181) }]), /Invalid Sanity policy page/);
  assert.throws(() => requirePolicies([seedPolicies[0], { ...seedPolicies[1], slug: seedPolicies[0].slug }]), /unique URL slugs/);
});

test('Markdown preserves policy headings, continuation numbering, nested lists, contact details and the statement note', async () => {
  const [data, environmental, equality, slavery] = await Promise.all(seedPolicies.map(({ body }) => renderPolicyMarkdown(body)));
  assert.equal((data.match(/<br>/g) || []).length, 5);
  assert.match(data, /<a href="mailto:info@thechangegroup\.com">info@thechangegroup\.com<\/a>/);
  assert.equal((environmental.match(/<li>/g) || []).length, 7);
  assert.equal((environmental.match(/<h2 /g) || []).length, 2);
  assert.equal((equality.match(/<h2 /g) || []).length, 4);
  assert.match(equality, /<ol start="7">/);
  assert.equal((equality.match(/<li>/g) || []).length, 29);
  assert.match(equality, /<strong>Equality<\/strong>/);
  assert.match(equality, /<strong>Company details<\/strong>/);
  assert.equal((slavery.match(/<h2 /g) || []).length, 3);
  assert.match(slavery, /<hr>/);
  assert.match(slavery, /\u00b9 'Modern slavery'/);
});

test('CMS Markdown cannot inject scripts, raw HTML handlers or unsafe link protocols', async () => {
  const html = await renderPolicyMarkdown(`## Safe heading

**Important** text and [contact](mailto:hello@example.com).

<script>alert('unsafe')</script>

<img src=x onerror="alert('unsafe')">

[unsafe link](javascript:alert)

[unsafe data](data:text/html;base64,PHNjcmlwdD4=)`);
  assert.match(html, /<h2 id="safe-heading">Safe heading<\/h2>/);
  assert.match(html, /<strong>Important<\/strong>/);
  assert.match(html, /href="mailto:hello@example.com"/);
  assert.doesNotMatch(html, /<script|<img|onerror|javascript:|data:text\/html/);
});
