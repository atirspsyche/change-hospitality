import assert from 'node:assert/strict';
import test from 'node:test';
import { storyInstagram } from './storyInstagram.ts';

function validationCalls(field) {
  const calls = [];
  const rule = Object.fromEntries(['required', 'min', 'max', 'assetRequired', 'custom'].map((name) => [
    name, (...args) => { calls.push([name, ...args]); return rule; },
  ]));
  field.validation(rule);
  return calls;
}

const posts = storyInstagram.fields.find(({ name }) => name === 'posts');
const post = posts.of[0];
const image = post.fields.find(({ name }) => name === 'image');

test('Our story Instagram requires five ordered posts and uses the guarded photo picker', () => {
  assert.equal(storyInstagram.type, 'document');
  assert.deepEqual(validationCalls(posts), [['required'], ['min', 5], ['max', 5]]);
  assert.equal(post.name, 'instagramPost');
  assert.equal(image.type, 'image');
  assert.equal(image.options.hotspot, true);
  assert.equal(image.options.sources[0].name, 'guarded-instagram');
  assert.equal(image.options.sources[0].title, 'Instagram photos');
  assert.deepEqual(validationCalls(image).slice(0, 2), [['required'], ['assetRequired']]);
});

test('captions and image descriptions must be non-blank and stay within their published limits', () => {
  const caption = post.fields.find(({ name }) => name === 'caption');
  const alt = image.fields.find(({ name }) => name === 'alt');
  for (const [field, maximum] of [[caption, 160], [alt, 300]]) {
    const calls = validationCalls(field);
    assert.deepEqual(calls.slice(0, 2), [['required'], ['max', maximum]]);
    const custom = calls.find(([name]) => name === 'custom')[1];
    assert.equal(custom('An accurate description.'), true);
    for (const value of [undefined, '', '   ']) assert.equal(typeof custom(value), 'string');
  }
});

test('post links are optional but cannot point to other sites or insecure destinations', () => {
  const link = post.fields.find(({ name }) => name === 'postUrl');
  const custom = validationCalls(link).find(([name]) => name === 'custom')[1];
  for (const value of [undefined, null, 'https://www.instagram.com/p/example/', 'https://instagram.com/reel/example/']) {
    assert.equal(custom(value), true);
  }
  for (const value of ['', 'https://example.com', 'http://instagram.com/p/example/', 'javascript:alert(1)']) {
    assert.equal(typeof custom(value), 'string');
  }
});
