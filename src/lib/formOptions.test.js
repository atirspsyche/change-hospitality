import assert from 'node:assert/strict';
import test from 'node:test';
import { staffingGroups, temporaryRoles } from '../data/formOptions.js';
import { validateRecruitmentBrief } from '../../api/recruit-talent.js';
import { validateTemporaryApplication } from '../../api/temporary-application.js';

test('all displayed staffing choices are unique and accepted by the recruitment endpoint', () => {
  const values = staffingGroups.flatMap(({ options }) => options.map(({ value }) => value));
  assert.equal(values.length, 7);
  assert.equal(new Set(values).size, values.length);
  const { data, errors } = validateRecruitmentBrief({ jobTypes: values });
  assert.deepEqual(data.jobTypes, values);
  assert.equal(errors.jobTypes, undefined);
});

test('all displayed temporary roles are accepted without losing their current labels', () => {
  assert.deepEqual(temporaryRoles, ['Back of house', 'Front of house', 'Sales', 'Events', 'Admin']);
  const { data, errors } = validateTemporaryApplication({ roles: temporaryRoles });
  assert.deepEqual(data.roles, temporaryRoles);
  assert.equal(errors.roles, undefined);
});
