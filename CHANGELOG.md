# Changelog

## 2026-06-19 — Round 3 UX Polish + Unified Follow-up Architecture

### What We Built

Post-round-3 testing session: rewrote the follow-up architecture, fixed back navigation, and improved several UX details in Prototype E. 7 files changed.

### Architectural Change: Unified Follow-up API

Old architecture (2 separate API calls per topic):
1. Opener answer → `/api/follow-up` → pre-cached follow-up question
2. Follow-up answer → no API call; advance to next topic with cached prologue

Problems: cold follow-up appearance (no prologue on first follow-up), stale pre-cached prologues, model only knew topic labels (not actual next question text).

New architecture (1 API call per answer):
- Every answer (opener or follow-up) triggers a single `/api/follow-up` call
- Always returns `{ prologue: string | null, followUp: { question, options, hint? } | null }`
- Model receives: full conversation history + current topic full Q&A + next topic's actual question text + `followUpsAskedThisTopic` count
- Model governs pacing; frontend has hard cap of 4 follow-ups per topic

### `app/api/follow-up/route.ts` — Rewritten

New input shape:
```typescript
{ conversationSoFar, currentTopic: { label, openerQuestion, openerAnswer, followUpQA[] },
  nextTopic: { label, question } | null, tone, depth, followUpsAskedThisTopic }
```
New output shape: `{ prologue: string | null, followUp: { question, options, hint? } | null }`

Prompt improvements:
- English instructions + Hebrew output (better Gemini compliance)
- Prologue marked REQUIRED/non-null in both follow-up and transition cases
- Explicit ban on bridging language inside `question` field
- Depth guidance replaces `maxFollowUps` integer cap
- Langfuse observability retained

### `app/prototype-e/page.tsx` — State Machine Rewrite

Old state (8 vars): `topicPhase`, `followUpIdx`, `openerAnswers`, `openerTexts`, `followUps`, `followUpAnswers`, `prologues`, `followUpLoading`

New state (5 vars): `topicQA` (Record<topicId, TopicQA>), `currentFollowUp`, `currentPrologue`, `followUpsAskedThisTopic`, `loading`

`TopicQA` type stores full follow-up `{ question, options, hint?, answer }` — enabling precise back navigation.

Back navigation now works as a stack:
- Back from follow-up #N → restores follow-up #N-1 (pops from stored, re-answers)
- Back from topic N+1 opener → restores topic N's last follow-up
- Re-answering a restored follow-up discards subsequent follow-ups (correct branching behavior)

### UX Improvements

**Follow-up context cues** — Follow-up screens now show:
- `↳ שאלת המשך` label next to topic chip
- Opener answer recap in teal-bordered quote block above the AI prologue

**Loading animation** — Replaced static "רגע..." with cycling verbs that start at a random index. Two distinct lists with zero overlap:
- Formal: מנתח / שוקל / חושב / מגבש
- Informal: מקשיב / מעכל / מהרהר / מתבשל / מתפלסף

**Landing page persistence** — Tone and depth selections now persist in `sessionStorage`; navigating back to `/` restores choices.

**Hints** — Expanded to all 8 topics in both question registers. `Option.term` field enables specific term labeling (`מה זה "פריפריה"?` instead of generic `מה זה אומר?`). TermHint anchored visually to its option with right-side teal border.

**API prompts** — All 4 API routes (`/api/follow-up`, `/api/results`, `/api/results-d`, `/api/chat`) rewritten with English instructions + Hebrew output for better model compliance.

**Bug fixes:**
- Close step back button now resets `topicPhase` to opener (previously bounced back to close)
- Prologue forced non-null in prompt; model no longer bakes bridging language into question field

### Commits

```
c445162 content: rewrite questions — policy positions in plain language, new religion options
87250ea feat: round 3 feedback — hints, Hotjar, English prompts
c7f903d fix: close step back button resets topicPhase to opener
53bcc84 feat(prototype-e): unified state machine — one API call per answer
37a7e24 fix(follow-up): enforce prologue split from question in prompt
813f490 fix(prototype-e): back navigation restores previous follow-up question
9a02834 ui(prototype-e): animate loading verb instead of "רגע..."
a677d39 ui(prototype-e): follow-up context cues + loading verb fixes
20bc100 Merge feature/questions-rewrite
```

---

## 2026-06-19 — Round 3 Implementation: Prototype E + Modified D

### What We Built

Full implementation of the Round 3 design. 11 files changed, 1,349 insertions. Deployed to production.

### New: `lib/questions.ts`

