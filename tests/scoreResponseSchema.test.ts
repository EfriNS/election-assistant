import { describe, it, expect } from "vitest";
import { buildScoreResponseSchema } from "@/app/api/score-topics/route";
import { PARTIES } from "@/lib/parties";

// Regression guard, same rationale as the follow-up/results schema tests:
// score-topics isn't exposed to the Hebrew-gershayim JSON.parse bug (no
// free-text string values in its output), but it has its own unconstrained-
// JSON symptom (the model emitting invalid `+2`) that this schema fixes via
// an `enum` of valid score values. This guards against a future refactor
// silently dropping the schema or its constraints.
describe("buildScoreResponseSchema", () => {
  const topics = [
    { topicId: "security", topicLabel: "ביטחון", openerQuestion: "", openerAnswer: "", followUpQA: [] },
    { topicId: "economy", topicLabel: "כלכלה", openerQuestion: "", openerAnswer: "", followUpQA: [] },
  ];

  it("creates one property per topic×party combination", () => {
    const schema = buildScoreResponseSchema(topics);
    expect(Object.keys(schema.properties)).toHaveLength(topics.length * PARTIES.length);
    expect(schema.properties).toHaveProperty(`security.${PARTIES[0].id}`);
    expect(schema.properties).toHaveProperty(`economy.${PARTIES[0].id}`);
  });

  it("requires every generated key — no party/topic can be silently omitted", () => {
    const schema = buildScoreResponseSchema(topics);
    expect(schema.required).toEqual(Object.keys(schema.properties));
  });

  it("constrains each value to the 5 valid score integers or null", () => {
    const schema = buildScoreResponseSchema(topics);
    const anyKey = Object.keys(schema.properties)[0];
    expect(schema.properties[anyKey].enum).toEqual([-2, -1, 0, 1, 2, null]);
    expect(schema.properties[anyKey].type).toEqual(["integer", "null"]);
  });
});
