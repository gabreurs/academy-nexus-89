import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { explicitTenantSlug } from "./selection";

describe("initial tenant selection", () => {
  test("normal site opening does not select CASA", () => {
    assert.equal(explicitTenantSlug("/", "?__lovable_load_id=preview"), null);
  });
  test("an explicit CASA demo remains available", () => {
    assert.equal(explicitTenantSlug("/demo/casa", ""), "casa");
  });
  test("an explicit tenant query remains available", () => {
    assert.equal(explicitTenantSlug("/", "?tenant=casa"), "casa");
  });
});