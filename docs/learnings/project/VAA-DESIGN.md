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

## Competitive Landscape Quick Reference

| Tool | Key insight for us |
|---|---|
| Wahl-O-Mat | Gold standard for trust; party self-reporting + transparent algorithm; rebuild per election |
| Vote Compass | 2D compass visualization; media partnership model for reach; expert positioning is its weakness |
| ISideWith | Nuanced answers + issue weighting; editorial party data works without party cooperation |
| Kieskompas | Best academic methodology; expert-calibrated axes; 2D model is its limitation |
| Smartvote | Individual candidate matching — relevant if we ever go beyond party-level |
