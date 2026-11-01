import { getCliClient } from 'sanity/cli';
import { getInitialTeamOrders, type TeamOrderLocation, type TeamOrderMember } from '../lib/teamOrder.ts';

async function seed() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const client = getCliClient({ apiVersion: '2026-09-08' }).withConfig({ useCdn: false, perspective: 'raw' });
  const config = client.config();
  if (config.projectId !== 'thyjjqzv' || config.dataset !== 'production') {
    throw new Error('Team order initialization refused: target must be thyjjqzv / production.');
  }
  if (apply && !args.includes('--project=thyjjqzv')) {
    throw new Error('To write, explicitly confirm --project=thyjjqzv.');
  }
  console.log(`Target: ${config.projectId} / ${config.dataset}; ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);
  const [locations, members] = await Promise.all([
    client.fetch<TeamOrderLocation[]>(
      '*[_type == "location" && !(_id in path("versions.**"))] | order(name asc) {_id, _rev, name, teamOrder}',
    ),
    client.fetch<TeamOrderMember[]>(
      '*[_type == "consultant"] {_id, name, location}',
      {},
      { perspective: 'published' },
    ),
  ]);
  const initialOrders = getInitialTeamOrders(locations, members);
  console.table(initialOrders.map((location) => ({ office: location.name, members: location.teamOrder.length })));
  console.log('Existing order lists are preserved. Initial lists retain alphabetical order until an editor rearranges them.');
  if (!initialOrders.length) {
    console.log('No offices with published members need initialization; no changes made.');
    return;
  }
  if (!apply) return;

  let transaction = client.transaction();
  for (const location of initialOrders) {
    transaction = transaction.patch(location._id, (patch) =>
      patch.ifRevisionId(location._rev).set({ teamOrder: location.teamOrder }));
  }
  await transaction.commit();

  const saved = await client.fetch<Array<{ _id: string; teamOrder: string[] | null; assignedMemberIds: string[] }>>(
    `*[_type == "location" && _id in $ids] {
      _id,
      "teamOrder": teamOrder[]._ref,
      "assignedMemberIds": *[_type == "consultant" && location._ref == ^._id]._id
    }`,
    { ids: initialOrders.map((location) => location._id) },
    { perspective: 'published' },
  );
  for (const expected of initialOrders) {
    const actual = saved.find((location) => location._id === expected._id);
    if (!actual?.teamOrder || actual.teamOrder.length !== expected.teamOrder.length
      || expected.teamOrder.some((reference, index) => actual.teamOrder?.[index] !== reference._ref)) {
      throw new Error(`Published team order for ${expected.name} does not match initialization. Inspect this office in Studio.`);
    }
    const assigned = new Set(actual.assignedMemberIds);
    if (expected.teamOrder.some((reference) => !assigned.has(reference._ref))) {
      throw new Error(`A profile in ${expected.name} moved or was unpublished during initialization. Review this office order in Studio.`);
    }
  }
  console.log(`Verified ${initialOrders.length} published office lists with ${initialOrders.reduce((total, location) => total + location.teamOrder.length, 0)} team members. Profiles and existing orders were preserved.`);
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Team order initialization failed.');
  process.exitCode = 1;
});
