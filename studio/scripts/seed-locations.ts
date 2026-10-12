import { getCliClient } from 'sanity/cli';
import { seedLocations } from '../data/locations';

async function seed() {
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