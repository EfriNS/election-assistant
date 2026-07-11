# Next.js + React Patterns (election-assistant)

**Purpose**: Project-specific Next.js and React patterns, gotchas, and fixes discovered during development.

---

## Tooling

### next lint removed in Next.js 16 (#first:2026-06-22)

`next lint` was a built-in CLI command in Next.js 13–15. It was **removed in Next.js 16**. Running it gives:
```
Invalid project directory provided, no such directory: .../lint
```

**Fix**: Install ESLint directly and use flat config.
```bash
npm install --save-dev eslint eslint-config-next
```

Create `eslint.config.mjs` (ESLint 9 flat config format):
```js
import nextConfig from "eslint-config-next";
const config = [...nextConfig];
export default config;
```

Update `package.json`:
```json
"lint": "eslint ."
```

---

## React Patterns

### Lazy useState initializer for external storage reads (#first:2026-06-22)

Reading `sessionStorage` / `localStorage` on mount via `useEffect` + `setState` triggers the `react-hooks/set-state-in-effect` lint rule and causes an extra render.

**Wrong:**
```typescript
const [tone, setTone] = useState<Tone | null>(null);
useEffect(() => {
  const t = sessionStorage.getItem("tone") as Tone | null;
  if (t) setTone(t);
}, []);
```

**Right:** Use a lazy initializer with an SSR guard (`typeof window`):
```typescript
const [tone, setTone] = useState<Tone | null>(() =>
  typeof window !== "undefined"
    ? (sessionStorage.getItem("tone") as Tone | null)
    : null
);
```

No `useEffect` needed. Works even for Next.js client components (which still run an initial SSR render where `window` is undefined).

---

### Module-level components for shared JSX within a page (#first:2026-06-22)

Defining a component as a `const` inside another component's render function creates a new function every render. React sees it as a different component type and remounts it, causing "Cannot create components during render" lint errors and real performance issues.

**Wrong:**
```typescript
function MyPage() {
  // ...state...
  const Header = () => <div onClick={goBack}>...</div>; // new fn every render!
  return <Header />;
}
```

**Right:** Move to module level, pass needed values as explicit props:
```typescript
function Header({ onBack, progress }: HeaderProps) {
  return <div onClick={onBack}>...</div>;
}

function MyPage() {
  // ...state...
  return <Header onBack={goBack} progress={progressPct} />;
}
```

---

### Cycling animation with lazy init (replaces setState-in-effect) (#first:2026-06-22)

For a verb/text cycling animation that starts at a random index, avoid `useState(0)` + `useEffect` that sets initial index synchronously.

**Right:** Lazy initializer picks random start; interval callback handles cycling (callbacks are fine, only sync body is flagged):
```typescript
function CyclingVerb({ verbs }: { verbs: string[] }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * verbs.length));
  useEffect(() => {
    const id = setInterval(() => setIdx(v => (v + 1) % verbs.length), 1400);
    return () => clearInterval(id);
  }, [verbs.length]);
  return <>{verbs[idx]}</>;
}
```

Extract as a module-level component so it remounts cleanly when shown/hidden.

---

### setState-in-effect: when to disable vs. refactor (#first:2026-06-22)

The `react-hooks/set-state-in-effect` rule flags setState calls in effect bodies. Two cases:

**Refactor (preferred):** When reading external storage on mount → use lazy initializer (see above).

**eslint-disable (acceptable):** When syncing UI state from navigation history (e.g., restoring a typed input when user navigates back). The pattern is legitimate; no cleaner alternative without restructuring the entire state model. Use a targeted `// eslint-disable-next-line` with a comment explaining why:
```typescript
useEffect(() => {
  // Restoring typed input from navigation history — intentional setState in effect
  if (qa?.openerAnswerId === "other") {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowInput(true);
    setDraft(qa.text ?? "");
  }
}, [questionIndex]);
```

Note: the rule only flags the **first** setState call in each branch — subsequent calls in the same block do not need individual disables.

---

### setState-in-effect: async data fetch pattern (#first:2026-06-24)

