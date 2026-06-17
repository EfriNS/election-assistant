# Docker Patterns - Project Learnings

**Purpose**: Lessons learned from Docker build issues, optimization, and E2E testing infrastructure.

## Key Learnings

### 1. PyTorch Installation in Docker - Layer Separation Critical

**Problem**: Docker build failing with "Wheel 'torch' located at ... is invalid" when installing PyTorch alongside other dependencies.

**Root Cause**: Installing PyTorch in combined RUN command with other dependencies causes pip resolution conflicts, especially when using custom index URLs (torch CPU wheel repository).

**Solution**: Separate PyTorch installation into distinct RUN command BEFORE other dependencies.

```dockerfile
# ✅ CORRECT - PyTorch first, then app dependencies
RUN if [ "$PYTORCH_VARIANT" = "cpu" ]; then \
      pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu; \
    else \
      pip install --no-cache-dir torch torchvision torchaudio; \
    fi

RUN pip install --no-cache-dir -e ".[dev]"

# ❌ WRONG - Combined installation causes conflicts
RUN if [ "$PYTORCH_VARIANT" = "cpu" ]; then \
      pip install --no-cache-dir torch --index-url https://...; \
    fi && \
    pip install --no-cache-dir -e ".[dev]"
```

**Why It Matters**: Custom index URLs interfere with pip's dependency resolution when multiple packages are installed in same command.

**Reference**: Dockerfile:47-57 (Session 2025-12-03)

---

### 2. Docker-Compose Image Sharing - Single Build, Multiple Services

**Problem**: Multiple services (`contendre`, `contendre-mcp`) building identical CPU images, wasting 2.76GB disk space and build time.

**Solution**: Tag built image and reuse across services with different entrypoints.

```yaml
# ✅ CORRECT - Share image between services
services:
  contendre:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        PYTORCH_VARIANT: cpu
    image: contendre:cpu  # Tag for reuse
    entrypoint: ["contendre"]

  contendre-mcp:
    image: contendre:cpu  # Reuse tagged image
    entrypoint: ["python", "-m", "contendre.server"]  # Different entrypoint

# ❌ WRONG - Duplicate builds
services:
  contendre:
    build: { context: ., dockerfile: Dockerfile }
  contendre-mcp:
    build: { context: ., dockerfile: Dockerfile }  # Rebuilds same image
```

**Benefits**:
- Saves 2.76GB disk space
- Faster builds (only build once)
- Ensures both services use identical code/dependencies

**Reference**: docker-compose.yml:62-181 (Session 2025-12-03)

---

### 3. E2E Testing Hierarchy - Test Published Artifacts First

**Principle**: When validating Docker distribution, test published artifacts (GHCR) BEFORE local builds to mirror production environment.

**Workflow**:
1. ✅ Pull from GHCR (`ghcr.io/efrins/contendre:latest-cpu`)
2. ✅ Validate image functionality (demo, MCP server, CLI)
3. ✅ Test docker-compose integration
4. ⚠️ Only fall back to local build if GHCR issues found

**Why**: Local builds don't test the actual distribution pipeline (GitHub Actions, GHCR publishing, image tagging).

**Anti-Pattern**: Testing only local builds and assuming GHCR works the same way.

**Reference**: Session 2025-12-03 E2E testing workflow

---

### 4. GHCR Authentication - Read vs Write Permissions

**Requirement**: Pulling private GHCR images requires `read:packages` scope on GitHub token.

**Setup**:
```bash
# Add read:packages scope
gh auth login --scopes read:packages

# Verify token has correct permissions
gh api user/repos --paginate | jq '.[].full_name'

# Login to GHCR (secure piping - don't echo token)
gh auth token | docker login ghcr.io -u USERNAME --password-stdin
```

**Security Best Practice**: Never echo secrets - use piping to avoid exposing tokens in logs.

```bash
# ❌ WRONG - Token visible in logs
echo $GITHUB_TOKEN | docker login ghcr.io --username ...

# ✅ CORRECT - Token piped securely
gh auth token | docker login ghcr.io --username ... --password-stdin
```

