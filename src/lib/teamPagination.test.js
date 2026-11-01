import assert from 'node:assert/strict';
import test from 'node:test';
import { getTeamPageItems, teamPageSize } from '../data/team.ts';

test('team grids use eight members per page', () => {
  assert.equal(teamPageSize, 8);
});

test('small team pagination includes every page without ellipses', () => {
  assert.deepEqual(getTeamPageItems(1, 0), []);
  for (let pageCount = 1; pageCount <= 7; pageCount += 1) {
    const expected = Array.from({ length: pageCount }, (_, index) => index + 1);
    for (let currentPage = 1; currentPage <= pageCount; currentPage += 1) {
      assert.deepEqual(getTeamPageItems(currentPage, pageCount), expected);
    }
  }
});

test('large team pagination shows the beginning, current neighbourhood, and end', () => {
  assert.deepEqual(getTeamPageItems(1, 20), [1, 2, 3, 4, 5, 'end-ellipsis', 20]);
  assert.deepEqual(getTeamPageItems(4, 20), [1, 2, 3, 4, 5, 'end-ellipsis', 20]);
  assert.deepEqual(getTeamPageItems(5, 20), [1, 'start-ellipsis', 4, 5, 6, 'end-ellipsis', 20]);
  assert.deepEqual(getTeamPageItems(10, 20), [1, 'start-ellipsis', 9, 10, 11, 'end-ellipsis', 20]);
  assert.deepEqual(getTeamPageItems(17, 20), [1, 'start-ellipsis', 16, 17, 18, 19, 20]);
  assert.deepEqual(getTeamPageItems(20, 20), [1, 'start-ellipsis', 16, 17, 18, 19, 20]);
});

test('pagination stays bounded and never loses the current or boundary pages as teams grow', () => {
  for (const pageCount of [8, 9, 20, 1250]) {
    for (let currentPage = 1; currentPage <= pageCount; currentPage += 1) {
      const items = getTeamPageItems(currentPage, pageCount);
      const pages = items.filter((item) => typeof item === 'number');
      assert.ok(items.length <= 7);
      assert.equal(pages[0], 1);
      assert.equal(pages.at(-1), pageCount);
      assert.ok(pages.includes(currentPage));
      assert.deepEqual(pages, [...new Set(pages)].sort((first, second) => first - second));
      assert.ok(pages.every((page) => page >= 1 && page <= pageCount));
    }
  }
});
