import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mock refs — must be declared before vi.mock is hoisted
const { mockSendMessage, mockGenerateContent } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  // Must use a regular function (not arrow) so `new GoogleGenAI()` works
  GoogleGenAI: vi.fn(function() {
    return {
      chats: {
        create: () => ({ sendMessage: mockSendMessage }),
      },
      models: {
        generateContent: mockGenerateContent,
      },
    };
  }),
}));

// ─── Error fixtures ───────────────────────────────────────────────────────────

const quotaError = new Error("Request failed with status 429 RESOURCE_EXHAUSTED: quota exceeded");
const serverError = new Error("Internal server error");

// ─── Request helper ───────────────────────────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.GEMINI_API_KEY = "test-key";
});

beforeEach(() => {
  mockSendMessage.mockReset();
  mockGenerateContent.mockReset();
});

// ─── /api/follow-up ───────────────────────────────────────────────────────────

describe("/api/follow-up quota handling", () => {
  const followUpBody = {
    conversationSoFar: [],
    currentTopic: {
      label: "ביטחון",
      openerQuestion: "מה עמדתך?",
      openerAnswer: "תמיכה בפתרון מדיני",
      followUpQA: [],
    },
    nextTopic: null,
    tone: "formal",
    depth: "short",
    followUpsAskedThisTopic: 0,
  };

  it("returns 429 and QUOTA_EXCEEDED on Gemini quota error", async () => {
    mockGenerateContent.mockRejectedValue(quotaError);
    const { POST } = await import("@/app/api/follow-up/route");
    const res = await POST(makeReq(followUpBody));
    const body = await res.json();
    expect(res.status).toBe(429);
    expect(body.errorCode).toBe("QUOTA_EXCEEDED");
  });

  it("returns 200 with null follow-up on non-quota Gemini error (graceful degradation)", async () => {
    mockGenerateContent.mockRejectedValue(serverError);
    const { POST } = await import("@/app/api/follow-up/route");
    const res = await POST(makeReq(followUpBody));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.prologue).toBeNull();
    expect(body.followUp).toBeNull();
  });
});

// ─── /api/results ─────────────────────────────────────────────────────────────

describe("/api/results quota handling", () => {
  const resultsBody = {
    answersSummary: "ביטחון: תומך בפתרון מדיני",
    topParties: [{ id: "likud", name: "ליכוד", score: 75 }],
  };

  it("returns 429 and QUOTA_EXCEEDED on Gemini quota error", async () => {
    mockSendMessage.mockRejectedValue(quotaError);
    const { POST } = await import("@/app/api/results/route");
    const res = await POST(makeReq(resultsBody));
    const body = await res.json();
    expect(res.status).toBe(429);
    expect(body.errorCode).toBe("QUOTA_EXCEEDED");
  });

  it("returns 500 and SERVER_ERROR on non-quota Gemini error", async () => {
    mockSendMessage.mockRejectedValue(serverError);
    const { POST } = await import("@/app/api/results/route");
    const res = await POST(makeReq(resultsBody));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.errorCode).toBe("SERVER_ERROR");
  });
});
