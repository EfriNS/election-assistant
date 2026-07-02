# VAA Design & Domain Knowledge

**Purpose**: Key findings about Voting Advice Applications (VAAs) that inform design and implementation decisions for the election assistant.

---

## Israeli Context

1. **No active Israeli VAA since 2009** — The JPost/IDI compass (2009) got 600K users with no marketing. The market has been empty for 12+ years. No competition; proven demand.

2. **Israel needs 3–4 political axes** — Standard 2D (economic × social) is insufficient. Israeli political space has: security/peace, religion/state, socioeconomic, Arab-Jewish identity. A 2D model systematically misrepresents.

3. **Coalition modeling is globally untapped** — No VAA anywhere models "which coalition scenario do I enable?" This is uniquely relevant to Israel's coalition system and is a genuine world-first differentiator.

4. **Arabic is not optional** — ~20% of Israeli voters are Arabic-speaking. Hebrew + Arabic from day one, not as an afterthought. Russian is a third major language (~15–20% of population).

5. **Rapidly shifting party positions** — Israeli parties frequently reverse positions. Every data point must carry a date. Rebuild per election (Wahl-O-Mat model) rather than maintaining a persistent database.

---

## Optimal Design Parameters (Research-Validated)

6. **30–35 questions is the sweet spot** — Completion rates fall sharply above 40–50. Better 30 excellent questions than 60 mediocre ones.

7. **Make importance weighting mandatory or prominent** — Only 20–30% of users use it when it's optional, but it significantly improves match quality. Build it into the flow, not as a post-quiz option.

8. **Show party justifications, not just positions** — Verbatim justification texts (Wahl-O-Mat model) are the feature most correlated with increased political knowledge. This is our exact-quotation requirement — academically validated.

9. **Don't show party logos/identities during answering** — Showing party labels while users answer causes anchoring (they choose what aligns with their existing preference, not their actual view). Reveal after answering.

10. **Concrete policy questions outperform abstract values** — "The minimum wage should be raised to X" outperforms "Freedom vs. equality — which matters more?" Ask about specific policies.

---

## Trust and Framing Principles

11. **Freeform chatbot = wrong primary interface for political tools** — Research specifically shows users distrust chatbot-style VAAs on political topics. Hybrid model: structured quiz as engine (auditable, consistent), AI as explanation layer (adaptive, human).

12. **Algorithmic opacity kills trust** — Publish the matching algorithm. Users must understand why they got their result. Black boxes are immediately suspected of political bias.

13. **Verbatim quotations are a trust third-path** — More verifiable than Wahl-O-Mat (parties write their own summaries) and more trustworthy than ISideWith (editorial coding). Citing directly from official platform text is the most defensible approach.

14. **Populist/fringe party inflation** — Binary and clear-position formats reward parties that take unambiguous stances on everything. Populist parties artificially score high. Consider nuanced answer options (ISideWith model) or how to represent policy complexity.

15. **Question framing bias is real** — Even section headers ("left-wing" / "right-wing") shift user responses. All questions must be tested for neutrality from both directions.

---

## What Not to Build

16. **Don't build a 2D political compass for Israel** — The standard Vote Compass / Kieskompas 2D model maps poorly to Israeli political reality. Don't use it as the primary results visualization.

17. **Don't use expert-coded party positions** — In Israel's contentious media environment, parties will dispute researcher-assigned positions. Use primary-source verbatim quotations instead.

18. **Don't use 100+ questions** — ISideWith's large question set has high drop-off. Israel's diverse electorate (age, language, tech comfort) makes completion rate a critical design constraint.

---

## AI Conversation Design (Prototype D Learnings)

19. **Auto-start removes a wasted "kickoff" turn** — If the chat opens with "type anything to start", the user's first message burns an API call on a non-substantive exchange. Better: fire the API call automatically on chat entry (hidden from state), let the AI open with the first real question. All turn budget is then for real content. Implementation: `useEffect` gated by a `useRef` flag to prevent React StrictMode double-invoke.

