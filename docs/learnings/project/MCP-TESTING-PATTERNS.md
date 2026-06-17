# MCP Testing Patterns

**Purpose**: Project-specific testing strategies for Model Context Protocol (MCP) integration.

---

## Core Principles

### Handler-Level Testing

1. **Test at handler level, not just business logic** - MCP tools require handler-level testing because:
   - Parameter extraction from JSON-RPC requests (type coercion, validation)
   - Response formatting (dict → JSON serialization)
   - Error handling at protocol boundary
   - Business logic tests alone miss protocol integration issues
   (#first:2025-12-01)

2. **Multi-level testing strategy for MCP servers**:
   - **Unit tests**: Business logic (ConfigManager methods)
   - **Handler tests**: MCP tool handlers with mock server context
   - **Integration tests**: Full MCP server lifecycle (initialize → call_tool → shutdown)
   - Each level catches different failure modes
   (#first:2025-12-01)

### ChromaDB Type Safety & Change Detection

3. **ChromaDB metadata requires type guards for mypy compliance** - ChromaDB returns metadata with broad union types that require runtime type checking:
   - `metadata.get("similarity_score")` returns `str | int | float | SparseVector | None`
   - Use `isinstance(similarity_score, (int, float))` before numeric comparisons
   - Use `dict(metadatas[0])` to create mutable copy for updates (ChromaDB returns Mapping, not dict)
   - Always check `if metadatas and len(metadatas) > 0` before indexing
   - Pattern: `metadatas = result.get("metadatas"); if metadatas and len(metadatas) > 0: metadata = dict(metadatas[0])`
   (#first:2025-12-28)

3a. **Backfill must use change detection, not direct item insertion** - Critical bug: Backfill calling `add_item()` bypasses similarity score calculation:
   - **Symptom**: All backfilled snapshots have `similarity_score=None`, preventing proper change classification
   - **Root cause**: `add_item()` stores without comparison; `detect_changes()` compares + calculates scores
   - **Fix**: Use `detect_changes(source, items, snapshot_date)` for all historical data ingestion
   - **Impact**: First run = no scores (expected), Second+ runs = proper similarity scores via `find_similar_items(exclude_latest=True)`
   - **Test pattern**: Verify second backfill run calculates scores (tests/orchestrator/test_backfill.py:448-484)
   - User's clarifying question led to root cause: "You said there are 3 snapshots... so why aren't the 2nd and 3rd ones 'changes'?"
   (#first:2025-12-30)

### Claude Desktop Connection to Docker-Hosted Services

5. **Use docker exec for Claude Desktop when MCP server needs Docker-internal services** - If the MCP server depends on services inside Docker (ChromaDB, databases), the Claude Desktop config must use `docker exec -i` not WSL Python directly:
   ```json
   // ✅ CORRECT - runs inside Docker, can reach ChromaDB
   {"command": "docker", "args": ["exec", "-i", "contendre-prod-contendre-mcp-1", "python", "-m", "contendre.server"]}

   // ❌ WRONG - WSL Python can't reach Docker-internal ChromaDB (port not exposed)
   {"command": "wsl", "args": ["-d", "Ubuntu", "python", "-m", "contendre.server"]}
   ```
   Echo tool works either way (no ChromaDB needed), masking the issue until real tools are called.
   (#first:2026-02-22)

6. **Simulate MCP transport via terminal to isolate Claude Desktop failures** - When Claude Desktop returns empty results but you suspect data exists, pipe JSON-RPC directly to the container:
   ```bash
   printf '{"jsonrpc":"2.0","method":"initialize","params":{...},"id":0}\n{"jsonrpc":"2.0","method":"tools/call","params":{"name":"query_recent_changes","arguments":{"days":30}},"id":1}\n' \
     | docker exec -i <container> python -m contendre.server 2>/dev/null
   ```
   This immediately reveals whether the issue is transport, config, or data quality. In our case it showed 71 changes were returned correctly — proving the issue was the old Claude Desktop config still pointing to WSL Python.
   (#first:2026-02-22)

7. **docker logs doesn't capture docker exec stdout** - Processes spawned via `docker exec` write to the exec session (the caller's stdio), not to the container's main process log stream. When Claude Desktop connects via `docker exec`, tool call logs won't appear in `docker logs <container>`. Use debug logging inside the server or test directly with step 6 above.
   (#first:2026-02-22)

### Docker Distribution Testing

4. **Local .mcpb testing requires real Docker images** - Cannot fully test .mcpb package locally without published Docker image:
   - manifest.json references `ghcr.io/username/repo:tag`
   - Claude Desktop pulls image during installation
   - Local testing validates manifest structure, not runtime
   - Real validation: After CI publishes image, install in Claude Desktop
   (#first:2025-12-01)

4. **ghcr.io images are PRIVATE by default** - GitHub Container Registry images default to private visibility:
   - Requires authentication to pull (GitHub token)
   - Only repository owner can pull by default
   - Must explicitly publish to make public
   - Safe for beta testing before public launch
   (#first:2025-12-01)

---

## Testing Patterns

### MCP Handler Test Template

```python
import pytest
from mcp.server import Server
from mcp.types import TextContent
from unittest.mock import Mock

@pytest.mark.asyncio
async def test_mcp_tool_handler():
    """Test MCP tool at handler level (not just business logic)."""
    # Setup
    server = Server("test-server")
    mock_request = Mock()
    mock_request.params.arguments = {"key": "value"}

    # Execute handler
    result = await server.call_tool("tool_name", mock_request)

    # Verify protocol response
    assert len(result) == 1
    assert isinstance(result[0], TextContent)
    assert "expected_output" in result[0].text
```

### .mcpb Package Testing Workflow

```bash
# 1. Build package locally
./build-mcpb.sh

# 2. Validate manifest structure (syntax check)
cat mcp-package/manifest.json | jq .

# 3. Wait for CI to publish Docker image
gh run watch

# 4. Verify image exists
docker pull ghcr.io/username/repo:latest-cpu

# 5. Test installation in Claude Desktop
# - Settings → MCP Servers → Install from file
# - Select contendre-0.1.0.mcpb
# - Verify tools appear in Claude Desktop
```

---

## Anti-Patterns

- ❌ Testing only business logic, skipping handler tests
- ❌ Attempting to fully test .mcpb package without published Docker image
- ❌ Assuming ghcr.io images are public by default
- ❌ Skipping integration tests for MCP server lifecycle

---

## Reference Examples

### Example 1: Handler-Level Testing Catches Protocol Issues (#2025-12-01)

**Situation**: ConfigManager unit tests all passing, but MCP tool fails in Claude Desktop

**Investigation**:
- Business logic (add_competitor) works correctly
- Handler test revealed: JSON serialization failed for response dict
- Root cause: Response contained non-serializable objects

**Fix**: Add handler-level test to catch serialization issues

**Lesson**: Unit tests for business logic insufficient for MCP tools. Must test at handler level.

---

### Example 2: Docker Image Privacy Validation (#2025-12-01)

**User Question**: "Will my image be public or private?"

**Investigation**:
- Checked GitHub Actions workflow (no public flag)
- Confirmed: ghcr.io defaults to private visibility
- Verified: Only repository owner can pull

**Decision**: Keep private until license/terms finalized

**Lesson**: Always verify default visibility of container registries before deployment.

---

## When to Apply These Principles

### Before MCP Tool Deployment
- ✓ Write unit tests for business logic
- ✓ Write handler tests for MCP protocol integration
- ✓ Write integration tests for server lifecycle
- ✓ Verify Docker image privacy settings

### During .mcpb Package Development
- ✓ Validate manifest.json structure locally
- ✓ Wait for CI to publish Docker image
- ✓ Test installation in Claude Desktop with real image
- ✓ Don't rely on local-only validation

### When Adding New MCP Tools
- ✓ Follow multi-level testing pattern
- ✓ Test parameter extraction and response formatting
- ✓ Test error handling at protocol boundary
- ✓ Verify tool appears in Claude Desktop

### 6. `load_dotenv()` in `main()` Pollutes `os.environ` for Later Tests

**Problem**: Tests that expected `TrialExpiredError` passed in isolation but silently succeeded (no error raised) when running the full test suite, because `CONTENDRE_SKIP_LICENSE_CHECK=1` from `.env` was loaded into `os.environ` globally by a prior test.

**Root Cause**:
1. `test_cli.py` calls `cli.py:main()` via `cli_runner.invoke()`
2. `cli.py:main()` calls `load_dotenv()` which reads `.env` and sets `CONTENDRE_SKIP_LICENSE_CHECK=1` in `os.environ`
3. `os.environ` persists for the entire pytest process — all subsequent tests see the flag
4. License tests that call `check_trial_status()` bypass the trial check → no `TrialExpiredError` raised

**Fix**: Test fixtures that require license checking must explicitly clear the skip flag:

```python
@pytest.fixture
def mock_build_date():
    """Ensure SKIP_LICENSE_CHECK is unset during license tests."""
    original_skip = os.environ.pop("CONTENDRE_SKIP_LICENSE_CHECK", None)
    yield
    if original_skip is not None:
        os.environ["CONTENDRE_SKIP_LICENSE_CHECK"] = original_skip
```

**Rule**: Any test fixture that controls license checking must also control `CONTENDRE_SKIP_LICENSE_CHECK`. The two env vars (`BUILD_DATE` and skip flag) are co-dependent — managing one without the other leaves tests non-deterministic.

**Reference**: Session 2026-02-23, commit `431459f` (`tests/test_license.py`) (#first:2026-02-23)

---

## Related Topics

- **TESTING**: Multi-level test strategies, integration testing
- **CI-CD**: Docker distribution, image privacy, workflow validation
- **ARCHITECTURE**: MCP server design, handler patterns

---

**Last Updated**: 2026-02-23 (load_dotenv test pollution pattern)
**Sessions Covered**: 2025-12-01 MCP implementation, 2025-12-28 type safety, 2025-12-30 backfill fix, 2026-02-23 env pollution
**Principles Count**: 6
