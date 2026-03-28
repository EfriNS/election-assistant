# Competitive Research: Election Voting Advice Tools

**Date**: 2026-03-28
**Scope**: Israeli election tools + international Voting Advice Applications (VAAs)
**Purpose**: Inform solution design and identify gaps

---

## Part 1: Israeli Landscape

### Finding: No Current Active VAA for Israel

The most important finding is a **gap, not competition**: there is no currently active, maintained voting advice / party-matching tool for the upcoming 2026 Israeli elections. Tools that existed were one-time builds for specific past elections and are not maintained.

### Known Israeli Tools

#### 1. JPost/IDI Election Compass (2009)
- **What**: Voting compass built by the Jerusalem Post and the [Israel Democracy Institute (IDI)](https://en.idi.org.il) for the 2009 Knesset elections
- **Scale**: 40,000 users in the first hour after launch; ~600,000 total by election day
- **Languages**: Hebrew, Arabic, English
- **Status**: Dead link (404). Built as a one-off for 2009. IDI did not revive it for any subsequent election (2013, 2015, 2019×4, 2021, 2022)
- **Gaps**: No longer active; never updated; no evidence of sustained investment by IDI

#### 2. Kaplan Open Source Election Map (2022)
- **What**: [Open-source election results map](https://elections.kaplanopensource.co.il/2022/ynet/) — visualizes voting patterns by region, run with Ynet
- **Status**: Results/visualization tool only. Not a voter-matching tool
- **Gaps**: Post-election analysis, not pre-election guidance

#### 3. HaMadad (המדד)
- **What**: [Poll aggregator](https://themadad.com/) — tracks and averages published election polls
- **Status**: Active
- **Gaps**: Descriptive (what others are voting), not prescriptive (what I should vote)

#### 4. Campaign Management Apps (Elector, LogiVote)
- **What**: Tools for campaign teams — volunteer management, voter outreach
- **Status**: Active but irrelevant — for parties, not voters

### Israeli Landscape Summary

| Tool | Active | Type | Party-matching? |
|---|---|---|---|
| JPost/IDI Compass (2009) | ❌ Dead | VAA | ✅ Yes — but gone |
| Kaplan Election Map | ✅ Active | Results visualization | ❌ |
| HaMadad | ✅ Active | Poll aggregator | ❌ |
| Elector / LogiVote | ✅ Active | Campaign management | ❌ |

**Conclusion**: The Israeli VAA market is essentially empty. The only true VAA ever built was a one-off from 2009. There is a clear gap — and proven demand (600K users in a single election with no marketing infrastructure).

---

## Part 2: International Tools

### 1. Wahl-O-Mat (Germany) — The Gold Standard
- **Builder**: [Federal Agency for Civic Education (Bundeszentrale für politische Bildung)](https://www.bpb.de/), government body; co-developed with political scientists, journalists, youth civic orgs
- **Running since**: 2002
- **Scale**: 26.5M uses in the first week of the 2021 federal election alone; 100M+ cumulative
- **How it works**:
  - 38 binary statements (agree/disagree/neutral) per election; rebuilt from scratch each time
  - Users can double-weight up to 8 statements
  - Parties respond directly and provide a short written justification for each position
  - Simple Euclidean proximity algorithm; fully documented and public
  - Question development: youth panel proposes ~80 statements → BpB vets → parties respond → final 38 selected
- **Results**: % match per party, ranked bar chart; drill-down shows each party's verbatim justification text
- **Strengths**: Maximum institutional trust; parties supply their own data; justification texts increase political knowledge; massive reach; transparent methodology
- **Weaknesses**: Binary format limits nuance; only 20–30% of users use the weighting feature; no 2D ideological map; populist parties inflate artificially (clear positions on everything); German only
- **Languages**: German only

### 2. Vote Compass (Vox Pop Labs)
- **Builder**: [Vox Pop Labs](https://votecompass.com/), social enterprise; media partnerships (CBC Canada, ABC Australia, France24, RTL, Globo)
- **Active in**: Canada, Australia, New Zealand, Brazil, US, France, Germany
- **Scale**: 3.8M completions for the 2019 Australian federal election; 2M+ for 2019 Canadian
- **How it works**:
  - ~30–40 policy questions on a 6-point slider scale
  - Party positions set by academic political scientists (not self-reported)
  - Shows party positions on the slider **as the user answers** — real-time context
  - Results place user on a 2D political spectrum (economic left-right × social liberal-conservative)
- **Results**: 2D scatter plot ("compass") with user dot among party dots; supplementary bar charts by issue area
- **Strengths**: 2D visualization is intuitive; media partnerships drive massive traffic and credibility; 6-point scale captures intensity; multilingual per deployment
- **Weaknesses**: Expert-coded positions → parties sometimes dispute; showing positions during answering can cause anchoring; 2D model is reductive for complex political contexts; no source quotations
- **Languages**: Localized per deployment (English, French, Portuguese, etc.)

### 3. ISideWith (US/Global)
- **Builder**: Commercial, independent, US-founded; [isidewith.com](https://www.isidewith.com); 70M+ claimed users across election cycles; covers 35+ countries
- **How it works**:
  - 70–100+ questions with nuanced answer options (not just yes/no — "yes, but only if...", "it's complicated", etc.)
  - After each question, 3–5 follow-up nuance questions refine the position
  - Users rate importance of each issue (5-star scale)
  - Matching includes "passion factors" (how prominently a party campaigns on the issue) and "conviction scores" (consistency over time; stance changes reduce score)
  - Party data maintained editorially from public sources — no party cooperation required
- **Results**: % match ranked list; radar/spider chart by issue category; candidate quotes with source links; aggregate "how others voted" data
- **Strengths**: Most sophisticated matching; nuance system; issue weighting; no party cooperation needed; strong mobile UX; global breadth
- **Weaknesses**: US-centric framing; high drop-off rate (too many questions); editorial positions are sometimes wrong; full algorithm not published; commercial incentives may favor engagement over accuracy
- **Languages**: English primary; uneven community translations

### 4. Kieskompas (Netherlands) — Methodological Pioneer
- **Builder**: [Kieskompas](https://home.kieskompas.nl/en/tools/), academic spin-off from VU Amsterdam (founded by political scientists André Krouwel and Tom Louwerse)
- **Running since**: 2006; 40+ countries
- **How it works**:
  - 30 propositions on a 5-point scale
  - Party placement by academic expert calibration — the most methodologically rigorous placement method
  - Questions designed for maximum discriminant validity (best at separating parties along key axes)
  - 2D compass visualization: user dot appears among party dots
- **Results**: 2D compass; issue-level breakdown; optional importance weighting
- **Strengths**: Strongest academic methodology; peer-reviewed; expert-calibrated placement; well-adapted to diverse political contexts internationally
- **Weaknesses**: Less polished UX than commercial tools; expert placement is contestable; commercial licensing model
- **Languages**: Dutch primary; localized per deployment

### 5. Other Notable Tools

**StemWijzer (Netherlands, 1989)** — The original VAA. Binary questions, 30 statements; still active; ~30M cumulative uses in a country of 17M.

**Smartvote (Switzerland, 2003)** — Most comprehensive VAA in the world: ~75 questions covering federal and cantonal levels. Matches to *individual candidates*, not just parties (critical for Switzerland's preference voting). Both parties and individual candidates self-report positions. The candidate-level matching is a unique and proven feature.

**VoteForPolicies (UK)** — Shows policy statements without party labels; user picks preferred policies, then reveals which party they chose. Reduces partisan priming. Niche but interesting approach.

**EUVox / VoteMatch Europe** — Used for EU Parliament elections across all member states; same questions in all languages. Demonstrates multi-country, multi-language feasibility.

**Democracy OS / Polis** — Different paradigm: collective deliberation rather than individual matching. Polis clusters opinions to find consensus areas. Used in Taiwan's vTaiwan process. Not directly competitive but represents a direction for civic tools.

### International Summary

| Tool | Questions | Party data | Results | Languages | Quotes | Coalition |
|---|---|---|---|---|---|---|
| Wahl-O-Mat | 38, binary | Self-reported | % bar chart | DE only | Justifications ✅ | ❌ |
| Vote Compass | 30–40, slider | Expert-coded | 2D compass | Per country | ❌ | ❌ |
| ISideWith | 70–100+, nuanced | Editorial | % + radar | EN primary | Source links ✅ | ❌ |
| Kieskompas | 30, scale | Expert-coded | 2D compass | Per country | ❌ | ❌ |
| Smartvote | 75, scale | Self-reported | Spider web | DE/FR | ❌ | ❌ |

**Universal gap across all tools**: No platform models the coalition question. No platform shows verbatim platform quotes as primary trust evidence. No platform handles parties without platforms.

---

## Part 3: Academic Research on VAA Effectiveness

### What Works
- VAAs increase voter turnout by **8–22%** across studies
- VAAs shift vote preferences in **1–10%** of users
- Undecided/floating voters are most influenced; committed voters less so
- Over 50% of Wahl-O-Mat users (2005) researched policies more deeply after using it
- Field experiments confirm positive effects on political knowledge

### Optimal Design Parameters (Research-Validated)
- **30–35 questions** is the sweet spot — completion rates drop sharply above 40–50
- **Importance weighting** significantly improves match quality, but only 20–30% of users use it when optional — consider making it mandatory or building it into the flow
- **Showing party justifications** (verbatim, from the party itself) is the feature most correlated with increased political knowledge
- **Not showing party logos during answering** reduces anchoring (VoteForPolicies model)
- **Concrete policy questions** ("the minimum wage should be raised to X") outperform abstract value questions ("freedom vs. equality")

### Known Design Pitfalls (Must Avoid)
1. **Framing bias**: Even section headers ("left-wing" / "right-wing") significantly skew responses. Question wording must be rigorously tested for neutrality
2. **Populist party inflation**: Binary and clear-position formats reward parties that take unambiguous stances on everything. Populist/fringe parties often score artificially high
3. **Question selection bias**: Which topics are included implicitly defines what the election is "about" — enormous agenda-setting power that must be used responsibly
4. **Algorithmic opacity**: Hidden matching formulas erode trust. Users must understand why they got the result they got
5. **Researcher-set positions**: When researchers (not parties) set party positions, parties dispute results — credibility risk
6. **AI trust concerns**: Users are specifically skeptical of chatbot-style VAAs on political topics. Bias fears are higher with conversational AI than with structured quizzes
7. **Educated-user selection bias**: VAA users skew younger, more educated, more politically engaged. Hard to reach apathetic voters

---

## Part 4: Israel-Specific Complexity

Standard VAA models were designed for Western European two-axis political landscapes. Israel is more complex.

### Political Axes in Israel (at least 4)
1. **Security/peace** — from territorial compromise and two-state solution to annexation and no negotiations
2. **Religion/state** — from full separation (civil marriage, public Shabbat) to Haredi influence on law and policy
3. **Socioeconomic** — from free-market and privatization to welfare state and housing regulation
4. **Arab-Jewish / communal identity** — Arab parties' inclusion/exclusion from coalitions; Mizrahi vs. Ashkenazi representation; immigrant community interests

A standard 2D Kieskompas/Vote Compass model would compress these into at most two dimensions, systematically misrepresenting the Israeli political landscape. A better approach: either a 4-axis model or separate dimensions surfaced based on user priorities.

### The Coalition Question (Untapped Opportunity)
Israeli voters don't elect a government directly — they vote for a party that then negotiates a coalition. The relevant question for many voters isn't just "which party matches my values?" but "which coalition scenario do I want to enable?"

**No existing VAA anywhere in the world models this.** This is a genuine innovation opportunity. A tool that says "based on your values, you'd be best served by a coalition of X + Y, and here's which party best positions you to make that happen" would be uniquely valuable in the Israeli context.

### Language and Accessibility
- Hebrew is the primary language of party platforms and most users
- ~20% of Israeli voters are Arabic-speaking — a meaningful minority that no tool currently serves
- Russian-speaking community (15–20% of population) is a significant constituency
- Translation of the UI is not enough: questions must be culturally framed appropriately per language/community

### Rapidly Shifting Positions
Israeli parties frequently reverse positions (most dramatically on security issues). Static party data becomes stale quickly. This favors:
- The Wahl-O-Mat model of rebuilding per election (over a persistent database)
- Semi-automated ingestion with human review (our planned model)
- Explicit dating of every data point ("Party X stated this on [date]")

---

## Part 5: Gap Analysis — What a New Tool Can Offer

| Gap | All existing tools | Our opportunity |
|---|---|---|
| Active Israeli VAA | None (gap since 2009) | First active Hebrew VAA in 12+ years |
| Verbatim platform quotations | None — 0 out of all major tools | Core trust differentiator |
| Hebrew-first, multilingual | None for Israel | Hebrew + Arabic + Russian + English |
| Conversational/adaptive flow | All are static quizzes | AI-driven; adapts to user profile |
| Coalition modeling | None — 0 out of all major tools | Unique to Israel; untapped globally |
| Missing platform disclosure | None address this | Explicit "no platform available" handling |
| Multi-axis Israeli political space | Standard 2D only | 3–4 axes reflecting actual Israeli politics |
| All parties, equal treatment | Varies | All parties above threshold |
| Open source | Partial (Wahl-O-Mat data, not code) | Full open source → maximum transparency |
| Tone personalization | None | User-selectable formal/informal |

### Key Strategic Insights

**The exact-quotation model is a third path** — more verifiable than Wahl-O-Mat (parties write their own summaries) and more trustworthy than ISideWith (third-party coding). Our verbatim citations from official sources are what academic research recommends for trust, but no existing tool has built this way.

**Coalition modeling is an untapped opportunity** globally, and especially relevant for Israel. This could be the headline differentiator — no other tool in the world does this.

**AI trust is a real risk**: Research shows users are specifically skeptical of chatbot-style VAAs on political topics. Any conversational AI layer must be framed carefully — as a guide that surfaces your values and explains matches, not as an authority that tells you what to think.

**The sweet spot is hybrid**: A structured question flow (trust, auditability) combined with AI for adaptive depth, explanation of results, and follow-up ("tell me more about Party X's position on education") — not a freeform chatbot as primary interface.

---

## Sources

**Live web research** (2026-03-28):
- [Voting advice application — Wikipedia](https://en.wikipedia.org/wiki/Voting_advice_application)
- [Frontiers: AI and voting advice applications (2024)](https://www.frontiersin.org/journals/political-science/articles/10.3389/fpos.2024.1286893/full)
- [Trustworthiness of VAAs in Europe — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11415416/)
- [Issue framing in VAAs — PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0212555)
- [Meta-Analysis of VAA Effects — ResearchGate](https://researchgate.net/publication/348596095_Meta-Analysis_of_the_Effects_of_Voting_Advice_Applications)
- [2026 Israeli legislative election — Wikipedia](https://en.wikipedia.org/wiki/2026_Israeli_legislative_election)
- [ISideWith](https://www.isidewith.com/) / [Vote Compass](https://votecompass.com/) / [Kieskompas](https://home.kieskompas.nl/en/tools/)

**Training knowledge** (academic literature through ~2025):
- Garzia, D. & Marschall, S. (eds.) (2012, 2014). *Matching Voters with Parties and Candidates*. ECPR Press.
- Louwerse, T. & Rosema, M. (2011). The Design Effects of Voting Advice Applications. *Political Studies*.
- Ladner, A. et al. (2012). Voting Advice Applications and Electoral Participation. *Swiss Political Science Review*.
- Garzia et al. (2023). Populism and Voting Advice Applications. *Electoral Studies*.
