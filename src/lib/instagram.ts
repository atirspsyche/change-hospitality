export const instagramPostCount = 5;

interface InstagramPostFields {
  _key: string;
  caption: string;
  postUrl?: string | null;
  image: { alt: string; asset?: { url: string } };
}

function instagramUrl(value: unknown): URL | undefined {
  if (typeof value !== 'string' || !URL.canParse(value)) return undefined;
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname)
    || url.username || url.password || url.port) return undefined;
  return url;
}

export function isInstagramPostUrl(value: unknown): value is string {
  const url = instagramUrl(value);
  return !!url && /^\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
}

export function requireInstagramProfile(links: Array<{ label: string; href: string }>) {
  const link = links.find(({ label }) => label.toLowerCase() === 'instagram');
  const url = instagramUrl(link?.href);
  const match = url?.pathname.match(/^\/([A-Za-z0-9._]+)\/?$/);
  if (!url || !match || ['p', 'reel', 'reels', 'tv', 'explore', 'accounts', 'stories'].includes(match[1].toLowerCase())) {
    throw new Error('Set a valid HTTPS Instagram profile URL in Sanity Public contacts before building Our Story.');
  }
  return { href: url.href, handle: `@${match[1]}` };
}

export function requireInstagramPosts<Post extends InstagramPostFields>(posts: Post[] | null): Post[] {
  if (!Array.isArray(posts) || posts.length !== instagramPostCount) {
    throw new Error(
      `Publish Our story Instagram in Sanity with exactly ${instagramPostCount} posts before building the website. `
      + 'For initial setup, run npm --prefix studio run seed:instagram.',
    );
  }
  for (const post of posts) {
    if (!post || typeof post._key !== 'string' || !post._key.trim()
      || typeof post.caption !== 'string' || !post.caption.trim() || post.caption.length > 160
      || typeof post.image?.alt !== 'string' || !post.image.alt.trim() || post.image.alt.length > 300
      || typeof post.image.asset?.url !== 'string' || !post.image.asset.url.trim()) {
      throw new Error('Every Our story Instagram post needs a key, a caption (up to 160 characters), an image and descriptive alt text (up to 300 characters).');
    }
    if (post.postUrl != null && !isInstagramPostUrl(post.postUrl)) {
      throw new Error(`Our story Instagram post "${post._key}" needs a valid HTTPS Instagram post or reel URL, or no post link to open the profile.`);
    }
  }
  if (new Set(posts.map(({ _key }) => _key)).size !== instagramPostCount) {
    throw new Error('Our story Instagram posts must have unique item keys. Correct and publish the document in Sanity.');
  }
  return posts;
}
