import assert from 'node:assert/strict';
import test from 'node:test';
import { getDisplayJobs, jobPositions, testJobs } from '../data/jobs.ts';

test('job position choices use the requested categories and order', () => {
  assert.deepEqual([...jobPositions], [
    'Back of House',
    'Front of House',
    'Sales & Marketing',
    'Events',
    'HR',
    'Finance',
    'Admin',
  ]);
});

test('an empty published jobs result displays exactly three explicitly marked local samples', () => {
  const result = getDisplayJobs([]);
  assert.equal(result.length, 3);
  for (const job of result) {
    assert.match(job.role, /^\[Test\]/);
    assert.match(job.slug.current, /^test-/);
    assert.equal(job.isTest, true);
  }
});
test('real vacancies replace rather than mix with the sample set', () => {
  const real = [{ ...testJobs[0], _id: 'real-job', isTest: false }];
  assert.equal(getDisplayJobs(real), real);
});

test('published jobs retain all supported position values', () => {
  const real = jobPositions.map((position, index) => ({
    ...testJobs[0],
    _id: `real-job-${index}`,
    position,
    isTest: false,
  }));
  assert.equal(getDisplayJobs(real), real);
  assert.deepEqual(getDisplayJobs(real).map((job) => job.position), [...jobPositions]);
});