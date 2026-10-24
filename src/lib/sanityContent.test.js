import assert from 'node:assert/strict';
import test from 'node:test';
import { getDisplayJobs, testJobs } from '../data/jobs.ts';

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