**Reference**: Session 2025-12-03, user feedback on security

---

### 5. Docker Volume Persistence - Config vs Data Separation

**Pattern**: Separate volumes for configuration vs runtime data enables different persistence strategies.

```yaml
volumes:
  contendre-config:/app/config      # User configuration (competitors list)
  contendre-chroma:/data/chroma      # Vector database (embeddings)
```

**Why Separate**:
- **Config volume**: Small, user-editable, reset on version upgrades (copy from defaults)
- **Data volume**: Large, append-only, preserve across all upgrades (expensive to rebuild)

**Initialization Pattern**:
```python
# Check if config exists, copy from defaults if empty
if not config_path.exists():
    shutil.copytree("/app/config-defaults", "/app/config")
```

**Reference**: Phase 1.5 MCP Mode Support (2025-12-03)

---

### 6. Git-Based Docker Versioning - Single Source of Truth

**Pattern**: Use `git describe` as single source of truth for Docker image versioning. Eliminates manual version management and provides build provenance.

**Implementation**:
```dockerfile
# Dockerfile - Dynamic labels via build args
ARG VERSION=dev-local
ARG BUILD_SOURCE=unknown
ARG BUILD_COMMIT=unknown
ARG BUILD_DATE_RFC3339

LABEL version="${VERSION}"
LABEL build.source="${BUILD_SOURCE}"
LABEL build.commit="${BUILD_COMMIT}"
LABEL build.date="${BUILD_DATE_RFC3339}"
```

```bash
# scripts/build-docker.sh - Auto-extract from git
VERSION=$(git describe --tags --always --dirty)
BUILD_SOURCE="local-$(whoami)"
BUILD_COMMIT=$(git rev-parse --short HEAD)
BUILD_DATE_RFC3339=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

docker build \
  --build-arg VERSION="${VERSION}" \
  --build-arg BUILD_SOURCE="${BUILD_SOURCE}" \
  --build-arg BUILD_COMMIT="${BUILD_COMMIT}" \
  --build-arg BUILD_DATE_RFC3339="${BUILD_DATE_RFC3339}" \
  -t "contendre:${VERSION}" \
  -t "contendre:latest" \
  .
```

**Version Semantics** (from `git describe`):
- `v0.1.0` - Exact tag (clean release)
- `v0.1.0-5-gf167581` - 5 commits after v0.1.0, commit hash f167581
- `v0.1.0-5-gf167581-dirty` - Above + uncommitted changes (local dev)
- `f167581` - No tags exist yet (uses commit hash only)

**Benefits**:
- Zero manual version bumps (derived automatically)
- Build provenance (local vs CI builds distinguishable via `build.source`)
- Debugging capability (`docker inspect` shows version/commit/date)
- MCP Registry ready (version metadata required for submission)

**Docker-Compose Integration**:
```yaml
services:
  contendre:
    image: ${CONTENDRE_IMAGE:-contendre:latest}  # Pin version via env var
```

**Usage**:
```bash
# Use latest (default)
docker-compose up

# Pin to specific version
CONTENDRE_IMAGE=contendre:v0.1.0 docker-compose up
```

**Reference**: backlog/DOCKER_VERSIONING.md (Session 2025-12-03)

---

### 7. Long-Running Docker Commands - Always Log to /tmp

**Pattern**: For long-running Docker operations (builds >1 min, tests, multi-stage operations), ALWAYS log output to `/tmp` for user review.

**Implementation**:
```bash
# ✅ CORRECT - Log to timestamped file in /tmp
LOGFILE="/tmp/docker-build-$(date +%Y%m%d-%H%M%S).log"
echo "Logging to: $LOGFILE"
./scripts/build-docker.sh 2>&1 | tee "$LOGFILE"

# Also works for compose, test runs, etc
LOGFILE="/tmp/pytest-$(date +%Y%m%d-%H%M%S).log"
pytest --tb=short 2>&1 | tee "$LOGFILE"
```

**Why This Matters**:
- Docker builds can take 5-15 minutes (especially with PyTorch)
- User can monitor progress by reading log file: `tail -f /tmp/docker-build-*.log`
- Terminal timeout doesn't lose output (preserved in file)
- Easy to share logs for debugging or review
- Timestamped naming prevents overwriting previous runs

