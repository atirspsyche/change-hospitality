import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCliClient } from 'sanity/cli';
import { getInitialTeamOrders, getRequestedTeamOrders, type TeamOrderLocation, type TeamOrderMember } from '../lib/teamOrder.ts';
import { inspectImage } from '../lib/teamImport.ts';

const requestedOrders = [
  {
    locationId: 'location-london',
    memberNames: [
      'Jim O\u2019Brien', 'Charley Taylor-Smith', 'Gareth Townsend', 'Claire Hoolahan', 'Amy Fox', 'James Buckland',
      'Louisa McLaughlin', 'Josh Beer', 'Tom Dukinfield', 'Beth Downey', 'Vanessa Zamora', 'Marieta Alecu',
      'Anda Chirita', 'Kumkum Bhattacharya', 'Louie Knight', 'Aimee Corr',
    ],
  },
  { locationId: 'location-manchester', memberNames: ['TJ Rashid', 'Michael Lovett'] },
  { locationId: 'location-hampshire', memberNames: ['Sam McGrath'] },
] as const;

interface TeamOrderProfile extends TeamOrderMember {
  _rev: string;
  title: string;
  avatar?: {
    _type: 'image';
    asset?: { _type: 'reference'; _ref: string };
    alt?: string;
    [key: string]: unknown;
  };
}

async function seed() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const reorder = args.includes('--reorder');
  const portraitFile = args.find((arg) => arg.startsWith('--amy-portrait='))?.slice('--amy-portrait='.length);
  if (portraitFile !== undefined && (!reorder || !portraitFile.trim())) {
    throw new Error('Supply --reorder and a non-empty --amy-portrait=path to update Amy Fox.');
  }
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
      '*[_type == "location" && !(_id in path("versions.**"))] | order(name asc)',
    ),
    client.fetch<TeamOrderProfile[]>(
      '*[_type == "consultant" && !(_id in path("versions.**"))]',
      {},
      { perspective: reorder ? 'raw' : 'published' },
    ),
  ]);
  if (reorder) {
    console.table(members.map((member) => ({ name: member.name, id: member._id, office: member.location?._ref, title: member.title })));
  }
  const orders = reorder ? getRequestedTeamOrders(locations, members, requestedOrders) : getInitialTeamOrders(locations, members);
  console.table(orders.flatMap((location) => location.teamOrder.map((reference, index) => ({
    office: location.name, position: index + 1, name: members.find((member) => member._id === reference._ref)?.name,
  }))));
  console.log(reorder
    ? 'Requested lists replace office ordering only. Other profile fields and office assignments are preserved.'
    : 'Existing order lists are preserved. Initial lists retain alphabetical order until an editor rearranges them.');
  if (!orders.length) {
    console.log('No offices with published members need initialization; no changes made.');
    return;
  }

  const amy = reorder ? members.find((member) => member._id === orders[0].teamOrder[4]._ref) : undefined;
  const jim = reorder ? members.find((member) => member._id === orders[0].teamOrder[0]._ref) : undefined;
  const jimTitle = 'Founder & Managing Director';
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const portrait = portraitFile ? await inspectImage(path.resolve(root, portraitFile), 'portrait') : undefined;
  if (portrait && !amy) throw new Error('Amy Fox needs a published profile before uploading her portrait.');
  if (portrait) console.log(`Validated Amy Fox portrait: ${portrait.filename}, ${portrait.width} x ${portrait.height}, ${portrait.size} bytes.`);
  if (jim && jim.title !== jimTitle) console.log(`Jim O'Brien title: ${jim.title} -> ${jimTitle}.`);
  if (!apply) return;

  const backup = path.join(root, 'temp/sanity-backups', `team-order-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await mkdir(backup, { recursive: true });
  const before = [
    ...locations.filter((location) => orders.some((order) => order._id === location._id)),
    ...members.filter((member) => (portrait && member._id === amy?._id) || (jim?.title !== jimTitle && member._id === jim?._id)),
  ];
  await writeFile(path.join(backup, 'before.ndjson'), before.map((document) => JSON.stringify(document)).join('\n'));
  console.log(`Saved pre-update documents to ${path.relative(root, backup)}.`);

  let transaction = client.transaction();
  for (const location of orders) {
    transaction = transaction.patch(location._id, (patch) =>
      patch.ifRevisionId(location._rev).set({ teamOrder: location.teamOrder }));
  }
  let portraitAssetId: string | undefined;
  if (portrait && amy) {
    const asset = await client.assets.upload('image', portrait.buffer, { filename: portrait.filename });
    portraitAssetId = asset._id;
    const previousAvatar = amy.avatar?.asset?._ref === asset._id ? amy.avatar : {};
    transaction = transaction.patch(amy._id, (patch) => patch.ifRevisionId(amy._rev).set({
      avatar: {
        ...previousAvatar, _type: 'image', asset: { _type: 'reference', _ref: asset._id }, alt: 'Amy Fox portrait',
      },
    }));
  }
  if (jim && jim.title !== jimTitle) {
    transaction = transaction.patch(jim._id, (patch) => patch.ifRevisionId(jim._rev).set({ title: jimTitle }));
  }
  await transaction.commit();

  const saved = await client.fetch<Array<{ _id: string; teamOrder: string[] | null; assignedMemberIds: string[] }>>(
    `*[_type == "location" && _id in $ids] {
      _id,
      "teamOrder": teamOrder[]._ref,
      "assignedMemberIds": *[_type == "consultant" && location._ref == ^._id]._id
    }`,
    { ids: orders.map((location) => location._id) },
    { perspective: 'published' },
  );
  for (const expected of orders) {
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
  if (portraitAssetId && amy) {
    const savedAmy = await client.getDocument<TeamOrderProfile>(amy._id);
    if (savedAmy?.avatar?.asset?._ref !== portraitAssetId || savedAmy.avatar.alt !== 'Amy Fox portrait') {
      throw new Error('Amy Fox portrait verification failed. Inspect her published profile in Studio.');
    }
    console.log('Verified Amy Fox published portrait and alternative text.');
  }
  if (jim) {
    const savedJim = await client.getDocument<TeamOrderProfile>(jim._id);
    if (savedJim?.title !== jimTitle) throw new Error("Jim O'Brien title verification failed.");
  }
  console.log(`Verified ${orders.length} published office lists with ${orders.reduce((total, location) => total + location.teamOrder.length, 0)} team members. Rebuild the website to display the updates.`);
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Team order initialization failed.');
  process.exitCode = 1;
});