When a `useEffect` needs to kick off an async fetch and update state on completion, placing `setIsLoading(true)` synchronously at the top of the effect body still triggers `set-state-in-effect`. The fix is to move the **entire** fetch+setState sequence into a nested `async function` with a cleanup flag:

**Wrong** (triggers lint even though await comes right after):
```typescript
useEffect(() => {
  setIsScoring(true);              // ← flagged: synchronous setState in effect body
  (async () => {
    const r = await fetch("/api/score-topics", ...);
    setAiScores(await r.json());
    setIsScoring(false);
  })();
}, [dep]);
```

**Right:** wrap everything, including the initial setState, inside the nested async function:
```typescript
useEffect(() => {
  let active = true;
  async function run() {
    setIsScoring(true);
    try {
      const r = await fetch("/api/score-topics", ...);
      if (active) setAiScores(await r.json());
    } finally {
      if (active) setIsScoring(false);
    }
  }
  run();
  return () => { active = false; };
}, [dep]);
```

The `active` flag prevents `setState` calls on unmounted components (prevents React "Can't perform state update on unmounted component" warning).

**⚠️ Exception — don't guard loading/spinner state in a parent component** (#first:2026-06-26): If a loading flag (e.g. `isScoring`) lives in the parent page component (which never unmounts), guarding it with `if (active)` causes a race condition: when the user navigates away from the step that started the fetch, `active` becomes `false` before the fetch completes, so `setIsLoading(false)` is never called and the spinner gets stuck permanently. Only use `if (active)` for state updates that would cause React warnings (i.e., state in a child component that actually unmounts). Loading state in a persistent parent should always be cleared unconditionally.

---

### React stale state in async callbacks: inject current value inline (#first:2026-06-26)

When a callback closes over React state and calls a function that needs the *current* value of that state — but React hasn't flushed a `setState` call yet — the function sees the stale (pre-update) value.

**Symptom in this project**: `callFollowUpAPI` called `calcResults(buckets, topicQA, ...)` to find close parties, but `topicQA` didn't include the current opener answer yet because `setTopicQA()` was called but not yet flushed. The current topic contributed zero to ranking, so all parties looked equally relevant.

**Fix**: build the authoritative value inline from the values in scope, before passing to the function:
```typescript
// topicQA state doesn't have openerAnswerId yet (setState hasn't flushed)
const syntheticTopicQA: Record<string, TopicQA> = {
  ...topicQA,
  [topicId]: {
    openerAnswerId: openerAnswerId ?? "",  // from local variable — always current
    openerAnswerText,
    followUps: followUpQA,
    coveredAspects: topicQA[topicId]?.coveredAspects,
  },
};
const rankings = calcResults(buckets, syntheticTopicQA, questionSet);
```

