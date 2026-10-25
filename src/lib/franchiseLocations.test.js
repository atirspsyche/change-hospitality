import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { franchiseLocations } from "../data/franchiseLocations.ts";

test("the franchise network has exactly three offices and London is the only head office", () => {
  assert.deepEqual(franchiseLocations.map(({ name }) => name), ["London", "Manchester", "Hampshire"]);
  assert.deepEqual(franchiseLocations.filter(({ headOffice }) => headOffice).map(({ name }) => name), ["London"]);
  for (const location of franchiseLocations) {
    assert.equal(location.address, "Office address to be confirmed");
    assert.ok(location.x > 0 && location.x < 100);
    assert.ok(location.y > 0 && location.y < 100);
  }
});

test("markers follow the upright illustration's geography and use the supplied asset", () => {
  const [london, manchester, hampshire] = franchiseLocations;
  assert.ok(manchester.y < london.y && london.y < hampshire.y);
  assert.ok(manchester.x < london.x && hampshire.x < london.x);
  assert.ok(existsSync(new URL("../../public/illustrations/map.webp", import.meta.url)));
});
