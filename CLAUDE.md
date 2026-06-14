# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## *LEARNING SYSTEM - READ THIS FIRST*

**Purpose**: The `docs/learnings/` system exists primarily for **Claude Code (me) to consume**.

**Structure**:
- `docs/learnings/universal/` - Transferable principles (copied from template)
- `docs/learnings/project/` - Project-specific patterns (created during development)
- `docs/learnings/INDEX.md` - Quick reference hub (read at session start)

**When Claude reads learnings**:
- **Session start** (`/start`): Read INDEX.md + relevant topic file for TODO item
- **Context compacting**: Use `/relearn` command to restore critical context
- **Session end** (`/wrapup`): Update learnings with new insights

**Key principle**: Learnings change Claude's behavior. If a principle doesn't affect how Claude works, it's documentation (belongs in docs/ or comments), not a learning.

---

## *CONTEXT COMPACT PROTOCOL*

**When you notice context has compacted (conversation feels "fresh" or you lack project context):**

1. **IMMEDIATELY ask user to run**: `/relearn`
2. **Don't proceed** with work until context is restored
3. **Don't guess** at project patterns or guidelines

**Trigger signals indicating context loss:**
- ⚠️ User mentions something you should know but don't remember
- ⚠️ You're about to violate a principle from CLAUDE.md (but don't know it)
- ⚠️ You don't recognize project-specific patterns or architecture
- ⚠️ You suggest creating files that likely already exist
- ⚠️ You ask questions that are answered in REQUIREMENTS.md
- ⚠️ You don't follow the branching workflow (feature branches)
- ⚠️ Token usage shows you're near the start of conversation but mid-task

**What NOT to do:**
- ❌ Don't continue work without context (leads to violations of guidelines)
- ❌ Don't manually read files one-by-one (use `/relearn` for systematic refresh)
- ❌ Don't assume you remember - explicitly verify with `/relearn`

**Response template when context loss detected:**
```
⚠️ I notice my context may have compacted. Before continuing, please run:

  /relearn

This will restore my knowledge of:
- Project guidelines and workflow (CLAUDE.md)
- Key learnings and principles (INDEX.md)
- Product requirements (REQUIREMENTS.md)
- Current work context (from conversation/git)

I'll wait for the context refresh before proceeding.
```

---

## *IMPORTANT ARCHITECTURAL GUIDELINES*
- Always prioritize user value and simplicity
- Always ensure that solutions maintain security
- **AVOID WORKAROUNDS AT ALL COSTS** - When encountering issues, find and fix the root cause instead of adding workarounds, fallbacks, or complex parsing logic that masks the real problem
- **TRUST AI-EXTRACTED DATA** - When the AI has already validated and extracted data, don't add unnecessary formatting or parsing logic. Just display it with proper treatment
- **DON'T OVER-ENGINEER** - Avoid creating unnecessary utility functions, complex formatters, or modules when simple logic suffices. If it's already structured data, use it as-is
- **ROOT CAUSE INVESTIGATION OVER SYMPTOM FIXING** - When something appears wrong or requires complex processing to be usable, trace the issue back through the entire pipeline to find where it gets corrupted
- **NEVER DECLARE SUCCESS WITHOUT VERIFICATION** - Do not mark debugging sessions or fixes as "complete" or "working perfectly" until you have confirmed the solution actually resolves the issue. Build success ≠ functional success. Always test the actual user flow that was broken before claiming victory
- Ask me before adding workarounds and defaults (especially when those might hide issues in the flow)

### **MANDATORY: Root Cause Investigation Checklist**

Before fixing ANY test failure, error, or unexpected behavior, complete this checklist:

1. **Trace the value back to source**:
   - WHERE is this value created? (file:line)
   - WHAT formula/logic produces it?
   - CAN it mathematically produce the observed value?

2. **Question the symptom**:
   - Is this value SUPPOSED to be possible?
   - If "no" → Fix the source, not the test
   - If "yes but rare" → Still fix the source with defensive logic