**Timeout Settings**:
```python
# For Docker builds - use long timeout or background mode
Bash(command="...", timeout=600000)  # 10 minutes
Bash(command="...", run_in_background=True)  # No timeout, check with BashOutput
```

**User Workflow**:
1. Claude starts build with `tee` to log file
2. User can check progress: `tail -f /tmp/docker-build-20251203-2330.log`
3. Claude can check output: `BashOutput(bash_id="...")`
4. After completion, log remains for review

**Reference**: Session 2025-12-03 (user request during E2E testing)

---

### 8. MCP Config Persistence - Track User Intent vs Env Var Defaults

**Problem**: Environment variable defaults (e.g., `CUSTOM_COMPETITORS=hightouch,stitch`) re-add competitors on every container restart, even after users explicitly removed them via MCP tools.

**Root Cause**: Module-level initialization runs on every startup, merging env var into config without tracking user-initiated removals.

**Solution**: Track user intent with `removed_by_user: []` list in config schema:

```yaml
# config/context.yaml
competitors:
  supported: ["fivetran", "airbyte", "dbt", "snowflake", "databricks"]
  additional: ["hightouch", "stitch", "prefect"]
  removed_by_user: ["blueberry"]  # User explicitly removed these
```

```python
# src/contendre/server.py - Startup merge logic
def merge_custom_competitors() -> None:
    """ALWAYS runs on startup, but respects user removals."""
    custom_competitors = os.environ.get("CUSTOM_COMPETITORS", "").strip()
    if not custom_competitors:
        return

    new_competitors = [comp.strip().lower() for comp in custom_competitors.split(",")]
    removed_by_user = config["competitors"].get("removed_by_user", [])
    additional = config["competitors"].get("additional", [])

    # Add only new competitors, skip those explicitly removed by user
    for comp in new_competitors:
        if comp in removed_by_user:
            logger.info(f"Skipping '{comp}' (explicitly removed by user)")
            continue
        if comp not in additional:
            additional.append(comp)
```

```python
# src/contendre/tools/config_manager.py - User removal tracking
def remove_competitor(self, name: str) -> str:
    """Remove competitor and track user intent."""
    additional.remove(name)

    # Track that this was explicitly removed by user
    removed_by_user = competitors.setdefault("removed_by_user", [])
    if name not in removed_by_user:
        removed_by_user.append(name)

    self.save_config(config)
    return f"Removed '{name}' from tracking."

def add_competitor(self, name: str) -> str:
    """Add competitor and enable un-remove feature."""
    additional.append(name)

    # If this was previously removed, un-remove it
    removed_by_user = competitors.get("removed_by_user", [])
    if name in removed_by_user:
        removed_by_user.remove(name)

    self.save_config(config)
    return f"Added '{name}' to additional competitors."
```

**Key Insights**:
- **Env vars are defaults, not overrides** - User actions always take precedence
- **Module initialization runs every startup** - Must be idempotent and respect user state
- **Track intent, not just current state** - Need separate list for "user removed" vs "not in config"
- **Enable un-remove** - Users can change their mind by re-adding via MCP tool

**User Workflow**:
1. Set `CUSTOM_COMPETITORS=blueberry,banana` in Claude Desktop config → Added on first startup
2. Remove "blueberry" via MCP `remove_competitor` tool → Added to `removed_by_user` list
3. Container restarts → `merge_custom_competitors()` runs but SKIPS "blueberry"
4. Disable/re-enable MCP extension → Removal still persists ✓
5. Re-add "blueberry" via `add_competitor` → Removed from `removed_by_user` (un-remove)

**Testing Requirements**:
- Test full lifecycle: add → remove → restart → verify persistence
- Test un-remove: remove → add → restart → verify re-addition
- Test CUSTOM_COMPETITORS skips removed items

**Design Alternatives Considered**:
- **Option A (implemented)**: Track `removed_by_user` - env var always runs, skips removed
- **Option B (rejected)**: One-time only merge - breaks adding new defaults in future releases
- **Option C (rejected)**: Merge only new items - complex diff logic, prone to bugs

