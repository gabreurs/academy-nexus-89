import { describe, expect, test } from "bun:test";
import { explicitTenantSlug } from "./selection";

describe("initial tenant selection", () => {
  test("normal site opening does not select CASA", () => {
    expect(explicitTenantSlug("/", "?__lovable_load_id=preview")).toBeNull();
  });
  test("an explicit CASA demo remains available", () => {
    expect(explicitTenantSlug("/demo/casa", "")).toBe("casa");
  });
  test("an explicit tenant query remains available", () => {
    expect(explicitTenantSlug("/", "?tenant=casa")).toBe("casa");
  });
});