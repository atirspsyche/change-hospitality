import assert from 'node:assert/strict';
import test from 'node:test';
import { consultant } from './consultant.ts';
import { location as locationSchema } from './location.ts';
import { getTeamGroups, teamMembers } from '../../src/data/team.ts';
import { englishCities, seedLocations } from '../data/locations.ts';
import { mediaLimits, uploadError, validateImage } from '../lib/mediaRules.ts';

test('portrait and logo upload guards enforce exact byte boundaries and supported types', () => {
  for (const kind of ['portrait', 'logo']) {
    assert.equal(uploadError({ size: mediaLimits[kind], type: 'image/webp' }, kind), true);
    assert.notEqual(uploadError({ size: mediaLimits[kind] + 1, type: 'image/webp' }, kind), true);
    assert.notEqual(uploadError({ size: 0, type: 'image/webp' }, kind), true);
    assert.notEqual(uploadError({ size: 100, type: 'image/gif' }, kind), true);
  }
  assert.notEqual(uploadError({ size: 100, type: 'image/svg+xml' }, 'portrait'), true);
  assert.equal(uploadError({ size: 100, type: 'image/svg+xml' }, 'logo'), true);
});

test('publish validation resolves existing asset size and dimensions rather than trusting its reference', async () => {
  let asset = { size: 2000, mimeType: 'image/webp', metadata: { dimensions: { width: 768, height: 768 } } };
  const context = { getClient: () => ({ fetch: async () => asset }) };
  const value = { asset: { _ref: 'image-example' } };
  assert.equal(await validateImage(value, context, 'portrait'), true);
  asset = { ...asset, size: mediaLimits.portrait + 1 };
  assert.match(await validateImage(value, context, 'portrait'), /2 MiB/);
  asset = { ...asset, size: 2000, metadata: { dimensions: { width: 100, height: 100 } } };
  assert.match(await validateImage(value, context, 'portrait'), /600/);
  asset = null;
  assert.match(await validateImage(value, context, 'portrait'), /verified/);
});

test('biographies preserve long descriptions while card summaries stay compact', () => {
  const calls = [];
  const rule = {
    required() { calls.push('required'); return this; },
    max(length) { calls.push(length); return this; },
  };
  consultant.fields.find((field) => field.name === 'note').validation(rule);
  assert.deepEqual(calls, ['required', 5000]);
  calls.length = 0;
  consultant.fields.find((field) => field.name === 'summary').validation(rule);
  assert.deepEqual(calls, [180]);
});

test('pending work contacts are optional but supplied emails are validated', () => {
  const calls = [];
  const rule = {
    required() { calls.push('required'); return this; },
    email() { calls.push('email'); return this; },
    max(length) { calls.push(length); return this; },
  };
  consultant.fields.find((field) => field.name === 'email').validation(rule);
  consultant.fields.find((field) => field.name === 'phone').validation(rule);
  assert.deepEqual(calls, ['email', 40]);
});

test('team members reference active location documents without a fixed office list', () => {
  const location = consultant.fields.find((field) => field.name === 'location');

  assert.equal(location.type, 'reference');
  assert.deepEqual(location.to, [{ type: 'location' }]);
  assert.equal(location.options.filter, 'active == true');
  assert.equal(location.options.disableNew, true);
  assert.equal(location.options.list, undefined);
  assert.ok(!consultant.fields.some((field) => field.name === 'division'));
  assert.equal(location.initialValue, undefined);
});

test('a team member location reference is required', () => {
  const location = consultant.fields.find((field) => field.name === 'location');
  const calls = [];
  const rule = {
    required() {
      calls.push('required');
      return this;
    },
  };

  location.validation(rule);
  assert.deepEqual(calls, ['required']);
});

test('new locations are inactive until explicitly enabled and published', () => {
  assert.equal(locationSchema.fields.find((field) => field.name === 'active').initialValue, false);
  assert.equal(locationSchema.preview.prepare({ title: 'York', active: false }).subtitle, 'Inactive');
  assert.equal(locationSchema.preview.prepare({ title: 'London', active: true, isHeadOffice: true }).subtitle, 'Active / Head office');
});

test('Studio previews show the office or flag an unassigned member', () => {
  assert.equal(consultant.preview.select.location, 'location.name');
  assert.equal(consultant.preview.prepare({
    title: 'Example member', jobTitle: 'Consultant', location: 'Hampshire',
  }).subtitle, 'Consultant / Hampshire');
  assert.equal(consultant.preview.prepare({
    title: 'Example member', jobTitle: 'Consultant',
  }).subtitle, 'Consultant / Location required');
});

