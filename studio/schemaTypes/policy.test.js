import assert from 'node:assert/strict';
import test from 'node:test';
import { policy } from './editorial.ts';
import { policyThemes } from '../../src/lib/policies.ts';

function validationCalls(field) {
  const calls = [];
  const rule = Object.fromEntries(['required', 'max', 'custom'].map((name) => [
    name, (...args) => { calls.push([name, ...args]); return rule; },
  ]));
  field.validation(rule);
  return calls;
}

test('existing policy documents become editable Markdown pages without discarding the PDF reference', () => {
  assert.equal(policy.name, 'policy');
  assert.equal(policy.title, 'Policy page');
  for (const name of ['label', 'title', 'slug', 'description', 'theme', 'body']) {
    const field = policy.fields.find((entry) => entry.name === name);
    assert.ok(validationCalls(field).some(([rule]) => rule === 'required'), name);
  }
  const body = policy.fields.find(({ name }) => name === 'body');
  assert.equal(body.type, 'text');
  assert.equal(body.rows, 30);
  const validateBody = validationCalls(body).find(([name]) => name === 'custom')[1];
  assert.equal(validateBody('## Section\n\nPolicy text.'), true);
  assert.equal(typeof validateBody(' \n '), 'string');
  const description = policy.fields.find(({ name }) => name === 'description');
  assert.ok(validationCalls(description).some(([rule, limit]) => rule === 'max' && limit === 180));
  const source = policy.fields.find(({ name }) => name === 'href');
  assert.equal(validationCalls(source).some(([rule]) => rule === 'required'), false);
  const validateSource = validationCalls(source).find(([name]) => name === 'custom')[1];
  assert.equal(validateSource(undefined), true);
  assert.equal(validateSource('https://drive.google.com/file/d/example/view'), true);
  assert.equal(typeof validateSource('javascript:alert(1)'), 'string');
  assert.equal(typeof validateSource('https://drive.google.com.example.com/file'), 'string');
});

test('policy URLs and colour choices are constrained to safe slugs and registered brand tokens', () => {
  const slug = policy.fields.find(({ name }) => name === 'slug');
  assert.equal(slug.options.source, 'title');
  const validateSlug = validationCalls(slug).find(([name]) => name === 'custom')[1];
  assert.equal(validateSlug({ current: 'data-protection' }), true);
  for (const current of ['../data', 'Data Protection', 'data--protection', 'a'.repeat(97)]) {
    assert.equal(typeof validateSlug({ current }), 'string');
  }
  const theme = policy.fields.find(({ name }) => name === 'theme');
  assert.deepEqual(theme.options.list.map(({ value }) => value), Object.keys(policyThemes));
  const validateTheme = validationCalls(theme).find(([name]) => name === 'custom')[1];
  assert.equal(validateTheme('cocoa'), true);
  assert.equal(typeof validateTheme('constructor'), 'string');
});
