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

## Competitive Landscape Quick Reference

| Tool | Key insight for us |
|---|---|
| Wahl-O-Mat | Gold standard for trust; party self-reporting + transparent algorithm; rebuild per election |
| Vote Compass | 2D compass visualization; media partnership model for reach; expert positioning is its weakness |
| ISideWith | Nuanced answers + issue weighting; editorial party data works without party cooperation |
| Kieskompas | Best academic methodology; expert-calibrated axes; 2D model is its limitation |
| Smartvote | Individual candidate matching — relevant if we ever go beyond party-level |
