import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse, after } from "next/server";
import { startObservation, propagateAttributes } from "@langfuse/tracing";
import { langfuseSpanProcessor } from "@/instrumentation";
import { PARTIES } from "@/lib/parties";
import { GROUNDINGS, getTopicGroundings } from "@/lib/groundings";
import { TOPIC_IDS } from "@/lib/topics";
import { sanitizeUserInput } from "@/lib/sanitize";
import { notifySlack } from "@/lib/slack";
import { isTransientGeminiError, waitBeforeTransientRetry } from "@/lib/gemini-errors";

import {
  buildScoreResponseSchema,
  buildScoringPrompt,
  getScoringAspects,
  getScoringEntries,
  type ScoreTopicsResult,
  type TopicQAForScoring,
} from "@/lib/score-topics-prompt";

export { buildScoreResponseSchema, buildScoringPrompt };
export type { ScoreTopicsResult };

function parseScores(
  raw: string,
  topics: TopicQAForScoring[]
): ScoreTopicsResult {
  const flat: Record<string, number | null> = JSON.parse(raw);
  const result: ScoreTopicsResult = {};

  for (const t of topics) {
    // Guard directly at the write, not just in POST's earlier validation:
    // this keeps parseScores safe against a "__proto__"-style key on its
    // own, regardless of what a future caller passes in.
    if (!TOPIC_IDS.has(t.topicId)) continue;
    result[t.topicId] = {};
    for (const party of PARTIES) {
      const key = `${t.topicId}.${party.id}`;
      const val = flat[key];
      // No text was sent for this party on this topic, so there is nothing a
      // score could be based on — enforced here rather than left to the model.
      const hasText = getScoringEntries(party.id, t).length > 0;
      result[t.topicId][party.id] = hasText && typeof val === "number" ? val : null;
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { topics: TopicQAForScoring[]; sessionId?: string };
  const rawTopics = body.topics;
  const sessionId = body.sessionId;

  // Input validation
  if (!Array.isArray(rawTopics) || rawTopics.length === 0 || rawTopics.length > 9) {
    return NextResponse.json({ errorCode: "INVALID_INPUT" }, { status: 400 });
  }
  for (const t of rawTopics) {
    if (!t.topicId || !TOPIC_IDS.has(t.topicId) || !t.openerAnswer) {
      return NextResponse.json({ errorCode: "INVALID_INPUT" }, { status: 400 });
    }
  }

  // Sanitize all user text before building the AI prompt
  const topics: TopicQAForScoring[] = rawTopics.map((t) => ({
    ...t,
    openerAnswer: sanitizeUserInput(t.openerAnswer, 500),
    followUpQA: t.followUpQA.map((fq) => ({
      ...fq,
      answer: sanitizeUserInput(fq.answer, 200),
    })),
  }));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ errorCode: "AUTH_ERROR" }, { status: 500 });

  const model = "gemini-3.1-flash-lite";
  const prompt = buildScoringPrompt(topics);

  const topicsWithGroundings = topics.filter((t) =>
    PARTIES.some((p) => getTopicGroundings(p.id, t.topicId).some((e) => !e.absent && e.text))
  );
  const partiesWithData = PARTIES
    .filter((p) => GROUNDINGS[p.id]?.platformAvailable)
    .map((p) => p.id);

  return propagateAttributes({ sessionId, traceName: "score-topics" }, async () => {
    // Do not pass prompt as input — it contains user answers (PII).
    const generation = startObservation(
      "gemini-score-topics",
      {
        model,
        metadata: {
          topicsRequested: topics.map((t) => t.topicId),
          topicsWithGroundings: topicsWithGroundings.map((t) => t.topicId),
          partiesWithData,
          // topicId → sub-dimensions scored against ("whole-topic" when not narrowed)
          aspectsScored: Object.fromEntries(topics.map((t) => [t.topicId, getScoringAspects(t) ?? "whole-topic"])),
          entriesSent: topics.reduce(
            (n, t) => n + PARTIES.reduce((m, p) => m + getScoringEntries(p.id, t).length, 0), 0
          ),
        },
      },
      { asType: "generation" }
    );

    // Hoisted so the catch block can log the raw AI output + diagnostics on parse failure.
    let rawText = "";
    let finishReason = "";
    let outputTokens = 0;
    let promptTokens = 0;
    let retried = false;
    let scores: ScoreTopicsResult | undefined;

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Retry once on parse failure — see app/api/follow-up/route.ts's comment for why
      // (confirmed rare/non-deterministic, not a token-budget issue). Also retries once
      // on a transient API-level error (503 UNAVAILABLE/overloaded) — genuine quota
      // errors still propagate immediately, uncaught here.
      for (let attempt = 1; attempt <= 2; attempt++) {
        let response;
        try {
          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.2,
              maxOutputTokens: 1500,
              responseMimeType: "application/json",
              responseJsonSchema: buildScoreResponseSchema(topics),
            },
          });
        } catch (callErr) {
          const callMsg = callErr instanceof Error ? callErr.message : String(callErr);
          if (attempt === 1 && isTransientGeminiError(callMsg)) { retried = true; await waitBeforeTransientRetry(); continue; }
          throw callErr;
        }

        rawText = response.text ?? "";
        finishReason = response.candidates?.[0]?.finishReason ?? "";
        outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
        promptTokens = response.usageMetadata?.promptTokenCount ?? 0;

        try {
          scores = parseScores(rawText, topics);
          break;
        } catch (parseErr) {
          if (attempt === 1) { retried = true; continue; }
          throw parseErr;
        }
      }

      generation.update({
        output: rawText,
        usageDetails: { input: promptTokens, output: outputTokens },
        metadata: { retried },
      });
      generation.end();
      after(() => langfuseSpanProcessor.forceFlush());

      return NextResponse.json({ scores });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isQuota = msg.includes("429") || msg.toLowerCase().includes("quota");
      const errorCode = isQuota ? "QUOTA_EXCEEDED" : "SERVER_ERROR";
      const diagnostics = `finishReason=${finishReason || "unknown"}, outputTokens=${outputTokens}/1500, retried=${retried}`;
      const langfuseOutput = rawText ? `${msg}\n\n${diagnostics}\n\nRAW:\n${rawText}` : `${msg}\n\n${diagnostics}`;
      generation.update({ output: langfuseOutput, level: "ERROR" });
      generation.end();
      after(() => langfuseSpanProcessor.forceFlush());
      await notifySlack(`🚨 /api/score-topics — ${errorCode}\n${msg.slice(0, 300)}\n${diagnostics}`);
      return NextResponse.json({ errorCode }, { status: isQuota ? 429 : 500 });
    }
  });
}