**Reference**: Session 2025-12-05, commit `5bdea16` - fix: Track removed competitors

---

### 9. AI Model Pre-Download - Bake into Docker Image

**Problem**: Container appeared to "hang" for 30-60 seconds on startup while downloading sentence-transformers model (~90MB) with no user feedback. Docker builds hung for 15+ minutes when trying to download model due to progress bar blocking in non-TTY environment.

**Root Cause**:
1. Sentence-transformers downloads model from HuggingFace on first use (runtime download)
2. Progress bars from tqdm/transformers/huggingface_hub block indefinitely in Docker non-TTY environment
3. No user-facing messages explaining the delay

**Solution**: Pre-download model during Docker build + comprehensive progress bar suppression.

```dockerfile
# Dockerfile - Pre-download AI model with progress bar suppression
RUN TRANSFORMERS_VERBOSITY=error \
    TOKENIZERS_PARALLELISM=false \
    HF_HUB_DISABLE_PROGRESS_BARS=1 \
    python -c "import os; \
    os.environ['TQDM_DISABLE'] = '1'; \
    from functools import partialmethod; \
    from tqdm import tqdm; \
    tqdm.__init__ = partialmethod(tqdm.__init__, disable=True); \
    from sentence_transformers import SentenceTransformer; \
    print('⏳ Pre-downloading AI model for change detection...'); \
    SentenceTransformer('all-MiniLM-L6-v2'); \
    print('✅ AI model cached in Docker image')"
```

```python
# src/contendre/storage/vector_store.py - User-facing loading messages
logger.info("⏳ Loading AI model for change detection (may take 30-60s on first run)...")
self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name=embedding_model
)
logger.info(f"✅ AI model '{embedding_model}' loaded successfully")
```

**Benefits**:
- ✅ Model loads in 6.8 seconds (vs 30-60s downloading)
- ✅ Docker build completes in 25.4 seconds (vs 15+ min hang)
- ✅ Clear user messaging ("AI model" not "embeddings")
- ✅ No silent delays that appear broken

**Technical Approach**:
- **Environment variables** (`TRANSFORMERS_VERBOSITY`, `HF_HUB_DISABLE_PROGRESS_BARS`, `TOKENIZERS_PARALLELISM`) suppress library-level progress output
- **tqdm monkey-patching** via `functools.partialmethod` ensures comprehensive suppression (catches cases where libraries ignore env vars)
- **Dual strategy**: Environment-level suppression + in-process patching for maximum coverage

**Why Both Approaches**:
- Libraries may check env vars at import time but create tqdm instances later
- Monkey-patching ensures tqdm is disabled regardless of when it's instantiated
- Some libraries (transformers, huggingface_hub) respect env vars, others (sentence-transformers) may not

**When to Use**:
- Any ML/AI Docker image using models that download on first use
- Any Docker RUN command using Python libraries with progress bars (pip, conda, etc.)
- Development containers where startup time matters (MCP servers, CLI tools)

**User Experience Impact**:
- **Before**: 30-60s silent hang → appears broken → poor first impression
- **After**: 6.8s with clear messages → professional UX → builds trust

**Reference**: Session 2025-12-09, commits `7d06b8c`, `74b76f5` - AI Model Loading UX + Docker Build Optimization

---

### 10. No Network Connections at Module Import Time

**Problem**: CI Docker runtime test (`contendre --help`) crashed because `server.py` instantiated `QueryService()` at module level, which opened a ChromaDB `HttpClient` connection. No ChromaDB server running in CI container → crash on import.

**Root Cause**: `query_service = QueryService()` at module level (line 219) — added in commit `0836aed` (Dec 28). Broke CI for 7 weeks before diagnosis.

**Solution**: Lazy singleton pattern — defer initialization to first actual use.

```python
# ❌ WRONG - Network call at import time
query_service = QueryService()  # Connects to ChromaDB immediately

# ✅ CORRECT - Lazy initialization
_query_service: QueryService | None = None

def get_query_service() -> QueryService:
    global _query_service
    if _query_service is None:
        _query_service = QueryService()
    return _query_service
```

