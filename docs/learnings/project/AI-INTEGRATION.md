# AI Integration Patterns (Project-Specific)

**Purpose**: Gemini API integration patterns, rate limits, observability, and error handling — for this project (election assistant, Next.js) and from previous contendre work (Python) below.

---

## Election Assistant — Next.js / Serverless Patterns

### Gemini Free Tier Limits (Critical!)

1. **Check BOTH RPD and RPM before choosing a model** — Free tier limits are per-model and much lower for newer models than for older ones. `gemini-3.5-flash` has RPD=20 (exhausted by 2 users in one afternoon). `gemini-3.1-flash-lite` has RPD=500, RPM=10. Always verify at: Google AI Studio → Explore models → your model → Quotas tab. (#first:2026-06-16)

2. **RPD=20 is useless for user-facing prototypes** — 20 requests/day across all users means a single enthusiastic tester can exhaust it. Minimum viable: RPD≥100 for prototype distribution to friends; RPD≥500 for wider sharing. (#first:2026-06-16)

3. **Turn limit pattern: guarantee users reach results** — For limited-quota AI conversations, cap at N user turns and auto-trigger synthesis on the final turn. Implementation: pass `isFinalTurn: true` to the API route, which appends a synthesis instruction to the system prompt. Benefits: (a) user always gets results, (b) usage is predictable (≤N+1 calls/session), (c) the conversation feels structured rather than open-ended. `app/api/chat/route.ts` + `app/prototype-d/page.tsx:MAX_TURNS`. (#first:2026-06-16)

4. **Detect AI "done" by response content, not external turn counter** — If the AI can self-terminate (system prompt says "after N topics, summarize"), the frontend's turn limit is a fallback, not the primary signal. Detecting synthesis by counting how many party/entity names appear in the response (≥5 = ranking) is more reliable than `turnCount >= MAX_TURNS`. The turn counter stays as an abuse-protection hard cap. Pattern: `const partyMentions = PARTY_NAMES.filter(n => content.includes(n)).length; const isSynthesis = isFinalTurn || partyMentions >= 5`. (#first:2026-06-17)

5. **Post-conversation extraction: fire in background while user reads** — When a conversational AI turn also serves as the "final answer", fire the structured extraction call immediately but don't transition the UI yet. Let the user read the conversational response (which they expected), then show a "מכין תוצאות..." loading indicator, and reveal a CTA button when extraction completes. Never hide the conversational response behind a loading screen — it's the payoff the user waited for. (#first:2026-06-17)

6. **Separate conversation from scoring — two API calls beats one doing both** — Having the chat AI score parties while also collecting preferences (conflating two jobs in one prompt) produces non-deterministic scoring and complicates future grounding. Better: conversation API collects preferences naturally; a second focused extraction API (`/api/results-d`) takes the full transcript and produces structured `{ scores, profile, partyBlurbs }`. The extraction prompt can be carefully crafted without risking the conversational tone. (#first:2026-06-17)

### Error Handling (Never Expose Raw SDK Errors)

4. **Translate API errors to structured codes at the boundary** — The Gemini SDK throws errors whose `.message` is a raw JSON blob (includes the full HTTP response). Passing this to the frontend shows incomprehensible text to users. Always inspect the error at `route.ts` and return `{ errorCode: "QUOTA_EXCEEDED" | "AUTH_ERROR" | "SERVER_ERROR" }`. Map in the UI to friendly Hebrew strings. (#first:2026-06-16)

   Detection heuristics (in `route.ts`):
   - Quota: `message.includes("429") || message.includes("RESOURCE_EXHAUSTED")`
   - Auth: `message.includes("401") || message.includes("403") || message.includes("API_KEY")`
   - Default: `SERVER_ERROR`

### LLM Observability (Langfuse)

5. **Helicone new signups are closed** — As of 2026-06, us.helicone.ai shows "New signups are disabled". Use Langfuse instead. (#first:2026-06-16)

6. **Langfuse: use direct SDK, not OTel, for Next.js serverless** — The direct SDK (`import { Langfuse } from "langfuse"`) is simpler than the OpenTelemetry-based wrapper for serverless API routes. Pattern:
   ```typescript
   const lf = new Langfuse({ secretKey, publicKey, baseUrl });
   const trace = lf.trace({ name, sessionId, metadata });
   const gen = trace.generation({ name, model, input });
   // ... call AI ...
   gen.update({ output }); gen.end();
   await lf.flushAsync(); // CRITICAL for serverless
   ```
   `flushAsync()` is mandatory: serverless processes exit immediately after response, before background flush completes. (#first:2026-06-16)

7. **Pass sessionId from client for conversation grouping** — Generate `sessionId` with `crypto.randomUUID()` in the React client on mount (`useState(() => crypto.randomUUID())`). Send it with every API request body. Use it as Langfuse `sessionId` to group all turns of one conversation. This lets you view a full conversation in Langfuse traces. (#first:2026-06-16)

---

## Gemini API Patterns (Contendre — Python)

### Rate Limits & Model Selection

1. **Model-specific rate limits AND output token limits vary** - Verified via `genai.list_models()` on free tier (2025-11-16):
   - `gemini-2.5-flash`: 10 RPM, 250k TPM, 250 RPD, **65,536 output tokens**
   - `gemini-2.0-flash`: 15 RPM, 1M TPM, 200 RPD, **8,192 output tokens**
   - `gemini-1.5` models: DEPRECATED (404 errors)

   **Implementation**: `src/contendre/synthesis/gemini_client.py:54-67` (MODEL_RATE_LIMITS with max_output)

   **Lesson**: Don't assume limits - verify via API. Free tier has same output limits as paid tier.
   (#first:2025-11-13 #updated:2025-11-16)

2. **Batch size calculation should be scientific** - Formula: `(max_output_tokens / tokens_per_item) * safety_margin`
   - Example: `(2048 / 50) * 0.8 = 32` items per batch
   - Accounts for: Output token limit (2048), expected tokens per summary (~50), variance buffer (20%)

   **Implementation**: `src/contendre/synthesis/gemini_client.py:23-28` (DEFAULT_BATCH_SIZE with comment)

   **Lesson**: User asked "Can you think like a senior engineer?" - show your work, don't guess.
   (#first:2025-11-13)

3. **Token clamping prevents API errors** - Always clamp requested tokens to API max (2048 for Gemini free tier):
   ```python
   safe_max_tokens = min(max_tokens, 2048)
   ```

   **Implementation**: `src/contendre/synthesis/gemini_client.py:147-149`

   **Why**: Prevents 400 errors when user requests more tokens than API supports.
   (#first:2025-11-13)

4. **Timeout is mandatory** - API calls without timeout can hang forever (user experienced 5+ min hang):
   ```python
   response = self.model.generate_content(
       prompt,
       generation_config={"max_output_tokens": max_tokens, "temperature": 0.3},
       request_options={"timeout": 60},  # 60 second timeout
   )
   ```

   **Implementation**: `src/contendre/synthesis/gemini_client.py:154`

   **Impact**: Fixed critical hanging bug that blocked production use.
   (#first:2025-11-13)

### Error Handling

4a. **Verify finish_reason enum values from documentation** - Gemini finish_reason enum (from google.generativeai.types):
   - 0=UNSPECIFIED, 1=STOP (normal), 2=MAX_TOKENS, 3=SAFETY, 4=RECITATION, 5=OTHER

   **Critical Bug Fixed**: finish_reason=2 was incorrectly treated as SAFETY (should be MAX_TOKENS)

   **Implementation**: `src/contendre/synthesis/gemini_client.py:224-248`
   ```python
   if finish_reason == 3:  # SAFETY (was checking 2)
       logger.error("❌ SAFETY BLOCK")
   if finish_reason == 2:  # MAX_TOKENS (new check)
       logger.error("❌ MAX_TOKENS")
   ```

   **Impact**: Misdiagnosed all failures as SAFETY blocks for 2-3 days. Root cause was token overflow.
   (#first:2025-11-16)

4b. **Smart time-based rate limiting beats count-based** - Track request timestamps, not just counts:
   ```python
   request_times: list[float] = []
   request_times = [t for t in request_times if current_time - t < 60]  # Sliding window
   if len(request_times) >= rpm:
       wait_time = 60 - (current_time - oldest_request)  # Exact wait needed
   ```

   **Implementation**: `src/contendre/synthesis/gemini_client.py:271-295`

   **Why**: Eliminates unnecessary 60s waits when requests are naturally spaced.
   (#first:2025-11-16)

4c. **Enforce strict brevity constraints in prompts** - Gemini ignores vague "1-2 sentence" requests:
   - ❌ Vague: "Provide a brief 1-2 sentence summary"
   - ✅ Strict: "CRITICAL CONSTRAINTS: MAXIMUM 25 words per summary (strictly enforced)"

   **Result**: Reduced verbosity from ~250 tokens/change → ~25 words/change

   **Implementation**: `src/contendre/synthesis/gemini_client.py:313-337`
   (#first:2025-11-16)

5. **Return None instead of fake fallbacks** - User: "What as a user can I do with this useless info?"
   - ❌ BAD: Return "Change detected. Review details for impact assessment." (fake fallback)
   - ✅ GOOD: Return `None` and let caller handle it explicitly

   **Implementation**: `src/contendre/synthesis/gemini_client.py:159,170` (return None on error)

   **Downstream**: Report formatter shows "(AI summary unavailable)" for None summaries

   **Slack Integration Bug**: slack_formatter.py incorrectly used `getattr(change, "_summary", ...)` instead of `change.change_summary`. This caused "No summary available" to display even when AI summaries were successfully generated. Always verify attribute names match the DetectedChange model when adding new fields.
   (#updated:2025-11-23)

   **Lesson**: If user can't act on it, don't generate it. Honest failure reporting > fake data.
   (#first:2025-11-13)

6. **Batch failures should mark individual items as None** - Don't fail entire batch silently:
   ```python
   except Exception as e:
       logger.error(f"Batch {batch_num}/{total_batches} FAILED with exception: {e}")
       # Mark summaries as unavailable (None) for this batch
       for i in range(len(batch)):
           all_summaries[str(batch_start + i)] = None
   ```

   **Implementation**: `src/contendre/synthesis/gemini_client.py:310-319`

   **Why**: Partial failures shouldn't lose all data - user can retry specific batches.
   (#first:2025-11-13)

### Batch Processing

7. **Rate limiting throttling based on RPM** - Pause after every `rpm` batches:
   ```python
   if batch_num > 1 and (batch_num - 1) % rpm == 0:
       logger.info(f"Rate limit: waiting 60 seconds (hit {rpm} RPM limit)...")
       time.sleep(60)
   ```

   **Implementation**: `src/contendre/synthesis/gemini_client.py:234-237`

   **Why**: Free tier has strict per-minute limits - respect them or get 429 errors.
   (#first:2025-11-13)

8. **Environment override for batch size** - Allow customization via `GEMINI_BATCH_SIZE`:
   ```python
   batch_size = int(os.getenv("GEMINI_BATCH_SIZE", DEFAULT_BATCH_SIZE))
   ```

   **Implementation**: `src/contendre/synthesis/gemini_client.py:210`

   **Use cases**: Lower if hitting timeouts, higher if paid tier with higher limits.
   (#first:2025-11-13)

---

## Testing Patterns

### Gemini Client Tests

9. **Reset mocks between test batches** - Client init call counts as first API call:
   ```python
   # Reset mock to clear init call
   gemini_client.model.generate_content.reset_mock()
   ```

   **Why**: `GeminiClient.__init__` tests model availability with API call - messes up call counts.

   **Files**: `tests/synthesis/test_gemini_client.py:311,339`
   (#first:2025-11-13)

10. **Test coverage for new features is mandatory** - User had to ask "can you check if we're covered there?"
    - Added 10 new tests (6 Gemini + 4 orchestrator)
    - Coverage: gemini_client.py 90% (up from 9%)

    **Lesson**: Proactively verify test coverage when adding features - don't wait for user to ask.
    (#first:2025-11-13)

---

## Slack API Patterns

### File Upload for Full Reports

**Pattern**: Upload full markdown reports as Slack files when digest truncates content. (#first:2025-11-23)

**User Insight**: "how can you 'mention a file' in slack? It's not like we have a shared filesystem"

**Problem**: Slack digest shows "... and 40 more medium priority changes" with no way to view them.

**Solution**: Use Slack's `files_upload_v2` API to upload full report as downloadable file.

**Implementation**:
```python
# src/contendre/notifications/slack_client.py:168-214
def upload_file(
    self,
    content: str,
    filename: str,
    title: str | None = None,
    channel: str | None = None,
    initial_comment: str | None = None,
) -> dict[str, Any]:
    """Upload a file to a Slack channel."""
    response = self.client.files_upload_v2(
        content=content,
        filename=filename,
        title=title or filename,
        channel=channel or self.default_channel,
        initial_comment=initial_comment,
    )
    return response.data
```

**Graceful Degradation**:
```python
# Don't fail entire digest if file upload fails
try:
    self.client.upload_file(content=report, filename=f"report-{date}.md")
except Exception as e:
    logger.warning(f"Failed to upload report: {e}")
    # Digest message already posted, file is bonus feature
```

**Benefits**:
- ✅ Users can access full report (all 40+ changes) via Slack file download
- ✅ No shared filesystem needed (file upload handled by Slack API)
- ✅ Digest posts even if file upload fails (not blocking)
- ✅ Maintains historical record (files persist in Slack)

**Lesson**: User feedback exposed wrong assumption (local file paths vs Slack file upload). Their insight redirected solution positively.

---

## Anti-Patterns to Avoid

- ❌ Hardcoding batch sizes without showing calculation
- ❌ Ignoring model-specific rate limits (using same throttling for all models)
- ❌ No timeout on API calls (can hang forever)
- ❌ Fake fallback data instead of honest None
- ❌ Failing entire batch when one item fails
- ❌ Requesting more tokens than API supports (causes 400 errors)

---

## Related Files

- `src/contendre/synthesis/gemini_client.py` - Gemini API client (130 lines, 90% coverage)
- `tests/synthesis/test_gemini_client.py` - Comprehensive test suite (20 tests)
- `src/contendre/orchestrator/change_detection.py:193-242` - Batch summarization integration
- `.env.example:16-25` - GEMINI_BATCH_SIZE documentation

---

**Note**: These are Gemini-specific patterns. For general API integration principles, see `docs/learnings/universal/ARCHITECTURE.md`.
