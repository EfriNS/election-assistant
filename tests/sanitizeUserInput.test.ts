import { describe, it, expect } from "vitest";
import { sanitizeUserInput } from "@/lib/sanitize";

describe("sanitizeUserInput", () => {
  it("strips angle brackets so no tag delimiters survive", () => {
    const result = sanitizeUserInput("<script>alert(1)</script>hello");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("removes an unclosed tag (no trailing '>') — a paired <...> regex would miss this", () => {
    expect(sanitizeUserInput("<script src=//evil.com/x.js")).toBe("script src=//evil.com/x.js");
  });

  it("enforces the length cap", () => {
    expect(sanitizeUserInput("a".repeat(1000), 10)).toHaveLength(10);
  });

  it("bounds cost on adversarial input (thousands of unclosed '<') without hanging", () => {
    const start = Date.now();
    const result = sanitizeUserInput("<".repeat(200000), 500);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(result).not.toContain("<");
  });

  it("trims surrounding whitespace after stripping", () => {
    expect(sanitizeUserInput("  hi  ")).toBe("hi");
  });
});
