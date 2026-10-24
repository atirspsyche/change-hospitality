import assert from 'node:assert/strict';
import test from 'node:test';
import { editorialTypes } from './editorial.ts';
import { indexedClients, namedClients, clientTestimonials, candidateTestimonials, policies, temporaryGuidance } from '../data/websiteContent.ts';
import { readFile } from 'node:fs/promises';
import { parseTeam } from '../lib/teamImport.ts';

test('supplied roster keeps all 18 portraits and full biographies with approved office assignments', async (context) => {
  let source;
  try { source = await readFile(new URL('../../temp/team-members.md', import.meta.url), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') { context.skip('Local client intake is intentionally not committed.'); return; } throw error; }
  const members = parseTeam(source);
  assert.equal(members.length, 18);
  assert.deepEqual(['london', 'manchester', 'hampshire'].map((office) => members.filter((member) => member.location._ref === `location-${office}`).length), [15, 2, 1]);
  const louisa = members.find((member) => member.name === 'Louisa McLaughlin');
  assert.ok(louisa.note.length > 600);
  assert.ok(source.includes(louisa.note));
  assert.equal(members.filter((member) => member.temporaryBiography).length, 4);
  assert.equal(members.filter((member) => !member.email).length, 4);
  assert.equal(members.find((member) => member.name === 'Charley Taylor-Smith').title, 'Deputy Managing Director');
});

test('the five editorial areas are registered without duplicating testimonial models', () => {
  assert.deepEqual(editorialTypes.map((schema) => schema.name), ['client', 'testimonial', 'siteSettings', 'policy', 'temporaryWork']);
});
test('existing logos keep numeric order and stable IDs independently of their editable names', () => {
  assert.equal(indexedClients.length, 42);
  assert.equal(new Set(indexedClients.map((client) => client._id)).size, 42);
  assert.deepEqual(indexedClients.map((client) => client.sortOrder), Array.from({ length: 42 }, (_, index) => index));
  assert.equal(indexedClients[41].name, 'Client 42');
});
test('approved content retains all testimonials, policies, benefits and FAQs', () => {
  assert.equal(clientTestimonials.length, 5);
  assert.equal(candidateTestimonials.length, 5);
  assert.equal(temporaryGuidance.benefits.length, 6);
  assert.equal(temporaryGuidance.faqs.length, 7);
  assert.equal(policies.length, 4);
  for (const entry of clientTestimonials) assert.ok(namedClients.some((client) => entry.client._ref === `client-${client.key}`));
  for (const policy of policies) assert.equal(new URL(policy.href).hostname, 'drive.google.com');
});

test('roster parser handles CRLF and rejects missing or duplicated identities without a local intake file', () => {
  const names = ['Josh Beer', 'Tom Dukinfield', 'Beth Downey', 'Louisa', 'Vanessa Zamora', 'Marieta Alecu', 'Anda Chirita', 'Charley Taylor-Smith', 'Claire Hoolahan', 'Gareth Townsend', 'James', 'Jim O\u2019Brien', 'Louie Knight', 'Aimee Corr', 'Kumkum Bhattacharya', 'TJ Rashid', 'Michael Lovett', 'Sam McGrath'];
  const source = names.map((name) => `${name} \u2013 Consultant\r\nFull biography for ${name}, preserved without truncation.`).join('\r\n\r\n');
  assert.equal(parseTeam(source).length, 18);
  assert.match(parseTeam(source)[0].note, /preserved without truncation/);
  assert.throws(() => parseTeam(source.replace('Josh Beer', 'Unmapped Person')), /Unmapped person/);
  assert.throws(() => parseTeam(source.split('\r\n\r\n').slice(1).join('\r\n\r\n')), /Expected 18/);
});