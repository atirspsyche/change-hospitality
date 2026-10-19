import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { requireImpactNumbers } from './impactNumbers.ts';

const metrics = [
  { number: '20,000+', label: 'trees funded', shape: 'tree', unit: null },
  { number: '3.09', label: 'carbon removal', shape: 'round', unit: 'tCO\u2082e' },
  { number: '0', label: 'projects worldwide', shape: 'soft' },
];

let server;
let getImpactNumbers;
let sanityClient;

before(async () => {
  server = await createServer({
    configFile: false,
    cacheDir: fileURLToPath(new URL('../../node_modules/.vite-impact-numbers', import.meta.url)),
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
  });
  ({ getImpactNumbers } = await server.ssrLoadModule('/src/sanity/queries.ts'));
  ({ sanityClient } = await server.ssrLoadModule('/src/sanity/client.ts'));
});

after(async () => {
  await server?.close();
});

test('impact numbers preserve CMS ordering, display formatting, optional units and zero values', () => {
  assert.equal(requireImpactNumbers(metrics), metrics);
  assert.deepEqual(requireImpactNumbers(metrics.slice().reverse()), metrics.slice().reverse());
  assert.equal(requireImpactNumbers([metrics[0]]).length, 1);
});

test('missing and empty content fails explicitly instead of falling back to static figures', () => {
  for (const value of [null, undefined, [], {}, '498']) {
    assert.throws(() => requireImpactNumbers(value), /missing in Sanity.*seed:impact/);
  }
});

test('incomplete or malformed CMS entries are rejected before rendering', () => {
  for (const value of [
    null,
    {},
    { ...metrics[0], number: 498 },
    { ...metrics[0], number: '   ' },
    { ...metrics[0], label: '' },
    { ...metrics[0], label: '\t' },
    { ...metrics[0], unit: 100 },
    { ...metrics[0], shape: null },
    { ...metrics[0], shape: 'unsupported' },
  ]) {
    assert.throws(() => requireImpactNumbers([metrics[0], value]), /Invalid Sanity environmental impact numbers/);
  }
});

test('the query reads only the published singleton and returns the CMS values without reordering', async (t) => {
  const fetch = t.mock.method(sanityClient, 'fetch', async () => metrics);
  assert.deepEqual(await getImpactNumbers(), metrics);
  const [query, parameters, options] = fetch.mock.calls[0].arguments;
  assert.match(query, /_type == "environmentalImpact"/);
  assert.match(query, /_id == "environmental-impact"/);
  assert.match(query, /\[0\]\.metrics\[\]/);
  for (const field of ['number', 'label', 'unit', 'shape']) {
    assert.match(query, new RegExp(`\\b${field}\\b`));
  }
  assert.doesNotMatch(query, /order\(/);
  assert.deepEqual(parameters, {});
  assert.deepEqual(options, { perspective: 'published' });
});

test('missing published CMS content is surfaced by the query', async (t) => {
  t.mock.method(sanityClient, 'fetch', async () => null);
  await assert.rejects(getImpactNumbers, /missing in Sanity/);
});

test('Sanity failures propagate without a success-shaped fallback', async (t) => {
  const failure = new Error('Sanity is unavailable');
  t.mock.method(sanityClient, 'fetch', async () => { throw failure; });
  await assert.rejects(getImpactNumbers, (error) => error === failure);
});
