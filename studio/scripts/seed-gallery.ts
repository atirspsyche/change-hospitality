import { deepStrictEqual } from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getCliClient } from 'sanity/cli';
import { uploadError } from '../lib/mediaRules.ts';

const selected = [
  { key: 'candidate-09', file: '09.webp', alt: 'change hospitality waitress serving at wedding' },
  { key: 'candidate-03', file: '10.webp', alt: 'Front of house team in green uniforms posing together behind a bar.' },
  { key: 'candidate-07', file: '11.webp', alt: 'Bartender performing a bottle flair move at an event bar.' },
  { key: 'candidate-04', file: '04.webp', alt: 'reception staff at social pantry event' },
  { key: 'candidate-08', file: '08.webp', alt: 'waitress pouring drinks at private members club' },
  { key: 'candidate-02', file: '02.webp', alt: 'chef and waiting staff for christmas at claridges' },
];

interface GalleryPhoto {
  _key: string;
  asset?: { _type: 'reference'; _ref: string };
  alt?: string;
  [key: string]: unknown;
}

interface GalleryDocument {
  _id: string;
  _type: string;
  _rev: string;
  photos?: GalleryPhoto[];
}

async function inspectPhoto(photo: typeof selected[number]) {
  const buffer = await readFile(fileURLToPath(new URL(`../../public/candidate-pics/${photo.file}`, import.meta.url)));
  const metadata = await sharp(buffer, { animated: true }).metadata();
  const error = uploadError({ size: buffer.length, type: `image/${metadata.format}` }, 'gallery');
  if (error !== true) throw new Error(`${photo.file}: ${error}`);
  if (!metadata.width || metadata.width < 600 || !metadata.height || metadata.height < 450 || (metadata.pages || 1) > 1) {
    throw new Error(`${photo.file}: use a non-animated image at least 600 by 450 pixels.`);
  }
  return { ...photo, buffer, sha1: createHash('sha1').update(buffer).digest('hex') };
}