**Rule**: Module-level code must be side-effect-free (no network, no file I/O that can fail, no database connections). Anything that requires external services should be lazy-initialized or deferred to `main()`.

**Reference**: Session 2026-02-15, commit `cad4657` (#first:2026-02-15)

---

### 11. WSL Cron Unreliable — Use Anacron for Scheduled Jobs

**Problem**: Cron job scheduled for 6am never fired because WSL was asleep (laptop closed). Cron daemon was running but the 6am window was missed entirely.

**Root Cause**: WSL suspends when the host machine sleeps. Cron doesn't catch up on missed jobs — if the scheduled time passes while suspended, the job is simply skipped.

**Solution**: Use anacron (catches up on missed jobs) triggered by cron hourly.

```bash
# ~/.anacron/etc/anacrontab
# period  delay  identifier        command
1         10     contendre.metrics  /path/to/collect-metrics.sh >> /path/to/cron.log 2>&1

# User crontab — triggers anacron hourly (catches up within 1hr of wake)
@hourly /usr/sbin/anacron -t ~/.anacron/etc/anacrontab -S ~/.anacron/spool
```

**Key Details**:
- `~/.anacron/spool/` stores timestamps of last run (no sudo needed)
- Period `1` = daily; anacron checks if it ran today, runs if not
- Delay `10` = wait 10 min after wake before running (avoids startup contention)

**Reference**: Session 2026-02-17 (#first:2026-02-17)

---

### 12. Docker Volumes Are Not Host-Accessible — Sync Cache Files Explicitly

**Problem**: Pipeline runs inside Docker write cache files to a Docker volume (`contendre_data:/data`). Metrics collector runs on the host and can't read them at `./data/changes/`.

**Solution**: After the Docker pipeline run, create a temporary container to copy files from the volume to the host.

```bash
# Sync cache files from Docker volume to host
CONTAINER_ID=$(docker create --rm -v "${PROJECT}_contendre_data:/data:ro" busybox true)
docker cp "$CONTAINER_ID:/data/changes/." "$HOST_DATA_DIR/changes/" 2>/dev/null || true
docker rm "$CONTAINER_ID" > /dev/null 2>&1 || true
```

**Alternative**: Use `docker compose run --rm -v ./data:/host-data contendre` with a bind mount, but this mixes Docker and host paths.

**Reference**: Session 2026-02-17, `scripts/collect-metrics.sh` (#first:2026-02-17)

---

### 13. ChromaDB `is_latest` Flag Corruption — Use `upsert()` Not `add()`

**Problem**: After running the daily scraper twice on the same day, ALL items in ChromaDB had `is_latest=False`. The MCP `query_recent_changes` tool returned "No changes detected" because it filters by `where={"is_latest": True}`.

**Root Cause** (chain of failures):
1. Second run calls `_mark_previous_snapshots_old()` → ALL existing items set to `is_latest=False`
2. Second run calls `collection.add()` with same-date doc IDs → raises `DuplicateIDError`
3. Exception caught per-source by orchestrator's `except Exception` handler
4. No `is_latest=True` items ever re-added → all 7,823 items stuck at `is_latest=False`

**Fix**: Change `collection.add()` to `collection.upsert()` — idempotent, no DuplicateIDError on same-date re-run.

```python
# ❌ WRONG - DuplicateIDError on same-day re-run, silently corrupts is_latest
collection.add(documents=documents, metadatas=metadatas, ids=ids)

# ✅ CORRECT - Idempotent, safe to run multiple times per day
collection.upsert(documents=documents, metadatas=metadatas, ids=ids)
```

**Silent Corruption**: The bug showed no errors during the scraper run — each per-source exception was swallowed. Only symptoms were visible at query time ("No changes detected").

**Data Repair Pattern** (when corrupted):
```python
# For each _history collection, find max snapshot_date and reset is_latest=True
for collection_name in [c for c in all_collections if c.endswith("_history")]:
    all_items = collection.get()
    if not all_items["ids"]:
        continue
    max_date = max(m["snapshot_date"] for m in all_items["metadatas"])
    for item_id, metadata in zip(all_items["ids"], all_items["metadatas"]):
        new_meta = dict(metadata)
        new_meta["is_latest"] = (metadata["snapshot_date"] == max_date)
        collection.update(ids=[item_id], metadatas=[new_meta])
```

**Reference**: Session 2026-02-23, commit `431459f` (`vector_store.py:163`) (#first:2026-02-23)

---

### 14. `pyproject.toml` Entry Point Must Match CLI Entrypoint, Not Server

**Problem**: `contendre metrics report` routed to `server.py:main()` (MCP server) instead of the CLI, so it started an MCP server and hung instead of showing the metrics report.

**Root Cause**: `pyproject.toml` had `contendre = "contendre.server:main"` — leftover from when server was the only entrypoint.

**Fix**:
```toml
# ❌ WRONG - Routes CLI to MCP server
[project.scripts]
contendre = "contendre.server:main"

# ✅ CORRECT - Routes to CLI dispatcher
[project.scripts]
contendre = "contendre.cli:main"
```

**Rule**: The console script entry point should be the CLI dispatcher (`cli.py:main()`), not the server. The server has its own invocation path (`python -m contendre.server`).

**Reference**: Session 2026-02-23, commit `431459f` (#first:2026-02-23)

---

## When to Apply These Patterns

1. **PyTorch Layer Separation**: Always when using custom index URLs or large ML frameworks
2. **Image Sharing**: Whenever multiple services run same codebase with different entrypoints
3. **E2E Testing Hierarchy**: Before every beta launch or major distribution change
4. **GHCR Authentication**: When setting up new dev environment or CI/CD pipeline
5. **Volume Separation**: When designing multi-tenant or user-configurable Docker services
6. **Git-Based Versioning**: At project start for all Docker-distributed applications (especially MCP servers)
7. **Long-Running Commands Logging**: For any Docker command >1 minute (builds, tests, multi-stage)
8. **MCP Config Persistence**: When MCP tools modify config AND env vars provide defaults
9. **AI Model Pre-Download**: Any Docker image using ML models with runtime downloads (transformers, sentence-transformers, etc.)
10. **No Module-Level Network Calls**: When adding services/clients that connect to external systems (databases, APIs)
11. **Anacron over Cron on WSL**: For any scheduled job on a laptop/WSL that may sleep through the scheduled time
12. **Docker Volume Sync**: When host-side tools need to read files produced by containerized workloads
13. **ChromaDB upsert over add**: Whenever storing snapshots that might be re-run on same date
14. **pyproject.toml entry point**: Always verify entry point routes to CLI dispatcher, not MCP server

---

## Anti-Patterns Observed

1. **Removing layer separation to "fix" build** → Results in different image (CUDA instead of CPU)
2. **Testing only local builds** → Misses GHCR distribution issues
3. **Echoing secrets in bash commands** → Security vulnerability
4. **Single volume for config + data** → Forces full reset on config changes
5. **Env vars overriding user actions** → Re-adds removed items on restart, frustrating user experience
6. **Implementing fixes without design discussion** → Hasty solutions, missing better alternatives
7. **Ignoring progress bars in Docker builds** → 15+ min hangs, appears broken, wastes dev time
8. **Silent long operations** → Users assume tool is broken, poor first impression
9. **Module-level service initialization** → Breaks CLI --help, CI tests, any non-server import path

---

## Reference Examples

### Session 2025-12-03 - E2E Testing & Docker Optimization
- **Issue**: PyTorch wheel installation failure
- **Investigation**: Tested torch repository in isolation (fresh python:3.11-slim)
- **Solution**: Split into separate RUN command
- **Verification**: Built successfully, image size correct (2.76GB)
- **User feedback**: "why did we remove this logic? I'm confused" → Caught over-simplification

### Key Metric
- **Disk space saved**: 2.76GB (image sharing optimization)
- **Build reliability**: 100% (after layer separation fix)
- **E2E coverage**: GHCR distribution + volume persistence + docker-compose integration
