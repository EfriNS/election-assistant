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