3. **Before modifying tests** (tolerance, type changes, assertions):
   - Ask: "Am I hiding a bug in application code?"
   - Propose the test change to user FIRST
   - Explain WHY the value can occur and WHERE it's created

4. **Red flags that indicate workaround thinking**:
   - "Just increase the tolerance to..."
   - "Add a try/except around..."
   - "Parse the output with regex..."
   - "Add a fallback for when..."
   - **STOP**: Investigate root cause instead

**Example (this session)**:
- ❌ Bad: "ChromaDB returns >1.0, change test to `<= 1.001`"
- ✅ Good: "Trace back → embedding_manager.py:224 formula → ChromaDB returns tiny negative distances → Add clamping in application code"

---

### 🛑 STOP - Coding Implementation Triggers

**BEFORE writing implementation code, read: [`docs/learnings/universal/CODING-PRINCIPLES.md`](docs/learnings/universal/CODING-PRINCIPLES.md)**

**Critical checkpoints during implementation:**

**🛑 STOP - Before Adding Error Handling**
- If you're about to write `try/except`, `catch`, or error handling → Read CODING-PRINCIPLES.md #1-2
- Ask: WHERE does this error originate? Can I fix the root cause?
- Use: Root Cause Investigation Checklist (above)

**🛑 STOP - Before Adding Data Parsing/Validation**
- If you're about to add parsing, regex, sanitization, or data validation → Read CODING-PRINCIPLES.md #2-3
- Ask: Why isn't this data already structured? Can I fix upstream (AI prompt, API, data source)?
- Remember: Trust validated data - don't re-validate internal data

**🛑 STOP - Before Extracting Functions/Creating Utilities**
- If you're about to extract a function or create a utility → Read CODING-PRINCIPLES.md #4
- Ask: Used in 3+ places? Adds actual user value? Simpler than inline?
- Use: Over-Engineering Check (in CODING-PRINCIPLES.md)

**🛑 STOP - Before Adding Fallbacks/Defaults**
- If you're about to add fallback logic, default values, or "just in case" handling → Read CODING-PRINCIPLES.md #1
- Ask: "Are we adding a workaround again?" What's the root cause?
- Remember: Avoid workarounds at all costs

**🛑 STOP - After Completing Implementation (BEFORE moving to next phase)**
- **MANDATORY**: Add tests for all code changes
- Use: Test Coverage Checklist (CODING-PRINCIPLES.md)
- Verify: Run tests and check coverage didn't drop
- Red flag: "I'll add tests later" → Add them NOW

---

- Make sure that changes are broken to small self-contained phases. Propose to commit and clear the context at the end of each phase
- Ask me clarifying questions if something (e.g., the requirements, role or directions) are unclear

## *AGENT USAGE GUIDELINES*
- **CAPABILITY-PLANNER USAGE**: Automatically trigger for requests containing "plan", "design", "architect", "implement", "add", "create", "build" or comprehensive analysis requests. Essential for plan mode and complex feature planning.

## *TESTING & DEPLOYMENT WORKFLOW*

### When to Run Tests (Realistic Balance)

**ALWAYS Test Before:**
- ✅ **Deployment** (MCP server, production changes) - NON-NEGOTIABLE
- ✅ **Pushing to main/shared branches** - Prevents sharing broken code
- ✅ **Completing a bug fix** - Add regression test, verify all tests pass

**Sometimes Test:**
- ⚠️ During iteration (5-10 commits while building) - use judgment
- ⚠️ For trivial changes (docstrings, type hints) - low risk

**Testing Commands:**
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_contendre_server.py

# Run with coverage
pytest --cov=src/contendre --cov-report=html

# Run integration tests (if they exist)
pytest tests/integration/
```

### Mandatory Pre-Push Checklist (AUTOMATED via `/checkpoint` and `/wrapup`)

**⚠️ CRITICAL: Tests are AUTOMATICALLY enforced by our branching workflow.**

**The `/checkpoint` and `/wrapup` commands automatically run:**
```bash
# 1. Run all tests (NO EXCEPTIONS)
pytest --tb=short

