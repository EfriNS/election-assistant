import { describe, it, expect } from "vitest";
import { FOLLOW_UP_RESPONSE_SCHEMA } from "@/app/api/follow-up/route";

// Regression guard for the JSON-parse-error fix: the follow-up route must
// keep passing a responseJsonSchema to Gemini (constrained decoding
// guarantees valid JSON, e.g. correctly escaped Hebrew gershayim in
// acronyms like צה"ל) — plain responseMimeType alone doesn't guarantee this.
describe("FOLLOW_UP_RESPONSE_SCHEMA", () => {
  it("requires prologue and followUp at the top level", () => {
    expect(FOLLOW_UP_RESPONSE_SCHEMA.required).toEqual(["prologue", "followUp"]);
  });

  it("requires question and options inside followUp", () => {
    expect(FOLLOW_UP_RESPONSE_SCHEMA.properties.followUp.required).toEqual(["question", "options"]);
  });

  it("allows followUp to be null (transition case)", () => {
    expect(FOLLOW_UP_RESPONSE_SCHEMA.properties.followUp.type).toContain("null");
  });
});
