"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string };

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-white border border-gray-200 text-gray-800"
            : "bg-purple-600 text-white"
        }`}
        // Render bold markdown from AI responses
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.content) {
        setMessages([...next, { role: "assistant", content: data.content }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    setStarted(true);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "התחל" }] }),
      });
      const data = await res.json();
      if (data.content) {
        setMessages([{ role: "assistant", content: data.content }]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!started) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-12 inline-block">← חזרה</Link>
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">💬</span>
          </div>
          <h1 className="text-2xl font-bold mb-3">שיחה עם עוזר AI</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            עוזר חכם ישוחח איתך על הנושאים שחשובים לך, ובסוף יגלה לאיזו מפלגה אתה הכי קרוב — עם הסבר.
          </p>
          <p className="text-xs text-gray-400 mb-8">
            השיחה מנוהלת על ידי Gemini AI. עמדות המפלגות הן פיקטיביות לצורכי הדגמה.
          </p>
          <button
            onClick={start}
            className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
          >
            התחל שיחה
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← חזרה</Link>
        <div className="w-px h-4 bg-gray-200" />
        <div className="w-2 h-2 bg-purple-500 rounded-full" />
        <span className="text-sm font-medium">עוזר הבחירות</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto">
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {loading && (
            <div className="flex justify-end mb-4">
              <div className="bg-purple-600 text-white px-4 py-3 rounded-2xl text-sm">
                <span className="animate-pulse">מקליד...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
        <div className="max-w-xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && input.trim()) { e.preventDefault(); sendMessage(input.trim()); } }}
            placeholder="כתוב כאן..."
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
    </main>
  );
}
