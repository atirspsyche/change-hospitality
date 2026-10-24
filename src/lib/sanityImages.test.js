import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import sharpService from 'astro/assets/services/sharp';
import { imageMetadata } from 'astro/assets/utils';
import { createServer } from 'vite';

let server;
let buildImage;
let getTeamMembers;
let sanityClient;
let calls;
let probes;
before(async () => {
  server = await createServer({
    configFile: false, optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom',
    plugins: [{
      name: 'test-astro-assets',
      resolveId(id) { if (id === 'astro:assets') return '\0test-astro-assets'; },
      load(id) {
        if (id === '\0test-astro-assets') return `
          export const calls = [];
          export const probes = [];
          export async function inferRemoteSize(src) {
            probes.push(src);
            if (src.includes('unavailable')) throw new Error('Cannot read logo dimensions');
            const [, width, height] = src.match(/-(\\d+)x(\\d+)\\./);
            return { width: Number(width), height: Number(height) };
          }
          export async function getImage(options) {
            calls.push(options);
            return { src: "/_astro/fixture-" + calls.length + "." + options.format, attributes: { width: options.width, height: options.height || 200 } };
          }
        `;
      },
    }],
  });
  ({ buildImage } = await server.ssrLoadModule('/src/lib/sanityImages.ts'));
  ({ getTeamMembers } = await server.ssrLoadModule('/src/sanity/queries.ts'));
  ({ sanityClient } = await server.ssrLoadModule('/src/sanity/client.ts'));
  ({ calls, probes } = await server.ssrLoadModule('astro:assets'));
});
after(async () => { await server?.close(); });

const portrait = { alt: 'Example portrait', asset: { _id: 'image-examplehash-1200x900-jpg', url: 'https://cdn.sanity.io/images/thyjjqzv/production/examplehash-1200x900.jpg', metadata: { dimensions: { width: 1200, height: 900 } } }, hotspot: { x: 0.7, y: 0.4, width: 0.2, height: 0.2 } };

test('portrait generation uses local responsive images and a separate crawler-friendly JPEG', async () => {
  const image = await buildImage(portrait, 'portrait');
  assert.match(image.src, /^\/_astro\//);
  assert.match(image.srcSet, /400w/);
  assert.match(image.srcSet, /800w/);
  assert.match(image.shareSrc, /\.jpeg$/);
  const count = calls.length;
  assert.deepEqual(await buildImage(portrait, 'portrait'), image);
  assert.equal(calls.length, count);
  assert.ok(calls.some((call) => new URL(call.src).searchParams.has('rect')));
});
test('logos use uncropped local outputs and missing portraits retain the initials fallback', async () => {
  const image = await buildImage(portrait, 'logo');
  assert.match(image.src, /^\/_astro\//);
  assert.equal(calls.at(-1).width, 400);
  assert.equal(calls.at(-1).height, 300);
  assert.equal(calls.at(-1).fit, 'contain');
  assert.equal(calls.at(-1).src, portrait.asset.url);
  assert.equal(await buildImage(undefined, 'portrait'), undefined);
  assert.equal(await buildImage(undefined, 'logo'), undefined);
  assert.equal(await buildImage({ asset: { _id: 'missing-url' } }, 'logo'), undefined);
});
test('SVG logos retain local vector output without requesting disabled SVG rasterization', async () => {
  const image = await buildImage({ asset: { _id: 'image-logohash-521x171-svg', url: 'https://cdn.sanity.io/images/thyjjqzv/production/logohash-521x171.svg', metadata: { dimensions: { width: 521, height: 171 } } } }, 'logo');
  assert.match(image.src, /^\/_astro\/.*\.svg$/);
  assert.equal(calls.at(-1).format, 'svg');
  assert.equal(calls.at(-1).width, 400);
  assert.equal(calls.at(-1).height, 131);
  assert.equal(calls.at(-1).inferSize, undefined);
});
for (const [name, width, height] of [
  ['square', 500, 500],
  ['wide', 1200, 300],
  ['tall', 500, 1500],
  ['small', 80, 40],
  ['fractional-ratio', 1001, 333],
  ['very-wide', 2000, 2],
  ['very-tall', 2, 2000],
]) {
  test(`${name} logos preserve their full source aspect ratio through Astro's image service`, async () => {
    const probeCount = probes.length;
    const image = await buildImage({
      asset: {
        _id: `image-${name}`,
        url: `https://cdn.sanity.io/images/thyjjqzv/production/${name}-${width}x${height}.png`,
        metadata: { dimensions: { width, height } },
      },
      crop: { top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 },
      hotspot: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 },
    }, 'logo');
    const options = calls.at(-1);
    const targetWidth = Math.min(400, width);
    const targetHeight = Math.max(1, Math.round(height * targetWidth / width));
    assert.deepEqual([image.width, image.height], [targetWidth, targetHeight]);
    assert.equal(options.inferSize, undefined);
    assert.equal(options.fit, 'contain');
    assert.equal(probes.length, probeCount, 'valid Sanity dimensions should not require another request');
    assert.equal(new URL(options.src).search, '', 'logo crop and hotspot settings must not crop the source');

    const source = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="red"/></svg>`);
    const result = await sharpService.transform(source, options, { service: { config: {} }, dangerouslyProcessSVG: true });
    const actual = await imageMetadata(result.data);
    assert.ok(Math.abs(actual.width - targetWidth) <= 1);
    assert.ok(Math.abs(actual.height - targetHeight) <= 1);
  });
}
for (const dimensions of [undefined, { width: 0, height: 500 }, { width: 500, height: -1 }, { width: NaN, height: 500 }, { width: 500, height: Infinity }]) {
  test(`logos infer source dimensions when metadata is ${JSON.stringify(dimensions)}`, async () => {
    const src = `https://cdn.sanity.io/images/thyjjqzv/production/inferred-${probes.length}-500x250.png`;
    const image = await buildImage({ asset: { _id: src, url: src, metadata: { dimensions } } }, 'logo');
    assert.equal(probes.at(-1), src);
    assert.deepEqual([image.width, image.height], [400, 200]);
    assert.equal(calls.at(-1).inferSize, undefined);
  });
}
test('unreadable logo dimensions fail explicitly rather than generating a cropped fallback', async () => {
  await assert.rejects(buildImage({ asset: { _id: 'unavailable', url: 'https://cdn.sanity.io/images/thyjjqzv/production/unavailable.png' } }, 'logo'), /Cannot read logo dimensions/);
});
test('team query never passes original asset URLs to hydrated profile cards', async (context) => {
  context.mock.method(sanityClient, 'fetch', async () => [{ _id: 'consultant-example', name: 'Example', note: 'A full biography.', avatar: portrait }]);
  const [member] = await getTeamMembers();
  assert.match(member.avatarUrl, /^\/_astro\//);
  assert.equal(member.avatar, undefined);
  assert.equal(member.note, 'A full biography.');
  assert.doesNotMatch(JSON.stringify(member), /cdn\.sanity\.io/);
});