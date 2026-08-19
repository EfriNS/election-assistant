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
