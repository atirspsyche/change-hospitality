import assert from 'node:assert/strict';
import test from 'node:test';
import { location } from './location.ts';
import { getInitialTeamOrders, validateTeamOrder } from '../lib/teamOrder.ts';
import { getTeamGroups, teamPageSize } from '../../src/data/team.ts';

const reference = (id, key = id) => ({ _type: 'reference', _ref: id, _key: key });
const office = (name, teamOrder) => ({
  _id: `location-${name.toLowerCase()}`,
  _rev: `revision-${name.toLowerCase()}`,
  name,
  slug: { current: name.toLowerCase() },
  active: true,
  ...(teamOrder === undefined ? {} : { teamOrder }),
});
const member = (id, name, locationId = 'location-london') => ({
  _id: id, _type: 'consultant', name, title: 'Consultant',
  accent: 'pink', note: 'Full biography.', signal: 'Hospitality',
  location: locationId ? { _id: locationId, name: 'Office' } : null,
});

test('locations offer a native sortable reference list without numeric member ranks', () => {
  const field = location.fields.find((entry) => entry.name === 'teamOrder');
  assert.equal(field.title, 'Team display order');
  assert.equal(field.type, 'array');
  assert.deepEqual(field.options, { layout: 'list', sortable: true });
  assert.equal(field.of[0].type, 'reference');
  assert.deepEqual(field.of[0].to, [{ type: 'consultant' }]);
  assert.equal(field.of[0].options.disableNew, true);
  const calls = [];
  field.validation({
    unique() { calls.push('unique'); return this; },
    custom(validator) { calls.push(validator); return this; },
  });
  assert.deepEqual(calls, ['unique', validateTeamOrder]);
});

test('the member picker restricts references to the current office, including drafts and releases', () => {
  const filter = location.fields.find((entry) => entry.name === 'teamOrder').of[0].options.filter;
  for (const id of ['location-london', 'drafts.location-london', 'versions.release.location-london']) {
    assert.deepEqual(filter({ document: { _id: id } }), {
      filter: 'location._ref == $locationId',
      params: { locationId: 'location-london' },
    });
  }
});

const noFetchContext = {
  getClient() { throw new Error('Validation should not need a remote query.'); },
};

test('missing and empty optional orders keep older offices publishable', async () => {
  for (const value of [undefined, null, []]) {
    assert.equal(await validateTeamOrder(value, noFetchContext), true);
  }
});

test('incomplete references and duplicate member IDs are rejected before querying', async () => {
  for (const value of ['invalid', [{}], [reference('')], [{ _type: 'image', _ref: 'member-a' }]]) {
    assert.match(await validateTeamOrder(value, noFetchContext), /Choose a team member/);
  }
  assert.match(await validateTeamOrder([
    reference('member-a', 'first'),
    { ...reference('member-a', 'second'), _weak: true },
  ], noFetchContext), /only once/);
  assert.match(await validateTeamOrder([reference('member-a')], noFetchContext), /Save this office/);
});

test('publish validation verifies actual published office membership with canonical location IDs', async () => {
  const context = {
    document: { _id: 'drafts.location-london' },
    getClient(options) {
      assert.deepEqual(options, { apiVersion: '2026-09-08' });
      return {
        async fetch(query, params, fetchOptions) {
          assert.match(query, /_type == "consultant"/);
          assert.match(query, /location\._ref == \$locationId/);
          assert.deepEqual(params, { ids: ['member-ceo', 'member-manager'], locationId: 'location-london' });
          assert.deepEqual(fetchOptions, { perspective: 'published' });
          return ['member-manager', 'member-ceo'];
        },
      };
    },
  };
  assert.equal(await validateTeamOrder([reference('member-ceo'), reference('member-manager')], context), true);
});

test('missing, unpublished and other-office members cannot pass office order validation', async () => {
  const context = {
    document: { _id: 'location-london' },
    getClient: () => ({ fetch: async () => ['member-london'] }),
  };
  assert.match(await validateTeamOrder([reference('member-london'), reference('member-moved')], context), /Only published team members assigned to this office/);
});

test('membership lookup failures are not treated as successful validation', async () => {
  const context = {
    document: { _id: 'location-london' },
    getClient: () => ({ fetch: async () => { throw new Error('Membership service unavailable.'); } }),
  };
  await assert.rejects(validateTeamOrder([reference('member-a')], context), /Membership service unavailable/);
});

test('leadership follows editorial order before the eight-person pagination boundary', () => {
  const members = [
    ...Array.from({ length: 12 }, (_, index) => member(`member-${index}`, `Member ${String(index + 1).padStart(2, '0')}`)),
    member('member-ceo', 'Zoe Founder'),
    member('member-manager', 'Yasmin Manager'),
  ];
  const [group] = getTeamGroups([office('London', ['member-ceo', 'member-manager', 'member-11'])], members);
  assert.deepEqual(group.members.map((entry) => entry._id), [
    'member-ceo', 'member-manager', 'member-11',
    ...Array.from({ length: 11 }, (_, index) => `member-${index}`),
  ]);
  assert.deepEqual(group.members.slice(0, teamPageSize).map((entry) => entry._id), [
    'member-ceo', 'member-manager', 'member-11', 'member-0', 'member-1', 'member-2', 'member-3', 'member-4',
  ]);
  assert.equal(group.members.length, members.length);
});

