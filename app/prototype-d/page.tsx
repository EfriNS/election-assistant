"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PARTIES } from "@/lib/parties";
import UnifiedResultsPage from "@/components/UnifiedResultsPage";

type Message = { role: "user" | "assistant"; content: string };

type ResultsData = {
  profile: string;
  scores: Record<string, number>;
  partyBlurbs: Record<string, string>;
  groundings: unknown[];
};

const MAX_TURNS = 50;

// Shown immediately on chat open (not sent to the API — API sees only the real conversation).
const INTRO_MESSAGE: Message = {
  role: "assistant",
  content:
    "שלום! אני עוזר הבחירות.\n\nאשאל אותך שאלות על נושאים שחשובים לך — ביטחון, כלכלה, דיור, חינוך ועוד. בסוף השיחה אסביר לאיזו מפלגה אתה הכי קרוב, ולמה.\n\nאין תשובות נכונות או לא נכונות — ענה בכנות לפי מה שאתה באמת חושב.",
};

const ERROR_MESSAGES: Record<string, string> = {
  QUOTA_EXCEEDED:
    "המערכת הגיעה למגבלת השימוש היומית שלה. נסה שוב מחר או בעוד מספר שעות.",
  AUTH_ERROR: "שגיאה בהגדרות המערכת. אנא דווח על הבעיה.",
  SERVER_ERROR: "אירעה שגיאה בשרת. נסה שוב.",
  NETWORK_ERROR: "שגיאת רשת — בדוק חיבור לאינטרנט ונסה שוב.",
};

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-white border border-gray-200 text-gray-800"
            : "bg-purple-600 text-white"
        }`}
        dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br/>"),
        }}
      />
    </div>
  );
}

export default function PrototypeD() {
  const [messages, setMessages] = useState<Message[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoStartedRef = useRef(false);

  // Results state
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!started || autoStartedRef.current) return;
    autoStartedRef.current = true;
    setLoading(true);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "התחל" }],
        isFinalTurn: false,
        sessionId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setMessages([INTRO_MESSAGE, { role: "assistant", content: data.content }]);
        } else {
          setError(data.errorCode ?? "SERVER_ERROR");
        }
      })
      .catch(() => setError("NETWORK_ERROR"))
      .finally(() => setLoading(false));
  }, [started, sessionId]);

  const sendMessage = async (content: string) => {
    setError(null);
    const conversationHistory = messages.slice(1);
    const userTurnsSoFar = conversationHistory.filter((m) => m.role === "user").length;
    const isFinalTurn = userTurnsSoFar >= MAX_TURNS - 1;

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...conversationHistory, { role: "user", content }],
          isFinalTurn,
          sessionId,
        }),
      });
      const data = await res.json();
      if (data.content) {
        setMessages([...next, { role: "assistant", content: data.content }]);
        // Detect synthesis turn: AI mentions 5+ party names in one response (ranking),
        // or the hard turn-limit fired. The system prompt uses **N. party** format.
        const PARTY_NAMES = ['הדמוקרטים', 'ליכוד', 'ש"ס', 'ביחד', 'ישר', 'ישראל ביתנו', 'חד"ש'];
        const partyMentions = PARTY_NAMES.filter((n) => data.content.includes(n)).length;
        const isSynthesis = isFinalTurn || partyMentions >= 5;
        if (isSynthesis) {
          setFinished(true);
          setResultsLoading(true); // extraction runs in background; user reads synthesis first

          const fullConversation: Message[] = [
            ...conversationHistory,
            { role: "user", content },
            { role: "assistant", content: data.content },
          ];

          fetch("/api/results-d", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: fullConversation }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.profile && d.scores && d.partyBlurbs) setResultsData(d);
            })
            .catch(() => {})
            .finally(() => setResultsLoading(false));
        }
      } else {
        setError(data.errorCode ?? "SERVER_ERROR");
      }
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  };

  const userTurnCount = messages.filter((m) => m.role === "user").length;
  const isNearLimit = userTurnCount === MAX_TURNS - 1 && !finished;
  const isAtLimit = userTurnCount >= MAX_TURNS - 1 && !finished;

  // ── Welcome screen ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-12 inline-block">
            ← חזרה
          </Link>
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">💬</span>
          </div>
          <h1 className="text-2xl font-bold mb-3">שיחה עם עוזר AI</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            עוזר חכם ישוחח איתך על הנושאים שחשובים לך, ובסוף יגלה לאיזו מפלגה אתה הכי קרוב —
            עם הסבר מפורט.
          </p>
          <p className="text-xs text-gray-400 mb-8">
            מנוהל על ידי Gemini AI · עמדות המפלגות הן פיקטיביות לצורכי הדגמה
          </p>
          <button
            onClick={() => setStarted(true)}
            className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
          >
            התחל שיחה
          </button>
        </div>
      </main>
    );
  }

  // ── Loading screen (extracting results after final turn) ────────────────────
  if (showResults && resultsLoading) {
    return (
      <main className="h-screen flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <span className="text-3xl">💬</span>
        </div>
        <p className="text-purple-700 font-medium mb-1">מנתח את השיחה...</p>
        <p className="text-gray-400 text-sm">מכין את התוצאות שלך</p>
      </main>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (showResults && !resultsLoading) {
    if (!resultsData) {
      // Extraction failed — offer to go back to the chat transcript
      return (
        <main className="h-screen flex flex-col items-center justify-center px-4 text-center">
          <p className="text-gray-500 mb-2">לא הצלחנו לטעון את התוצאות.</p>
          <p className="text-gray-400 text-sm mb-6">ניתן לראות את סיכום השיחה בחלון הצ'אט.</p>
          <button onClick={() => setShowResults(false)} className="text-purple-600 text-sm hover:text-purple-800">
            ← חזרה לשיחה
          </button>
        </main>
      );
    }

    const rankedResults = PARTIES
      .map((p) => ({ ...p, score: resultsData.scores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);

    return (
      <UnifiedResultsPage
        results={rankedResults}
        accentColor="purple"
        onBack={() => setShowResults(false)}
        externalAiData={{ profile: resultsData.profile, partyBlurbs: resultsData.partyBlurbs }}
        externalAiLoading={false}
      />
    );
  }

  // ── Chat screen ─────────────────────────────────────────────────────────────
  return (
    <main className="h-screen flex flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-3 shrink-0">
        {!confirmHome ? (
          <button onClick={() => setConfirmHome(true)} className="text-sm text-gray-400 hover:text-gray-600">
            ← חזרה
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">השיחה תאבד —</span>
            <button onClick={() => router.push("/")} className="text-red-500 hover:text-red-700 font-medium">בטוח</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => setConfirmHome(false)} className="text-gray-400 hover:text-gray-600">ביטול</button>
          </div>
        )}
        <div className="w-px h-4 bg-gray-200" />
        <div className="w-2 h-2 bg-purple-500 rounded-full" />
        <span className="text-sm font-medium">עוזר הבחירות</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {isNearLimit && !loading && (
            <div className="flex justify-end mb-4">
              <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-2 rounded-2xl text-xs">
                עוד תשובה אחת — ואז אסכם את עמדותיך ואציג תוצאות.
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-end mb-4">
              <div className="bg-purple-100 text-purple-600 px-4 py-3 rounded-2xl text-sm">
                <span className="animate-pulse">מקליד...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-end mb-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm leading-relaxed">
                {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.SERVER_ERROR}
              </div>
            </div>
          )}

          {finished && (
            <div className="flex justify-center mb-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-gray-400 mb-2">השיחה הסתיימה</p>
                {resultsLoading ? (
                  <p className="text-xs text-purple-400 animate-pulse">מכין תוצאות מפורטות...</p>
                ) : resultsData ? (
                  <button
                    onClick={() => setShowResults(true)}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    ראה תוצאות מפורטות ←
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {!finished && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
          <div className="max-w-xl mx-auto flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                  e.preventDefault();
                  sendMessage(input.trim());
                }
              }}
              placeholder={isAtLimit ? "שאלה אחרונה לפני הסיכום..." : "כתוב כאן..."}
              disabled={loading}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 disabled:opacity-50"
            />
            <button
              onClick={() => input.trim() && sendMessage(input.trim())}
              disabled={loading || !input.trim()}
              className="bg-purple-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors"
            >
              שלח
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