# 2. Check code formatting (NO EXCEPTIONS)
black --check src/ tests/

# 3. Run linter (NO EXCEPTIONS)
ruff check src/ tests/

# 4. Run type checker (NO EXCEPTIONS)
mypy src/
```

**Both commands BLOCK if any check fails** - you cannot push broken code.

**Why this is enforced:**
- `/checkpoint` - Ensures WIP branches are always in working state
- `/wrapup` - HARD REQUIREMENT before merging to main
- No manual checklist needed - automation prevents mistakes
- If tests fail: Fix before proceeding (no exceptions)

**Manual Push** (if not using `/checkpoint`/`/wrapup`):
If you need to push manually (rare), run all 4 commands above first.

---

### Pre-Deployment Checklist (For Major Changes)

**Before deploying significant features:**

1. **Identify what changed** this session (modules, tools, data sources)

2. **Run comprehensive tests**:
   - Run full test suite (not just changed modules)
   - Test integration points
   - Verify coverage hasn't dropped

3. **Verify all tests + linting pass** - Use checklist above

4. **Regression test check** - If you fixed a bug:
   - Ask: "Could this bug happen again?"
   - If YES: Add regression test
   - Document what it prevents

5. **Report readiness**:
   - "✅ Tests passing: [all 260 tests]"
   - "✅ Linting clean: black + ruff + mypy passing"
   - "✅ Coverage: [X]%"
   - "Ready to deploy"

### When to Add Regression Tests

**High Value (Always Propose)**:
- Bug that caused MCP tool failure
- Bug that could silently corrupt ChromaDB data
- Bug that only appears with specific queries (edge cases)
- Bug that took >30 minutes to debug

**Medium Value (Use Judgment)**:
- Bug in well-tested module (gap in coverage)
- Bug that could affect multiple MCP tools

**Low Value (Skip)**:
- One-off environment issue
- Typo in logging messages
- Documentation-only bug

**Test Effort Rule**: If test takes <15 minutes to write and prevents hours of future debugging → ADD IT

### Learning Resources

**Before any task**, consult:
- `docs/learnings/INDEX.md` - Quick reference hub (Top 10 principles, cross-cutting themes)
- `docs/learnings/universal/` - Universal principles from template
- `docs/learnings/project/` - Project-specific patterns (created as we work)

**Relevant topic files**:
- `TESTING.md` - Testing principles, QA approach, infrastructure
- `DEBUGGING.md` - Verification discipline, systematic investigation
- `ARCHITECTURE.md` - Design decisions, simplicity, root cause fixes
- `CI-CD.md` - Local verification, deployment, workflow debugging
- `PROCESS.md` - User collaboration, session management, documentation
- `AI-PROMPTS.md` - Token budgets, prompt design, validation

**Key sections to reference in TESTING.md**:
- "When to Apply These Principles" - Workflow guidance
- "Anti-Patterns to Avoid" - What NOT to do
- "Reference Examples" - Real-world patterns

---

## *PROJECT-SPECIFIC CONFIGURATION*

### Virtual Environment Setup

**IMPORTANT**: This project uses a Python virtual environment (`.venv/`) to manage dependencies.

**On WSL/Linux (and likely other platforms):**
- All `pip` and `python` commands MUST be run within the virtual environment
- Use `source .venv/bin/activate` before any Python operations
- The virtual environment is located at `./.venv/`

**Session Start Checklist:**
1. Activate virtual environment: `source .venv/bin/activate`
2. Verify activation: `which python` should show `.venv/bin/python`
3. Install dependencies if needed: `pip install -e ".[dev]"`

**Why This Matters:**
- System Python is externally managed (can't install packages without `--break-system-packages`)
- Virtual environment keeps project dependencies isolated
- All development tools (pytest, black, ruff, mypy) installed in `.venv/`

### Development Commands

**⚠️ ALWAYS activate virtual environment first: `source .venv/bin/activate`**

```bash
# Virtual Environment
source .venv/bin/activate               # Activate virtual environment (REQUIRED)
which python                            # Verify you're in venv (should show .venv/bin/python)