20. **isNearLimit warning must fire exactly 1 turn before the event** — An off-by-one (warning at turn N-2 instead of N-1) creates a confusing UX: the user sees "one more question" but the AI asks two more before synthesizing. Trace: isNearLimit uses `messages` state (post-response), isFinalTurn uses `conversationHistory` (pre-submit). Keep both thresholds at `MAX_TURNS - 1` so they refer to the same turn.

21. **Turn limit is a cost proxy, not a UX boundary — set it generously** — The real cost driver for Gemini Flash-lite is API requests/day (free tier: 1,500/day), not tokens. Cost per conversation is ~$0.002 on paid tier. A tight turn limit (8) was leaving only 6 meaningful topic turns; 50 lets the AI conclude naturally (around turn 10–15 per system prompt) with the hard limit as abuse protection only. Progress bars showing "3/50" when the AI wraps up at turn 13 would be misleading — don't add them unless tracking topic coverage (not turn count).

22. **System prompt double-greeting when combining static prefix + AI first turn** — A static intro card (shown instantly, no API latency) + an AI-generated first message creates duplicate greetings if the prompt says "start with a greeting". Fix: instruct the AI to skip the greeting ("המשתמש כבר ראה הסבר...פתח ישירות בשאלה") and trim the "כתוב כל דבר להתחיל" from the static intro.

23. **Format AI-presented options as numbered list with free-text escape** — When the AI lists answer options as a prose paragraph, users don't know if they must choose one. Better: instruct the AI to present options as numbered lines (1., 2., 3.) with a final "4. אחר — ספר לי בחופשיות". Keep the answer field as free text — users can pick a number or write anything.

24. **Conversational tangents (e.g., rhymes) don't harm the assessment** — A user asked "תוכל לשאול אותי את זה בחרוזים?" and the AI answered in rhyme. The subsequent political assessment was unaffected. Allowing personality/humor in the AI exchange increases engagement with no meaningful cost to result quality. Don't suppress this — it makes the tool feel human.

25. **Per-topic follow-up cap prevents topic starvation** — Without a cap, the AI may ask 3–4 follow-ups on security and never reach housing or health. System prompt should say "אל תשאל יותר מ-2 שאלות על אותו נושא לפני שתמשיך הלאה". This ensures breadth across 8 topics within a ~12-turn conversation.

---

## Unified Results Design (Implemented 2026-06-17)