Two complete question registers (8 topics each):
- `QUESTIONS_FORMAL` — policy framing ("מה הגישה הנכונה?"), 4 options each
- `QUESTIONS_PERSONAL` — concern framing ("מה הכי מדאיג אותך?"), 4 options each
- Party scores: 7-element arrays `[hadash, democrats, beyahad, yashar, beitenu, likud, shas]`
- All scores marked as rough estimates pending expert review (TODO #3)

### New: `components/PrioritiesStep.tsx`

Shared rank component used by B, D, E. Props: `{ buckets, setBuckets, onContinue, accentColor?, onBack? }`. Accent variants: `emerald` (B), `teal` (E), `purple` (D). Exports `TOPICS`, `MIN_IMPORTANT`, `AccentColor`.

### New: `app/prototype-e/page.tsx`

Full Prototype E flow: rank → questions → close → results.
- Reads `tone` + `depth` from URL params (`/prototype-e?tone=formal&depth=short`)
- Adaptive follow-ups: AI decides 0 or 1 per topic; depth is a cap (short=1, deep=2)
- Full conversation history passed to `/api/follow-up` on every call
- "אחר — פרט" as 5th dashed-border option with textarea, submits free text
- Back navigation: restores previous selection highlight (teal) and "other" draft
- Prologue: AI transition sentence between topics (not a chat message — integrated into question flow)
- Close step: optional free text → results (single "← לתוצאות" CTA)
- Accent: teal throughout

### New: `app/api/follow-up/route.ts`

POST endpoint. Input: `{ conversationSoFar[], currentTopic, nextTopic, tone, maxFollowUps }`. Output: `{ followUp: {question, options[]} | null, nextPrologue: string | null }`. Prompt instructs: male form always, decide if follow-up needed, always append "אחר — פרט", write prologue for next topic transition.

### Modified: `app/page.tsx` — New Landing Page

Advisor persona framing ("מי אני כיועץ שלכם?") replaced tone cards. Editorial radio style (Option C after user UX review). Two sections separated by dividers:
- ענייני / זורם — tone of voice selection
- ממוקד / מעמיק — depth selection
No defaults; CTA disabled until both chosen. Removed "ניטרלי · שקוף · ללא הרשמה" tagline. "המפלגות" not "כל המפלגות".

### Modified: `app/prototype-d/page.tsx` — Priorities Step Added

Replaced welcome screen with `<PrioritiesStep accentColor="purple" />`. Reads `tone`, `depth` from URL params. `maxTurns` = 5 (short) or 10 (deep). Passes `priorities, tone, depth` to `/api/chat`.

### Modified: `app/api/chat/route.ts`

Added `buildContextBlock(priorities, tone, depth)` prepended to system prompt. Accepts `priorities`, `tone`, `depth`, `maxTurns` from request body. Added `tone`, `depth` to Langfuse metadata.

### UX Polish (multiple iterations)

- Prologue rendering: topic chips above prologue → prologue as `text-gray-600` (no italic, no indigo box, no ✦) → question heading. `mb-6` spacing between prologue and question.
- Close step: arrow flipped to `← לתוצאות` (RTL-correct). Redundant "דלג" button removed.
- Advisor gender: explicit "דבר תמיד בלשון זכר" in follow-up prompt after AI switched genders mid-flow.
- Close step copy: "לקבל המלצה מדויקת יותר" (removed "לנתח את הפרופיל שלך" — felt like profiling).

### Commits

```
bbb85d9 ui: darken prologue text, add spacing, fix arrow direction, remove redundant skip button
18b3d4c ui: move topic chips above prologue, restyle prologue as plain italic text
80ec258 fix: back nav shows previous selection; advisor uses male form
cdda53e feat: E — AI prologue, adaptive follow-ups, "אחר — פרט" option
c101c26 fix: landing page copy — remove trust tagline, fix party count claim
73ea4d1 feat: no default selection on landing page
5e0a47f feat: landing page — editorial radio style (Option C)
5ea1160 feat: redesign landing page with advisor persona framing
48201e4 feat: phase 4 — modified prototype D with priorities step + context-aware chat
1ed1598 feat: phase 3 — Prototype E (priorities + structured questions + AI follow-ups)
dd17a6b feat: phase 2 — new landing page with tone/depth selector
6eefc97 feat: phase 1 — shared question sets, PrioritiesStep component, teal accent, bug fixes
```

---

## 2026-06-19 — Round 3 Design: Prototype E + Modified D

### What We Did

Pure design session — no code changes. Processed round 2 user testing feedback, developed the full round 3 design direction, and fully documented it in `docs/SOLUTION-DESIGN.md`.

### Round 2 Feedback Processed

New file: `docs/user-testing/round-2-feedback.md`

- **User 1** (50–60, Android, 11:28 min): Liked new priorities screen. Disliked dilemmas — skip button invisible, felt forced. Ideal flow: priorities → AI conversation. Missed the "see details" screen in results. Translation bug: "לא מגיעה" → "לא מספיקה".
- **User 2** (teenager, iPhone, 18:46 min): Liked terminology hints + AI in results. Rejected AI chat flow (D) — first question too complex, less visual. Preferred flows 1 and 2.
- **Cross-round pattern**: Both users want AI in results, not necessarily in input. User 1 wants AI after priorities. User 2 wants structured entry regardless.

### Round 3 Design Decisions (in `docs/SOLUTION-DESIGN.md`)

**Convergence**: 4 prototypes → 2. A, B, C removed from homepage (routes kept alive).

**Landing page** (new design):
- Tone signal: two mini-cards showing example question fragments (multi-choice format, not open questions). ענייני = policy-focused options. אישי = personal-concern options. User picks by feel, no abstract labels.
- Depth signal: `[ בקצרה ]` / `[ בהרחבה ]` (register-based, not time-based — avoids pressuring users).
- Flow choice: primary CTA → Prototype E; small text link → Prototype D. E is recommended default, D accessible but not equal-weight.

**Prototype E** (new):
- Flow: priorities → opener question (from tone-selected set) → AI follow-up questions as structured tappable cards (not chat bubbles) → optional free text → UnifiedResultsPage.
- Party scores: hardcoded from opener answers (same mechanism as B). Follow-up Q&A feeds AI explanation layer only.
- AI follow-ups: generated at runtime per topic; aim to (a) go deeper on the user's concern and (b) surface distinguishing dimensions between similar-looking parties.
- Depth setting controls: number of follow-ups per topic (1 vs 2) and which topics get follow-ups (top-importance-only vs all).
- Accent color: teal.

**Two question sets** (key design decision — audit-first):
- NOT a clean split: existing B questions are not uniformly אישי. Justice and equality topics already read as civic/ענייני; religion options are policy positions. Headers tend to be אישי, options vary.
- Implementation approach: audit each of 8 topics, assign to dominant register, clean inconsistent options, then write the counterpart. Some existing questions will end up in the ענייני set.
- Both sets independently scored — options differ enough that party mappings differ too.

**Modified Prototype D**:
- Priorities screen added as step 1 (same as B/E). Current welcome screen removed.
- System prompt augmented with user's priorities + tone preference + depth preference.
- Rest unchanged (turn limit, synthesis detection, `/api/results-d`, `UnifiedResultsPage`).

**Bug fixes included in round 3 scope**:
- C skip button records "A" instead of skipping (`prototype-c/page.tsx:169`)
- C skip button visually too small/light
- Translation: "המשכורת לא מגיעה" → "לא מספיקה" (`prototype-b/page.tsx:52`)

**Deferred to production**: tradeoff questions, AI-scored follow-up answers, real party platform grounding.

### Key Design Insight

Taste signals on the landing page are **calibration** (tuning the experience) not **routing** (choosing a flow). Tone and depth preferences apply inside both E and D — they're independent of which path the user takes. Conflating calibration with routing leads to over-simplified binary choices that bundle too many dimensions into one tap.

---

## 2026-06-17 — Unified Results Page + Prototype D Extraction

### What We Did

Designed and implemented a unified results experience across all four prototypes. A/B/C now show a shared `UnifiedResultsPage` with deterministic party scores (unchanged) + an AI personalization layer (profile summary + per-party micro-blurbs). Prototype D gets the same results page via post-conversation extraction: after the AI gives its synthesis, `/api/results-d` analyzes the full transcript and produces structured scores + blurbs, then transitions to `UnifiedResultsPage`.

### Design Decisions (documented in `docs/SOLUTION-DESIGN.md`)

- **Two-job principle**: deterministic = trust anchor (scores, rankings, links); AI = meaning-making (profile summary, "why this party fits you"). Never conflated.
- **Three options considered**: (1) AI micro-blurbs on existing cards, (2) Unified component with both layers, (3) D emits structured output. Chose option 2.
- **Prototype D approach**: post-conversation extraction (Option A) — chat flow unchanged, extraction fires in background, user reads the AI's conversational synthesis first, then clicks "ראה תוצאות מפורטות ←" to see the structured page.
- **Future D direction**: full structured output `{ scores, partyBlurbs, profile, groundings }` — groundings require party platform database (post-prototype).
- **Grounding vision**: per-topic evidence — "Party A says 'quote'" — drives direction rather than gap; show alignment/partial/gap with citation, not a number.

### New Files

- `app/api/results/route.ts` — AI personalization for A/B/C. Receives `answersSummary` + ranked party list, returns `{ profile, partyBlurbs }`.
- `app/api/results-d/route.ts` — Post-conversation extraction for D. Receives full transcript, returns `{ profile, scores, partyBlurbs, groundings: [] }`.
- `components/UnifiedResultsPage.tsx` — Shared results component. Indigo profile summary box (AI, loads async) + party cards (deterministic) with per-card micro-blurbs (AI, top 3 only) + amber prototype caveat banner + methodology disclaimer.

### Modified Files

- `components/PartyResultCard.tsx` — Added `aiBlurb?: string`, `aiLoading?: boolean` props; added `"purple"` accent color.
- `components/UnifiedResultsPage.tsx` — Added `externalAiData / externalAiLoading` props so D can bypass internal `/api/results` call; added `"purple"` accent; added prototype caveat banner.
- `app/prototype-a/page.tsx` — Replaced inline results block with `<UnifiedResultsPage>`; added `buildAnswersSummary()`.
- `app/prototype-b/page.tsx` — Same; `buildAnswersSummary()` formats topic importance buckets + chosen concern text.
- `app/prototype-c/page.tsx` — Same; `buildAnswersSummary()` formats dilemma choices.
- `app/prototype-d/page.tsx` — Added `resultsData / resultsLoading / showResults` state; synthesis detection by party-mention count (≥5 party names = synthesis turn); extraction fires in background; user reads chat synthesis first; button → structured results.

### Bug Fixes

- **Synthesis detection**: `isFinalTurn` only triggered at turn 50 (hard cap), but AI naturally concludes around turn 8–10. Fixed by counting party name mentions in the response — 5+ = synthesis. `isFinalTurn` remains as fallback.
- **Premature transition**: First version set `showResults = true` immediately when synthesis detected, hiding the chat response. Fixed: extraction runs in background, user reads the synthesis in the chat, button appears when results are ready.
- **Negative object keys**: `{ -1: "לא מסכים" }` is invalid JS syntax. Fixed with string keys `{ "-1": "לא מסכים" }`.

### Wording Fix

- "עשוי להיות לא מדויק" → "עלול להיות לא מדויק" in results footer.

### Commits

```
c5905da fix: show synthesis in chat before transitioning to results page
2733998 fix: detect synthesis turn in prototype D by party mention count
c5e4415 feat: unified results page for prototype D via post-conversation extraction
f321c19 fix: add prototype caveat banner + fix "עלול" wording on results page
552e70e feat: unified results page for prototypes A/B/C with AI personalization layer
```

---

## 2026-06-17 — Analytics Debugging, UX Polish, Pre-Round-2 Fixes

### What We Did

Third session of the day. Debugged and improved all three analytics integrations (ContentSquare, Clarity, Hotjar), fixed several UX and copy issues, and completed pre-round-2 preparation (home navigation, confirmation dialogs, text fixes).

### Analytics Stack Overhaul

**ContentSquare — VPV tracking** (`2d7b4c6`):
- Root cause of 0 session replays: ContentSquare doesn't auto-detect SPA route changes.
- Added `components/ContentSquareTracker.tsx` — a client component using `usePathname()` that pushes `["trackPageview", pathname]` to `window._uxa` on every navigation.
- `window._uxa` initialized defensively before each push to handle race condition (component fires before CS script loads; CS drains the queue on load).

**ContentSquare — script moved to `<head>`** (`105beb5`):
- Original placement: `<Script strategy="afterInteractive">` at bottom of `<body>`. CS's own docs say "paste as high as possible in `<head>`".
- Changed to `<script defer src="...">` inside `<head>` in `layout.tsx`. Confirmed via `curl` that it renders as `<script defer="" src="...">` in the actual HTML.
- Sessions started appearing in replay after this fix — but free plan samples only 5% of sessions (next paid tier "Growth" at $591/mo samples 15%; 100% requires "Pro" = call sales). Kept CS for what it is.

**Microsoft Clarity added** (`403d2bf`):
- Added inline init script to `<head>` via `dangerouslySetInnerHTML`. Tag ID: `x8iv051fpw`.
- Recordings appeared immediately. Sessions showed as "live" (expected — moves to "recordings" once tab closes + processing completes).

**Hotjar re-added** (`ac87389`):
- ContentSquare free tier too limited for reliable replay data. Hotjar re-added alongside Clarity and CS.
- Tag ID: `6732665`. Same inline pattern in `<head>`. Hotjar confirmed "recordings on the way".

**Vercel Analytics**:
- Had 0 records. Root cause: `live: false` in project config (no custom domain). Resolved via Vercel dashboard toggle. Not a code change.

**npm audit fix --force incident**:
- `npm audit fix --force` downgraded `@vercel/analytics` v2→v1.1.4. v1 lacks the `/next` subpath export used in `layout.tsx`, breaking the build. The underlying vulnerability (postcss in Next.js internals) has no viable fix (npm's "fix" would downgrade Next.js to 9.3.3). Reverted the downgrade; accepted the known limitation.

### UX Fixes

**Question counter direction** (`4104f04`):
- RTL page direction was rendering "1 / 6" as "6 / 1" in prototypes A, B, C.
- Fixed with `dir="ltr"` on each counter `<span>`. Works correctly for both RTL and future LTR language support.

**Home button with confirmation** (`4285770`, `510905e`):
- Added "← חזרה לדף הבית" at the bottom of results screens in prototypes A, B, C.
- Inline confirmation pattern: click → shows "התשובות והתוצאות יאבדו — בטוח | ביטול".
- Prototype D chat header: same pattern but rendered inline in the compact header. Pre-start screen kept as plain Link (no data to lose).
- Prototype B: `useRouter` added (wasn't imported).

**Prototype B — min topics emphasis** (`510905e`):
- "לפחות 3 נושאים" instruction was `text-xs text-gray-400` — easy to miss (round-1 feedback).
- Changed to `text-sm text-gray-600` with `<strong>לפחות {MIN_IMPORTANT} נושאים</strong>`.

### Copy Fixes

- `904bb32` — AI prompt option 4: "אחר — ספר לי בחופשיות" → "משהו אחר — במילים שלך" (gender-neutral, more natural)
- `4285770` — ישר! platform label: "משימות (לא מצע)" → "יעדים (לא מצע)" ("missions" was a literal translation of the URL slug; "יעדים" is natural political Hebrew for "goals")
- `59c8fbe` — confirmation warning: "התוצאות לא ישמרו" → "התשובות והתוצאות יאבדו" (more accurate — results are never saved)
- `59c8fbe` — disclaimer text: `text-gray-300` → `text-gray-500` (was nearly invisible)
- `854a1f1` — typo: "הציונות מבוסס" → "הציון מבוסס" ("Zionism" vs "the score") across A, B, C
- `66893e6` — Democrats: added constitution link (`democrats.org.il/.../constitution_240725.pdf`) labeled "חוקה (לא מצע)", parallel to ישר!'s "יעדים (לא מצע)"

### Commits

```
510905e feat: add home confirmation to chat header + emphasize min topics in prototype-b
ac87389 feat: add Hotjar tracking tag to <head>
66893e6 feat: add Democrats constitution link to results (labeled "חוקה (לא מצע)")
403d2bf feat: add Microsoft Clarity tracking tag to <head>
854a1f1 fix: correct typo "הציונות" → "הציון" in scoring disclaimer
59c8fbe fix: improve home confirmation text and disclaimer color
4285770 feat: add home button with confirmation to results screens + fix party label
105beb5 fix: move ContentSquare tag to <head> with defer per CS instructions
904bb32 fix: replace forced "ספר לי בחופשיות" with gender-neutral "במילים שלך"
4104f04 fix: force LTR direction on question counter spans
2d7b4c6 feat: add ContentSquare virtual page view tracking for SPA navigation
```

---

## 2026-06-17 — AI Chat Flow Fixes, Back Navigation, Text Quality, ContentSquare

### What We Did

Second wave of fixes after user testing. Addressed structural bugs in the AI conversation flow, broken back navigation across all fixed-option prototypes, and miscellaneous copy errors.

### Tracking: Hotjar → ContentSquare (`b1457be`)

- Removed Hotjar inline script (`HOTJAR_SITE_ID = 6507347`) from `app/layout.tsx`
- Replaced with ContentSquare: `<Script src="https://t.contentsquare.net/uxa/fe934643ecf38.js" strategy="afterInteractive" />`
- Hotjar was acquired by ContentSquare; this is the migration path

### AI Chat Flow Overhaul (`b1457be`)

**Problem 1 — Wasted kickoff turn**: The static INTRO_MESSAGE ended with "מוכן? כתוב כל דבר כדי להתחיל", forcing the user to type anything to start. That first message burned 1 of 8 `MAX_TURNS` just for kickoff, leaving only 6 real topic turns + 1 synthesis.

**Fix — Auto-start**: A `useEffect` (gated by `autoStartedRef` to prevent React StrictMode double-invoke) fires when the user enters the chat. It calls the API with a hidden `{ role: "user", content: "התחל" }` message not shown in the UI. The AI responds with the first question, which appears after the INTRO_MESSAGE prefix. All 8 `MAX_TURNS` are now real user turns.

**Problem 2 — isNearLimit off by one**: The "עוד תשובה אחת — ואז אסכם" banner appeared at `userTurnCount === MAX_TURNS - 2 = 6`, but synthesis only triggered at turn 8. The banner fired 2 turns early, creating the UX sequence: banner → another question → "שאלה אחרונה" placeholder → another question → synthesis.

**Fix**: Changed `isNearLimit = userTurnCount === MAX_TURNS - 1`. Banner and "שאלה אחרונה" placeholder now both fire at turn 7, and turn 8 is the actual final turn. One warning, one final turn.

**Restored INTRO_MESSAGE**: Static prefix displayed instantly on chat open (no loading delay). Text trimmed — removed "מוכן? כתוב כל דבר כדי להתחיל". API never receives this message (`conversationHistory = messages.slice(1)`).

### MAX_TURNS Raised 8 → 50 (`b1457be`)

- **Rationale**: Flash-lite cost is ~$0.002/conversation; bottleneck is API requests/day (free tier: 1,500), not tokens. 8 turns left only 6 meaningful topic exchanges. 50 is a generous safety net.
- **AI natural ending**: System prompt says "אחרי כ-8-10 נושאים, סכם" — the AI concludes around turn 10–15 naturally. 50 is abuse protection, not a UX boundary.
- **Implication**: `isNearLimit` and `isAtLimit` banners now only appear in extreme edge cases (turn 49), not during normal use.
- **Decision against progress bar**: Since most conversations end well before 50 turns (AI decides naturally), a turn-count progress bar would show "3/50" when the AI wraps up — meaningless and misleading. A topic tracker would be better UX but requires structured AI output.

### System Prompt Improvements (`e029847`)

- **No duplicate greeting**: System prompt previously said "התחל בברכה קצרה" — but INTRO_MESSAGE already greeted the user, causing two "שלום!" messages. Changed to "פתח ישירות בשאלה הראשונה...ללא ברכה נוספת".
- **Follow-up cap**: Added "אל תשאל יותר מ-2 שאלות על אותו נושא" to prevent the AI from spending 3–4 turns on one topic and never reaching others.
- **Numbered options**: When the AI presents answer options, it now formats them as a numbered list (1., 2., 3.) with "4. אחר — ספר לי בחופשיות" appended. User still answers with free text.

### Back Navigation Fixed — Prototype A and C (`e029847`)

**Problem**: In prototype-a (הצהרות) and prototype-c (דילמות), the "← חזרה" button was a `<Link href="/">` that always went to the landing page. Users had no way to reconsider a previous answer.

**Fix — Prototype A**:
- Added `goBack()` function: removes the answer for the most recently answered statement (`answers[STATEMENTS[current - 1].id]`) using `setAnswers((prev) => { delete copy[id]; return copy; })`.
- From Q1: `router.push("/")` — goes to landing page.
- From results screen: `setDone(false)` + removes last answer (goes back to Q6, not the intermediate "ענית על כל השאלות" screen).
- Replaced `Link` import with `useRouter` (no other Link usage in this component).

**Fix — Prototype C**: Same pattern. `answered = Object.keys(answers).length` tracks position; back removes `DILEMMAS[answered - 1].id`.

**Prototype B**: Back navigation was already correct (`handleBack` function with proper question-step logic). No change needed.

### Text Quality Fixes (`e029847`)

- **Prototype B economy option**: "פערים — הבוגרים מתעשרים, הפועלים נסגרים" was nonsensical ("הפועלים נסגרים" has no meaning in this context). Fixed to: "פערים — בעלי הון מתעשרים, השכירים נשארים מאחור".
- **Prototype C housing dilemma**: "בנות עשרות אלפי דירות" → "לבנות עשרות אלפי דירות" (infinitive verb missing "ל" prefix).

### Commits

```
e029847 fix: back navigation, text fixes, AI prompt improvements
b1457be feat: replace Hotjar with ContentSquare, fix AI chat flow, raise turn limit
```

---

## 2026-06-16–17 — User Testing Round 1: Feedback Captured + UX Fixes + Analytics

### What We Did

After testing with 2 users on build `e48ca79`, captured structured feedback and shipped all critical fixes before round 2. Also added analytics and LLM observability.

### User Testing Round 1 Findings

Feedback captured in `docs/user-testing/round-1-feedback.md`. Key issues:
- **Prototype D**: Raw Gemini API error JSON shown to users when quota exhausted (worst possible UX)
- **Prototype D**: Free tier quota (`gemini-3.5-flash` RPD=20) exhausted by 2 users in a single day
- **Prototype B**: "Select at least 3 topics" read as "exactly 3" — users stopped early
- **Prototypes A, C**: Teen user (age 16–18) didn't understand terms like "כלכלת שוק", "מדינת רווחה"
- **Prototype B**: Strict rank-ordering of priorities was cognitively demanding and imprecise

### UX Fixes (`7efabc0`)

**Prototype D — Friendly error messages**: `route.ts` now returns structured error codes (`QUOTA_EXCEEDED`, `AUTH_ERROR`, `SERVER_ERROR`, `NETWORK_ERROR`). Frontend maps codes to friendly Hebrew strings. Previous behavior: raw Gemini SDK error JSON exposed to users.

**Prototype D — Turn limit + auto-synthesis**: `MAX_TURNS = 8`. On turn 8, `isFinalTurn: true` is passed to the API, which appends `SYNTHESIS_INSTRUCTION` to the system prompt, forcing party ranking output. User always reaches results; usage is capped at ≤9 API calls/session.

**Prototype B — Topic selection clarity**: Subtitle updated to explain "ככל שתבחרי יותר נושאים, כך התוצאה תהיה מדויקת יותר". Live counter below grid: "בחרת N נושאים — ניתן לבחור עוד". Button disabled with reason text until ≥3 selected.

**Prototype B — Priority buckets**: Replaced strict rank-ordering with importance-level buckets. Each topic gets a row of 4 buttons: קריטי (4) / חשוב מאוד (3) / חשוב (2) / פחות חשוב (1). Matching weights are the bucket values. Gate: ≥3 topics at bucket ≥2.

**Prototypes A, C — Term hints** (`components/TermHint.tsx`): Expandable `?` button inline next to unfamiliar terms. Tap reveals one-line Hebrew definition; tap again to close. Added to: שתי מדינות, נישואין אזרחיים, עצמאות משפט (Prototype A); שוק חופשי, ממשל בינלאומי (Prototype C).

**Footer**: `text-gray-300` → `text-gray-500` for improved readability.

### Analytics (`422b079`)

- **Vercel Analytics**: `@vercel/analytics/next` — `<Analytics />` in `app/layout.tsx`
- **Hotjar**: Site ID `6507347` (same account as cv-refinery). Added via `next/script` with `strategy="afterInteractive"`
- Initially implemented Helicone for LLM tracking; discovered new signups closed at us.helicone.ai → removed

### Env File Cleanup (`2104444`)

- Deleted `.env` — contained cv-refinery credentials (wrong project, should not exist)
- `.env.example` — documentation file, committed, describes all env vars
- `.env.local` — real keys, gitignored

### Gemini Model Switch (`8727c6d`)

- **Problem**: `gemini-3.5-flash` has RPD=20 on free tier — exhausted by 2 users testing in one afternoon (confirmed via Google AI Studio dashboard: 89 calls June 15)
- **Fix**: Switched to `gemini-3.1-flash-lite` — RPD=500, RPM=10 (25× more headroom)
- **Tradeoff**: Slightly older model; quality difference not significant for structured political Q&A
- **Revisit**: If RPD=500 is exhausted by wider distribution, evaluate paid tier

### Langfuse LLM Observability (`f5d901f`, `3ec0623`)

- Package: `langfuse` npm (direct SDK, not OTel — simpler for Next.js serverless API routes)
- Tracks each conversation turn: sessionId (via `crypto.randomUUID()` in client), turn number, isFinalTurn flag, model, input messages, output text
- Pattern: `langfuse.trace() → trace.generation() → generation.update() → generation.end() → langfuse.flushAsync()` — `flushAsync` is critical for serverless (process exits before background flush completes)
- Keys stored in `.env.local` and Vercel environment variables; gracefully bypassed if keys absent
- Langfuse agent skill installed via `npx skills add` from github.com/langfuse/skills

### Commits

```
3ec0623 feat: add Langfuse agent skill + Langfuse API keys configured
f5d901f feat: replace Helicone with Langfuse for LLM conversation tracking
8727c6d fix: switch AI model from gemini-3.5-flash to gemini-3.1-flash-lite
2104444 chore: clean up env files
422b079 feat: analytics — Vercel Analytics, Hotjar, Helicone LLM tracking
7efabc0 fix: round-1 UX fixes — error handling, turn limit, priority buckets, term hints
```

---

## 2026-06-14–16 — UX Prototypes Built, Deployed, and Sent for User Testing

### What We Built

Four interactive Hebrew RTL prototypes deployed to https://election-assistant-snowy.vercel.app:

| | Prototype | Model |
|--|--|--|
| א | הצהרות | 6 agree/disagree statements, 5-point scale |
| ב | עדיפויות | Click-to-rank topics → value/concern question per topic |
| ג | דילמות | 6 concrete policy trade-off scenarios |
| ד | שיחה | AI conversation (Gemini gemini-3.5-flash) |

All prototypes use real 2026 Israeli parties, show a methodology disclaimer, and render a build ID badge for feedback traceability.

### Real 2026 Party List (corrected by advisor)

Source of truth: `lib/parties.ts`. Ordered left→right spectrum:

| ID | Name | Note |
|--|--|--|
| hadash | חד"ש-תע"ל | |
| democrats | הדמוקרטים | Formerly העבודה |
| beyahad | ביחד | Formerly יש עתיד + Bennett; subtitle בנט/לפיד |
| yashar | ישר! | New party; subtitle איזנקוט; links to missions page, not formal מצע |
| beitenu | ישראל ביתנו | |
| likud | ליכוד | |
| shas | ש"ס | |

Removed: המחנה הממלכתי (dissolved).

**Party scoring**: manual estimates based on known public positions — **not verified against current party platforms**. Results pages show methodology disclaimer. New parties (ביחד, ישר!) especially need expert review.

### מצע (Platform) Transparency

Every party result card shows:
- "אתר המפלגה ↗" link (or "אתר לא ידוע" if missing)
- `platformUrl` present → clickable link with `platformLabel` (or "מצע רשמי")
- `platformUrl` absent → "אין מצע מפורסם" in red

Currently, only ישר! has a link (`yasharwitheisenkot.com/topic/missions/`) labeled "משימות (לא מצע)" — honest about it not being a formal platform.

### Gemini Integration (Prototype D)

- Package: `@google/genai` v2.8.0 (replaced deprecated `@google/generative-ai`)
- Model: `gemini-3.5-flash` (current Google model; explicitly required by user)
- `maxOutputTokens: 2000` — was 600, was truncating responses mid-sentence
- System prompt includes structured rubric with all 7 parties; requires per-party explanation tied to what user said in chat

### Build ID / Version Badge

- `next.config.ts` resolves git SHA at build time (`VERCEL_GIT_COMMIT_SHA?.slice(0,7)` || `git rev-parse --short HEAD`)
- Injected as `BUILD_ID` env var; rendered in `app/layout.tsx` as fixed badge bottom-right
- `text-gray-500` for visibility without distraction
- Required because collecting user feedback via screenshots — needed version traceability

### Key UX Decisions (Prototype B)

Questions are value/concern framing, not policy prescriptions: "מה הכי מדאיג אותך ב[נושא]?" rather than "what policy do you prefer?". Min 3 topics, no max cap. Skip and back buttons both work correctly. Back from first question → ranking step; skip on last question → results.

### Files Created/Changed

- `app/layout.tsx` — RTL layout, Rubik font, build ID badge
- `app/page.tsx` — landing page; "שאלון קלאסי" (not "Quiz"); 4 prototype cards
- `app/prototype-a/page.tsx` — statements quiz; PARTY_POSITIONS 7×6
- `app/prototype-b/page.tsx` — priority-first; click-to-rank + per-topic questions
- `app/prototype-c/page.tsx` — dilemmas; PARTY_LEANINGS 6×7
- `app/prototype-d/page.tsx` — AI conversation; static intro + real Gemini chat
- `app/api/chat/route.ts` — server-side Gemini API route
- `lib/parties.ts` — shared party metadata (single source of truth)
- `components/PartyResultCard.tsx` — shared result card with מצע logic
- `next.config.ts` — BUILD_ID injection
- `vercel.json` — `{"framework":"nextjs"}` (Vercel couldn't auto-detect framework)
- `.gitignore` — `.env.local` excluded; API keys never committed

### Technical Fixes Applied

- Migrated Gemini SDK (`@google/generative-ai` → `@google/genai` v2.8.0)
- Deployed Next.js 16 (security fix; 15.3.3 was blocked)
- "פריה" (accidental Hebrew for "her fruit") → "בדידות דיפלומטית"
- "Quiz" → "שאלון"; "פלטפורמה" → "מצע" throughout
- Version badge: fixed 3 times (invisible → wrong env var → build-time injection)
- Added `vercel.json` when Vercel couldn't auto-detect Next.js

---

## 2026-06-14 — Solution Design + Prototyping Approach

### Decisions Made

**Prototyping strategy**: Build 4 clickable UX prototypes before committing to a technical approach. Show to real users (voters) and the advisor for feedback. Prototypes vary on *how questions are asked* — the highest-leverage UX decision.

**4 prototypes defined** (see `docs/SOLUTION-DESIGN.md` for full rationale):
- **A — הצהרות (Statements)**: Classic agree/disagree binary quiz, 25–30 questions, linear flow. Wahl-O-Mat model.
- **B — עדיפויות (Priority-First)**: User weights 8–10 topic areas first, then answers deeper questions on their top priorities only.
- **C — דילמות (Dilemmas)**: Concrete trade-off scenarios instead of abstract ideological statements.
- **D — שיחה (Conversation)**: AI-guided structured dialogue; structured rubric underneath, conversational surface on top.

**Tech stack decided**:
- Framework: Next.js (React), scaffolded in this repo
- Hosting: Vercel (already connected to GitHub; auto-deploys on push)
- AI (prototype D): Google Gemini free tier (`gemini-2.0-flash` via `@google/generative-ai`)
- Language: Hebrew from the start; RTL layout

**Rejected approaches** (with rationale in `docs/SOLUTION-DESIGN.md`):
- Lovable: Free tier too limited for 4 prototypes; vendor lock-in; poor RTL support
- Claude.ai "skill"/Project: Requires Claude accounts (barrier for general public); no reproducible results; opaque to users

**Gemini API key**: stored in `.env.local` (gitignored) for local dev; Vercel environment variable for deployment. Pattern follows cv-refinery project.

### Infrastructure
- `.gitignore` updated for Node.js / Next.js artifacts
- `docs/SOLUTION-DESIGN.md` created

---

## 2026-03-28 — Project Kickoff + Competitive Research

### Project Setup
- Created `README.md` (public-facing), `README.txt` (superseded, to delete), `REQUIREMENTS.md`, `TODO.md`, `LICENSE` (MIT), `.gitignore`
- Initialized git repo with `main` branch; created private GitHub repo at https://github.com/EfriNS/election-assistant
- `Screenshots/` excluded from repo (internal reference material)
- `CLAUDE.md` and `docs/` excluded from initial commit (internal Claude Code scaffolding)

### Requirements Captured (`REQUIREMENTS.md`)
Key decisions documented:
- **Goal**: Free public tool matching Israeli voters to parties by values; Hebrew-first, multilingual
- **Audience**: General public, wide distribution
- **Data**: Official party platforms only; verbatim quotations with source URL + date; no social media
- **Parties**: All parties; explicit "no platform available" for those without one
- **Curation**: Semi-automatic ingestion + human (advisor) review
- **Cost cap**: ~$50/month
- **Interaction model**: Hybrid — structured quiz engine + AI explanation layer (not freeform chatbot)
- **Open questions** explicitly preserved (technical approach, question design, pipeline design, cost model)

### Competitive Research (`docs/COMPETITIVE-RESEARCH.md`)
**Israeli landscape:**
- No active VAA exists for Israel; the only one ever built (JPost/IDI, 2009) is dead
- Proven demand: 600K users in a single election with no marketing infrastructure
- Other Israeli tools (HaMadad, Kaplan map, Elector) are not party-matching tools

**International tools analyzed:**
- Wahl-O-Mat (Germany): binary quiz, 38q, parties self-report, ~26.5M uses/election; most trusted globally
- Vote Compass (Vox Pop Labs): 6-point slider, 30–40q, 2D compass visualization, media partnerships
- ISideWith (US/global): 70–100q with nuance follow-ups, editorial party data, best mobile UX
- Kieskompas (Netherlands): 30q, expert-calibrated 2D placement, strongest academic methodology
- Smartvote (Switzerland): 75q, individual candidate matching, self-reported data

**Academic research findings:**
- VAAs increase turnout 8–22%; shift vote preferences 1–10%
- Optimal question count: 30–35 (completion drops sharply above 40–50)
- Importance weighting improves match quality but only 20–30% use it when optional → make it mandatory
- Framing bias, populist inflation, and algorithmic opacity are the top design pitfalls
- Users specifically distrust chatbot-style VAAs on political topics

**Gap analysis — our differentiators:**
- Verbatim quotations from official platforms: 0 out of all major tools do this
- Coalition modeling (which coalition scenario do I enable?): 0 out of all major tools do this; globally unique; highly relevant to Israel
- Hebrew-first multilingual (Hebrew + Arabic + Russian + English)
- Active Israeli VAA: first in 12+ years
- Israel needs 3–4 political axes (security, religion/state, socioeconomic, Arab-Jewish) — standard 2D model is inadequate

### Interaction Model Defined (`REQUIREMENTS.md`)
Documented the hybrid model rationale:
- Structured quiz = engine (deterministic, auditable, consistent)
- AI = explanation + adaptation layer (follow-up depth, result narrative, quotation surfacing, tone)
- Freeform chatbot as primary interface explicitly ruled out (inconsistency, opacity, hallucination risk, trust research)