# MCP Server Development
python -m src.contendre.server          # Run MCP server (connects to Claude Desktop)

# Testing
pytest                                  # Run all tests
pytest tests/test_contendre_server.py   # Run specific test file
pytest --cov=src/contendre              # Run with coverage report
pytest -v                               # Verbose output

# Linting & Formatting
black src/ tests/                       # Format code with Black
ruff src/ tests/                        # Lint with Ruff
mypy src/                               # Type checking

# Dependencies
pip install -e .                        # Install in editable mode (runtime only)
pip install -e ".[dev]"                 # Install with dev dependencies

# Docker Build (with automatic versioning)
./scripts/build-docker.sh                       # Build CPU image with git-based version
PYTORCH_VARIANT=cuda ./scripts/build-docker.sh  # Build GPU image (opt-in)
docker inspect contendre:latest | jq '.[0].Config.Labels'  # Check version metadata

# Claude Desktop Integration
# (MCP servers are registered in Claude Desktop config)
# Test connection: Ask Claude "Can you list available MCP tools?"

# MCP Bundle (.mcpb) Package Build
# ⚠️ CRITICAL: Must be run from mcp-package/ directory, NOT project root
cd mcp-package/                     # Change to mcp-package directory (REQUIRED!)
./build-mcpb.sh                     # Build .mcpb package (creates contendre-<version>.mcpb)
cd ..                               # Return to project root
```

**Docker Versioning**: Images built with `./scripts/build-docker.sh` include automatic version metadata from git (see `backlog/DOCKER_VERSIONING.md` for details).

**MCP Bundle (.mcpb) Build Process**:
- **⚠️ CRITICAL**: The `build-mcpb.sh` script MUST be run from within the `mcp-package/` directory
- Running from project root will fail (manifest.json not found)
- The script:
  - Validates `manifest.json` (MCPB 0.3 spec)
  - Reads version from `manifest.json`
  - Creates ZIP archive named `contendre-<version>.mcpb`
  - Requires `jq` and `zip` utilities installed
- After building: Test by installing in Claude Desktop → Settings → Developer → Install from file

### Project Architecture

**Tech Stack**:
- **Language**: Python 3.11+
- **MCP Integration**: Official MCP Python SDK
- **Vector Database**: ChromaDB (embedded mode)
- **LLM**: Hybrid approach
  - Gemini Flash API (free tier) for complex reasoning
  - Local phi3:3.8b for simple tasks (future)
- **Web Scraping**: BeautifulSoup4 + requests
- **Reddit API**: PRAW (Python Reddit API Wrapper)
- **Testing**: pytest, pytest-cov
- **Linting**: Black (formatter), Ruff (linter), mypy (type checking)

**Directory Structure**:
```
contendre/
├── src/contendre/                 # Main package
│   ├── __init__.py
│   ├── server.py               # MCP server entry point
│   ├── tools/                  # MCP tool implementations
│   │   ├── compare_products.py
│   │   ├── analyze_sentiment.py
│   │   └── fetch_company_data.py
│   ├── orchestrator/           # Query orchestration
│   │   ├── query_planner.py
│   │   └── source_router.py
│   ├── sources/                # Data source integrations
│   │   ├── web_scraper.py
│   │   ├── pdf_ingestion.py
│   │   └── reddit_client.py
│   ├── synthesis/              # LLM synthesis
│   │   ├── gemini_client.py
│   │   └── prompt_templates.py
│   └── storage/                # ChromaDB interface
│       └── vector_store.py
├── tests/                      # Test files mirror src/ structure
│   ├── test_server.py
│   ├── tools/
│   ├── sources/
│   └── fixtures/
├── config/                     # Configuration files
│   └── context.yaml            # "Our company" context
├── backlog/                    # Planning documents
│   ├── REQUIREMENTS.md
│   ├── PROJECT_PLAN.md
│   └── ROADMAP.md
└── pyproject.toml              # Project metadata & dependencies
```

**Key Architectural Patterns**:
- **MCP Server Pattern**: Server exposes tools, Claude Desktop calls them via JSON-RPC
- **Query Orchestration**: Router decides RAG vs web scraping based on query type
- **Source Abstraction**: Each data source (web, PDF, Reddit) has standardized interface
- **Synthesis Pipeline**: Raw data → extraction → validation → LLM synthesis → structured output

**Data Flow**:
```
User Query (via Claude Desktop)
    ↓
