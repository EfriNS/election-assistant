---
name: collect-party-data
description: Collect and merge party platform data into grounding JSON files. Use when adding a new party's platform data or updating an existing party's data with new sources. Handles URLs, PDFs, user-pasted text, and multiple sources per party.
---

# collect-party-data

Collects party platform content from any source and merges it into the structured grounding data files used for AI-assisted scoring.

## Invocation

```
/collect-party-data <partyId> [source]
```

- `partyId` — one of: `hadash`, `democrats`, `beyahad`, `yashar`, `beitenu`, `likud`, `shas`
- `source` — optional: a URL, "paste" (user will provide text in chat), or omit to start interactively

If no source is provided, read the existing JSON to see what's already there and ask the user what new source to use.

---

## Step 1: Check Current State

Read `data/groundings/<partyId>.json`. Note:
- Which topics already have entries
- Which are empty
- Any `_note` fields flagging "no page yet" (check if those are now available)
- The `sourceUrl` already recorded

Also check `docs/sources/<partyId>/` to see which source archives already exist.

---

## Step 2: Determine Source Type and Fetch Strategy

### A. URL → HTML page
Try fetching the URL. If the response is useful:
- First attempt: ask for all content by named section headings (more reliable than "return all text verbatim")
- If content is thin: fetch each section individually by name
- If JS-rendered (returns loading screen or empty): note it, ask user to paste the text or visit the URL and copy sections

**Known WebFetch behavior**: requests for "return all text verbatim" are often refused (copyright). Instead, ask: *"From the section [section name], copy every bullet point and commitment in Hebrew."* This works reliably.

### B. URL → PDF
Fetch the PDF URL with WebFetch. The tool saves the binary to a local cache path (shown in the result). Then use the **Read tool** on that local path to extract the text. The Read tool renders PDFs visually — you can read all pages.

### C. User copy-paste
The user has pasted text directly in chat. Skip fetching. Use the text as-is.

### D. YouTube / video
Fetch the video URL. If a transcript is available, use it. If not, note the URL in the archive as a "pending source" and ask the user whether they can provide a summary or transcript.

### E. Multiple sources
Run steps 2–4 for each source. Merge into the same JSON file — entries from different sources coexist under the same topic. Each entry tracks its own `sourceUrl` and `archivePath`.

---

## Step 3: Map Content to Topics

The 9 topics and their rough scope:

| topicId    | Hebrew label     | Scope |
|------------|------------------|-------|
| `security` | ביטחון           | military, foreign policy, regional agreements, Oct 7 accountability |
| `economy`  | כלכלה            | cost of living, labor, monopolies, taxation, growth |
| `housing`  | דיור             | housing prices, rental, construction, urban renewal |
| `education`| חינוך            | school systems, curriculum, teachers, higher education |
| `health`   | בריאות           | hospitals, insurance, drugs, preventive care |
| `religion` | דת ומדינה        | Shabbat, marriage, conversion, equal service burden, kashrut |
| `justice`  | שלטון החוק       | judiciary, constitution, democracy, anti-corruption, civil rights |
| `equality` | שוויון           | LGBTQ, minorities, women, disability, social gaps |
| `ecology`  | סביבה            | environment, energy, climate |

For each source item, pick the single best-fit topic. If an item clearly spans two topics (e.g., "equal service burden" sits at religion AND security), use your judgment — pick the primary one, or duplicate with different `aspect` values.

---

## Step 4: Write Grounding Entries

Each entry:
```json
{
  "text": "exact quote or close paraphrase in Hebrew",
  "aspect": "kebab-case-label",
  "sourceUrl": "https://...",
  "archivePath": "docs/sources/<partyId>/YYYY-MM-DD-<slug>.md",
  "dateRetrieved": "YYYY-MM-DD",
  "contrary": "what this position opposes (optional)",
  "absent": true  // only if explicitly stating they have NO position on this
}
```

**Aspect labels** must be one of the fixed canonical ids for that topic — see `TOPIC_KEY_DIMENSIONS[topicId]` in `lib/questions.ts`. This is a closed enum (not placeholder slugs): every party's grounding entries share the same small bucket set per topic so the results page and follow-up dimension-selection can match across parties. Read the bucket list and pick the closest fit by content, not by superficial wording similarity. If a source item genuinely doesn't fit any existing bucket for its topic, do NOT invent a new free-text slug — note it in the archive markdown and the JSON `_note` field as "uncovered by current taxonomy" and flag it to the user for a taxonomy update instead.

**Text quality**: prefer direct quotes. If the source refused verbatim, use a close Hebrew paraphrase that preserves the meaning and key terms. Avoid English.

---

## Step 5: Handle Updates (re-runs)

When updating an existing party's data:

1. **New source, new topic**: add entries straightforwardly
2. **New source, existing topic**: check for near-duplicates before adding
   - Same aspect + essentially same meaning → skip (note it in archive as "confirmed by second source")
   - Same aspect + different nuance → add both, note the distinction in `_note`
   - Same aspect + contradictory → add both, flag with a `_note: "contradicts entry from [other source]"` on both
3. **"No page yet" note now resolved**: remove the `_note`, add the entries
4. **Entry no longer on live site**: do NOT remove it automatically — note the discrepancy in the archive and ask the user

---

## Step 6: Create/Update Archive Markdown

For each new source, create `docs/sources/<partyId>/YYYY-MM-DD-<slug>.md` with:
- Source URL and date retrieved
- Full or near-full source text (for future verification)
- Section "נושאים שטרם פורסמו" listing any announced-but-empty categories

For updates to an existing source, add a dated section to the existing archive file rather than creating a new one.

---

## Step 7: Update the JSON

Update `data/groundings/<partyId>.json`:
- Set `platformAvailable: true` if it was false
- Update `platformLabel` to reflect the source
- Merge new entries into existing topic arrays (don't replace — append)
- Update `_note` to reflect current collection state

---

## Step 8: Commit

```bash
git add data/groundings/<partyId>.json docs/sources/<partyId>/
git commit -m "data(<partyId>): <summary of what was added/updated>"
```

---

## Gaps and Logging

Always log gaps explicitly — both in the archive markdown and in the JSON `_note`:
- **Category in nav but no page**: note the URL and date checked
- **JS-rendered page**: note it as "requires manual collection"
- **"Coming soon"**: note exact wording and date seen
- **No ecology/health/etc. policy**: note "not addressed in platform"

This makes reruns efficient — you can immediately see what changed.

---

## Future Enhancements (not yet implemented)

- **Smarter dedup**: semantic similarity check across entries before adding
- **Contradiction detection**: flag entries where `text` and `contrary` from different parties overlap
- **Back-porting**: use grounding entries to generate or refine differentiating follow-up questions (tracked as backlog item in TODO.md)
- **YouTube transcription**: auto-transcribe if transcript API available
