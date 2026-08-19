import { describe, it, expect } from "vitest";
import { isTransientGeminiError } from "@/lib/gemini-errors";

describe("isTransientGeminiError", () => {
  it("classifies the observed production 503 UNAVAILABLE message as transient", () => {
    const msg =
      '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}';
    expect(isTransientGeminiError(msg)).toBe(true);
  });

  it("does not classify quota exhaustion as transient", () => {
    const msg = '{"error":{"code":429,"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED"}}';
    expect(isTransientGeminiError(msg)).toBe(false);
  });

  it("does not classify an unrelated error as transient", () => {
    expect(isTransientGeminiError("TypeError: fetch failed")).toBe(false);
  });
});