MCP Server (server.py)
    ↓
Query Orchestrator
    ├─→ RAG Engine (ChromaDB) - for cached/static knowledge
    ├─→ Web Scraper - for real-time product pages
    └─→ Reddit Analyzer - for sentiment
    ↓
Synthesis Engine (Gemini)
    ↓
Structured Response
    ↓
User (via Claude Desktop)
```

**Environment Configuration**:
```bash
# Required environment variables
GEMINI_API_KEY=your_api_key_here     # For Gemini Flash API
REDDIT_CLIENT_ID=your_client_id      # For PRAW (Reddit)
REDDIT_CLIENT_SECRET=your_secret     # For PRAW

# Optional
CONTENDRE_DEBUG=true                    # Enable debug logging
CHROMA_PERSIST_DIR=./data/chroma     # ChromaDB storage location
```

### Code Style Guidelines

**Python Style**:
- **PEP 8** compliance (enforced by Black + Ruff)
- **Type hints**: Use for all function signatures (checked by mypy)
- **Docstrings**: Google style for all public functions and classes
- **Line length**: 100 characters (Black default)
- **Imports**: Grouped (stdlib, third-party, local) and sorted

**Naming Conventions**:
- `snake_case` for functions, variables, modules
- `PascalCase` for classes
- `UPPER_CASE` for constants
- Private methods: `_leading_underscore`

**Module Organization**:
```python
"""Module docstring explaining purpose."""

# Standard library imports
import os
from typing import Optional

# Third-party imports
from chromadb import Client
import requests

# Local imports
from contendre.storage import VectorStore

# Constants
MAX_RETRIES = 3

# Classes/Functions
class ToolName:
    """Class implementing MCP tool."""
    ...
```

**Comment Style**:
- Prefer docstrings over inline comments
- Inline comments for non-obvious logic only
- TODO comments: `# TODO(username): Description of what needs to be done`

### Testing Guidelines

**Test Framework**: pytest with standard plugins

**Test File Organization**:
- Mirror `src/` structure in `tests/`
- Test file naming: `test_<module_name>.py`
- Test function naming: `test_<function>_<scenario>_<expected_outcome>`

**Example**:
```python
def test_compare_products_with_valid_inputs_returns_structured_comparison():
    """Test that compare_products returns expected structure with valid product names."""
    result = compare_products("GitLab", "GitHub")
    assert "features" in result
    assert "sources" in result
    assert len(result["sources"]) > 0
```

**Mock Patterns**:
- Mock external APIs (Gemini, Reddit, web requests)
- Use `pytest.fixture` for reusable test data
- ChromaDB: Use in-memory client for tests
- Prefer `unittest.mock` or `pytest-mock`

**Test Data**:
```python
@pytest.fixture
def sample_product_data():
    """Fixture providing sample product comparison data."""
    return {
        "product_a": "GitLab",
        "product_b": "GitHub",
        "aspects": ["features", "pricing", "integrations"]
    }
```

**Coverage Requirements**:
- Target: 80% coverage for core modules (tools/, orchestrator/, synthesis/)
- 60% acceptable for data source integrations (external dependencies)
- Run: `pytest --cov=src/contendre --cov-report=html`

**Integration Test Patterns**:
- Test MCP tool end-to-end (mock only external APIs, not internal modules)
- Use `tests/integration/` for tests that touch multiple modules
- Mark slow tests: `@pytest.mark.slow`

