// Gemini 503 UNAVAILABLE ("This model is currently experiencing high demand
// ... Please try again later") is a transient, self-reported-retryable
// error — distinct from quota exhaustion (429/RESOURCE_EXHAUSTED), which
// will not resolve on retry. Observed in production 2026-08-17/18 on
// /api/follow-up with retried=false every time, because the existing
// retry-once loop only covered malformed/empty output, not errors thrown by
// the generateContent()/sendMessage() call itself.
export function isTransientGeminiError(msg: string): boolean {
  return msg.includes("503") || msg.includes("UNAVAILABLE") || msg.toLowerCase().includes("overloaded");
}

// An immediate retry lands in the same demand spike that produced the 503 —
// the 2026-09-15 session retried instantly and failed again 2.5s later.
// A short pause gives the spike a chance to pass while staying well inside
// the "taking longer than usual" UI threshold (SLOW_AI_NOTICE_MS).
export const TRANSIENT_RETRY_DELAY_MS = 1500;

export function waitBeforeTransientRetry(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
}
