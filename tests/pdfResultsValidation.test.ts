import { describe, it, expect } from "vitest";
import { validatePdfResultsData } from "@/lib/pdf-template";

const VALID = {
  results: [{ id: "likud", name: "ליכוד", score: 75 }],
  accentColor: "blue",
};

describe("validatePdfResultsData", () => {
  it("accepts a well-formed payload", () => {
    expect(validatePdfResultsData(VALID)).toEqual(VALID);
  });

  it("accepts a valid finite rawScore", () => {
    const data = { ...VALID, results: [{ id: "likud", name: "ליכוד", score: 75, rawScore: 40 }] };
    expect(validatePdfResultsData(data)).toEqual(data);
  });

  it("rejects non-object input", () => {
    expect(validatePdfResultsData(null)).toBeNull();
    expect(validatePdfResultsData("string")).toBeNull();
    expect(validatePdfResultsData(42)).toBeNull();
  });

  it("rejects a missing or empty results array", () => {
    expect(validatePdfResultsData({ accentColor: "blue" })).toBeNull();
    expect(validatePdfResultsData({ ...VALID, results: [] })).toBeNull();
  });

  it("rejects a non-numeric score (the actual injection vector)", () => {
    const data = { ...VALID, results: [{ id: "likud", name: "ליכוד", score: "0 onload=alert(1)" }] };
    expect(validatePdfResultsData(data)).toBeNull();
  });

  it("rejects a non-finite score", () => {
    const data = { ...VALID, results: [{ id: "likud", name: "ליכוד", score: Infinity }] };
    expect(validatePdfResultsData(data)).toBeNull();
  });

  it("rejects a non-numeric rawScore", () => {
    const data = { ...VALID, results: [{ id: "likud", name: "ליכוד", score: 75, rawScore: "<script>" }] };
    expect(validatePdfResultsData(data)).toBeNull();
  });

  it("rejects a result missing id or name", () => {
    expect(validatePdfResultsData({ ...VALID, results: [{ name: "ליכוד", score: 75 }] })).toBeNull();
    expect(validatePdfResultsData({ ...VALID, results: [{ id: "likud", score: 75 }] })).toBeNull();
  });

  it("rejects an invalid accentColor", () => {
    expect(validatePdfResultsData({ ...VALID, accentColor: "<script>" })).toBeNull();
    expect(validatePdfResultsData({ ...VALID, accentColor: undefined })).toBeNull();
  });
});