async function seed() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const client = getCliClient({ apiVersion: '2026-09-08' }).withConfig({ useCdn: false, perspective: 'raw' });
  const config = client.config();
  if (config.projectId !== 'thyjjqzv' || config.dataset !== 'production') {
    throw new Error('Gallery import refused: target must be thyjjqzv / production.');
  }
  if (args.includes('--replace-photos')) {
    if (args.includes('--update-alt')) throw new Error('Run --replace-photos and --update-alt separately.');
    const documents = await client.fetch<GalleryDocument[]>(
      '*[_id in ["candidate-gallery", "drafts.candidate-gallery"]]',
    );
    if (documents.some(({ _id }) => _id === 'drafts.candidate-gallery')) {
      throw new Error('An editorial Candidate gallery draft exists. Review and publish it before replacing photos.');
    }
    const document = documents.find(({ _id, _type }) => _id === 'candidate-gallery' && _type === 'candidateGallery');
    if (!document?.photos || document.photos.length !== 6 || new Set(document.photos.map((photo) => photo._key)).size !== 6) {
      throw new Error('Expected the published six-photo gallery with unique item keys; no changes made.');
    }
    const photos = document.photos;
    const replacements = await Promise.all([
      { ...selected[1], index: 1, originalFile: '03.webp' },
      { ...selected[2], index: 2, originalFile: '07.webp' },
    ].map(async (replacement) => {
      const inspected = await inspectPhoto(replacement);
      const original = await readFile(fileURLToPath(new URL(`../../public/candidate-pics/${replacement.originalFile}`, import.meta.url)));
      const originalHash = createHash('sha1').update(original).digest('hex');
      const photo = photos[replacement.index];
      const currentAsset = photo?.asset?._ref;
      const alreadyReplaced = currentAsset?.startsWith(`image-${inspected.sha1}-`) === true;
      if (photo?._key !== replacement.key || (!alreadyReplaced && !currentAsset?.startsWith(`image-${originalHash}-`))) {
        throw new Error(`Photo ${replacement.index + 1} no longer matches ${replacement.originalFile}. Review the gallery in Studio; no changes made.`);
      }
      return { ...replacement, ...inspected, alreadyReplaced };
    }));
    console.log(`Target: ${config.projectId} / ${config.dataset}; ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);
    console.table(replacements.map(({ index, originalFile, file, buffer, alt, alreadyReplaced }) => ({
      position: index + 1, from: originalFile, to: file, bytes: buffer.length, alt, alreadyReplaced,
    })));
    if (replacements.every(({ index, alt, alreadyReplaced }) => alreadyReplaced && photos[index].alt === alt)) {
      console.log('Both replacement photos are already published in the requested positions; no changes made.');
      return;
    }
    if (!apply) return;
    if (!args.includes('--project=thyjjqzv')) throw new Error('To write, explicitly confirm --project=thyjjqzv.');
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const backup = path.join(root, 'temp/sanity-backups', `candidate-gallery-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    await mkdir(backup, { recursive: true });
    await writeFile(path.join(backup, 'before.ndjson'), JSON.stringify(document));
    console.log(`Saved pre-update gallery to ${path.relative(root, backup)}.`);

    const expectedPhotos = photos.map((photo) => ({ ...photo }));
    const fields: Record<string, unknown> = {};
    const unsetFields: string[] = [];
    for (const replacement of replacements) {
      const { key, file, buffer, index, alt, alreadyReplaced } = replacement;
      const assetId = alreadyReplaced ? photos[index].asset!._ref
        : (await client.assets.upload('image', buffer, { filename: `candidate-${file}` }))._id;
      const photoPath = `photos[_key=="${key}"]`;
      fields[`${photoPath}.asset`] = { _type: 'reference', _ref: assetId };
      fields[`${photoPath}.alt`] = alt;
      expectedPhotos[index].asset = { _type: 'reference', _ref: assetId };
      expectedPhotos[index].alt = alt;
      if (!alreadyReplaced) {
        unsetFields.push(`${photoPath}.crop`, `${photoPath}.hotspot`);
        delete expectedPhotos[index].crop;
        delete expectedPhotos[index].hotspot;
      }
    }
    let patch = client.patch(document._id).ifRevisionId(document._rev).set(fields);
    if (unsetFields.length) patch = patch.unset(unsetFields);
    await patch.commit();
    const saved = await client.fetch<GalleryDocument | null>(
      '*[_id == "candidate-gallery"][0]', {}, { perspective: 'published' },
    );
    deepStrictEqual(saved?.photos, expectedPhotos, 'Published gallery does not match the two replacements. Inspect Candidate gallery in Studio.');
    console.log('Verified 03.webp -> 10.webp in position 2 and 07.webp -> 11.webp in position 3. The other four photos, item keys and sequence were preserved.');
    return;
  }
  if (args.includes('--update-alt')) {
    const documents = await client.fetch<Array<{
      _id: string; _type: string; _rev: string;
      photos?: Array<{ _key: string; alt?: string }>;
    }>>('*[_id in ["candidate-gallery", "drafts.candidate-gallery"]]{_id, _type, _rev, photos[]{_key, alt}}');
    if (documents.some(({ _id }) => _id === 'drafts.candidate-gallery')) {
      throw new Error('An editorial Candidate gallery draft exists. Review and publish it in Studio before updating descriptions.');
    }
    const document = documents.find(({ _id, _type }) => _id === 'candidate-gallery' && _type === 'candidateGallery');
    if (!document || document.photos?.length !== selected.length) {
      throw new Error('The published gallery must contain the six original photo keys before updating descriptions.');
    }
    const updates = selected.map(({ key, alt }) => ({ key, alt }));
    if (updates.some(({ key }) => !document.photos?.some(({ _key }) => _key === key))) {
      throw new Error('The gallery photo keys have changed. Update the descriptions in Studio instead; no changes made.');
    }
    console.log(`Target: ${config.projectId} / ${config.dataset}; ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);
    console.table(updates);
    if (!apply) return;
    if (!args.includes('--project=thyjjqzv')) throw new Error('To write, explicitly confirm --project=thyjjqzv.');
    await client.patch(document._id).ifRevisionId(document._rev)
      .set(Object.fromEntries(updates.map(({ key, alt }) => [`photos[_key=="${key}"].alt`, alt])))
      .commit();
    const saved = await client.fetch<Array<{ _key: string; alt?: string }>>(
      '*[_id == "candidate-gallery"][0].photos[]{_key, alt}', {}, { perspective: 'published' },
    );
    if (updates.some(({ key, alt }) => saved.find(({ _key }) => _key === key)?.alt !== alt)) {
      throw new Error('Published gallery descriptions do not match the update. Inspect Candidate gallery in Studio.');
    }
    console.log('Verified six published descriptions. Images, crops and photo order were preserved.');
    return;
  }
  const inspected = await Promise.all(selected.map(inspectPhoto));
  console.log(`Target: ${config.projectId} / ${config.dataset}; ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);
  console.table(inspected.map(({ file, alt, buffer }) => ({ file, bytes: buffer.length, alt })));
  if (!apply) return;
  if (!args.includes('--project=thyjjqzv')) throw new Error('To write, explicitly confirm --project=thyjjqzv.');

  const existing = await client.fetch<Array<{ _id: string; _type: string }>>(
    '*[_id in ["candidate-gallery", "drafts.candidate-gallery"]]{_id, _type}',
  );
  if (existing.some((document) => document._id === 'drafts.candidate-gallery')) {
    throw new Error('An editorial Candidate gallery draft exists. Review and publish it in Studio instead of seeding.');
  }
  if (existing.length) {
    if (existing[0]._type !== 'candidateGallery') throw new Error('The candidate-gallery ID is already used by another document type.');
    console.log('Preserved existing published Candidate gallery; no assets uploaded or documents changed.');
    return;
  }

  const photos = [];
  for (const { key, file, buffer, alt } of inspected) {
    const asset = await client.assets.upload('image', buffer, { filename: `candidate-${file}` });
    photos.push({
      _key: key,
      _type: 'image',
      asset: { _type: 'reference', _ref: asset._id },
      alt,
    });
    console.log(`Uploaded ${file}`);
  }
  const document = await client.createIfNotExists({ _id: 'candidate-gallery', _type: 'candidateGallery', photos });
  const published = await client.fetch<{ photos?: Array<{ _key: string; asset?: { _ref: string }; alt?: string }> } | null>(
    '*[_id == "candidate-gallery"][0]{photos}',
    {},
    { perspective: 'published' },
  );
  if (published?.photos?.length !== 6 || photos.some((photo, index) => {
    const saved = published.photos?.[index];
    return saved?._key !== photo._key || saved.asset?._ref !== photo.asset._ref || saved.alt !== photo.alt;
  })) throw new Error('Published Candidate gallery does not match the six selected photos. Inspect the document in Studio.');
  console.log(`Verified ${document._id}: six published candidate photos, descriptive alt text and original selection order.`);
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Candidate gallery import failed.');
  process.exitCode = 1;
});
