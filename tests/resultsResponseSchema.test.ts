import { describe, it, expect } from "vitest";
import { RESULTS_RESPONSE_SCHEMA } from "@/app/api/results/route";

// Regression guard, same rationale as tests/followUpResponseSchema.test.ts:
// the results route generates Hebrew prose that's instructed to quote party
// platform text verbatim (where Hebrew acronyms like צה"ל are common) — a
// responseJsonSchema is what guarantees valid escaping, not just
// responseMimeType. If a future refactor drops the schema, this fails loudly.
describe("RESULTS_RESPONSE_SCHEMA", () => {
  it("requires profile and partyBlurbs at the top level", () => {
    expect(RESULTS_RESPONSE_SCHEMA.required).toEqual(["profile", "partyBlurbs"]);
  });

  it("profile is a string", () => {
    expect(RESULTS_RESPONSE_SCHEMA.properties.profile.type).toBe("string");
  });

  it("partyBlurbs is a string-keyed map of strings (dynamic party ids)", () => {
    expect(RESULTS_RESPONSE_SCHEMA.properties.partyBlurbs.type).toBe("object");
    expect(RESULTS_RESPONSE_SCHEMA.properties.partyBlurbs.additionalProperties).toEqual({ type: "string" });
  });
});
