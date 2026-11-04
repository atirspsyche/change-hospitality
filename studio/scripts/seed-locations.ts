import { getCliClient } from 'sanity/cli';
import { seedLocations } from '../data/locations';

async function updateOfficeDetails() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const client = getCliClient({ apiVersion: '2026-09-08' }).withConfig({ useCdn: false, perspective: 'raw' });
  const config = client.config();
  if (config.projectId !== 'thyjjqzv' || config.dataset !== 'production') {
    throw new Error('Office update refused: target must be thyjjqzv / production.');
  }
  if (apply && !args.includes('--project=thyjjqzv')) {
    throw new Error('To write, explicitly confirm --project=thyjjqzv.');
  }
  const offices = seedLocations.filter((location) => location.active);
  const ids = offices.map((location) => location._id);
  const documents = await client.fetch<Array<{ _id: string; _type: string; _rev: string; name: string; address?: string; phone?: string }>>(
    '*[_id in $ids || _id in $draftIds] {_id, _type, _rev, name, address, phone}',
    { ids, draftIds: ids.map((id) => `drafts.${id}`) },
  );
  if (documents.some(({ _id }) => _id.startsWith('drafts.'))) {
    throw new Error('An office has an unpublished draft. Review and publish it in Studio before updating office details.');
  }
  for (const office of offices) {
    if (!documents.some(({ _id, _type }) => _id === office._id && _type === 'location')) {
      throw new Error(`Missing published office ${office._id}. Run the initial location seed first.`);
    }
  }
  console.log(`Target: ${config.projectId} / ${config.dataset}; ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);
  console.table(offices.map(({ _id, name, address, phone }) => ({ _id, name, address, phone })));
  if (!apply) return;

  let transaction = client.transaction();
  for (const { _id, name, address, phone } of offices) {
    const document = documents.find((entry) => entry._id === _id)!;
    transaction = transaction.patch(_id, (patch) =>
      patch.ifRevisionId(document._rev).set({ name, address, phone }));
  }
  await transaction.commit();
  const saved = await client.fetch<Array<{ _id: string; name: string; address?: string; phone?: string }>>(
    '*[_id in $ids] {_id, name, address, phone}', { ids }, { perspective: 'published' },
  );
  for (const office of offices) {
    const actual = saved.find(({ _id }) => _id === office._id);
    if (actual?.name !== office.name || actual.address !== office.address || actual.phone !== office.phone) {
      throw new Error(`Published office details for ${office._id} do not match the update. Inspect this office in Studio.`);
    }
  }
  console.log('Verified all three published office names, addresses and phone numbers. Office IDs, slugs, team orders and profiles were preserved.');
}

async function seed() {
  if (process.argv.includes('--update-office-details')) return updateOfficeDetails();
  const client = getCliClient({ apiVersion: '2026-09-08' }).withConfig({
    useCdn: false,
    perspective: 'published',
  });
  let transaction = client.transaction();
  for (const location of seedLocations) {
    transaction = transaction.createIfNotExists(location);
  }
  await transaction.commit();

  const locations = await client.fetch<Array<{ name: string; active: boolean }>>(
    '*[_type == "location" && _id in $ids] | order(name asc) {name, active}',
    { ids: seedLocations.map((location) => location._id) },
  );
  if (locations.length !== seedLocations.length) {
    throw new Error(`Expected ${seedLocations.length} seeded locations, found ${locations.length}.`);
  }
  console.log(`Verified ${locations.length} published locations; existing documents were preserved.`);
  console.log(`Active offices: ${locations.filter((location) => location.active).map((location) => location.name).join(', ')}`);
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Location seeding failed.');
  process.exitCode = 1;
});