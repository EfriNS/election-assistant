"use client";

import { useState, useEffect, useRef } from "react";

const MAX_SUBMISSIONS = 3;
const THANK_YOU_MS = 3000;

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const pageRef = useRef("");

  useEffect(() => {
    pageRef.current = window.location.pathname;
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-feedback-widget", handler);
    return () => window.removeEventListener("open-feedback-widget", handler);
  }, []);

  if (done) return null;

  async function submit() {
    if (!text.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, context: pageRef.current }),
      });
      if (res.ok) {
        const next = count + 1;
        setCount(next);
        setText("");
        setStatus("sent");
        setTimeout(() => {
          if (next >= MAX_SUBMISSIONS) {
            setDone(true);
          } else {
            setStatus("idle");
            setOpen(false);
          }
        }, THANK_YOU_MS);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="fixed bottom-12 right-3 z-50" dir="rtl">
      {open && (
        <div className="mb-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4 text-right">
          {status === "sent" ? (
            <p className="text-sm text-gray-500 text-center py-2">תודה על המשוב! 🙏</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 mb-2">נשמח למשוב, כדי להשתפר</p>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="מה תרצו לשתף? (כל הערה מועילה)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
              <div className="flex justify-between items-center mt-2">
                <button
                  onClick={() => { setOpen(false); if (status === "error") setStatus("idle"); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ביטול
                </button>
                <button
                  onClick={submit}
                  disabled={!text.trim() || status === "sending"}
                  className="text-xs px-3 py-1.5 rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? "שולח..." : "שלחו"}
                </button>
              </div>
              {status === "error" && (
                <p className="text-xs text-red-400 mt-1 text-center">שגיאה — נסו שוב</p>
              )}
            </>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 bg-white border border-gray-200 shadow-md rounded-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:shadow-lg transition-shadow"
      >
        <span>💬</span>
        <span>משוב</span>
      </button>
    </div>
  );
}
