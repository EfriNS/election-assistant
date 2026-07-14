// Diagnostics for a fetch()/res.json() failure — these only fire on network-level
// transport failures (a real server response, even an error one, is always valid
// JSON from our API routes), so this describes "was the request lost", not "did
// the server error". Non-PII: JS exception name/message plus browser
// connectivity/tab state — safe to send to analytics as-is.
export function describeRequestFailure(err: unknown) {
  const e = err instanceof Error ? err : null;
  return {
    error_name: e?.name ?? "Unknown",
    error_message: (e?.message ?? String(err)).slice(0, 200),
    online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
    visibility: typeof document !== "undefined" ? document.visibilityState : undefined,
  };
}
