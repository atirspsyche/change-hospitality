import assert from 'node:assert/strict';
import test from 'node:test';
import { getSanityConfig } from './sanity-config.js';

test('website and API default to the client production project', () => {
  assert.equal(getSanityConfig().projectId, 'thyjjqzv');
  assert.equal(getSanityConfig().dataset, 'production');
  assert.equal(getSanityConfig().perspective, 'published');
});

test('deployment targeting can be explicitly overridden without changing code', () => {
  assert.equal(getSanityConfig({ SANITY_PROJECT_ID: 'preview123', SANITY_DATASET: 'review' }).projectId, 'preview123');
  assert.equal(getSanityConfig({ SANITY_DATASET: 'review' }).dataset, 'review');
  assert.throws(() => getSanityConfig({ SANITY_PROJECT_ID: 'not/a/project' }), /Invalid/);
  assert.throws(() => getSanityConfig({ SANITY_DATASET: '../production' }), /Invalid/);
});