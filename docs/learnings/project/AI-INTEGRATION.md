# AI Integration Patterns (Project-Specific)

**Purpose**: Gemini API integration patterns, rate limits, observability, and error handling for this project (election-assistant, Next.js).

---

## Election Assistant — Next.js / Serverless Patterns

### Gemini Free Tier Limits (Critical!)

1. **Check BOTH RPD and RPM before choosing a model** — Free tier limits are per-model and much lower for newer models than for older ones. `gemini-3.5-flash` has RPD=20 (exhausted by 2 users in one afternoon). `gemini-3.1-flash-lite` has RPD=500, RPM=10. Always verify at: Google AI Studio → Explore models → your model → Quotas tab. (#first:2026-06-16)

2. **RPD=20 is useless for user-facing prototypes** — 20 requests/day across all users means a single enthusiastic tester can exhaust it. Minimum viable: RPD≥100 for prototype distribution to friends; RPD≥500 for wider sharing. (#first:2026-06-16)

3. **Turn limit pattern: guarantee users reach results** — For limited-quota AI conversations, cap at N user turns and auto-trigger synthesis on the final turn. Implementation: pass `isFinalTurn: true` to the API route, which appends a synthesis instruction to the system prompt. Benefits: (a) user always gets results, (b) usage is predictable (≤N+1 calls/session), (c) the conversation feels structured rather than open-ended. `app/api/chat/route.ts` + `app/prototype-d/page.tsx:MAX_TURNS`. (#first:2026-06-16)

4. **Detect AI "done" by response content, not external turn counter** — If the AI can self-terminate (system prompt says "after N topics, summarize"), the frontend's turn limit is a fallback, not the primary signal. Detecting synthesis by counting how many party/entity names appear in the response (≥5 = ranking) is more reliable than `turnCount >= MAX_TURNS`. The turn counter stays as an abuse-protection hard cap. Pattern: `const partyMentions = PARTY_NAMES.filter(n => content.includes(n)).length; const isSynthesis = isFinalTurn || partyMentions >= 5`. (#first:2026-06-17)

5. **Post-conversation extraction: fire in background while user reads** — When a conversational AI turn also serves as the "final answer", fire the structured extraction call immediately but don't transition the UI yet. Let the user read the conversational response (which they expected), then show a "מכין תוצאות..." loading indicator, and reveal a CTA button when extraction completes. Never hide the conversational response behind a loading screen — it's the payoff the user waited for. (#first:2026-06-17)

6. **Separate conversation from scoring — two API calls beats one doing both** — Having the chat AI score parties while also collecting preferences (conflating two jobs in one prompt) produces non-deterministic scoring and complicates future grounding. Better: conversation API collects preferences naturally; a second focused extraction API (`/api/results-d`) takes the full transcript and produces structured `{ scores, profile, partyBlurbs }`. The extraction prompt can be carefully crafted without risking the conversational tone. (#first:2026-06-17)

### `responseMimeType: "application/json"` alone does NOT eliminate JSON parse errors — use `responseJsonSchema` (#first:2026-06-30 #corrected:2026-07-02)

**Original (incomplete) fix, 2026-06-30**: `gemini-3.1-flash-lite` occasionally generates malformed JSON — missing commas in arrays, property value errors. 5 confirmed failures over 10 days in production, all with grounding data active (longer prompts → more likely to drift). Added `responseMimeType: "application/json"` to the `generateContent` config on the theory that it "constrains the model to output valid JSON."

**Correction, 2026-07-02**: that theory was wrong. Two more production failures happened *after* the mimeType fix shipped. Root cause, found via Langfuse raw-output inspection: `responseMimeType` alone only asks the model to produce JSON-*shaped* text — it does not guarantee correct string escaping. Both failures were Hebrew gershayim/acronym characters (צה"ל, מו"מ) emitted unescaped inside a JSON string value, breaking `JSON.parse` mid-string. This is a real, recurring risk for **any Gemini call generating Hebrew prose that might reference Israeli institutions/acronyms** (military, legal, religious — all acronym-heavy in Hebrew).

**Actual fix**: add an explicit `responseJsonSchema` (or `responseSchema`) alongside `responseMimeType`. This switches on Gemini's structured-output *constrained decoding*, which guarantees syntactically valid JSON at the token level regardless of content — the model literally cannot emit a token sequence that breaks the schema, including unescaped quotes inside strings.

```typescript
const MY_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    prologue: { type: ["string", "null"] },      // nullable via type array
    followUp: { type: ["object", "null"], properties: { /* ... */ }, required: ["question", "options"] },
  },
  required: ["prologue", "followUp"],
};
config: { temperature: 0.7, maxOutputTokens: 500, responseMimeType: "application/json", responseJsonSchema: MY_RESPONSE_SCHEMA }
```

**Verification is honestly hard**: the failure is intermittent (a handful of instances over weeks of traffic), so a live smoke test with acronym-heavy prompts came back correctly escaped both with and without the schema in a small sample — couldn't force a clean before/after reproduction. Treat post-deploy Slack alert volume over the following days/weeks as the real signal, not a single test run.

**Observed in**: `app/api/follow-up/route.ts` (fixed 2026-07-02, commit `b490834`) and `app/api/results/route.ts` (fixed same day, commit `48a166f` — this one had *neither* `responseMimeType` nor a schema at all, and generates Hebrew prose explicitly instructed to quote party platforms verbatim, the exact risk case). Apply the same `responseJsonSchema` pattern to any Gemini route that expects JSON output and generates Hebrew text, not just the ones that have already broken in production — the absence of a reported error isn't evidence of absence of the bug, given how rare/intermittent it is.

**Not every JSON-mode route is exposed, though — check before assuming**: `app/api/score-topics/route.ts` was audited and found *not* vulnerable to this specific bug — its output is pure `{"topicId.partyId": number | null}`, no free-text Hebrew string values at all, so there's no string content for an unescaped gershayim to break. It had a different unconstrained-JSON symptom instead (a regex workaround for the model emitting invalid `+2` instead of `2`, plus a regex-based JSON-blob extraction). Lesson: "generates JSON via Gemini" isn't itself sufficient to flag a route as at-risk for *this specific* bug — check whether the schema's string fields actually carry Hebrew free text before assuming the fix applies verbatim.

**`enum` in a JSON schema eliminates a whole class of "almost valid" values, not just escaping bugs** — fixed `score-topics` (2026-07-02, commit `06ec144`) with a schema where every score property is `{ type: ["integer", "null"], enum: [-2, -1, 0, 1, 2, null] }` instead of a generic `{ type: "number" }`. This is stricter than the follow-up/results fixes: it doesn't just guarantee syntactically valid JSON, it guarantees the *value itself* is one of the exact 5 allowed scores (or null) — constrained decoding literally cannot produce `+2`, `3`, or `1.5`. Building the schema's `properties`/`required` dynamically per-request (from the same `topics`/`PARTIES` data already used to build the prompt) also let `required` list every expected key, which structurally prevents the model from silently omitting a party/topic — a guarantee a generic `additionalProperties` schema wouldn't give. When a route's expected values are a small closed set (ratings, categorical labels, scores on a fixed scale), prefer `enum` over a bare type — it's strictly more protective for the same amount of schema code, and it deletes any accompanying "clean up the model's near-miss output" regex.

### Hoist the AI response variable before the try block for catch-block logging (#first:2026-06-30)

When a Langfuse generation or error logger needs to record the raw AI output on failure, `const text = response.text` declared inside the try block is not accessible in the catch. Pattern:

```typescript
let rawText = "";   // hoisted — accessible in catch
try {
  const response = await ai.models.generateContent(...);
  rawText = response.text ?? "";
  const parsed = JSON.parse(rawText);  // if this throws...
  generation?.update({ output: rawText });
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  // ...rawText is available here — include the bad output in the error log
  generation?.update({ output: rawText ? `${msg}\n\nRAW:\n${rawText.slice(0, 500)}` : msg, level: "ERROR" });
}
```

Without hoisting, error traces in Langfuse show only the exception message (e.g. `"Expected ',' or ']' after array element in JSON at position 403"`), with no way to see what the model actually returned. With hoisting, the malformed output is visible — essential for diagnosing prompt/model issues.

### Prompt vs. Client Fix: Fix Root Cause First, Keep Defensive Strip (#first:2026-06-26)

When the AI produces malformatted output (e.g., numbered option text "1. text" when options should be plain), fix the prompt FIRST — then keep a lightweight defensive transform in the client as a silent safety net.

**Wrong order:** add a client-side regex strip → declare it fixed.
**Right order:**
1. Identify WHY the AI produces the format: the prompt format instruction says `"options": ["...", "...", "..."]` but never says "don't number items". The AI interprets the list structure as an invitation to number.
2. Add an explicit negative instruction to the prompt: *"Write plain text only — do NOT number the options (no '1.', '2.', etc.) — numbers are added by the UI."*
3. Keep the client strip (`opt.replace(/^\d+[\.\)]\s*/, "")`) as a fallback that fires silently if the model deviates.

Rationale: the prompt fix addresses non-determinism at the source. The client strip catches rare regressions without cluttering logs or user experience. This pattern (fix upstream + silent defensive layer) applies to any AI output format issue. (#first:2026-06-26)

---

### Error Handling (Never Expose Raw SDK Errors)

4. **Translate API errors to structured codes at the boundary** — The Gemini SDK throws errors whose `.message` is a raw JSON blob (includes the full HTTP response). Passing this to the frontend shows incomprehensible text to users. Always inspect the error at `route.ts` and return `{ errorCode: "QUOTA_EXCEEDED" | "AUTH_ERROR" | "SERVER_ERROR" }`. Map in the UI to friendly Hebrew strings. (#first:2026-06-16)

   Detection heuristics (in `route.ts`):
   - Quota: `message.includes("429") || message.includes("RESOURCE_EXHAUSTED")`
   - Auth: `message.includes("401") || message.includes("403") || message.includes("API_KEY")`
   - Default: `SERVER_ERROR`

### LLM Observability (Langfuse)

5. **Helicone new signups are closed** — As of 2026-06, us.helicone.ai shows "New signups are disabled". Use Langfuse instead. (#first:2026-06-16)

6. **Langfuse: use direct SDK, not OTel, for Next.js serverless** — The direct SDK (`import { Langfuse } from "langfuse"`) is simpler than the OpenTelemetry-based wrapper for serverless API routes. Pattern:
   ```typescript
   const lf = new Langfuse({ secretKey, publicKey, baseUrl });
   const trace = lf.trace({ name, sessionId, metadata });
   const gen = trace.generation({ name, model, input });
   // ... call AI ...
   gen.update({ output }); gen.end();
   await lf.flushAsync(); // CRITICAL for serverless
   ```
   `flushAsync()` is mandatory: serverless processes exit immediately after response, before background flush completes. (#first:2026-06-16)

7. **Pass sessionId from client for conversation grouping** — Generate `sessionId` with `crypto.randomUUID()` in the React client on mount (`useState(() => crypto.randomUUID())`). Send it with every API request body. Use it as Langfuse `sessionId` to group all turns of one conversation. This lets you view a full conversation in Langfuse traces. (#first:2026-06-16)

