import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateGallery } from './candidateGallery.ts';
import { mediaLimits, uploadError, validateImage } from '../lib/mediaRules.ts';

const photos = candidateGallery.fields.find((field) => field.name === 'photos');
const photo = photos.of[0];
function validationCalls(field) {
  const calls = [];
  const rule = Object.fromEntries(['required', 'min', 'max', 'assetRequired', 'custom'].map((name) => [
    name, (...args) => { calls.push([name, ...args]); return rule; },
  ]));
  field.validation(rule);
  return calls;
}

test('candidate gallery is an editable ordered array of one to six guarded photos', () => {
  assert.equal(candidateGallery.type, 'document');
  assert.deepEqual(validationCalls(photos), [['required'], ['min', 1], ['max', 6]]);
  assert.equal(photo.type, 'image');
  assert.equal(photo.options.hotspot, true);
  assert.equal(photo.options.sources[0].name, 'guarded-gallery');
  assert.deepEqual(validationCalls(photo).slice(0, 2), [['required'], ['assetRequired']]);
  const alt = photo.fields.find((field) => field.name === 'alt');
  const rules = validationCalls(alt);
  assert.deepEqual(rules.slice(0, 2), [['required'], ['max', 300]]);
  const custom = rules.find(([name]) => name === 'custom')[1];
  assert.equal(custom('A team at work.'), true);
  for (const value of [undefined, '', '   ']) assert.equal(typeof custom(value), 'string');
});

test('candidate picker rejects oversized, empty or unsupported files before uploading', () => {
  assert.equal(mediaLimits.gallery, 2 * 1024 * 1024);
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(uploadError({ size: 200_000, type }, 'gallery'), true);
  }
  for (const file of [
    { size: 0, type: 'image/webp' },
    { size: mediaLimits.gallery + 1, type: 'image/webp' },
    { size: 100, type: 'image/gif' },
    { size: 100, type: 'image/svg+xml' },
  ]) assert.equal(typeof uploadError(file, 'gallery'), 'string');
});

test('candidate image publication verifies asset size, format and minimum dimensions', async () => {
  let asset;
  const context = { getClient: () => ({ fetch: async () => asset }) };
  const image = { asset: { _ref: 'image-example' } };
  const valid = { size: 200_000, mimeType: 'image/webp', metadata: { dimensions: { width: 1024, height: 768 } } };
  asset = valid;
  assert.equal(await validateImage(image, context, 'gallery'), true);
  for (const invalid of [
    null,
    { ...valid, size: mediaLimits.gallery + 1 },
    { ...valid, mimeType: 'image/gif' },
    { ...valid, metadata: undefined },
    { ...valid, metadata: { dimensions: { width: 599, height: 450 } } },
    { ...valid, metadata: { dimensions: { width: 600, height: 449 } } },
  ]) {
    asset = invalid;
    assert.equal(typeof await validateImage(image, context, 'gallery'), 'string');
  }
});
