import assert from 'node:assert/strict';
import test from 'node:test';
import { instagramPostCount, isInstagramPostUrl, requireInstagramPosts, requireInstagramProfile } from './instagram.ts';

const posts = () => Array.from({ length: instagramPostCount }, (_, index) => ({
  _key: `post-${index}`,
  caption: `Moment ${index + 1}`,
  image: { alt: 'An approved Instagram image.', asset: { _id: `image-${index}`, url: 'https://cdn.sanity.io/image.webp' } },
}));

test('Instagram links accept only HTTPS posts and reels on the real Instagram host', () => {
  for (const url of [
    'https://www.instagram.com/p/ABC_123-xyz/',
    'https://instagram.com/reel/ABC123?igsh=example',
    'https://www.instagram.com/tv/ABC123/',
  ]) assert.equal(isInstagramPostUrl(url), true);
  for (const url of [
    undefined, null, '', 'not a URL', '/p/example', 'javascript:alert(1)',
    'http://www.instagram.com/p/example/', 'https://www.instagram.com.evil.test/p/example/',
    'https://user:password@www.instagram.com/p/example/', 'https://www.instagram.com:444/p/example/',
    'https://www.instagram.com/changehospitality/', 'https://www.instagram.com/reel/',
    'https://www.instagram.com/stories/changehospitality/123/',
  ]) assert.equal(isInstagramPostUrl(url), false, String(url));
});

test('the shared Public contacts profile supplies the handle and destination', () => {
  assert.deepEqual(requireInstagramProfile([
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/change-hospitality/' },
    { label: 'Instagram', href: 'https://www.instagram.com/changehospitality/' },
  ]), { href: 'https://www.instagram.com/changehospitality/', handle: '@changehospitality' });
  for (const href of [undefined, 'http://instagram.com/changehospitality/', 'https://instagram.com/p/example/', 'https://instagram.com/explore/']) {
    assert.throws(() => requireInstagramProfile(href ? [{ label: 'Instagram', href }] : []), /Public contacts/);
  }
});

test('exactly five complete posts preserve their editorial sequence and optional profile destinations', () => {
  const content = posts();
  content[1].postUrl = 'https://www.instagram.com/reel/example/';
  content[2].postUrl = null;
  assert.equal(requireInstagramPosts(content), content);
  assert.equal(instagramPostCount, 5);
});

test('missing, duplicate or incomplete Instagram content fails with an actionable explanation', () => {
  for (const value of [null, [], posts().slice(0, 3), [...posts(), posts()[0]]]) {
    assert.throws(() => requireInstagramPosts(value), /exactly 5 posts/);
  }
  for (const invalid of [
    { caption: '' }, { caption: ' ' }, { caption: 'x'.repeat(161) }, { _key: '' },
    { image: undefined }, { image: { alt: ' ', asset: { url: 'https://cdn.sanity.io/image.webp' } } },
    { image: { alt: 'x'.repeat(301), asset: { url: 'https://cdn.sanity.io/image.webp' } } },
    { image: { alt: 'Missing image asset.' } },
  ]) {
    const content = posts();
    content[0] = { ...content[0], ...invalid };
    assert.throws(() => requireInstagramPosts(content), /Every Our story Instagram post/);
  }
  const duplicate = posts();
  duplicate[1]._key = duplicate[0]._key;
  assert.throws(() => requireInstagramPosts(duplicate), /unique item keys/);
  const invalidLink = posts();
  invalidLink[0].postUrl = 'https://example.com/not-instagram';
  assert.throws(() => requireInstagramPosts(invalidLink), /valid HTTPS Instagram/);
});