const offices = [
  { _id: 'location-london', name: 'London', slug: { current: 'london' }, active: true, isHeadOffice: true, sortOrder: 0 },
  { _id: 'location-hampshire', name: 'Hampshire', slug: { current: 'hampshire' }, active: true, sortOrder: 1 },
  { _id: 'location-manchester', name: 'Manchester', slug: { current: 'manchester' }, active: true, sortOrder: 2 },
];

test('active offices group every assigned member by document ID', () => {
  const groups = getTeamGroups(offices, teamMembers);
  assert.deepEqual(groups.map((group) => group.label), ['London', 'Manchester', 'Hampshire']);
  assert.deepEqual(groups.map((group) => group.members.length), [2, 1, 1]);
  assert.match(groups[0].description, /head office/);
});

test('activating a new office automatically creates its accordion and assigns its members', () => {
  const bristol = { _id: 'location-bristol', name: 'Bristol', slug: { current: 'bristol' }, active: true };
  const member = { ...teamMembers[0], _id: 'consultant-bristol', location: { _id: bristol._id, name: bristol.name } };
  const groups = getTeamGroups([...offices, bristol], [...teamMembers, member]);
  assert.equal(groups.length, 4);
  assert.deepEqual(groups.find((group) => group.id === 'bristol').members, [member]);
  assert.equal(getTeamGroups([...offices, { ...bristol, active: false }], [...teamMembers, member]).length, 3);
});

test('renaming an office preserves its members and unassigned profiles are not misclassified', () => {
  const groups = getTeamGroups([{ ...offices[0], name: 'London Central' }], [
    ...teamMembers, { ...teamMembers[0], _id: 'unassigned', location: null },
  ]);
  assert.equal(groups[0].label, 'London Central');
  assert.equal(groups[0].members.length, 2);
});

test('primary offices keep their order ahead of other offices sorted by display order then name', () => {
  const extra = ['York', 'Bath'].map((name) => ({ _id: `location-${name}`, name, slug: { current: name.toLowerCase() }, active: true }));
  const bristol = { _id: 'location-bristol', name: 'Bristol', slug: { current: 'bristol' }, active: true, sortOrder: 0 };
  const groups = getTeamGroups([...extra, bristol, ...offices.slice().reverse()], teamMembers);
  assert.deepEqual(groups.map((group) => group.label), ['London', 'Manchester', 'Hampshire', 'Bristol', 'Bath', 'York']);
  assert.equal(groups.at(-1).members.length, 0);
});

test('office order uses stable slugs, preserves the source list, and skips inactive or incomplete offices', () => {
  const locations = [
    { ...offices[1], sortOrder: 0 },
    { ...offices[2], sortOrder: 1 },
    { ...offices[0], name: 'London Central', sortOrder: 2 },
    { _id: 'location-inactive', name: 'Inactive', slug: { current: 'inactive' }, active: false },
    { _id: 'location-incomplete', name: 'Incomplete', active: true },
  ];
  const original = locations.slice();
  const groups = getTeamGroups(locations, teamMembers);
  assert.deepEqual(groups.map((group) => group.label), ['London Central', 'Manchester', 'Hampshire']);
  assert.deepEqual(locations, original);
  assert.deepEqual(groups.map((group) => group.accent), ['mint', 'flame', 'blush']);
});

test('new office section accents cycle without using the cream profile card surface', () => {
  const locations = Array.from({ length: 8 }, (_, index) => ({
    _id: `location-${index}`, name: `Office ${index}`, slug: { current: `office-${index}` }, active: true,
  }));
  assert.deepEqual(
    getTeamGroups(locations, []).map((group) => group.accent),
    ['mint', 'flame', 'blush', 'citron', 'mint', 'flame', 'blush', 'citron'],
  );
});

test('the seed includes every official English city plus Hampshire, with three active offices', () => {
  assert.equal(englishCities.length, 55);
  assert.equal(new Set(englishCities).size, 55);
  assert.equal(seedLocations.length, 56);
  assert.equal(new Set(seedLocations.map((location) => location._id)).size, 56);
  assert.equal(new Set(seedLocations.map((location) => location.slug.current)).size, 56);
  assert.deepEqual(seedLocations.filter((location) => location.active).map((location) => location.name).sort(), ['Hampshire', 'London', 'Manchester']);
  assert.deepEqual(seedLocations.filter((location) => location.isHeadOffice).map((location) => location.name), ['London']);
  assert.deepEqual(
    seedLocations.filter((location) => location.active).sort((first, second) => first.sortOrder - second.sortOrder).map((location) => location.name),
    ['London', 'Manchester', 'Hampshire'],
  );
  assert.deepEqual(getTeamGroups(seedLocations, teamMembers).map((group) => group.label), ['London', 'Manchester', 'Hampshire']);
  assert.ok(englishCities.includes('Westminster'));
  assert.ok(englishCities.includes('Doncaster'));
  assert.ok(!englishCities.includes('Hampshire'));
});