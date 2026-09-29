import { describe, it, expect, vi, afterEach } from "vitest";
import { isTransientGeminiError, waitBeforeTransientRetry, TRANSIENT_RETRY_DELAY_MS } from "@/lib/gemini-errors";

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

describe("waitBeforeTransientRetry", () => {
  afterEach(() => vi.useRealTimers());

  it("does not resolve immediately — an instant retry lands in the same 503 demand spike", async () => {
    vi.useFakeTimers();
    let done = false;
    const p = waitBeforeTransientRetry().then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(TRANSIENT_RETRY_DELAY_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });
});
