import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mock refs ────────────────────────────────────────────────────────

const { mockSendMessage, mockGenerateContent, mockGenerationUpdate } = vi.hoisted(() => ({
  mockSendMessage:     vi.fn(),
  mockGenerateContent: vi.fn(),
  mockGenerationUpdate: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function() {
    return {
      chats:  { create: () => ({ sendMessage: mockSendMessage }) },
      models: { generateContent: mockGenerateContent },
    };
  }),
}));

vi.mock("langfuse", () => ({
  Langfuse: vi.fn(function() {
    return {
      trace: vi.fn().mockReturnValue({
        generation: vi.fn().mockReturnValue({
          update: mockGenerationUpdate,
          end:    vi.fn(),
        }),
      }),
      flushAsync: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USAGE = { promptTokenCount: 120, candidatesTokenCount: 45, totalTokenCount: 165 };
const EXPECTED_USAGE = { input: 120, output: 45, unit: "TOKENS" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeAll(() => {
  process.env.GEMINI_API_KEY     = "test-key";
  process.env.LANGFUSE_SECRET_KEY = "test-secret";
  process.env.LANGFUSE_PUBLIC_KEY = "test-public";
});

beforeEach(() => {
  mockSendMessage.mockReset();
  mockGenerateContent.mockReset();
  mockGenerationUpdate.mockReset();
});

// ─── /api/results ─────────────────────────────────────────────────────────────

describe("/api/results token tracking", () => {
  const VALID_BODY = JSON.stringify({ profile: "test profile", partyBlurbs: { likud: "blurb" } });

  it("passes usageMetadata to Langfuse generation.update()", async () => {
    mockSendMessage.mockResolvedValue({ text: VALID_BODY, usageMetadata: USAGE });
    const { POST } = await import("@/app/api/results/route");
    const res = await POST(makeReq({
      answersSummary: "ביטחון: תומך בפתרון",
      topParties: [{ id: "likud", name: "ליכוד", score: 75 }],
    }));
    expect(res.status).toBe(200);
    expect(mockGenerationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ usage: EXPECTED_USAGE })
    );
  });
});

// ─── /api/follow-up ───────────────────────────────────────────────────────────

describe("/api/follow-up token tracking", () => {
  const FOLLOW_UP_BODY = {
    conversationSoFar: [],
    currentTopic: { label: "ביטחון", openerQuestion: "מה עמדתך?", openerAnswer: "תמיכה", followUpQA: [] },
    nextTopic: null,
    tone: "formal",
    depth: "short",
    followUpsAskedThisTopic: 0,
  };
  const VALID_JSON = JSON.stringify({ prologue: "בהחלט", followUp: null });

  it("passes usageMetadata to Langfuse generation.update()", async () => {
    mockGenerateContent.mockResolvedValue({ text: VALID_JSON, usageMetadata: USAGE });
    const { POST } = await import("@/app/api/follow-up/route");
    const res = await POST(makeReq(FOLLOW_UP_BODY));
    expect(res.status).toBe(200);
    expect(mockGenerationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ usage: EXPECTED_USAGE })
    );
  });
});

// ─── /api/score-topics ────────────────────────────────────────────────────────

describe("/api/score-topics token tracking", () => {
  const TOPICS_BODY = {
    topics: [{
      topicId: "security",
      topicLabel: "ביטחון",
      openerQuestion: "מה עמדתך?",
      openerAnswer: "תמיכה בפתרון מדיני",
      followUpQA: [],
    }],
  };
  // Flat key format the route expects
  const SCORES_JSON = JSON.stringify({ "security.hadash": 1, "security.likud": -1 });

  it("passes usageMetadata to Langfuse generation.update()", async () => {
    mockGenerateContent.mockResolvedValue({ text: SCORES_JSON, usageMetadata: USAGE });
    const { POST } = await import("@/app/api/score-topics/route");
    const res = await POST(makeReq(TOPICS_BODY));
    expect(res.status).toBe(200);
    expect(mockGenerationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ usage: EXPECTED_USAGE })
    );
  });
});

// ─── Retry-on-parse-failure (added 2026-07-05, see docs/learnings/project/AI-INTEGRATION.md) ──

describe("retry on parse failure", () => {
  const MALFORMED = '{"prologue": "test", "followUp": {"question": "broken';
  const FOLLOW_UP_BODY = {
    conversationSoFar: [],
    currentTopic: { label: "ביטחון", openerQuestion: "מה עמדתך?", openerAnswer: "תמיכה", followUpQA: [] },
    nextTopic: null,
    tone: "formal",
    depth: "short",
    followUpsAskedThisTopic: 0,
  };
  const VALID_FOLLOWUP_JSON = JSON.stringify({ prologue: "test", followUp: null });

  it("/api/follow-up: retries once, succeeds on 2nd attempt", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: MALFORMED, usageMetadata: USAGE })
      .mockResolvedValueOnce({ text: VALID_FOLLOWUP_JSON, usageMetadata: USAGE });
    const { POST } = await import("@/app/api/follow-up/route");
    const res = await POST(makeReq(FOLLOW_UP_BODY));
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prologue).toBe("test");
  });

  it("/api/follow-up: gives up (only 2 attempts) and degrades gracefully if both fail", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: MALFORMED, usageMetadata: USAGE })
      .mockResolvedValueOnce({ text: MALFORMED, usageMetadata: USAGE });
    const { POST } = await import("@/app/api/follow-up/route");
    const res = await POST(makeReq(FOLLOW_UP_BODY));
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    const body = await res.json();
    expect(body.followUp).toBeNull();
  });

  it("/api/follow-up: does not retry a genuine API error (e.g. quota)", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("429 RESOURCE_EXHAUSTED"));
    const { POST } = await import("@/app/api/follow-up/route");
    const res = await POST(makeReq(FOLLOW_UP_BODY));
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(429);
  });

  it("/api/score-topics: retries once, succeeds on 2nd attempt", async () => {
    const TOPICS_BODY = {
      topics: [{
        topicId: "security", topicLabel: "ביטחון", openerQuestion: "מה עמדתך?",
        openerAnswer: "תמיכה בפתרון מדיני", followUpQA: [],
      }],
    };
    const SCORES_JSON = JSON.stringify({ "security.hadash": 1, "security.likud": -1 });
    mockGenerateContent
      .mockResolvedValueOnce({ text: "not valid json", usageMetadata: USAGE })
      .mockResolvedValueOnce({ text: SCORES_JSON, usageMetadata: USAGE });
    const { POST } = await import("@/app/api/score-topics/route");
    const res = await POST(makeReq(TOPICS_BODY));
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("/api/results: retries once on malformed JSON, succeeds on 2nd attempt", async () => {
    const VALID_BODY = JSON.stringify({ profile: "test profile", partyBlurbs: { likud: "blurb" } });
    mockSendMessage
      .mockResolvedValueOnce({ text: "not valid json", usageMetadata: USAGE })
      .mockResolvedValueOnce({ text: VALID_BODY, usageMetadata: USAGE });
    const { POST } = await import("@/app/api/results/route");
    const res = await POST(makeReq({
      answersSummary: "ביטחון: תומך בפתרון",
      topParties: [{ id: "likud", name: "ליכוד", score: 75 }],
    }));
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("/api/results: retries once on valid JSON with the wrong shape", async () => {
    const VALID_BODY = JSON.stringify({ profile: "test profile", partyBlurbs: { likud: "blurb" } });
    mockSendMessage
      .mockResolvedValueOnce({ text: JSON.stringify({ foo: "bar" }), usageMetadata: USAGE })
      .mockResolvedValueOnce({ text: VALID_BODY, usageMetadata: USAGE });
    const { POST } = await import("@/app/api/results/route");
    const res = await POST(makeReq({
      answersSummary: "ביטחון: תומך בפתרון",
      topParties: [{ id: "likud", name: "ליכוד", score: 75 }],
    }));
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });
});