**Cleanup Requirements**:
- ChromaDB: Clean up test collections after each test
- Temporary files: Use `pytest.fixture` with teardown
- API mocks: Reset between tests

---

## *VERY IMPORTANT OPERATIONS GUIDELINES*

### Branching Workflow (Feature-Based Development)

**IMPORTANT**: All development work should happen on feature branches, not main.

**Branch Strategy**:
- **Main branch**: Protected, always deployable, tests must pass
- **Feature branches**: Short-lived (0.5-3 days), one per TODO item
- **Branch naming**: Auto-generated from TODO items with type prefixes
  - `feature/` - New features (default)
  - `fix/` - Bug fixes
  - `test/` - Test additions
  - `docs/` - Documentation
  - `refactor/` - Code refactoring

**Complete Workflow**:

```
┌─────────────────────────────────────────────────────────┐
│ 1. START: Create feature branch from TODO               │
│    /start → feature/slack-integration                    │
│    - Auto-extracts branch name from TODO item            │
│    - Prompts if name is ambiguous/too long               │
│    - Creates and checks out branch                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 2. WORK: Develop on feature branch                      │
│    - Make changes, commit as needed                      │
│    - Run tests locally during development (optional)     │
│    - Use /checkpoint periodically (see below)            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CHECKPOINT: Save work-in-progress (optional)         │
│    /checkpoint                                           │
│    - Stashes uncommitted changes                         │
│    - Syncs with main (offers to merge if diverged)       │
│    - Runs full test suite (pytest + black + ruff + mypy) │
│    - Commits and pushes branch to GitHub                 │
│    - Safe to switch sessions or take breaks              │
│                                                          │
│    When to checkpoint:                                   │
│    - Before switching sessions (local ↔ web)             │
│    - After 5-7 commits or 45-60 min of work              │
│    - Before risky operations (major refactors)           │
│    - When suggested by Claude                            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 4. SWITCH: Work on different branch (optional)          │
│    /switch                                               │
│    - Lists all local and remote feature branches         │
│    - Auto-stashes uncommitted changes                    │
│    - Switches to selected branch                         │
│    - Restores stashed changes if returning to branch     │
│    - Enables parallel work on multiple features          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 5. WRAPUP: Merge to main and complete session           │
│    /wrapup                                               │
│    - Updates main branch (git pull)                      │
│    - Merges main into feature (conflict resolution)      │
│    - Runs FULL test suite (MANDATORY - blocks if fails)  │
│    - Merges feature → main                               │
│    - Pushes main + feature branch to GitHub              │
│    - Deletes local branch (keeps remote for history)     │
│    - Updates CHANGELOG, TODO, learnings                  │
│    - Commits documentation to main                       │
└─────────────────────────────────────────────────────────┘
```

**Key Principles**:
- ✅ **Always start with `/start`** - Auto-creates feature branch from TODO
- ✅ **Checkpoint frequently** - Enables safe multi-session work
- ✅ **Tests must pass** - Cannot checkpoint/wrapup with failing tests
- ✅ **Sync with main** - Reduces merge conflicts (offered at checkpoint/wrapup)
- ✅ **Keep branches** - Remote branches kept for 30 days (historical reference)
- ✅ **Use vi for conflicts** - WSL-friendly conflict resolution workflow

**Multi-Session Workflow**:
```bash
# Morning - Local WSL
/start → feature/slack-integration
... work 2 hours ...
/checkpoint → pushes to GitHub

# Afternoon - Claude Code Web
/continue → pulls feature/slack-integration
... work 1 hour ...
/checkpoint → pushes updates

# Evening - Local WSL
git pull origin feature/slack-integration (or just /start and continue)
... finish work ...
/wrapup → merges to main
```

