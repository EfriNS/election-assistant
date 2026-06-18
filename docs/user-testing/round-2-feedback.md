# User Testing Round 2 — Feedback

**Date**: 2026-06-18  
**Participants**: 2 users (same as Round 1)

---

## User 1

**Profile**: Female, Hebrew speaker, age 50–60  
**Device**: Android phone  
**Session**: 1 session · 11:28 min · 13 pages · 130 actions

**Liked**:
- New design of the priorities screen

**Didn't like**:
- Dilemmas flow (Prototype C) — especially the lack of a "no opinion" option
  - A skip button exists but she didn't notice it; she felt forced to take a stance

**Preferred flow**: Priorities (Prototype B/D)  
**Ideal flow in her mind**: Priorities selection **followed by** an AI conversation — she wants depth and personalization, but anchored in her topic choices first (not AI-first)

**Results screen behavior**:
- Looked back and forth between the AI long summary and the "see details" screen
- Missed that "see details" exists / what it contains (10 sec each, fast reader)
- Liked the scores
- Some detail from the chat is present in the AI summary but not in the "see details" view — she sensed the gap

**Translation bug**: "המשכורת לא מגיעה" is wrong → should be "לא מספיקה" (or similar)

---

## User 2

**Profile**: Female, Hebrew speaker, age 16–18  
**Device**: iPhone  
**Session**: 1 session · 18:46 min · 13 pages · 107 actions

**Liked**:
- New changes overall
- Explanations for terms (hint tooltips)
- AI explanations in results

**Preferred flows**: 1 (Quiz) and 2 (Priorities) — **did not like** the AI conversation flow (Prototype D)

**Behavior in AI flow**:
- Spent significant time on the first question — it was too complex for her
- Did not answer; went back
- Hypothesis: combination of longer text, less graphically-appealing format, and more complex/abstract content — real barrier for a teenager

---

## Synthesis — Round 2

### What improved since Round 1
- Terminology hints (tooltips) well-received by User 2
- Priority screen design well-received by User 1
- AI explanations in results well-received by User 2

### What's still broken / newly surfaced

| Priority | Issue | Notes |
|----------|-------|-------|
| 🔴 Critical | AI first question too complex for teenager | Longer text + abstract content + less visual = barrier |
| 🟠 High | "See details" screen undiscoverable | User 1 didn't realize it existed; detail from chat is lost there |
| 🟠 High | Skip button in Dilemmas not visible | User felt forced; skip needs to be more prominent |
| 🟠 High | User 1's ideal: Priorities → AI conversation | Not currently a single flow; B and D are separate |
| 🟡 Medium | AI results page: chat detail not reflected in "see details" | User 1 sensed a gap between AI summary and detail view |
| 🟢 Low | Translation: "המשכורת לא מגיעה" → "לא מספיקה" | Wrong verb phrase |

### Emerging picture across both rounds

| Segment | Preferred input | Preferred results |
|---------|----------------|-------------------|
| User 1 (50–60) | Priorities → AI conversation | Scores + AI summary |
| User 2 (16–18) | Quiz or Priorities (visual, structured) | AI explanations in results |

**Key insight**: Both users want AI in the **results** layer. Only User 1 wants AI in the **input** layer — and even she wants it to be grounded in priorities first. User 2 rejects the AI-first input flow entirely.

**Implication for Prototype D (AI chat)**: The current AI-first conversation is a poor entry point for younger/less politically-engaged users. Could work as a second layer (after priorities), or needs a much simpler, more visual first question.
