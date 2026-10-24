import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCliClient } from 'sanity/cli';
import { parseTeam, inspectImage } from '../lib/teamImport.ts';
import { indexedClients, namedClients, publicContacts, policies, clientTestimonials, candidateTestimonials, temporaryGuidance } from '../data/websiteContent.ts';
import { seedLocations } from '../data/locations.ts';
import { seedEnvironmentalImpact } from '../data/environmentalImpact.ts';

async function main() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const approvedSingletons = new Set<string>();
  if (args.includes('--approve-guidance')) approvedSingletons.add('temporary-work');
  if (args.includes('--approve-impact')) approvedSingletons.add('environmental-impact');
  const members = parseTeam(await readFile(path.join(root, 'temp/team-members.md'), 'utf8'));
  const media = [
    ...members.map((member) => ({ owner: member._id, file: member.portraitFile, kind: 'portrait' as const })),
    ...indexedClients.map((client) => ({ owner: client._id, file: client.file, kind: 'logo' as const })),
    ...namedClients.map((client) => ({ owner: `client-${client.key}`, file: `public/client-logos/${client.key}.svg`, kind: 'logo' as const })),
  ];
  const inspected = [];
  for (const item of media) inspected.push({ ...item, ...await inspectImage(path.join(root, item.file), item.kind) });
  const offices = seedLocations.filter((office) => office.active);
  const clients = [
    ...indexedClients.map(({ file, ...client }) => client),
    ...namedClients.map((client) => ({ _id: `client-${client.key}`, _type: 'client', name: client.name, marquee: false, visible: true, sortOrder: 100 })),
  ];
  const documents: Array<{ _id: string; _type: string; [key: string]: unknown }> = [
    ...offices,
    ...members.map(({ portraitFile, temporaryBiography, ...member }) => member),
    ...clients, ...clientTestimonials, ...candidateTestimonials, publicContacts, ...policies,
    { ...temporaryGuidance, _id: args.includes('--approve-guidance') ? 'temporary-work' : 'drafts.temporary-work' },
    { ...seedEnvironmentalImpact, _id: args.includes('--approve-impact') ? 'environmental-impact' : 'drafts.environmental-impact' },
  ];
  const client = getCliClient({ apiVersion: '2026-09-08' }).withConfig({ useCdn: false, perspective: 'raw' });
  const config = client.config();
  if (config.projectId !== 'thyjjqzv' || config.dataset !== 'production') throw new Error('Import refused: target must be thyjjqzv / production.');
  console.log(`Target: ${config.projectId} / ${config.dataset}; ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);
  console.log(`Validated ${members.length} team profiles, ${offices.length} offices, ${clients.length} client logos, ${documents.length} documents and ${inspected.length} image files.`);
  console.log(`Original image payload: ${(inspected.reduce((total, item) => total + item.size, 0) / 1_000_000).toFixed(2)} MB.`);
  console.table(members.map((member) => ({ name: member.name, office: member.location._ref, biography: member.note.length, contact: member.email ? 'verified' : 'pending', temporaryBiography: member.temporaryBiography })));
  if (!apply) return;
  if (!args.includes('--project=thyjjqzv')) throw new Error('To write, explicitly confirm --project=thyjjqzv.');
  const before = await client.fetch<Array<{ _id: string; _type: string; _rev: string; [key: string]: unknown }>>('*[!(_id in path("_.**"))]');
  const existing = new Set(before.map((document: { _id: string }) => document._id));
  for (const document of documents) {
    const publishedId = document._id.replace(/^drafts\./, '');
    if (!existing.has(document._id) && existing.has(`drafts.${publishedId}`) && !approvedSingletons.has(publishedId)) throw new Error(`Review existing draft ${publishedId} before importing.`);
  }
  const backup = path.join(root, 'temp/sanity-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  await mkdir(backup, { recursive: true });
  await writeFile(path.join(backup, 'before.ndjson'), before.map((document: unknown) => JSON.stringify(document)).join('\n'));
  const publications = before
    .filter((document) => document._id.startsWith('drafts.') && approvedSingletons.has(document._id.slice(7)) && !existing.has(document._id.slice(7)))
    .map((document) => ({
      actionType: 'sanity.action.document.publish' as const,
      draftId: document._id,
      ifDraftRevisionId: document._rev,
      publishedId: document._id.slice(7),
    }));
  if (publications.length) {
    await client.action(publications);
    for (const publication of publications) {
      existing.delete(publication.draftId);
      existing.add(publication.publishedId);
      console.log(`Published reviewed draft ${publication.publishedId}`);
    }
  }
  const assets = new Map<string, string>();
  for (const item of inspected) {
    if (existing.has(item.owner)) continue;
    const asset = await client.assets.upload('image', item.buffer, { filename: item.filename });
    assets.set(item.owner, asset._id);
  }
  for (const document of documents) {
    if (document._id.startsWith('drafts.') && existing.has(document._id.slice(7))) {
      console.log(`Preserved published ${document._id.slice(7)}`);
      continue;
    }
    const asset = assets.get(document._id);
    const mediaField = document._type === 'consultant' ? 'avatar' : 'logo';
    const result = await client.createIfNotExists({ ...document, ...(asset ? {
      [mediaField]: { _type: 'image', asset: { _type: 'reference', _ref: asset }, ...(mediaField === 'avatar' ? { alt: `${'name' in document ? document.name : 'Team member'} portrait` } : {}) },
    } : {}) });
    console.log(`${existing.has(document._id) ? 'Preserved' : 'Created'} ${result._id}`);
  }
  console.log('Import complete. Unapproved impact/guidance remain drafts. Existing published records were preserved.');
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Import failed.'); process.exitCode = 1; });