Rule: any callback that reads React state and then passes it to a pure function should ask: "could state have been set but not flushed between the setter call and this function call?" If yes, build a synthetic object from local variables. (`app/prototype-e/page.tsx:callFollowUpAPI`) (#first:2026-06-26)

### Back-navigation must roll back *every* piece of state the forward step wrote — audit the appends, not just the visible question (#first:2026-07-11)

`goBack` in `app/quiz/page.tsx` rolled back `followUps` and the asked-count when withdrawing a displayed follow-up, but not `coveredAspects` — appended when a question is *generated*, not answered. User-visible result: pressing back on follow-up N silently consumed N's dimension — the regenerated question skipped it, or the topic transitioned early when it was the last dimension with grounding evidence. Fixing it required first persisting `targetedAspect` on each stored entry: the aspect had only lived in the accumulated list, so rollback had nothing to key on (removal is by last occurrence — an aspect can legitimately recur after rollback+regeneration).

Rule: when adding "append X on step forward" bookkeeping to a flow with back-navigation, write the rollback in the same change — and keep enough per-step provenance in state that a rollback *can* be computed later. An accumulated list whose items don't record which step produced them cannot be unwound.

---

## Testing (Vitest)

### Mocking constructable classes: use regular function, not arrow function (#first:2026-06-24)

When mocking an ES class or constructor function with Vitest, the mock factory must return a **regular function** (not arrow function) because arrow functions cannot be used as constructors (called with `new`).

**Wrong** (throws "not a constructor" at test runtime):
```typescript
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => ({          // ← arrow function, can't use `new`
    chats: { create: () => ({...}) },
  })),
}));
```

**Right:** use a regular function expression:
```typescript
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function() {      // ← regular function, constructable
    return {
      chats: { create: () => ({...}) },
    };
  }),
}));
```

Also: hoist shared mock refs with `vi.hoisted()` so they're available both inside the `vi.mock()` factory and in test assertions:
```typescript
const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function() {
    return { chats: { create: () => ({ sendMessage: mockSendMessage }) } };
  }),
}));
```

---

## Environment Variables

### .env.local quoting: Next.js strips quotes; shell commands don't (#first:2026-06-24)

Next.js App Router **strips surrounding double quotes** from `.env.local` values at startup. So `QUOTA_CRON_SECRET="abc123"` gives `process.env.QUOTA_CRON_SECRET === "abc123"` (no quotes) in the app.

Shell commands (`grep`, `cut`) preserve the surrounding quotes. This causes a mismatch when testing env-based auth in shell:

```bash
# .env.local:  QUOTA_CRON_SECRET="abc123"
SECRET=$(grep "^QUOTA_CRON_SECRET=" .env.local | cut -d= -f2-)
# SECRET is: "abc123"  (with quotes!)
# But Next.js sees: abc123  (without quotes)

# Auth will fail:
curl -H "Authorization: Bearer \"abc123\""   # vs app expecting: Bearer abc123
```

**Fix:** add `tr -d '"'` to strip quotes from the shell read:
```bash
SECRET=$(grep "^QUOTA_CRON_SECRET=" .env.local | cut -d= -f2- | tr -d '"')
```

---

## Vercel Deployment

### Vercel Hobby plan: daily crons only (#first:2026-06-25)

Vercel Hobby plan rejects any cron schedule that runs more than once per day. A sub-daily schedule (e.g. `"0 * * * *"` hourly) in `vercel.json` causes **every deployment to fail silently** — builds stop triggering entirely, not just the cron invocation.

```json
// ❌ Blocks all builds on Hobby plan:
{ "path": "/api/quota-check", "schedule": "0 * * * *" }

// ✅ Allowed on Hobby:
{ "path": "/api/quota-check", "schedule": "0 0 * * *" }
```

Upgrade to Pro to re-enable sub-daily schedules.

### TypeScript errors block Vercel builds (#first:2026-06-25)

A `TS2322` error that appears in `tsc --noEmit` output will also block Vercel production builds, even if the local dev server runs fine. The error does NOT surface as an obvious build failure message — Vercel just stops creating new deployments for subsequent pushes.

**Rule:** Treat any local `tsc --noEmit` error as a production blocker. Fix it before pushing.

### Vercel KV env var names differ from Upstash SDK defaults (#first:2026-06-26)

`@upstash/redis`'s `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
Vercel's KV/Upstash marketplace integration auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` — different names, same values.

Using `Redis.fromEnv()` with a Vercel KV store means rate limiting silently does nothing (env vars not found → `makeRatelimit()` returns null → no-op middleware). No error is thrown.

**Fix**: don't use `fromEnv()`. Explicitly read whichever names Vercel injects:
```typescript
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
if (!url || !token) return null;
return new Ratelimit({ redis: new Redis({ url, token }), ... });
```

Other Vercel-injected vars (`KV_URL`, `REDIS_URL`, `KV_REST_API_READ_ONLY_TOKEN`) are not needed for rate limiting — use the read-write token and REST URL only.

---

### RTL flex: first DOM child = screen-right (#first:2026-06-25)

In a component rendered inside an RTL context (`dir="rtl"`), Flexbox reverses the visual order: **the first child in the DOM appears on the right side of the screen**. This is the opposite of LTR.

```jsx
// In RTL: badge appears on RIGHT (correct for Hebrew), text fills LEFT
<button className="flex items-center gap-3">
  <span className="badge">{num}</span>      {/* → screen-right */}
  <span className="flex-1 text-right">{text}</span>  {/* → screen-left */}
</button>

// In RTL: badge appears on LEFT (wrong — looks like an LTR leftover)
<button className="flex items-center gap-3">
  <span className="flex-1 text-right">{text}</span>
  <span className="badge">{num}</span>      {/* → screen-left */}
</button>
```

Always put the badge/icon FIRST in the DOM when you want it on the right in Hebrew UI.

---

## Security Patterns

### Vercel Edge middleware: graceful no-op without credentials (#first:2026-06-25)

Rate-limiting middleware that depends on an external service (Upstash Redis) must not fail or error when credentials are absent — it should simply pass through. Pattern: check for env vars at module load time, return `null` from a factory function, then check for `null` at the start of the middleware handler.

```typescript
function makeRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "24 h") });
}

const ratelimit = makeRatelimit();  // evaluated once at cold start

export async function middleware(req: NextRequest) {
  if (!ratelimit) return NextResponse.next();  // ← no-op in local dev / CI
  // ...rate limit logic...
}
```

This pattern makes local dev work without a Redis instance and avoids runtime errors in CI.

### Return structured data even on error responses (#first:2026-06-25)

API routes that perform AI calls plus deterministic computation should return the deterministic data in the error response body — not just an error code. Clients then get useful output even on quota/auth failure.

```typescript
// ❌ Error response discards all useful data:
return NextResponse.json({ errorCode: "QUOTA_EXCEEDED" }, { status: 429 });

// ✅ Error response still includes pre-computed grounding data:
return NextResponse.json({ errorCode: "QUOTA_EXCEEDED", groundings }, { status: 429 });
```

Client must call `res.json()` regardless of status to access the structured data:
```typescript
.then((res) => {
  if (res.status === 429) setQuotaExceeded(true);
  return res.json();  // ← always parse, even on error
})
.then((data) => {
  if (data.groundings) setGroundings(data.groundings);  // still available on 429
})
```

### PII in AI observability traces (#first:2026-06-25)

Langfuse (and similar tracing tools) `generation()` calls accept an `input` field. If this field contains user-submitted text (answers to quiz questions, free-text responses), it constitutes PII storage in a third-party system.

**Fix:** Remove the `input` field entirely from `generation()`. Token counts (`usage`) and `output` can still be captured for cost monitoring without storing the user's content.

```typescript
// ❌ PII stored in Langfuse:
const generation = trace?.generation({ name: "gemini-results", model, input: userMessage });

// ✅ No PII — tokens + output still tracked:
const generation = trace?.generation({ name: "gemini-results", model });
// ...later:
generation?.update({ output: text, usage: { input: promptTokens, output: candidateTokens } });
```

Apply this pattern to every route that includes user-submitted text in the AI prompt.

---

## Third-party Analytics

### Mixpanel EU projects: `api_host` is mandatory (#first:2026-06-28)

Both Mixpanel projects (production 4038344, preview 4038347) are EU-hosted. The default JS SDK sends events to `api.mixpanel.com` (US). For EU projects, the US endpoint:
- Returns HTTP 200 and response body `1` (looks like success)
- **Silently discards all events** — they never appear in the Mixpanel UI

**Fix**: always pass `api_host` to `mixpanel.init()`:
```typescript
mixpanel.init(token, {
  api_host: "https://api-eu.mixpanel.com",  // REQUIRED for EU projects
  // ...other options
});
```

**Diagnostic**: fire a synthetic curl event to both endpoints to identify which one the project accepts:
```bash
# Both return `1` — check Mixpanel Events view to see which delivered
curl -s -X POST "https://api.mixpanel.com/track" -H "Content-Type: application/json" \
  --data-binary '[{"event":"test","properties":{"token":"YOUR_TOKEN","distinct_id":"test"}}]'
curl -s -X POST "https://api-eu.mixpanel.com/track" -H "Content-Type: application/json" \
  --data-binary '[{"event":"test","properties":{"token":"YOUR_TOKEN","distinct_id":"test"}}]'
```

Full setup: `lib/mixpanel.ts` + `docs/ANALYTICS-DESIGN.md`.

---

## RTL Copy

### Whitespace around `<strong>` is swallowed in RTL (#first:2026-06-26)

In Hebrew RTL JSX, a space placed **between** a closing inline tag and the next text node can be silently dropped by the browser, merging the words:

```jsx
// ❌ Renders as "לפחות 3 נושאיםכ"חשוב"" — space eaten:
יש לסמן <strong>לפחות {MIN_IMPORTANT} נושאים</strong> כ&quot;חשוב&quot;

// ✅ Move the space inside the tag — always preserved:
יש לסמן <strong>לפחות {MIN_IMPORTANT} נושאים{" "}</strong>כ&quot;חשוב&quot;
```

Rule: when a space must appear immediately after a closing inline tag in Hebrew text, put it inside the tag using `{" "}`.

---

### Hebrew RTL: avoid `")?"`  at end of string — move `"?"` before parenthetical (#first:2026-06-26)

In RTL text, `")"` and `"?"` are both weak-direction characters. When they appear together at the end of a string (`")?"`) inside an RTL element, the Unicode BiDi algorithm can render them in the wrong order — visually the parenthesis appears to close on the wrong side.

**Wrong** (renders with reversed parens in RTL):
```
"מה כתוב בפרסומי המפלגה (למפלגה אין מצע רשמי)?"
```

**Right** (move `"?"` before the parenthetical — ends cleanly):
```
"מה כתוב בפרסומי המפלגה? (למפלגה אין מצע רשמי)"
```

Rule: in Hebrew UI strings, never end with `")?"`. The `"?"` closes the main clause; any parenthetical note comes after it.

### Direction-sensitive glyphs don't mirror with dir="rtl" — pick the mirrored codepoint yourself (#first:2026-07-11)

Unicode bidi mirroring applies to paired punctuation (parens, brackets), **not** to arrows and similar symbols: `↳` (U+21B3, tip-rightwards, "continuation" in LTR) renders tip-rightwards even inside an RTL paragraph, pointing *away* from the Hebrew text flow. User-reported after the ↳-prefixed answer-chain recap shipped; the same glyph had been in the follow-up label, results-card quote marker, and PDF template for weeks. Fix: use the direction-correct codepoint (`↲`, U+21B2) — and when adding any arrow/chevron/progress glyph to this RTL-first app, ask "which way does this point in *this* text direction?" rather than copying the LTR-conventional symbol. (Continuation/back buttons here already follow this: "המשך ←".)

---

## Server-side PDF generation (Puppeteer + @sparticuz/chromium)

### Next.js 16 Turbopack blocks `react-dom/server` in App Router route handlers (#first:2026-06-28)

Importing `react-dom/server` (for `renderToStaticMarkup`) inside an App Router route handler causes a Turbopack build error:
```
You're importing a component that imports react-dom/server
```

**Fix**: Use a plain TypeScript string builder (no React). This is actually the cleaner pattern for server-side HTML generation — no hydration, no component lifecycle, pure data → HTML:

```typescript
// ❌ Won't compile with Turbopack:
import { renderToStaticMarkup } from "react-dom/server";
export async function POST() {
  const html = renderToStaticMarkup(<MyResultsPage data={...} />);
}

// ✅ Plain string builder in lib/pdf-template.ts:
export function buildPdfHtml(data: PdfResultsData, generatedAt: string): string {
  function e(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;") ... }
  return `<!DOCTYPE html><html>...${e(data.aiProfile ?? "")}...</html>`;
}
```

### `outputFileTracingIncludes` required for Chromium binaries on Vercel (#first:2026-06-28)

Vercel's function bundler traces JS imports but excludes binary assets from `node_modules` by default. `@sparticuz/chromium` stores brotli-compressed Chromium executables in `bin/` — without explicit inclusion, the Vercel function throws at runtime:
```
The input directory "/var/task/node_modules/@sparticuz/chromium/bin" does not exist.
```

**Fix** in `next.config.ts`:
```typescript
outputFileTracingIncludes: {
  "/api/export-pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
}
```

The chromium bin is ~66MB — fits within Vercel's 250MB function bundle limit. Also required: `serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"]` to prevent Next.js from bundling native deps.

### Puppeteer API changes in v24 (#first:2026-06-28)

Two breaking changes from older Puppeteer docs:
1. `networkidle0` / `networkidle2` removed from `setContent()` `waitUntil` — only `"load"` and `"domcontentloaded"` accepted. Use `page.waitForNetworkIdle({ idleTime: 500 })` as a separate call after `setContent`.
2. `chromium.defaultViewport` removed from `@sparticuz/chromium` v147 — don't pass it to `puppeteer.launch()`.

### Cold starts are per function-instance lifecycle, not per deployment (#first:2026-06-28)

`@sparticuz/chromium` extracts ~300MB to `/tmp` on first invocation (~4-6s). This is a **per-function-instance** cold start, not a per-deployment event. Serverless function instances recycle after ~5-10 min idle — so most real user PDF calls will incur a cold start. On Vercel Hobby, PDF generation will commonly take 6-10s. Consider showing a loading message ("מכין את הקובץ...") in the UI — implemented in `UnifiedResultsPage.tsx`.

### Minimal Chromium ≠ full Chrome: emoji and Unicode symbols fail silently (#first:2026-06-28)

`@sparticuz/chromium` ships a stripped Chromium with limited font support. Emoji (🗳️, ⚠️) and Unicode symbols (✦, ↗) render as empty rectangles. Solution: **remove or replace** rather than trying to load emoji fonts (more reliable):
- Remove decorative emoji from headings
- Replace ⚠️ with `<strong>` text
- Replace ✦ sparkles with plain text prefix
- Remove ↗ arrows from link labels

Adding Noto Sans to the Google Fonts load (`family=Noto+Sans`) improves Unicode coverage for basic symbols (✓, ✕, ~) — sufficient for topic chips. Noto Emoji is too heavy for Puppeteer-rendered PDFs.

---

### Don't interpolate dynamic values into the middle of Hebrew sentences (#first:2026-06-26)

Interpolating a data-driven string into the middle of a natural-language sentence produces unreadable or grammatically broken Hebrew when the value is itself a phrase:

```jsx
// ❌ Breaks when platformLabel = "אין מצע בחירות רשמי":
הציטוטים מבוססים על <span>{groundingData?.platformLabel}</span> ועלולים שלא לשקף...
// → "הציטוטים מבוססים על אין מצע בחירות רשמי ועלולים..."

// ✅ Keep the sentence self-contained; show the label separately or not at all:
ציטוטים אלה מבוססים על מסמכים ישנים ועלולים שלא לשקף את עמדותיה הנוכחיות.
```

Rule: sentences with interpolated values should be designed so any plausible value produces grammatical Hebrew. If you can't guarantee that, rewrite the sentence to not depend on the interpolated value.

---

## Testing

### `vi.mock` a module with `importOriginal` when the code under test calls the module's own helper functions (#first:2026-07-03)

Adding new exported helpers to a module (e.g. `compareEntryQuality`, `derivePartySourceQuality`, `getBestEvidenceForTopic` in `lib/groundings.ts`) that the function under test calls *internally* breaks any existing test that mocks the whole module with a plain object literal:

```ts
// ❌ Breaks with "No 'compareEntryQuality' export is defined on the mock" as soon as
// buildGroundingsForParties (the code under test) starts calling that helper internally:
vi.mock("@/lib/groundings", () => ({
  GROUNDINGS: { /* fixture data */ },
  getTopicGroundings: vi.fn(),
}));

// ✅ Keep every real export via importOriginal, override only the data + functions
// the test actually needs to control:
vi.mock("@/lib/groundings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/groundings")>();
  return {
    ...actual,
    GROUNDINGS: { /* fixture data */ },
    getTopicGroundings: vi.fn(),
  };
});
```

Fixture data also needs every field the real helpers read (e.g. `provenance`/`concreteness` on each mock grounding entry) — a mock object missing a field a real helper's sort/lookup depends on fails differently (`NaN` comparisons, `undefined` lookups) than a missing export does. Default to `importOriginal` for any module mock in this codebase unless the test deliberately wants every export stubbed.

---

## Static Assets

### A missing favicon is a real, measurable cost, not just cosmetic (#first:2026-07-08)

With no `public/` directory and no `app/icon.*`/`favicon.ico`, every browser tab load auto-requests `/favicon.ico` (often `/favicon.png` too) and 404s through `/_not-found` — a real function invocation each time (the enforced CSP nonce middleware runs on all pages), visible in Vercel logs as elevated `/_not-found` counts uncorrelated with actual page traffic. Diagnosed by cross-referencing `mcp__plugin_vercel_vercel__get_runtime_logs` (`group_by: "requestPath"`) against a plain `find` for icon files in `app/`/`public/`.

**Fix, using Next.js App Router's file conventions** (no manual `metadata.icons` needed — Next auto-injects the `<link>` tags):
- `app/icon.svg` — static vector, primary favicon for modern browsers. Prerenders as a **static** route (`○`) even though the rest of this app is forced dynamic by the CSP-nonce middleware (`INFRA-PATTERNS.md`) — icon/asset routes that don't call `headers()` aren't swept into that cost.
- `app/apple-icon.tsx` — `ImageResponse` from `next/og` (bundled with Next, no install) generates the PNG at request time; use `size`/`contentType` exports. iOS applies its own corner mask on home-screen icons — ship this one as a flat square, not pre-rounded, or you get double-rounding.
- `app/favicon.ico` — browsers request this literal path regardless of `<link>` tags (why Next has a dedicated convention for it, separate from `icon.*`). Modern ICO format can embed a PNG directly per frame — no BMP encoding needed: a 6-byte `ICONDIR` header + one 16-byte `ICONDIRENTRY` per size + the raw PNG bytes back-to-back. Built via a one-off script using `sharp` (already present in `node_modules` transitively) to rasterize the SVG at each size, not committed — only the resulting binary is.

Verify with a real production build + local `npm start`, not just `npm run dev`: `curl -I` each icon path for status/content-type, and grep the served HTML for the auto-injected `<link rel="icon">`/`<link rel="apple-touch-icon">` tags.

---

## Headless E2E Verification

### Full-flow browser verification with zero installs: puppeteer-core + @sparticuz/chromium (#first:2026-07-10)

Both are already dependencies (PDF export), so the real quiz flow can be driven headlessly against a local dev server with no Chrome install: `puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, "--no-sandbox"] })`. Used to verify the analytics round 2 event schema end-to-end by intercepting `page.on("request")` for `mixpanel.com/track` and decoding the `data=` payload (URL-decoded JSON, base64 fallback). Local dev sends to the Mixpanel *Preview* project (the later of the two duplicate `NEXT_PUBLIC_MIXPANEL_TOKEN` lines in `.env.local` wins), so test runs don't pollute production data.

Gotchas that cost a debugging cycle each:
- **The script must live under the repo root** (temp file, delete after) — bare imports don't resolve from the scratchpad since Node walks `node_modules` up from the *script's* path, not cwd.
- **One state-updating click per `page.evaluate`, with a pause between.** Clicking three priority buckets in one evaluate clobbered state down to the last click: each handler does `setBuckets({ ...buckets, ... })` from the *same* stale props object when no re-render happens between clicks. Real users always get a re-render between clicks; a synchronous bot doesn't.
- **Selector precision**: option buttons were matched by "contains a `span.rounded-full`" — but `TermHint`'s "מה זה אומר?" button also has one. Match the digit inside the circle (`/^\d+$/` on the span text), not the circle.
- **StrictMode double-fires mount-effect events in dev** — duplicated `results_viewed`/`results_ai_loaded` in captured output are a dev-only artifact (also: duplicate `/api/results` fetches locally), not a bug to fix; production single-fires.
