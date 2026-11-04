import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { franchiseMapPositions, isOfficePhone, requireFranchiseLocations } from "../data/franchiseLocations.ts";
import { telephoneHref } from "../data/editorial.ts";

const offices = [
  { _id: "location-hampshire", name: "Hampshire & Isle of Wight", address: "Cell 4, 194 Victory Gate Lodge, The Hard, Charles Dickens, Portsmouth, PO1 3PU", phone: "02393 553506" },
  { _id: "location-london", name: "London", isHeadOffice: true, address: "Arch 4, 1 Crucifix Lane, SE1 3JW", phone: "020 8050 6312" },
  { _id: "location-manchester", name: "Greater Manchester", address: "Neo Building, 9 Charlotte Street, M1 4ET", phone: "0161 399 8575" },
];

test("the map keeps its coordinates and order while all office content comes from Sanity", () => {
  const franchiseLocations = requireFranchiseLocations(offices);
  assert.deepEqual(franchiseLocations.map(({ name }) => name), ["London", "Greater Manchester", "Hampshire & Isle of Wight"]);
  assert.deepEqual(franchiseLocations.filter(({ headOffice }) => headOffice).map(({ name }) => name), ["London"]);
  for (const [index, location] of franchiseLocations.entries()) {
    const content = offices.find(({ _id }) => _id === location.id);
    assert.equal(location.address, content.address);
    assert.equal(location.phone, content.phone);
    assert.equal(location.headOffice, content.isHeadOffice === true);
    assert.equal(location.x, franchiseMapPositions[index].x);
    assert.equal(location.y, franchiseMapPositions[index].y);
    assert.equal(location.labelSide, franchiseMapPositions[index].labelSide);
  }
  assert.equal(telephoneHref(franchiseLocations[0].phone), "tel:02080506312");
  assert.equal(telephoneHref(franchiseLocations[1].phone), "tel:01613998575");
  assert.equal(telephoneHref(franchiseLocations[2].phone), "tel:02393553506");
  const edited = offices.map((office) => office._id === "location-london"
    ? { ...office, name: "London office", address: "A newly published address", phone: "+44 20 8050 6312" }
    : office);
  assert.equal(requireFranchiseLocations(edited)[0].address, "A newly published address");
  assert.equal(requireFranchiseLocations(edited)[0].name, "London office");
  assert.equal(offices[1].name, "London");
});

test("markers follow the upright illustration's geography and use the supplied asset", () => {
  const [london, manchester, hampshire] = requireFranchiseLocations(offices);
  assert.ok(manchester.y < london.y && london.y < hampshire.y);
  assert.ok(manchester.x < london.x && hampshire.x < london.x);
  assert.ok(existsSync(new URL("../../public/illustrations/map.webp", import.meta.url)));
});

test("missing offices and invalid contact details fail explicitly instead of showing placeholders", () => {
  assert.throws(() => requireFranchiseLocations([]), /Publish location-london/);
  for (const field of ["name", "address", "phone"]) {
    assert.throws(() => requireFranchiseLocations(offices.map((office) =>
      office._id === "location-london" ? { ...office, [field]: " " } : office)), /Publish location-london/);
  }
});

test("office phones accept UK and international formatting, not malformed call links", () => {
  for (const phone of ["020 8050 6312", "0161 399 8575", "02393 553506", "+44 (20) 8050-6312"]) {
    assert.equal(isOfficePhone(phone), true);
  }
  for (const phone of [undefined, null, "", "123", "020 abc 6312", "020+80506312", "1234567890123456", "          "]) {
    assert.equal(isOfficePhone(phone), false);
  }
});
