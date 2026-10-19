import assert from "node:assert/strict";
import test from "node:test";
import { getNotFoundContent } from "./notFound.ts";

test("missing pages return home by default", () => {
  for (const path of ["/404", "/404.html", "/missing/", "/jobs/", "/jobs", "/job/", "/jobs/missing/extra", "/other/jobs/missing/"]) {
    assert.equal(getNotFoundContent(path).href, "/", path);
    assert.equal(getNotFoundContent(path).label, "Back to home", path);
  }
});

test("only missing job detail URLs return to jobs", () => {
  for (const path of ["/jobs/filled-chef-role/", "/jobs/filled-chef-role", "/job/filled-chef-role/", "/job/filled-chef-role", "/jobs/chef%20role/"]) {
    const content = getNotFoundContent(path);
    assert.equal(content.href, "/jobs/", path);
    assert.equal(content.label, "Explore jobs", path);
    assert.match(content.description, /filled or is no longer available/);
  }
});