26. **Two-job principle for hybrid AI/deterministic results** — Deterministic computation = trust anchor (percentages, rankings, external links — users can compare notes). AI = meaning-making (profile summary, "why this party fits *you* specifically"). Never conflate. If the AI generates scores, they're non-auditable; if the matrix generates scores, they're explainable. For the prototype, matrix scores + AI explanation is the right split even though the matrix positions are rough estimates. (#first:2026-06-17)

27. **Grounding means showing direction + quote, not a contribution number** — "Party A says 'X', which contributed 8 points to your score" is confusing. "ביחד: ✅ התאמה — 'נחוקק נישואין אזרחיים'" is actionable. Users want to judge whether the match is meaningful, not verify a formula. Show evidence; let the user decide the weight. Display: alignment (✅) / partial (⚠️) / gap (❌) + verbatim quote + source. This is also the most legally defensible format (directly attributable to party). (#first:2026-06-17)

28. **The `groundings: []` skeleton field buys forward-compatibility for free** — Adding the field to the API response now (as an empty array) means the `UnifiedResultsPage` component doesn't need to change when the party platform database is ready. The UI can check `groundings.length > 0` to conditionally render the evidence panel. Cost: zero. Value: no refactoring needed when real data arrives. (#first:2026-06-17)

29. **Prototype D results page: unified layout, AI-generated scores are acceptable at prototype stage** — The matrix in A/B/C is also expert-assigned estimates, not verified platform text. AI scores from a full conversation transcript are not inherently less reliable than a matrix row set by hand. At prototype stage the distinction matters less than the UX pattern being testable. Label the methodology clearly ("מבוסס על ניתוח השיחה") — but don't withhold the results page from D users because scores aren't "deterministic". (#first:2026-06-17)

## Round 3 UX Design Learnings (2026-06-19)

30. **Taste signals = calibration, not routing** — The instinct is to use landing-page preference signals to route users into different flows (E or D). Wrong mental model. Tone and depth preferences are *calibration* — they tune how the experience runs, independent of which flow the user is in. Conflating calibration with routing produces a single binary choice that bundles too many dimensions (depth + tone + format) into one tap. Separate them: routing (E vs D) is one decision; tone (ענייני/אישי) is another; depth (בקצרה/בהרחבה) is a third. (#first:2026-06-19)

31. **Audit existing content before assuming register** — The existing B question set was assumed to be uniformly "personal/אישי". Wrong. Justice and equality topic options are already civic/ענייני; religion options describe policy positions. Headers tend personal, options vary. Any time a design calls for "two versions of existing content", audit first to classify what you actually have — don't assume the existing set belongs entirely to one category and build the other from scratch. (#first:2026-06-19)

32. **Show actual question format in landing-page preference signals** — When asking users to choose between formal vs. personal question styles, show example question *fragments in the actual format they'll encounter* (multi-choice cards, not open questions). Abstract labels ("ישיר" / "שיחותי") require users to know themselves; a concrete fragment lets them react. The preview doubles as the label. Corollary: update the landing page example cards whenever the question content changes. (#first:2026-06-19)

33. **Avoid time-based framing for depth signals** — "~5 minutes" vs "~15 minutes" pressures users and misrepresents what depth means (it's about question complexity/count, not how fast someone reads/types). Register-based framing ("בקצרה" / "בהרחבה") sets expectation about scope without implying speed. This matters especially for an audience that includes slower/more deliberate readers. (#first:2026-06-19)

34. **User feedback often encodes multiple independent UX dimensions — don't bundle them** — When a user says "I want it to feel personal and also to go deep", they're expressing two separate preferences: tone and depth. If you collapse these into a single binary choice ("fast/light" vs "deep/personal"), you exclude the valid combinations (deep+formal, light+personal). Before designing a preference selector, list the dimensions explicitly and decide which can be decoupled. (#first:2026-06-19)

35. **Priorities-first is a strong anchor — don't skip it even for the "chat" path** — Both round 1 and round 2 users gravitated toward the priorities screen. Prototype D (current) bypasses it, going directly to free chat. For round 3, priorities is step 1 for everyone, including D. The priorities screen provides structural grounding that makes the subsequent AI conversation feel purposeful rather than open-ended. The AI should receive priorities as context so it doesn't have to rediscover them through conversation. (#first:2026-06-19)

---

## Prototype E UX Learnings (2026-06-19 — Implementation)

36. **Advisor persona framing solves the "what am I choosing?" problem** — Earlier landing page designs showed tone cards with bullet options that looked like the quiz had already started, or used abstract labels ("ישיר" / "שיחותי") that required self-knowledge. Reframing as "מי אני כיועץ שלכם?" (ענייני/זורם) made the selection click for users because they were choosing a personality, not an abstract concept. Key insight: the selector should describe the *advisor*, not the *user's self-classification*. (#first:2026-06-19)

37. **"Trust" micro-copy can backfire** — "ניטרלי · שקוף · ללא הרשמה" was intended to reassure users about privacy and bias. The user called it "too sleezy" — it read as marketing copy on a site that was supposed to be neutral. Don't protest too much. If the tool is neutral, the experience should demonstrate it; explaining it is counterproductive. (#first:2026-06-19)

38. **No defaults on preference selectors reduces anchor bias** — Starting with one option pre-selected caused users to stick with it without reading the alternative. No-default forces engagement with both options. The cost (slightly higher friction) is worth it for a tool where preference calibration directly affects the quality of the match. (#first:2026-06-19)

39. **AI prologue should be typographically integrated, not boxed** — When an AI-generated transition sentence appears in a distinct colored card (indigo box, ✦ bullet), it breaks the question flow — it feels like a modal interruption rather than a natural bridge. The prologue is a transitional sentence: it should render in the same column, in lighter text (`text-gray-600`), without background, border, or special bullet. Users read it as context, not as an AI "widget". (#first:2026-06-19)

40. **Topic chips as anchors belong before the contextual transition** — Rendering the topic label (e.g., "חשוב מאוד · דיור ועלות מחיה") after the prologue loses its orienting function — the user reads the AI's transition sentence without knowing what topic is coming. Chips first → prologue second → question third. The chip announces where we're going; the prologue bridges how we got there; the question is the payload. (#first:2026-06-19)

41. **In RTL Hebrew UI, arrow direction must match reading direction** — "לתוצאות →" points right (screen-right), which is *away from* the next step in a right-to-left reading context. RTL forward motion uses ← (screen-left). Always use `← [action]` for "proceed" and `→ [back]` for "go back" in Hebrew UIs. Opposite of English convention. (#first:2026-06-19)

42. **Redundant CTAs dilute trust — one clear action is enough** — The close step had both "לתוצאות ←" (primary) and "דלג — עבור לתוצאות" (secondary skip). Both did the same thing. Two buttons for the same action signals confusion about what the first button does. Remove the secondary; if the user doesn't want to write anything, the primary CTA covers them. (#first:2026-06-19)

43. **AI gender consistency requires explicit prompt instruction** — Without a gender constraint, Hebrew AI output switches between male and female verb forms (מבין/מבינה) across turns. The model defaults to whichever form "feels right" in context. Solution: add "דבר תמיד בלשון זכר (מבין, מסכים, שואל וכו׳)" explicitly to the system/generation prompt. This is a Hebrew-specific requirement — most AI prompt guides don't cover it. (#first:2026-06-19)

44. **"אחר — פרט" free text is a valid data point that MUST be scored, not silently zeroed** — Earlier framing: "don't try to score free text." Revised: free text answers (whether from opener "other" or follow-up answers) express the user's actual position and must be scored. The mechanism is AI-assisted scoring (not a lookup), but the obligation is the same. Silently contributing 0 to the topic score when a user writes thoughtful free text is a trust failure: they gave input, the algorithm ignored it. The right fix is not to avoid free-text inputs — it's to route them through AI scoring. (#first:2026-06-19 #revised:2026-06-22)

45. **Unified API call per answer produces more coherent conversation than split calls** — Pre-computing a follow-up immediately after the opener answer (before the user even sees it) creates a "cold" follow-up with no prologue and stale context. Generating follow-up AND prologue together in one call after each answer — with the full conversation history + next topic's actual question text — produces noticeably better bridging. Latency is acceptable because users expect a brief pause after submitting an answer. (#first:2026-06-19)

46. **Follow-up questions need two explicit context cues: a label AND an answer recap** — A topic chip alone doesn't communicate "you're still on topic N, going deeper." Users need: (a) an explicit `↳ שאלת המשך` label marking the question as a follow-up, and (b) a visual recap of their opener answer ("ענית: ...") so the connection to what they said is immediate. Without these, users experience follow-ups as mysterious new questions. (#first:2026-06-19)

47. **LLM will bake bridging language into question field unless explicitly forbidden** — Even with a "write a prologue" instruction, the model tends to prefix questions with contextualizing phrases ("כדי להעמיק בגישה זו, כיצד...") unless the prompt explicitly says: "do NOT start the question with phrases like X — those belong in prologue only." State the prohibition and give concrete examples of the forbidden pattern. (#first:2026-06-19)

48. **Back navigation in a branching conversation must be a stack, not a topic jump** — Pressing back from topic N+1 should restore the last follow-up of topic N (the actual screen the user was on), not the opener. This requires storing full follow-up Q+A (with options) in state, not just the answer text. Popping the last stored follow-up and re-presenting it is the right UX; re-answering it discards subsequent follow-ups, which is correct since branching may differ. (#first:2026-06-19)

49. **Loading verbs should start at a random index** — Cycling loading verbs always starting at index 0 means fast API responses always show the same word. Random start gives variety across interactions without any UX cost. Overlap between formal and informal verb lists confuses users about which register they're in — keep the two lists completely distinct. (#first:2026-06-19)

---

## Grounding-Based Score Derivation (2026-06-24)

57. **Verbatim platform quotes enable confident, auditable automated scoring** — When you have the actual party platform text as grounding entries, Claude can derive party position scores (+2 to -2) with high confidence for ~75% of party+topic combinations. The remaining ~25% (parties with 0 entries for a topic) fall back to "estimated" confidence and can be flagged for human review in the output document. The key advantage over manual scoring: every score has a traceable rationale tied to a specific quote. (#first:2026-06-24)

58. **Service-conditional benefits ≠ universal safety net — different scoring implications** — ביחד's platform is explicitly "only those who serve the state receive state budgets; those who don't, get nothing." This is a fundamentally different position from "the state provides a basic living standard for everyone" — the score must be 0, not +1. When reading party platforms, watch for this conditional framing: it looks like social support but is actually selective/meritocratic. (#first:2026-06-24)

59. **8 of 36 options are weak discriminators (range < 3, all parties score 0..+2)** — Growth investment, first-time buyer grants, periphery development, quality teachers, public health basket, medical workforce, geographic health equality, and court diversity are all broadly popular — no party actively opposes them. These options don't differentiate between parties and produce near-identical scores for everyone. The health topic is worst (3/4 options weak). Consider replacing weak options with ones that cut more sharply across the political spectrum. See `docs/score-review.md` for full list. (#first:2026-06-24)

60. **Aspect slug inconsistency silently breaks follow-up deduplication** — The `coveredAspects` array in `/api/follow-up` deduplicates already-asked sub-dimensions so the AI doesn't repeat itself. This only works if the same concept has the same slug across all parties. Inconsistent slugs (`"two-state-1967-borders"` vs `"two-state-solution"` vs `"political-settlement"`) mean deduplication silently fails — the AI asks about the same dimension multiple times, burning turns. Fix: define a canonical slug vocabulary per topic and standardize all 10 grounding JSON files. (#first:2026-06-24 #reinforced:2026-07-01)

  **2026-07-01 reinforcement, broader impact found**: the same root cause (aspect tags are ad-hoc per-party strings; only a small hand-standardized subset is shared across 2-3/10 parties — see `CHANGELOG.md:1006`) also silently breaks `buildGroundingsForParties` (`app/api/results/route.ts`), the results-page quote display. A party ranked #1 (78%) showed *zero* platform quotes despite full grounding data, because the topic's probed aspect happened to be a slug only that party's competitors share. Rule of thumb going forward: **any code that compares `aspect` strings across different parties should be treated as broken until proven otherwise** — only the handful of dimensions from the 2026-06-25 standardization pass are safe to compare cross-party; everything else is party-scoped and comparing it across parties will silently drop data for the majority. `score-topics.ts`'s scoring is unaffected because it never compares aspects across parties — it reads a party's *entire* topic content holistically. See TODO backlog #2 for candidate fixes not yet implemented.

  **2026-07-02 — fully fixed**: replaced the entire ad-hoc `aspect` vocabulary with a fixed canonical taxonomy (~43 ids across 9 topics, `TOPIC_KEY_DIMENSIONS` in `lib/questions.ts` — now the single source of truth, not just a curated subset). All 249 grounding entries across 10 parties reclassified by reading actual entry text, not trusting old slugs — reclassification itself surfaced several real misclassifications (e.g. an entry tagged `internal-security` was actually about domestic police funding, correctly reclassified to `hardline-enforcement` after reading the text). Cross-party `aspect` comparison is now safe project-wide; the "treat as broken until proven otherwise" rule above no longer applies. Full design process in item 68 below.

61. **Same opener score ≠ same sub-position — explicit keyDimensions expose hidden contradictions** — Parties can score identically on an opener option while holding contradictory sub-positions. Example: Raam and Democrats both score +2 on the "legal anti-discrimination" option, but Raam has `anti-lgbtq-rights-conversion-therapy` in its grounding data — directly opposing LGBTQ inclusion. Without an explicit `keyDimensions` priority list that includes `anti-lgbtq-rights-conversion-therapy`, the AI would likely miss this contradiction and leave a user with pro-LGBTQ views falsely matched to Raam. Rule: when a party scores high on an abstract option but has grounding data that contradicts a specific interpretation of that option, add the specific aspect to `keyDimensions` so it must be surfaced. (#first:2026-06-25)

62. **Cluster analysis is the right method for finding discriminating follow-up dimensions** — To decide which sub-dimensions belong in `keyDimensions`, the method that works: (1) for each opener option, list all parties that score ≥ +1; (2) look at their grounding `aspect` fields; (3) identify aspects that appear in some parties in the cluster but not others. Those aspects are the discriminating dimensions worth probing. This is faster and more reliable than intuiting follow-ups from political knowledge alone, because it's grounded in the actual platform data rather than assumptions. Rerun this analysis whenever grounding data is updated. (#first:2026-06-25)

---

## Competitive Landscape Quick Reference

| Tool | Key insight for us |
|---|---|
| Wahl-O-Mat | Gold standard for trust; party self-reporting + transparent algorithm; rebuild per election |
| Vote Compass | 2D compass visualization; media partnership model for reach; expert positioning is its weakness |
| ISideWith | Nuanced answers + issue weighting; editorial party data works without party cooperation |
| Kieskompas | Best academic methodology; expert-calibrated axes; 2D model is its limitation |
| Smartvote | Individual candidate matching — relevant if we ever go beyond party-level |

---

## Domain / Branding for Civic Tools (#first:2026-06-22)

23. **Civic tools need descriptive names, not brand names** — A name that requires marketing to explain what it does ("kolvote", "matzpen", "neatvote") is a higher trust bar than one that is self-explanatory ("voteassist"). Users need to understand what they're clicking before they give political trust to a tool.

24. **Word connotation risks matter for non-native-speaker audiences** — "aide" was rejected for `voteaide.com` despite being a legitimate English word because it risks AIDS association for non-native English speakers reading quickly. For a multilingual (Hebrew/Russian/Arabic) audience, prefer common English words with no ambiguous connotations over formal/rare synonyms.

25. **`.me` is acceptable for personal/civic tools distributed by word-of-mouth** — `.com` is preferable, but `.me` reads naturally for a tool with a personal-help framing ("vote assist me") and is not a trust barrier when users receive a link directly. Chosen domain: `voteassist.me`.

---

## Free-Text Scoring Architecture (#first:2026-06-22)

50. **Free-text scoring is a unified problem: "other" openers and follow-up answers are the same mechanism** — Both produce user-expressed positions in free text. The correct architecture treats them identically: AI scores the text against party positions. Don't build separate handling for "other" vs. follow-up scoring — they need the same infrastructure (AI call + grounding context + explanation output). (#first:2026-06-22)

51. **AI cannot assign trustworthy party scores from free text without grounding data** — Using training-data knowledge of Israeli parties to score user answers is unacceptable for a civic tool: positions change, training data is outdated, and the scoring is unauditable. The AI must receive party positions from the grounding database as context. This creates a hard sequencing constraint: **free-text scoring must launch alongside or after Phase 0.2 (platform data collection)**, not before. (#first:2026-06-22)

52. **Score explanations must trace to party positions, not just user preferences** — Saying "your answer moved party X's score up" is insufficient. The obligation is to explain WHY the party aligns: "Party X aligns with your position because [reason grounded in their platform]." This is not a UX nicety — it's the core trust mechanism for AI-assisted scoring. Without it, the score change is unauditable and legally indefensible. At launch, topic-level citations are acceptable where sub-nuance citations don't exist; clearly label cases where the AI is reasoning from general knowledge rather than a specific document. (#first:2026-06-22)

53. **"Other" opener answers create a different blending formula** — For regular openers: `topic_score = opener_score × 0.5 + followup_score × 0.5`. For "other" openers: there is no pre-defined opener score, so `topic_score = ai_score × 1.0` (AI scores the full free text, including the opener "other" text and any follow-up conversation). This means "other" users depend entirely on AI scoring — make sure the follow-up flow triggers for "other" answers, even if follow-ups wouldn't otherwise be generated. (#first:2026-06-22)

---

## Grounding Data Implementation (2026-06-23/24)

54. **Hebrew gershayim (U+05F4) required inside JSON strings for party abbreviations** — Abbreviations like `רע"מ` use a regular `"` double-quote, which breaks JSON parsing if placed inside a JSON string value. Replace with the Hebrew gershayim character `״` (U+05F4): `רע״מ`. This affects any Hebrew abbreviation that includes a quotation mark inside a JSON string. Always test `JSON.parse()` on grounding files after editing. (#first:2026-06-23)

  **2026-07-02 — same issue on the AI-output side, not just hand-edited data files**: this isn't only a risk when humans manually author grounding JSON — Gemini itself emits the same unescaped-quote pattern when generating Hebrew JSON containing acronyms like `צה"ל`, `מו"מ`, breaking `JSON.parse` in production (`app/api/follow-up/route.ts`). Prompt instructions alone (or even `responseMimeType: "application/json"`) don't reliably prevent this — the model doesn't consistently self-escape. Fix for AI-generated JSON: use `responseJsonSchema` (Gemini structured output / constrained decoding), which guarantees valid escaping structurally. See `docs/learnings/project/AI-INTEGRATION.md` for the full pattern. This is a recurring Hebrew-specific risk class (human-authored AND AI-generated) — anywhere Hebrew text with acronyms flows through `JSON.stringify`/model generation into a JSON string value.

55. **Score arrays indexed by party order must exactly match lib/parties.ts** — The score arrays in `lib/questions.ts` are positionally indexed to the `PARTIES` array. When adding parties, inserting at a new index shifts all subsequent indices. After any change: run `grep -oP 'scores: \[([^\]]+)\]' lib/questions.ts | awk -F',' '{print NF}' | sort -u` to verify all arrays have exactly N elements where N = PARTIES.length. A mismatch silently produces wrong scores — no type error, no runtime crash. (#first:2026-06-23)

56. **Derive display/detection lists from PARTIES source of truth — never hardcode** — Hardcoded party name arrays in components (e.g., synthesis detection in prototype-d, column headers in export script) go stale when parties are added or renamed. Use `PARTIES.map(p => p.name)` or `PARTIES.map(p => SHORT_NAME_FN(p))` everywhere. The moment a list is hardcoded it's wrong as soon as the party roster changes. (#first:2026-06-23)

64. **Progress counters in quiz flows should count the fixed unit, not the dynamic one** — When a quiz has fixed outer units (topics) and variable inner units (follow-up questions), the progress counter must count topics, not questions. A counter that says "4/9" when 9 = topics is honest and stable; a counter that tries to include follow-ups creates a denominator that shifts mid-flow, which users experience as a broken or lying counter. Corollary: label the unit explicitly ("נושא 4 מתוך 9"), not just the number — users assume "4/9" means questions. (#first:2026-06-30)

65. **Per-character staggered animation gives "live" feeling without a spinner** — A loading state that pulses the whole container (`animate-pulse`) looks frozen because all pixels move together. Per-character staggered pulse (80ms delay per character, 1.2s cycle) creates a continuous left-to-right wave — the animation is visible at every frame, not just when text changes. The verb can cycle *less* frequently (1800ms) because the wave does the work. Advantage over a spinner: the text content itself is animated, making the "what the app is doing" message feel active rather than static. Implement with `key={${verbIdx}-${charIdx}}` so the wave restarts cleanly on each verb change. (#first:2026-06-30)

63. **`lib/parties.ts` and `data/groundings/*.json` must be kept in sync — audit both when updating either** — `parties.ts` holds UI labels (`platformLabel`, `platformUrl`); grounding JSON holds factual data (`sourceQuality`, `platformAvailable`, `sourceUrl`). These are two separate truths that must agree. When grounding data is added or updated for a party, check whether `platformLabel` in `parties.ts` still matches: a party whose grounding says `sourceQuality: "official"` + `platformAvailable: true` should not have a `platformLabel` saying `"(לא מצע)"`, and must have a `platformUrl` set or it shows "ללא מצע רשמי" (amber) inconsistently with the accordion "מה כתוב במצע?".

  **Checklist after any grounding update**: for each party changed — (1) does `platformLabel` in parties.ts reflect the actual source? (2) is `platformUrl` set if `platformAvailable: true`? (3) does the label avoid "(לא מצע)" if `sourceQuality: "official"`? (#first:2026-06-26)

---

## Follow-Up Neutrality & Aspect-Tag Gotchas (2026-07-01)

66. **`TOPIC_KEY_DIMENSIONS` curated purely by "sharpest discriminator" can silently monopolize a topic's theme** — Advisor flagged follow-up questions as disproportionately about Arabs/Arabic. Found: `security`'s 4 key dimensions were *all* Israeli-Arab/Palestinian-conflict axes, and `housing` had exactly 1 dimension total — also Arab-sector-specific — despite ~24 and ~9 other already-grounded, thematically-different aspects (military-deterrence, idf-rehabilitation, disarmament-wmd for security; rent control, periphery incentives, public housing for housing) sitting unused in `data/groundings/*.json`. Because `suggestedNextDimension` always picks the first uncovered dimension in list order (`app/quiz/page.tsx`) and default quiz depth caps at 1 follow-up/topic, whatever theme dominates the list dominates what nearly every user gets asked. When curating this list, check topic-level thematic proportionality, not just each candidate dimension's individual party-discriminating power — a list can be "8 excellent discriminators" and still be a bad list if 8/8 are the same underlying axis. (#first:2026-07-01)

67. **AI-generated follow-up options had no programmatic non-overlap check, only a floor-of-3 instruction** — Unlike opener answers (manually reviewed against grounding data, pairwise correlation, register parity — see items 36-43 methodology), follow-up options generated live by `/api/follow-up` relied on a single soft LLM instruction ("options must be mutually exclusive") plus a hardcoded "3–4 options" floor that forced a 3rd/4th option to exist even when only 2 genuinely distinct positions existed. Fixed by allowing 2–4 with explicit "don't pad with a redundant option" instruction — but this is prompt-level, not verified programmatically; if redundancy resurfaces, the next step is likely spot-checking real Langfuse traces rather than assuming the instruction is sufficient. (#first:2026-07-01)

68. **Canonical taxonomy buckets must be checked against opener redundancy before finalizing — data clustering alone isn't enough** — Building `TOPIC_KEY_DIMENSIONS` (or any bucket/category system) purely by clustering existing free-text tags produces buckets that can accidentally restate what the topic's opener question already asks (e.g. a first-draft `economy` bucket literally merged two of the opener's four options into one). This isn't visible from the clustering data itself — it only shows up when each bucket is explicitly checked against the opener's actual question text. Process: after clustering, read every topic's opener options side-by-side with the draft buckets and ask "would probing this bucket just re-ask what the opener already asked?" Reframe toward concrete mechanisms/specifics one level below the opener's abstraction (progression, not restatement) where it does. (#first:2026-07-02)

69. **When a dynamic mechanism can enforce a constraint, don't also hardcode it statically — the two can drift or fight each other** — First-draft design for the taxonomy above tried to solve "don't repeat the opener" by hardcoding low static priority for buckets that are conceptually close to the opener (e.g. always probe `judicial-appointments` last, even though it's the topic's richest bucket by data coverage). User correction: since an explicit anti-repetition instruction was *also* being added to the follow-up prompt, the static demotion was redundant and actively worse — it discarded a genuinely valuable, richly-grounded bucket based on a category (opener-adjacency) that the dynamic mechanism already handles per-turn with full context (what's actually been asked, what grounding exists for THIS user's close parties). Rule: order/prioritize static structures by their real, objective merit (here: data coverage) and let a context-aware dynamic mechanism (prompt instruction, runtime check) handle constraints that require judgment about the specific situation. Don't pre-empt the dynamic mechanism with a static workaround for the same concern — pick one. (#first:2026-07-02)

70. **A `feature/*` design branch benefits from a real plan-mode round-trip before execution, even when the requester says "let's just start looking at X"** — Given a green light to prototype option (a) of a two-option architecture decision, the instinct is to start clustering data and writing code immediately. Entering plan mode first (drafting the taxonomy as a proposal, not a fait accompli) surfaced two rounds of substantive user corrections (items 68, 69) that would have required a full data-reclassification redo if caught only after ~250 entries were already retagged. The cost of a plan round-trip (a few minutes of user review) is far lower than the cost of redoing mechanical work built on a flawed design. Apply this whenever the "obviously right" next step involves committing to a structure (taxonomy, schema, API shape) that many downstream artifacts will depend on. (#first:2026-07-02)
