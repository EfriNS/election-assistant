# Configuration Patterns (Contendre-Specific)

**Purpose**: Document hybrid configuration strategies for data scraping systems with both static (vendor-specific) and dynamic (user-customizable) sources.

**Context**: Contendre monitors competitive intelligence from static vendors (Airbyte, dbt, Fivetran) and user-configured discussions (Reddit keywords, competitor names).

---

## Hybrid Static/Dynamic Configuration

**Pattern**: Split configuration by change frequency and ownership. (#first:2025-11-23)

**When to Use**:
- System has both product-specific scrapers (rarely change, maintained by developers) AND user-customizable inputs (frequently change, maintained by end users)
- You want single config file (config/context.yaml) but different loading strategies

**Implementation**:

**Static Configuration (maintained in code)**:
```python
# src/contendre/cli.py
def create_vendor_scrapers() -> list[BaseScraper]:
    """Hardcoded vendor scrapers (Airbyte, dbt Hub, Fivetran, etc.)"""
    return [
        AirbyteScraper(...),  # Product-specific URL
        DBTHubScraper(...),   # Product-specific URL
        FivetranScraper(...), # Product-specific URL
    ]

def create_github_scrapers() -> list[GitHubReleasesScraper]:
    """Hardcoded GitHub repos to monitor"""
    repos = [
        "airbyte/airbyte",
        "dbt-labs/dbt-core",
        "dagster-io/dagster",
        "PrefectHQ/prefect",
        "apache/airflow",
    ]
    return [GitHubReleasesScraper(repo) for repo in repos]
```

**Dynamic Configuration (config/context.yaml)**:
```yaml
# config/context.yaml
discussion_tracking:
  enabled: true
  reddit:
    subreddits:
      - dataengineering
      - analytics
      - BusinessIntelligence
  keywords:
    - "data pipeline"
    - "ETL"
    - "reverse ETL"
    - "data integration"
  competitors:
    - fivetran
    - airbyte
    - dbt
    - stitch
    - hightouch
```

**Dynamic Configuration Loading**:
```python
# src/contendre/cli.py
def load_config(config_path: str = "config/context.yaml") -> dict[str, Any]:
    """Load YAML config, return empty dict if missing (disable dynamic features)."""
    try:
        with open(config_path) as f:
            config: dict[str, Any] = yaml.safe_load(f)
            return config
    except FileNotFoundError:
        return {}  # Dynamic features disabled

def create_discussion_scrapers(config: dict[str, Any]) -> list[BaseScraper]:
    """Create scrapers from dynamic config."""
    discussion_config = config.get("discussion_tracking", {})

    if not discussion_config.get("enabled", False):
        return []  # Feature disabled

    return [
        RedditScraper(
            subreddits=discussion_config["reddit"]["subreddits"],
            keywords=discussion_config["keywords"],
            competitors=discussion_config["competitors"],
        )
    ]
```

**Benefits**:
- ✅ Vendor changes → code update (PR, code review, version control)
- ✅ User preferences → config update (no code changes, user editable)
- ✅ Single config file keeps all user settings in one place
- ✅ Feature flag pattern (`enabled: true`) for clean opt-in
- ✅ Graceful degradation (missing config → feature disabled, not crash)

**Why Not All Config?**:
- Static scrapers are product-specific (unlikely user wants to monitor different vendors)
- Code changes force version control, testing, deployment discipline
- Config changes skip these safeguards → better for user preferences, worse for core product behavior

---

## Type-Safe YAML Loading

**Pattern**: Add explicit type annotations when loading YAML to satisfy mypy. (#first:2025-11-23)

**Problem**:
```python
# This fails mypy type checking
config = yaml.safe_load(f)  # Returns Any, not dict[str, Any]
discussion_config = config.get("discussion_tracking", {})  # Error: Any has no .get()
```

**Solution**:
```python
# Explicit type annotation
config: dict[str, Any] = yaml.safe_load(f)
discussion_config = config.get("discussion_tracking", {})  # ✅ mypy happy
```

**Why It Matters**:
- yaml.safe_load() returns `Any` (can be dict, list, str, int, None depending on YAML content)
- Type annotation asserts "we know this will be a dict" (crashes at runtime if wrong)
- Enables type checking for downstream .get(), .keys(), etc. operations

**Pre-Push Validation**: Always run `mypy src/` before pushing to catch type errors.

---

## Session Learnings

**2025-11-23: Hybrid Config System Implementation**
- Implemented hybrid static/dynamic configuration for Contendre
- Static: Vendor scrapers, GitHub repos, RSS feeds (code)
- Dynamic: Discussion tracking keywords/competitors (YAML)
- User tested successfully with config file
- Type annotation fix for mypy compliance

---

**Last Updated**: 2025-11-23
