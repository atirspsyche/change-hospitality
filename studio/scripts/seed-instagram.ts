import { deepStrictEqual } from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getCliClient } from 'sanity/cli';
import { instagramPostCount, requireInstagramProfile } from '../../src/lib/instagram.ts';
import { uploadError } from '../lib/mediaRules.ts';

const selection = [
  { file: '1.webp', caption: 'Good opportunities. Great hospitality.', alt: 'Jobs of the Week graphic over a cocktail, listing Events & Commercial, Front of House and Back of House.' },
  { file: '2.webp', caption: 'Between tables, behind the scenes.', alt: 'A woman outside Northcote Records beneath the words Between Tables at Northcote.' },
  { file: '3.webp', caption: 'A day in the life of our good people.', alt: 'A person walking outdoors beneath the words A day in the life of a Change temp worker.' },
  { file: '4.webp', caption: 'Big ideas, from the people behind them.', alt: 'Hospitality staff setting tables beneath The Founder Series with Alix Caiger, Caiger & Co.' },
  { file: '5.webp', caption: 'Hello, Hampshire. Good things are happening.', alt: 'Portsmouth waterfront and the Spinnaker Tower beneath Hello Hampshire! and a message about local hospitality teams.' },
];

async function seed() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const client = getCliClient({ apiVersion: '2026-09-08' }).withConfig({ useCdn: false, perspective: 'raw' });
  const config = client.config();
  if (config.projectId !== 'thyjjqzv' || config.dataset !== 'production') {
    throw new Error('Instagram initialization refused: target must be thyjjqzv / production.');
  }
  const existing = await client.fetch<Array<{ _id: string; _type: string }>>(
    '*[_id in ["story-instagram", "drafts.story-instagram"]]{_id, _type}',
  );
  if (existing.some(({ _id }) => _id === 'drafts.story-instagram')) {
    throw new Error('An Our story Instagram draft exists. Review and publish it in Studio before initializing.');
  }
  if (existing.some(({ _type }) => _type !== 'storyInstagram')) {
    throw new Error('The story-instagram ID belongs to another document type. No changes made.');
  }
  if (existing.length) {
    console.log('Our story Instagram is already published; preserving all editorial changes. No uploads or writes.');
    return;
  }
  const contacts = await client.fetch<{ socialLinks: Array<{ label: string; href: string }> } | null>(
    '*[_type == "siteSettings" && _id == "public-contacts"][0]{socialLinks}', {}, { perspective: 'published' },
  );
  const profile = requireInstagramProfile(contacts?.socialLinks ?? []);
  if (selection.length !== instagramPostCount) throw new Error(`Select exactly ${instagramPostCount} Instagram images.`);
  const photos = await Promise.all(selection.map(async (photo, index) => {
    const buffer = await readFile(fileURLToPath(new URL(`../../public/instagram-pics/${photo.file}`, import.meta.url)));
    const metadata = await sharp(buffer, { animated: true }).metadata();
    const error = uploadError({ size: buffer.length, type: `image/${metadata.format}` }, 'gallery');
    if (error !== true) throw new Error(`${photo.file}: ${error}`);
    if (!metadata.width || metadata.width < 600 || !metadata.height || metadata.height < 450 || (metadata.pages || 1) > 1) {
      throw new Error(`${photo.file}: use a non-animated image at least 600 by 450 pixels.`);
    }
    return { ...photo, key: `instagram-${index + 1}`, buffer };
  }));
  console.log(`Target: ${config.projectId} / ${config.dataset}; ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);
  console.table(photos.map(({ file, buffer, caption }) => ({ file, bytes: buffer.length, caption })));
  console.log(`Cards initially open ${profile.href}; individual post links are editable in Studio.`);
  if (!apply) return;
  if (!args.includes('--project=thyjjqzv')) throw new Error('To write, explicitly confirm --project=thyjjqzv.');

  const posts = await Promise.all(photos.map(async ({ file, key, buffer, caption, alt }) => {
    const asset = await client.assets.upload('image', buffer, { filename: `instagram-${file}` });
    return {
      _type: 'instagramPost',
      _key: key,
      caption,
      image: { _type: 'image', alt, asset: { _type: 'reference', _ref: asset._id } },
    };
  }));
  await client.createIfNotExists({ _id: 'story-instagram', _type: 'storyInstagram', posts });
  const saved = await client.fetch<{ posts: typeof posts } | null>(
    '*[_type == "storyInstagram" && _id == "story-instagram"][0]{posts}', {}, { perspective: 'published' },
  );
  deepStrictEqual(saved?.posts, posts, 'Published Instagram cards do not match the five supplied images. Review the document in Studio.');
  console.log('Published and verified all five Instagram images, in supplied order. Existing content was not changed.');
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
