# Hadash — refresh check, 2026-08-07

Re-checked all three existing sources for updates since the last pass (2026-06-27). No content removed or contradicted; found a few items in already-known sources that were not yet captured in the grounding JSON.

## Sources re-checked

- https://hadash.org.il/#values — retrieved 2026-08-07. No new content detected beyond what's already captured (2026-06-27 collection); this page appears unchanged.
- https://maki.org.il/עקרונות-יסוד/ — retrieved 2026-08-07. Page includes an enumerated "Social Commitments (a–h)" list. Six of eight points were already captured (worker rights, Arab-minority recognition/citizenship, women's equality, religion-state separation) or are near-duplicates of existing entries. Two points were previously uncaptured — see "Taxonomy gaps" below. One point (conscientious objection) broadens an existing entry — added.
- https://zoha.org.il/116306/ — retrieved 2026-08-07 (re-fetched, focused on the חד"ש-תע"ל section specifically). Two commitments not previously captured — added below.

## New entries added (2026-08-07)

**Economy (social-safety-net-and-labor-protections):**
- "הוא היחיד הקורא לקיצור שבוע העבודה" — article states Hadash-Taal is the only list among those compared (Labor, Meretz, Balad, Hadash-Taal) calling for a shortened work week. [zoha.org.il]
- "בפתיחת כל ההסכמים הקיבוציים והענפיים" — reopening all collective and sectoral labor agreements; distinct concrete mechanism from the existing "right to organize/strike" entry. [zoha.org.il]
- "להגנת מהגרי העבודה" (maki.org.il, point f of the a–h commitments list) — protection of migrant workers. Mapped to social-safety-net-and-labor-protections as the closest fit (labor-rights protection for a specific worker subgroup, same pattern as existing child-allowance/pension entries in this bucket).

**Justice (emergency-powers-and-security-law):**
- "נגד המיליטריזם ולהכרה בזכות הסירוב מטעמי מצפון" (maki.org.il, point g). Existing entry ("הכרה בזכות הדמוקרטית לסרב לשרת בשטחים הכבושים מטעמי מצפון") scopes conscientious objection to service in the occupied territories specifically; this maki.org.il source states the right more broadly (general right of conscientious refusal, not territory-scoped). Added as a distinct entry noting the broader scope — not a straight duplicate.

## Taxonomy gaps flagged (not added as scored entries)

Two of the eight maki.org.il commitments have no fitting bucket in the current `TOPIC_KEY_DIMENSIONS` taxonomy (checked `lib/questions.ts`; equality topic buckets are demographic-and-citizenship-policy, arab-minority-specific-mechanisms, gender-equality, lgbtq-specific-policy-mechanisms, disability-and-elderly-inclusion — none fit):

- **(d)** "לשוויון זכויות לעדות המזרח" — equal rights for Mizrahi/Eastern Jewish communities. This is an intra-Jewish ethnic-equality axis, distinct from the existing Arab-minority and gender buckets.
- **(e)** "להגנת זכויות הילדים והנוער" — protection of children's and youth rights. Doesn't cleanly fit equality, education, or health as currently scoped.

Per the collect-party-data skill, not inventing new slugs for these — flagging for a taxonomy update decision instead.

## Not added (near-duplicates / low marginal value, confirmed by second source)

- (a) worker rights + non-discriminatory development + anti-racism/anti-nationalism — generic, largely redundant with existing labor and anti-discrimination entries across economy/religion/equality.
- (b) equal civil/national rights for Arab population, national-minority recognition, equal citizenship law — near-identical to two existing arab-minority-specific-mechanisms entries (hadash.org.il and maki.org.il, both already in the JSON).
- (c) equal women's rights, ending violence/coercion against women — near-identical to existing gender-equality entries.
- (h) separation of religion and state — verbatim duplicate of the existing maki.org.il religion-topic entry.

## Pre-existing gap noticed (not part of this refresh's scope, flagging for the user)

Many entries in `data/groundings/hadash.json` cite `archivePath: "docs/sources/hadash/2026-06-27-hadash-values-full.md"`, but that file does not exist in `docs/sources/hadash/` — only `2026-06-23-hadash-principles.md` is present. This predates today's refresh (introduced in commit `487c002`, "add full values platform"). The underlying quotes in the JSON look sound; only the archive markdown for that source was apparently never committed. Recommend either reconstructing that archive file from a fresh full fetch of hadash.org.il/#values, or updating the `archivePath` fields to point at wherever that content actually lives.

## עדכון 2026-08-17 — בדיקה חוזרת, ללא שינוי

`hadash.org.il/#values` נבדק שוב. 8 העקרונות ורשימת המועמדים זהים לגמרי למה שכבר ב-JSON. אין תוכן חדש.
