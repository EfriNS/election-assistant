import { describe, it, expect } from "vitest";
import { describeRequestFailure } from "@/lib/request-diagnostics";

describe("describeRequestFailure", () => {
  it("extracts name and message from a real Error", () => {
    const result = describeRequestFailure(new TypeError("Failed to fetch"));
    expect(result.error_name).toBe("TypeError");
    expect(result.error_message).toBe("Failed to fetch");
  });

  it("falls back to Unknown/String() for a non-Error throw", () => {
    const result = describeRequestFailure("network down");
    expect(result.error_name).toBe("Unknown");
    expect(result.error_message).toBe("network down");
  });

  it("truncates a long message to 200 characters", () => {
    const longMessage = "x".repeat(500);
    const result = describeRequestFailure(new Error(longMessage));
    expect(result.error_message).toHaveLength(200);
  });

  it("does not throw and reports undefined online/visibility outside a browser", () => {
    const result = describeRequestFailure(new Error("boom"));
    expect(result.online).toBeUndefined();
    expect(result.visibility).toBeUndefined();
  });
});
