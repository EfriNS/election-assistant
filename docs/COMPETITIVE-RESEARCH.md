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
- **Status**: Dead link (404). Built as a one-off for 2009. IDI does not appear to have revived it for subsequent elections (2013, 2015, 2019×4, 2021, 2022)
- **Gaps**: No longer active; never updated; no evidence of sustained investment in this type of tool by IDI

#### 2. Kaplan Open Source Election Map (2022)
- **What**: [Open-source election results map](https://elections.kaplanopensource.co.il/2022/ynet/) — visualizes voting patterns by region, run in partnership with Ynet
- **Status**: Results/visualization tool only. Not a voter matching or party-recommendation tool
- **Gaps**: Not relevant to this use case (it's for after-the-fact analysis, not pre-election guidance)

#### 3. HaMadad (המדד)
- **What**: [Poll aggregator](https://themadad.com/) — tracks and averages published election polls from Israeli media
- **Status**: Active
- **Gaps**: Descriptive/tracking tool (what others are voting), not prescriptive (what I should vote)

#### 4. Campaign Management Apps (Elector, LogiVote)
- **What**: Tools for campaign teams and party organizers — volunteer management, voter outreach
- **Status**: Active but irrelevant — these are for parties, not voters
- **Gaps**: Not for voters at all

### Israeli Landscape Summary

| Tool | Active | Type | Party-matching? |
|---|---|---|---|
| JPost/IDI Compass (2009) | ❌ Dead | VAA | ✅ Yes — but gone |
| Kaplan Election Map | ✅ Active | Results visualization | ❌ |
| HaMadad | ✅ Active | Poll aggregator | ❌ |
| Elector / LogiVote | ✅ Active | Campaign management | ❌ |

**Conclusion**: The Israeli VAA market is essentially empty. The only true VAA ever built was a one-off from 2009 that is no longer accessible. There is a notable gap — and notable proven demand (600K users in a single election with no marketing infrastructure).

---

## Part 2: International Tools

### 1. Wahl-O-Mat (Germany) — The Gold Standard
- **Builder**: [Federal Agency for Civic Education (Bundeszentrale für politische Bildung)](https://www.bpb.de/), in collaboration with political scientists, journalists, and young voters
- **Running since**: 2002
- **Scale**: 30M+ uses per election cycle
- **How it works**:
  - ~38 binary statements (agree/disagree/neutral)
  - Users can weight which issues matter most
  - Parties respond directly to the same statements
  - Simple proximity algorithm (Euclidean distance on issue space)
  - Algorithm is public and documented
- **Results**: Percentage match per party, ranked; can compare selected parties side-by-side
- **Strengths**: Maximum trust (government-backed, transparent methodology, parties participate directly); massive adoption; co-designed with youth input
- **Weaknesses**: Binary yes/no limits nuance; static question set; no conversational depth; no quotations from platforms; republished fresh per election (not continuous)
- **Languages**: German only

### 2. Vote Compass (Vox Pop Labs)
- **Builder**: [Vox Pop Labs](https://votecompass.com/) — social enterprise; media partnerships (CBC Canada, ABC Australia, France24, RTL, Globo)
- **Active in**: Canada, Australia, New Zealand, Brazil, US, Germany (Wahl-Navi), France (Boussole électorale)
- **How it works**:
  - ~30 policy questions on a 5-point scale (strongly agree → strongly disagree)
  - Party positions determined by political scientists (not self-reported by parties)
  - User positioned on a 2D political spectrum (economic left-right × social liberal-authoritarian)
  - Match score shown per party
- **Results**: 2D scatter plot placing user among parties; percentage alignment
- **Strengths**: Media partnership model drives huge traffic; multilingual by design; 2D visualization is intuitive; academic rigor
- **Weaknesses**: Party positions set by researchers (not parties themselves) → disputed accuracy; no quotations from platforms; requires media partner to launch in a new country
- **Languages**: Multiple (per country: English, French, German, Portuguese, etc.)

### 3. ISideWith (US/Global)
- **Builder**: Independent, non-partisan, US-founded; covers many countries
- **URL**: [isidewith.com](https://www.isidewith.com)
- **How it works**:
  - Large question set (hundreds of issues, can skip freely)
  - Nuanced answers: not just yes/no — includes "it's complicated", "yes, but only if...", etc.
  - Users weight which issues matter most to them
  - Matching includes "passion factors" (how prominently the party campaigns on this) and "conviction scores" (consistency of party's position over time)
  - Stance changes reduce a party's conviction score
- **Results**: % match per party, ranked; also shows % of voters who agree on each issue
- **Strengths**: Most sophisticated matching of any VAA; issue weighting; nuance in answers; global coverage; tracks stance changes
- **Weaknesses**: US-centric UX; overwhelming number of questions; no exact quotations from platforms; crowd-sourced party positions are sometimes inaccurate; results feel gameable
- **Languages**: English primarily; some localization

### 4. Kieskompas (Netherlands) — Original Inventor
- **Builder**: [Kieskompas](https://home.kieskompas.nl/en/tools/) — commercial entity, spun out of academic research
- **Running since**: 2006
- **Active in**: 40+ countries
- **How it works**:
  - 30 propositions, 5-point agreement scale
  - Users select which issues matter most (weighting)
  - 2D compass visualization: economic left-right × progressive-conservative
  - Parties positioned via researcher coding (not self-reported)
- **Results**: User appears as a dot on the compass, with party dots around them; closest parties highlighted
- **Strengths**: 2D visualization is immediately intuitive; has deployed in many countries; academic credibility
- **Weaknesses**: Commercial (licensing fees); researcher-set positions may not match party self-description; no exact quotations

### International Tools Summary

| Tool | Approach | Party positioning | Results format | Multilingual | Quotes |
|---|---|---|---|---|---|
| Wahl-O-Mat | Binary quiz (38q) | Self-reported by parties | % ranked list | German only | ❌ |
| Vote Compass | Scale quiz (30q) | Researcher-coded | 2D scatter plot | Per country | ❌ |
| ISideWith | Nuanced quiz (100q+) | Researcher + crowd | % ranked list | English-primary | ❌ |
| Kieskompas | Scale quiz (30q) | Researcher-coded | 2D compass | Per country | ❌ |

**Universal gap**: Not one existing VAA shows exact quotations from party platforms. All either use self-reported positions (Wahl-O-Mat) or researcher-coded positions (others). The "why" — verbatim evidence — is absent everywhere.

---

## Part 3: Academic Research on VAA Effectiveness

### What Works
- VAAs increase voter turnout by **8–22%** across studies
- VAAs shift vote preferences in **1–10%** of users
- Undecided / floating voters are most influenced (committed voters less so)
- Over 50% of German Wahl-O-Mat users in 2005 reported researching policies more after using it
- Field experiments confirm positive effects on political knowledge

### Known Design Pitfalls (Must Avoid)
1. **Framing bias**: The wording of questions (even section headers like "left-wing" or "right-wing") significantly skews user responses. Questions must be framed neutrally.
2. **Question selection bias**: Which topics are included/excluded favors certain parties. Small teams of political scientists tend to reproduce mainstream agendas.
3. **Algorithmic opacity**: Hidden or unexplained matching formulas erode trust. Users who don't understand why they got a result lose confidence.
4. **Researcher-set positions**: When researchers (not parties) set party positions, parties dispute the results → credibility risk.
5. **Educated-user bias**: VAAs disproportionately attract already-engaged, educated, younger voters. Difficult to reach apathetic voters.
6. **AI trust concerns**: Users are specifically skeptical of chatbot-style VAAs on politically sensitive topics. Bias fears are higher with AI than with structured quizzes.

### What Academic Research Recommends
- **Transparency**: Publish methodology, algorithm, and data sources openly
- **Party participation**: Have parties respond to statements directly (Wahl-O-Mat model) rather than researcher-coded positions
- **Explicit sourcing**: Cite where party positions came from (our exact-quotation requirement aligns with best practice)
- **Issue weighting**: Allow users to signal which topics matter most to them
- **Multi-party coverage**: Include all parties above threshold to avoid appearance of bias

---

## Part 4: Gap Analysis — What a New Tool Can Offer

| Gap | Existing tools | Our opportunity |
|---|---|---|
| **Active Israeli VAA** | None | First active Hebrew-language VAA in 12+ years |
| **Exact platform quotations** | None (0 out of 4 major tools) | Core differentiator — transparency & trust |
| **Hebrew-first, multilingual** | None for Israel | Hebrew + Russian + Arabic + English |
| **Conversational/adaptive flow** | All are static quizzes | AI-driven flow that adapts to user |
| **"Missing platform" handling** | Not addressed | Explicit "no platform available" disclosure |
| **All parties** | Varies | All parties above threshold, equal treatment |
| **Open source** | Some (Wahl-O-Mat data is open) | Full open source → maximum transparency |
| **Tone personalization** | None | Optional formal/informal register |

### Key Strategic Insight
The **Wahl-O-Mat model** (self-reported party positions + transparent algorithm + civic/non-partisan framing) is the **most trusted** approach globally. But it requires party cooperation.

The **ISideWith model** (researcher/crowd-coded positions + nuanced matching) is the **most scalable** — no party cooperation needed, but positions can be disputed.

Our exact-quotation approach is a **third path**: positions are not researcher-interpreted or party-summarized — they are directly cited from source documents. This is more verifiable than Wahl-O-Mat (where parties write their own position summaries) and more trustworthy than ISideWith (where positions are third-party coded).

---

## Sources

- [Voting advice application — Wikipedia](https://en.wikipedia.org/wiki/Voting_advice_application)
- [Frontiers: AI and voting advice applications (2024)](https://www.frontiersin.org/journals/political-science/articles/10.3389/fpos.2024.1286893/full)
- [Trustworthiness of VAAs in Europe — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11415416/)
- [Issue framing in VAAs — PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0212555)
- [Meta-Analysis of VAA Effects — ResearchGate](https://researchgate.net/publication/348596095_Meta-Analysis_of_the_Effects_of_Voting_Advice_Applications)
- [JPost/IDI Compass (2009) — Jerusalem Post](https://www.jpost.com/Diplomacy-and-Politics/JPostIDI-compass-Who-should-you-vote-for)
- [Kieskompas](https://home.kieskompas.nl/en/tools/)
- [Vote Compass](https://votecompass.com/)
- [ISideWith](https://www.isidewith.com/)
- [2026 Israeli legislative election — Wikipedia](https://en.wikipedia.org/wiki/2026_Israeli_legislative_election)
