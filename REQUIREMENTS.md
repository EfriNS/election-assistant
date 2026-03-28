# Election Assistant — Requirements

## Problem Statement

A civic-minded individual currently helps friends choose which party to vote for in Israeli elections — manually. She interviews them about their priorities (defense, foreign policy, education, etc.) and matches those against party platforms. The goal is to automate and scale this process into a free, public tool available to any voter.

---

## Goals

- Help individuals find their best-matching political party based on personal values and priorities
- Present results transparently: ranked options with exact quotations from official party platforms (with source URLs and dates)
- Be non-partisan: treat all parties equally; note when a party has no published platform
- Be accessible to the general public (not tech-savvy users)
- Be free to use, with no monetization

**Secondary goal**: personal brand building for the builder — anonymous or very subtle; must not compromise credibility.

---

## Audience

- Civic-minded individuals seeking informed, values-based voting guidance
- General public; wide distribution (not a private friend network)
- Israel-first, but multi-country support is a long-term consideration

---

## Constraints

| Constraint | Value |
|---|---|
| Timeline | ~6 months to Israeli elections |
| Primary language | Hebrew (party platforms are in Hebrew) |
| Additional languages | Russian, Arabic, English (in scope; exact phasing TBD) |
| Monthly cost cap | ~$50/month |
| Data sources | Official party platforms + candidate records only (no social media) |
| Parties covered | All parties; show "no platform available" where applicable |

---

## Data & Curation

- Core content: official party platform texts, updated as campaigns evolve
- Curation owners: builder + advisor (domain expert)
- Ingestion approach: semi-automatic (automated scraping + human review/approval) — exact design TBD
- Each piece of content must carry: source URL, party name, date retrieved/published
- Candidate records (experience, notable actions/votes) are a desired extension, not MVP

---

## Results Presentation (Known Requirements)

- Show more than one option (ranked or scored)
- Show the "why" for each match — exact quotations from the party's platform
- Citation format: Party name + source URL + date + verbatim quote
- Feel trustworthy and non-partisan

---

## UX Principles (Known)

- Easy to use for non-tech-savvy general public
- The conversation/question flow should adapt to the user (age, background) rather than being one-size-fits-all
- Tone/formality may be user-selectable (e.g., formal vs. casual)
- Should go deeper than the current manual process (more follow-up questions, better matching nuance)
- The advisor will provide high-level guidelines for the flow; AI should drive the actual question logic from those

---

## Open Questions (To Be Resolved After Research & Design)

- **Technical approach**: Quiz (Wahl-O-Mat style), AI agent, or hybrid? → pending competitive research + design
- **Question design**: How are questions structured? Static set vs. dynamic/conversational? → pending approach decision
- **Multi-language rollout**: Which languages in MVP vs. later phases? → pending scope decision
- **Ingestion pipeline design**: What does semi-automatic look like in practice? → pending technical design
- **Admin/curation UI**: How do builder and advisor review and approve content? → pending technical design
- **Cost model**: API-based (builder pays) vs. user-brings-own-account → pending approach decision
- **Open-source timing**: Repo is private now; when to go public? → after MVP

---

## Out of Scope (Explicit)

- Monetization of any kind
- Social media as a data source
- Telling users what to vote (the tool matches values, not prescribes answers)
