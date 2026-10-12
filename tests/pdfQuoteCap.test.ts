import { describe, it, expect } from "vitest";
import { buildPdfHtml } from "@/lib/pdf-template";
import { QUOTES_SHOWN_PER_TOPIC, type GroundingEntryLite } from "@/lib/grounding-types";

const entry = (text: string, matched = false): GroundingEntryLite => ({
  text,
  aspect: "a",
  sourceUrl: "https://example.org/platform",
  archivePath: "docs/sources/x.md",
  dateRetrieved: "2026-10-11",
  provenance: "official-current",
  ...(matched ? { matched: true } : {}),
});

const pdfFor = (entries: GroundingEntryLite[]) =>
  buildPdfHtml(
    {
      results: [{ id: "yashar", name: "ישר!", description: "", website: "", score: 75 }],
      accentColor: "teal",
      answeredTopicIds: ["security"],
      groundings: {
        yashar: {
          platformAvailable: true,
          sourceQuality: "official",
          topics: [{ topicId: "security", topicLabel: "ביטחון", entries }],
        },
      },
    },
    "12 באוקטובר 2026"
  );

describe("PDF quote cap per topic", () => {
  it("shows only the first quotes of a long topic and states how many were collected", () => {
    const html = pdfFor(["ציטוט-א", "ציטוט-ב", "ציטוט-ג", "ציטוט-ד", "ציטוט-ה"].map((t) => entry(t)));
    expect(html).toContain("ציטוט-א");
    expect(html).toContain("ציטוט-ב");
    expect(html).not.toContain("ציטוט-ג");
    expect(html).not.toContain("ציטוט-ה");
    expect(html).toContain(`מוצגים ${QUOTES_SHOWN_PER_TOPIC} מתוך 5 הציטוטים שנאספו בנושא זה`);
  });

  it("shows every quote and no note when the topic is within the cap", () => {
    const html = pdfFor([entry("ציטוט-א"), entry("ציטוט-ב")]);
    expect(html).toContain("ציטוט-א");
    expect(html).toContain("ציטוט-ב");
    expect(html).not.toContain("הציטוטים שנאספו בנושא זה");
  });

  it("keeps the given order, so a quote on the probed sub-topic survives the cap", () => {
    const html = pdfFor([entry("ציטוט-קשור", true), entry("ציטוט-ב"), entry("ציטוט-ג")]);
    expect(html).toContain("ציטוט-קשור");
    expect(html).toContain("קשור לשאלת ההמשך שענית עליה");
    expect(html).not.toContain("ציטוט-ג");
  });
});