test('each office has its own member order without changing the established office sequence', () => {
  const members = [
    member('london-a', 'Alice'), member('london-z', 'Zoe'),
    member('manchester-a', 'Alice', 'location-manchester'), member('manchester-z', 'Zoe', 'location-manchester'),
  ];
  const groups = getTeamGroups([
    office('Manchester', ['manchester-z', 'manchester-a']),
    office('London', ['london-a', 'london-z']),
  ], members);
  assert.deepEqual(groups.map((group) => group.label), ['London', 'Manchester']);
  assert.deepEqual(groups.map((group) => group.members.map((entry) => entry._id)), [
    ['london-a', 'london-z'], ['manchester-z', 'manchester-a'],
  ]);
});

test('unset, null and empty orders retain alphabetical display with deterministic ties', () => {
  const members = [member('z', 'Zoe'), member('b', 'Alice'), member('a', 'Alice')];
  for (const order of [undefined, null, []]) {
    assert.deepEqual(getTeamGroups([office('London', order)], members)[0].members.map((entry) => entry._id), ['a', 'b', 'z']);
  }
});

test('new members remain visible after ranked profiles and stale references never duplicate or reassign people', () => {
  const members = [
    member('new-z', 'Zoe'), member('ranked', 'Yasmin'), member('new-a', 'Alice'),
    member('moved', 'Bob', 'location-manchester'), member('unassigned', 'Claire', null),
  ];
  const groups = getTeamGroups([
    office('London', ['missing', 'ranked', 'ranked', 'moved']),
    office('Manchester', []),
  ], members);
  assert.deepEqual(groups[0].members.map((entry) => entry._id), ['ranked', 'new-a', 'new-z']);
  assert.deepEqual(groups[1].members.map((entry) => entry._id), ['moved']);
});

test('renaming members does not change their chosen positions and ordering never mutates source data', () => {
  const locations = [office('London', ['ranked', 'second'])];
  const members = [member('second', 'Alice'), member('ranked', 'Zoe')];
  const before = structuredClone({ locations, members });
  assert.deepEqual(getTeamGroups(locations, members)[0].members.map((entry) => entry._id), ['ranked', 'second']);
  assert.deepEqual({ locations, members }, before);
  members[1].name = 'Aaron';
  assert.deepEqual(getTeamGroups(locations, members)[0].members.map((entry) => entry._id), ['ranked', 'second']);
});

const seedMember = (id, name, locationId = 'location-london') => ({
  _id: id, name, location: locationId ? { _type: 'reference', _ref: locationId } : null,
});

test('initialization creates complete keyed reference lists in the current alphabetical order', () => {
  const locations = [office('London'), office('Manchester', null), office('Hampshire')];
  const members = [
    seedMember('member-z', 'Zoe'), seedMember('member-b', 'Alice'), seedMember('member-a', 'Alice'),
    seedMember('member-manchester', 'Claire', 'location-manchester'),
    seedMember('drafts.member-draft', 'Draft'),
    seedMember('unassigned', 'Unassigned', null),
  ];
  const plans = getInitialTeamOrders(locations, members);
  assert.deepEqual(plans, [
    {
      _id: 'location-london', _rev: 'revision-london', name: 'London',
      teamOrder: [
        reference('member-a', 'team-1'),
        reference('member-b', 'team-2'),
        reference('member-z', 'team-3'),
      ],
    },
    {
      _id: 'location-manchester', _rev: 'revision-manchester', name: 'Manchester',
      teamOrder: [reference('member-manchester', 'team-1')],
    },
  ]);
  for (const plan of plans) {
    assert.equal(new Set(plan.teamOrder.map((entry) => entry._key)).size, plan.teamOrder.length);
  }
});

test('initialization preserves existing editorial lists, including intentionally empty lists', () => {
  const locations = [
    office('London', [reference('member-z'), reference('member-a')]),
    office('Manchester', []),
  ];
  assert.deepEqual(getInitialTeamOrders(locations, [
    seedMember('member-a', 'Alice'), seedMember('member-z', 'Zoe'),
    seedMember('member-manchester', 'Bob', 'location-manchester'),
  ]), []);
});

test('initialization refuses to overwrite an office with pending editorial changes', () => {
  const published = office('London');
  const draft = { ...published, _id: 'drafts.location-london', _rev: 'draft-revision' };
  assert.throws(() => getInitialTeamOrders([published, draft], [seedMember('member-a', 'Alice')]), /Review and publish the existing draft for London/);
  assert.deepEqual(getInitialTeamOrders([draft], [seedMember('member-a', 'Alice')]), []);
  assert.deepEqual(getInitialTeamOrders([{ ...published, teamOrder: [] }, draft], [seedMember('member-a', 'Alice')]), []);
});

test('initialization is non-mutating and reruns do not reset any previously created list', () => {
  const locations = [office('London')];
  const members = [seedMember('member-z', 'Zoe'), seedMember('member-a', 'Alice')];
  const before = structuredClone({ locations, members });
  const plans = getInitialTeamOrders(locations, members);
  assert.deepEqual({ locations, members }, before);
  assert.deepEqual(getInitialTeamOrders(plans, members), []);
});
