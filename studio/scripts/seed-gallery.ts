import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getCliClient } from 'sanity/cli';
import { uploadError } from '../lib/mediaRules.ts';

const selected = [
  { file: '09.webp', alt: 'change hospitality waitress serving at wedding' },
  { file: '03.webp', alt: 'front of house team behind the bar at Wimbledon games' },
  { file: '07.webp', alt: 'change hospitality bartender mixing drinks at Bacardi arena at Wireless festival' },
  { file: '04.webp', alt: 'reception staff at social pantry event' },
  { file: '08.webp', alt: 'waitress pouring drinks at private members club' },
  { file: '02.webp', alt: 'chef and waiting staff for christmas at claridges' },
];

async function seed() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const client = getCliClient({ apiVersion: '2026-09-08' }).withConfig({ useCdn: false, perspective: 'raw' });
  const config = client.config();
  if (config.projectId !== 'thyjjqzv' || config.dataset !== 'production') {
    throw new Error('Gallery import refused: target must be thyjjqzv / production.');
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
    const updates = selected.map(({ file, alt }) => ({ key: `candidate-${file.replace('.webp', '')}`, alt }));
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
  const inspected = await Promise.all(selected.map(async (photo) => {
    const buffer = await readFile(fileURLToPath(new URL(`../../public/candidate-pics/${photo.file}`, import.meta.url)));
    const metadata = await sharp(buffer, { animated: true }).metadata();
    const error = uploadError({ size: buffer.length, type: `image/${metadata.format}` }, 'gallery');
    if (error !== true) throw new Error(`${photo.file}: ${error}`);
    if (!metadata.width || metadata.width < 600 || !metadata.height || metadata.height < 450 || (metadata.pages || 1) > 1) {
      throw new Error(`${photo.file}: use a non-animated image at least 600 by 450 pixels.`);
    }
    return { ...photo, buffer };
  }));
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
  for (const { file, buffer, alt } of inspected) {
    const asset = await client.assets.upload('image', buffer, { filename: `candidate-${file}` });
    photos.push({
      _key: `candidate-${file.replace('.webp', '')}`,
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
