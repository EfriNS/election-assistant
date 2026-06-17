# Web Scraping Patterns (Contendre-Specific)

**Purpose**: Project-specific patterns for web scraping competitive intelligence sources.

---

## Scraping Infrastructure

### 1. robots.txt compliance forced better source selection

**Context**: Built HTTPClient with robots.txt checking, attempted Fivetran scraper.

**What happened**: Fivetran blocks `/connectors` page in robots.txt. Initial reaction: "Should we disable robots.txt checking?"

**Outcome**: Kept compliance, pivoted to Airbyte (allows scraping). Found 53 connectors successfully.

**Lesson**: robots.txt compliance is a **feature, not a bug**:
- Forces finding sources that allow scraping (more sustainable)
- Encourages finding API endpoints or docs pages
- Ethical scraping = good long-term relationships

**Pattern to repeat**: When blocked by robots.txt, explore alternatives:
1. Check if competitor has API endpoint (inspect Network tab)
2. Try docs pages (`docs.fivetran.com` vs marketing site)
3. Scrape allowed pages that link to connectors
4. Last resort: Headless browser for JS-heavy sites

(#first:2025-11-11)

---

### 2. Virtual environment setup critical for WSL environments

**Context**: System Python externally-managed on WSL, pip install failed.

**Issue**: `pip install` returned "externally-managed-environment" error on WSL.

**Root cause**: Debian/Ubuntu WSL distributions prevent system-wide pip installs.

**Solution**: Use project virtual environment (`.venv/`)
- Always activate: `source .venv/bin/activate`
- Verify: `which python` → should show `.venv/bin/python`
- Document in CLAUDE.md for future sessions

**Impact**: Added comprehensive virtual environment section to CLAUDE.md (lines 137-186).

**Pattern**: For Python projects on WSL, document virtual environment setup in CLAUDE.md immediately during project initialization.

(#first:2025-11-11)

---

### 3. requests-cache works well for daily scraping

**Context**: Need HTTP caching to avoid hitting sites repeatedly during development.

**Decision**: Use `requests-cache` with SQLite backend (vs Redis or in-memory).

**Why it works**:
- SQLite persists across runs (unlike in-memory)
- No additional infrastructure (unlike Redis)
- 24-hour TTL perfect for "daily monitoring" use case
- Simple integration: `CachedSession` drop-in replacement for `requests.Session`

**Performance**: Second demo run instant (cache hit), first run ~500ms.

**Pattern**: For embedded MVP scrapers with daily refresh cycles, SQLite caching provides right balance of simplicity and persistence.

(#first:2025-11-11)

---

## Competitor-Specific Patterns

### 4. Fivetran connector page: robots.txt blocked

**URL**: `https://www.fivetran.com/connectors`

**Status**: ✗ Blocked by robots.txt

**Alternative approaches**:
- Try docs pages: `https://www.fivetran.com/docs/connectors`
- Check for API endpoint (inspect Network tab in browser)
- Scrape sitemap or RSS feed if available

**Current implementation**: Scraper code ready in `fivetran_scraper.py`, just needs allowed URL.

(#first:2025-11-11)

---

### 5. Airbyte connector page: allowed, but messy HTML

**URL**: `https://airbyte.com/connectors`

**Status**: ✓ Allowed by robots.txt, successfully scraped 53 connectors

**Data quality issues**:
- Connector names include metadata: "BigQueryWarehouses and LakesDestinations..."
- Need cleaner parsing or scrape individual detail pages

**Current approach**: Keyword-based categorization (`_guess_type` method)
- "postgres", "mysql" → Database
- "/sources/" in URL → Source
- Works ~80% of the time

**Improvement options**:
1. **Parse detail pages**: Each connector has page like `/connectors/bigquery` with cleaner data
2. **LLM cleanup** (Phase 2): Gemini extracts clean name from messy text
3. **Find API endpoint**: Check if Airbyte exposes JSON API

(#first:2025-11-11)

---

### 6. Connector categorization: keyword heuristics sufficient for MVP

**Pattern**: Simple keyword matching for connector types/categories.

**Example** (`airbyte_scraper.py:171-193`):
```python
if "postgres" in name.lower() or "mysql" in name.lower():
    return "Database"
elif "/sources/" in url:
    return "Source"
```

**Accuracy**: ~80% correct based on manual spot-checking.

**When to upgrade**:
- When categorization accuracy becomes business-critical
- When adding more nuanced categories (e.g., "SaaS API" vs "Database")
- Phase 2: LLM synthesis can provide semantic categorization

**Lesson**: Don't over-engineer early. Keyword heuristics validate architecture, LLM improves accuracy later.

(#first:2025-11-11)

---

## Testing Patterns

### 7. 100% coverage on critical infrastructure, deferred on scrapers

**Decision**: Achieved 100% test coverage on `http_client.py` (15 tests), but 0% on scrapers.

**Reasoning**:
- HTTPClient is **reused by all scrapers** → bugs have 10x impact
- Scrapers are **specific implementations** → easier to test manually
- Demo script (`demo_scraper.py`) provides integration testing

**Impact**: Caught `delete_url` → `delete` API change during testing.

**When to add scraper tests**:
- After scraping 2-3 more sources (validate pattern)
- Before deploying to production (regression protection)
- When scraper logic gets complex (>100 lines of parsing)

**Pattern**: Test infrastructure heavily, test implementations pragmatically.

(#first:2025-11-11)

---

## Architecture Decisions

### 8. BaseScraper abstraction validated

**Pattern**: Abstract base class with template methods (`scrape()`, `parse_html()`).

**Benefit demonstrated**:
- `airbyte_scraper.py` and `fivetran_scraper.py` share 80% of logic
- `fetch_html()`, `make_soup()`, logging → inherited for free
- Enforces interface consistency

**When to use**: Multi-source scraping systems where sources share structure (connector catalogs, pricing pages, blog lists).

**When not to use**: One-off scrapers or highly unique parsing logic.

(#first:2025-11-11)

---

## Next Steps

**Immediate**:
- Add basic tests for `airbyte_scraper` (validate against fixtures)
- Find Fivetran API endpoint or docs page alternative
- Implement dbt Hub scraper (check robots.txt first!)

**Phase 2**:
- LLM synthesis for cleaner connector names
- Semantic categorization (beyond keyword matching)
- Individual detail page scraping for richer data

**Future**:
- Pricing page scrapers (more fragile, needs screenshot diffing?)
- Blog/announcement scrapers
- GitHub activity monitoring

---

## Data Schema Consistency

### Item Name Field Varies by Source Type

**Problem**: `embedding_manager.py` stored `item_name` using `item.get("name", "")`, which returned `""` for blog RSS items (they use `"title"` key, not `"name"`). All blog post names stored as empty strings in ChromaDB, making `query_recent_changes` return `[](url)` links with no text.

**Root Cause**: Different scrapers produce different field names:
- Connector scrapers → `"name"` (e.g., "PostgreSQL", "Salesforce")
- Blog RSS scraper → `"title"` (e.g., "Airbyte Agent Engine Enters Public Beta")
- GitHub release scraper → `"name"` (e.g., "3.6.18 - The annotation that minds...")

**Fix**: `item.get("name", item.get("title", ""))` in `embedding_manager.py:125` — same pattern used in `change_detector.py:128`.

**Lesson**: When adding new scraper types, verify which field they use for the item's display name. The storage layer must handle all variants. Check `embedding_manager.py` when adding new sources.

**How discovered**: `query_recent_changes` via MCP returned 71 items but all blog links had no title text. Direct ChromaDB inspection showed `item_name: ""` with the title buried in `full_snapshot.title`.
(#first:2026-02-22)

---

**Last Updated**: 2026-02-22
**Related Files**: `src/contendre/sources/*.py`, `src/contendre/detection/embedding_manager.py`