**Parallel Branch Workflow**:
```bash
# Work on feature A
/start → feature/slack-integration
... work ...
/checkpoint

# Switch to feature B
/switch → choose or create feature/redis-caching
... work ...
/checkpoint

# Switch back to A
/switch → feature/slack-integration
... continue ...
/wrapup → merge feature A

# Later, finish B
/switch → feature/redis-caching
/wrapup → merge feature B
```

**Emergency Hotfix** (rare - main branch work):
- If you need to work directly on main (hotfix), just commit as before
- `/wrapup` detects main branch and skips merge workflow
- Consider using `/start` even for hotfixes (creates `fix/hotfix-name` branch)

---

### Standard Operations

- **Context compacting**: Re-read this CLAUDE.md file + `docs/learnings/INDEX.md`, then tell user you've re-read it
- **Wrapping up behavior**: Use `/wrapup` slash command which handles:
  1. **Feature branch merge** (if on feature branch - see workflow above)
  2. Session retrospective assessment
  3. CHANGELOG updates with all work done
  4. TODO cleanup (see TODO maintenance rules below)
  5. Learning files updates in `docs/learnings/` (distilled principles, not narratives)
  6. Commit and push documentation changes
  7. Report completion summary
- **Session start**: Use `/start` command (reads TODO, loads relevant learnings, **creates feature branch**, executes or plans)
- **Crash recovery**: Use `/continue` command (restores from ops/SAVED.md if it exists)
- **Learning system**:
  - Universal learnings in `docs/learnings/universal/` (from template, rarely changes)
  - Project learnings in `docs/learnings/project/` (evolves with this project)
  - INDEX.md provides quick reference (read at session start)
  - **Primary consumer**: Claude Code (these change how I work, not user documentation)

### TODO.md Maintenance Rules

**Structure** (3 sections, do not add others):
- **✅ Recently Completed** → **📋 Backlog** → **📚 Reference**

**Recently Completed**:
- Exactly 3 items, one line each (brief: what + date)
- When adding: remove oldest (bottom), add newest at top
- Moved-from items go to CHANGELOG.md (keeping detail)

**Backlog**:
- Single numbered list, ordered by priority (top = do next)
- Blocked/conditional items marked inline with ⏸️ and `— _blocked on: [condition]_`
- When completing an item: move to Recently Completed (rotating out oldest), remove from Backlog
- New items: insert at appropriate priority position, not just appended
- When user approves a plan: add as backlog item(s) at appropriate priority

**Reference**:
- Strategy doc links, completed milestones, guardrails, future ideas
- Rarely changes — only during strategy shifts or milestone completion

---

## *MCP-SPECIFIC GUIDELINES*

### MCP Tool Development

**Tool Registration Pattern**:
```python
from mcp import Tool, types

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """Register all available MCP tools."""
    return [
        types.Tool(
            name="compare_products",
            description="Compare two products across multiple dimensions",
            inputSchema={
                "type": "object",
                "properties": {
                    "product_a": {"type": "string"},
                    "product_b": {"type": "string"},
                    "aspects": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["product_a", "product_b"]
            }
        )
    ]
```

**Tool Implementation Best Practices**:
- Always validate inputs (use Pydantic models if complex)
- Return structured data with source attribution
- Handle errors gracefully (don't crash server)
- Log tool invocations for debugging
- Use async/await for I/O operations

**Error Handling**:
```python
try:
    result = await scrape_product_page(url)
except requests.RequestException as e:
    logger.error(f"Failed to scrape {url}: {e}")
    return {"error": f"Could not fetch data for {product_name}", "sources": []}
```

### Testing MCP Integration

**Test with Claude Desktop**:
1. Register MCP server in Claude Desktop config
2. Ask Claude "Can you list available MCP tools?"
3. Test each tool with real queries
4. Verify responses are well-formatted and accurate

**Mock MCP Calls in Tests**:
```python
@pytest.mark.asyncio
async def test_compare_products_tool():
    """Test compare_products MCP tool."""
    params = {"product_a": "GitLab", "product_b": "GitHub"}
    result = await compare_products(**params)
    assert result["product_a"] == "GitLab"
    assert "features" in result
```
