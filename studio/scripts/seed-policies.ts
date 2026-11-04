import { isDeepStrictEqual } from 'node:util';
import { getCliClient } from 'sanity/cli';
import { seedPolicies } from '../data/policies.ts';
import { requirePolicies } from '../../src/lib/policies.ts';

interface ExistingPolicy {
  _id: string;
  _type: string;
  _rev: string;
  [field: string]: unknown;
}

async function seed() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const client = getCliClient({ apiVersion: '2026-09-08' }).withConfig({ useCdn: false, perspective: 'raw' });
  const config = client.config();
  if (config.projectId !== 'thyjjqzv' || config.dataset !== 'production') {
    throw new Error('Policy migration refused: target must be thyjjqzv / production.');
  }
  if (apply && !args.includes('--project=thyjjqzv')) {
    throw new Error('To write, explicitly confirm --project=thyjjqzv.');
  }
  const ids = seedPolicies.map(({ _id }) => _id);
  const documents = await client.fetch<ExistingPolicy[]>(
    '*[_id in $ids || _id in $draftIds]', { ids, draftIds: ids.map((id) => `drafts.${id}`) },
  );
  if (documents.some(({ _id }) => _id.startsWith('drafts.'))) {
    throw new Error('A policy has an unpublished draft. Review and publish it in Studio before running this migration.');
  }
  const plans = seedPolicies.map((policy) => {
    const current = documents.find(({ _id }) => _id === policy._id);
    if (current && current._type !== 'policy') throw new Error(`${policy._id} is not a policy document.`);
    const missing = Object.fromEntries(Object.entries(policy).filter(([field]) =>
      !field.startsWith('_') && (!current || current[field] === undefined)));
    const expected = { ...policy, ...current };
    requirePolicies([expected]);
    return { policy, current, missing, expected };
  });
  requirePolicies(plans.map(({ expected }) => expected));
  console.log(`Target: ${config.projectId} / ${config.dataset}; ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);
  console.table(plans.map(({ policy, current, missing }) => ({
    id: policy._id,
    action: !current ? 'Create policy page' : Object.keys(missing).length ? 'Add missing fields' : 'Preserve existing page',
    fields: Object.keys(missing).join(', '),
  })));
  if (!apply) return;

  let transaction = client.transaction();
  let changes = 0;
  for (const { policy, current, missing } of plans) {
    if (!current) {
      transaction = transaction.createIfNotExists<(typeof seedPolicies)[number]>(policy);
      changes++;
    } else if (Object.keys(missing).length) {
      transaction = transaction.patch(policy._id, (patch) => patch.ifRevisionId(current._rev).setIfMissing(missing));
      changes++;
    }
  }
  if (changes) await transaction.commit();

  const saved = await client.fetch<ExistingPolicy[]>('*[_type == "policy" && _id in $ids]', { ids }, { perspective: 'published' });
  requirePolicies(saved);
  if (saved.length !== seedPolicies.length) throw new Error(`Expected four published policy pages, found ${saved.length}.`);
  for (const { expected } of plans) {
    const actual = saved.find(({ _id }) => _id === expected._id);
    for (const [field, value] of Object.entries(expected)) {
      if (!field.startsWith('_') && !isDeepStrictEqual(actual?.[field], value)) {
        throw new Error(`Could not verify ${expected._id}.${field}. Inspect the policy in Studio.`);
      }
    }
  }
  console.log('Verified all four published policy pages. Existing content, PDF references, labels, ordering and visibility were preserved.');
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Policy migration failed.');
  process.exitCode = 1;
});
