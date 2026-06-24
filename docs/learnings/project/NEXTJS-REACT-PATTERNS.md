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
