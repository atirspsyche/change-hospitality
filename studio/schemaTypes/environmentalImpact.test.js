import assert from 'node:assert/strict';
import test from 'node:test';
import { environmentalImpact } from './environmentalImpact.ts';
import { seedEnvironmentalImpact } from '../data/environmentalImpact.ts';
import { requireImpactNumbers } from '../../src/lib/impactNumbers.ts';

const metrics = environmentalImpact.fields.find((field) => field.name === 'metrics');
const metric = metrics.of[0];

const validationCalls = (field) => {
  const calls = [];
  const rule = Object.fromEntries(['required', 'min', 'regex', 'custom'].map((name) => [
    name,
    (...args) => {
      calls.push([name, ...args]);
      return rule;
    },
  ]));
  field.validation(rule);
  return calls;
};

test('environmental impact is an ordered array of at least one editable metric', () => {
  assert.equal(environmentalImpact.name, 'environmentalImpact');
  assert.equal(environmentalImpact.type, 'document');
  assert.equal(metrics.type, 'array');
  assert.deepEqual(validationCalls(metrics), [['required'], ['min', 1]]);
  assert.equal(metric.type, 'object');
  assert.equal(metric.name, 'impactNumber');
});

test('display values and labels require non-blank text while units remain optional', () => {
  for (const name of ['number', 'label']) {
    const field = metric.fields.find((field) => field.name === name);
    assert.equal(field.type, 'string');
    const [required, regex] = validationCalls(field);
    assert.deepEqual(required, ['required']);
    assert.equal(regex[0], 'regex');
    assert.equal(regex[1].test('  '), false);
    assert.equal(regex[1].test('0'), true);
    assert.equal(regex[1].test('20,000+'), true);
  }
  const unit = metric.fields.find((field) => field.name === 'unit');
  assert.equal(unit.type, 'string');
  assert.equal(unit.validation, undefined);
});

test('the shape picker only offers styles supported by the website', () => {
  const shape = metric.fields.find((field) => field.name === 'shape');
  assert.deepEqual(shape.options.list.map((option) => option.value), ['tree', 'round', 'soft']);
  const [required, custom] = validationCalls(shape);
  assert.deepEqual(required, ['required']);
  assert.equal(custom[0], 'custom');
  for (const value of ['tree', 'round', 'soft']) assert.equal(custom[1](value), true);
  for (const value of [undefined, '', 'unsupported']) assert.equal(typeof custom[1](value), 'string');
  assert.equal(shape.initialValue, 'round');
});

test('Studio previews include the value, optional unit and label', () => {
  assert.deepEqual(metric.preview.prepare({ number: '9', unit: 'tCO\u2082e', label: 'carbon avoidance' }), {
    title: '9 tCO\u2082e',
    subtitle: 'carbon avoidance',
  });
  assert.deepEqual(metric.preview.prepare({ number: '498', label: 'trees funded' }), {
    title: '498',
    subtitle: 'trees funded',
  });
});

test('the migration preserves the four visible figures, units, shapes and order', () => {
  assert.equal(seedEnvironmentalImpact._id, 'environmental-impact');
  assert.equal(seedEnvironmentalImpact._type, environmentalImpact.name);
  assert.equal(new Set(seedEnvironmentalImpact.metrics.map((item) => item._key)).size, 4);
  assert.ok(seedEnvironmentalImpact.metrics.every((item) => item._type === metric.name));
  const seeded = requireImpactNumbers(seedEnvironmentalImpact.metrics);
  assert.deepEqual(seeded.map(({ number, label, unit, shape }) => ({ number, label, unit, shape })), [
    { number: '498', label: 'trees funded', unit: undefined, shape: 'tree' },
    { number: '15', label: 'projects worldwide', unit: undefined, shape: 'round' },
    { number: '9', label: 'carbon avoidance', unit: 'tCO\u2082e', shape: 'soft' },
    { number: '34', label: 'habitat restoration', unit: 'm\u00b2', shape: 'soft' },
  ]);
});
