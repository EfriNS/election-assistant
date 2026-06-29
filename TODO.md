# Election Assistant - TODO

## ✅ RECENTLY COMPLETED (Last 3)

- **Scoring quality + monitoring** — Contrary label fix; +2 JSON parse bug; coveredAspects grounding filter; freeTextInterpretation forwarding; Slack alerts on all AI routes; ?notrack=1. (2026-06-29)
- **PDF page break fix** — Removed break-inside-avoid from outer card; inner header-only wrapper; per-topic grounding grouping; ASCII v/x chips replacing unsupported Unicode. (2026-06-28)
- **Quota cron redesign** — Requests-first monitoring (RPD=500); per-route Slack breakdown; fixed 3 root-cause bugs (schedule/logic/CRON_SECRET). (2026-06-28)

> See CHANGELOG.md for complete details.

---

## 📋 BACKLOG (Prioritized)

1. **Advisor review before MVP** — All 10 parties grounded + sourceQuality classified. Have advisor review: (a) live app UX, (b) `docs/score-review.md` (8 weak discriminators), (c) `sourceQuality` calls for חד"ש (official vs. thirdParty) and עוצמה (thirdParty vs. official — own 13 principles but supplemented with IDI/JVL).

2. **Graphical shareable card** — Single-screen image (≈600×400px) optimized for social/WhatsApp sharing: top match + score, 2-3 topic chips, branding. Complements the PDF export (different use case: "share a teaser" vs. "save full results"). Options: server-side canvas (Satori/`@vercel/og`), or screenshot crop from Puppeteer reusing export-pdf infrastructure. Deferred from PDF export planning session.

3. **Add מצע links as parties publish them** — ישר!, הדמוקרטים, and ביחד now have accurate links. Monitor ש"ס, ליכוד, חד"ש for new/updated official platforms. Update `lib/parties.ts` + grounding `sourceQuality`/`platformAvailable` when links appear.

4. **Build MVP** — Active. Full scope in `docs/PHASED-ROADMAP.md`. Completed: 0.3 (grounding UI), 0.4 (security), 0.5 (quota degradation). Next: 0.7 scoring tests, then 1.1 remove prototype artifacts.

   _Next sessions:_
   - **1.8 (in progress)**: Soft launch underway — monitoring Langfuse, quota, mobile; iterating on feedback

   _Open decisions (discuss before implementing):_
   - ✅ **"ענית" for un-grounded topics** — resolved: show gray "—" chip for topics with no party data (chip row, not accordion). (2026-06-27)
   - ✅ **Feedback channel** — resolved: floating in-app widget → Slack #election-feedback. (2026-06-27)
   - ✅ **Analytics depth** — resolved: migrated to Mixpanel (EU, free tier), 8 events, full funnel + priority distribution + topic engagement. Design in `docs/ANALYTICS-DESIGN.md`. (2026-06-28)

   _Human tasks (parallel):_
   - **0.1** Advisor review of live app + `docs/score-review.md` (8 weak discriminators flagged)
   - **0.6** Content neutrality audit (3rd-party review of question framing)
   - **0.8** Infrastructure: connect voteassist.me domain; set Vercel env vars (UPSTASH_*, GEMINI_API_KEY, LANGFUSE_*, NEXT_PUBLIC_FEEDBACK_FORM_URL)

5. **Topic chip / percentage divergence** — The v/~/x chip reflects only the opener pre-calibrated score (sign), while the final percentage blends in AI follow-up scoring (50/50). A party can show "x" yet score 65% if the follow-up probed an aspect where they partially aligned. Options: (a) derive chip from blended topic score instead of opener, (b) add tooltip explaining the divergence, (c) leave as-is and flag for advisor review. Revisit after next user-testing round.

6. **Scoring tuning: squared weights + critical-topic cap** — two related levers to make high-priority mismatches hit harder: (a) use weight² (16:9:4:1) instead of linear (4:3:2:1) so "קריטי" means more in the weighted average; (b) limit קריטי selections to 1–2 so users can't mark everything critical (making each designation genuinely selective). Both are low-lift and complementary; revisit after next user-testing round with real data. _[decided 2026-06-27: deferred, score curve already handles primary case]_

6. ⏸️ **Multi-language support** — _blocked on: MVP working in Hebrew_
   - Russian, Arabic, English UI layers
   - Party platforms remain in Hebrew; answers/explanations translated

7. ⏸️ **Candidate records extension** — _blocked on: v1 stable_
   - Experience, notable actions/votes (official sources only, no social media)

8. ⏸️ **Multi-country generalization** — _blocked on: Israel v1 validated_

---

## 📚 REFERENCE

### Key Decisions Made
- **Timeline**: ~6 months to Israeli elections
- **Audience**: General public, wide distribution (not a private tool)
- **Languages**: Hebrew-first; Russian, Arabic, English in scope
- **Data sources**: Official party platforms + candidate records; social media excluded
- **Results format**: Ranked options + "why" with exact quotations and source URLs
- **Parties**: All parties; show "no platform available" for those without one
- **Curation**: Semi-automatic ingestion + human (advisor) review/approval
- **Monetization**: Free tool; no revenue goal
- **Promotion**: Personal brand for builder; anonymous/subtle; must not hurt credibility
- **Transparency**: Consider open-sourcing on GitHub for credibility
- **Cost model**: API-based → builder pays; must rate-limit and cap costs

### Open Questions
- What is the recommended technical approach? (hybrid confirmed; exact implementation TBD in solution design)
- What tone/style should the tool use? (formal, informal, user-selectable?) → TBD in UX design
- Should the project be open-sourced from the start, or later? → public after MVP
- How many questions? → research says 30–35 is optimal; exact set TBD
- Ingestion pipeline design, admin UI → TBD in technical design phase

### Future Ideas
- Candidate profile pages (experience, voting record)
- Multi-country support (architecture to be designed with this in mind)
- Shareable results ("Here's why I'm voting for X")
- Embeddable widget for civic organizations
- "How did the parties perform on their promises?" (post-election retrospective)

### Reference Material
- Screenshots/ — Der Spiegel Hamburg election quiz (UX reference)
- README.txt — Full project brief and context
