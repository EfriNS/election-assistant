"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS_FORMAL, QUESTIONS_PERSONAL } from "@/lib/questions";

type Tone = "formal" | "personal";
type Depth = "short" | "deep";

// Economy question fragments shown as preview cards on the landing page
const PREVIEW = {
  formal: {
    label: "ענייני",
    question: QUESTIONS_FORMAL.economy.question,
    options: QUESTIONS_FORMAL.economy.options.slice(0, 2).map((o) => o.text.split(" — ")[0]),
  },
  personal: {
    label: "אישי",
    question: QUESTIONS_PERSONAL.economy.question,
    options: QUESTIONS_PERSONAL.economy.options.slice(0, 2).map((o) => o.text.split(" — ")[0]),
  },
};

export default function Home() {
  const router = useRouter();
  const [tone, setTone] = useState<Tone>("formal");
  const [depth, setDepth] = useState<Depth>("short");

  const handleStart = (path: "/prototype-e" | "/prototype-d") => {
    router.push(`${path}?tone=${tone}&depth=${depth}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-xl">

        {/* Headline */}
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-gray-400 tracking-widest mb-3">אב-טיפוס לבדיקה</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">עוזר הבחירות</h1>
          <p className="text-lg text-gray-500">
            מצא לאיזו מפלגה אתה הכי קרוב — בצורה שקופה, ללא עיוות.
          </p>
        </div>

        {/* Tone selector */}
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-700 mb-3 text-center">
            בחר את הסגנון שמתאים לך:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(["formal", "personal"] as const).map((t) => {
              const p = PREVIEW[t];
              const selected = tone === t;
              return (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`border-2 rounded-2xl p-4 text-right transition-all ${
                    selected
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <p className={`text-xs font-bold mb-2 ${selected ? "text-teal-700" : "text-gray-400"}`}>
                    {p.label}
                  </p>
                  <p className="text-xs font-medium text-gray-700 mb-2 leading-snug">{p.question}</p>
                  <ul className="space-y-1">
                    {p.options.map((opt, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                        <span className="text-gray-300 shrink-0">·</span>
                        <span>{opt}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* Depth selector */}
        <div className="mb-10">
          <p className="text-sm font-medium text-gray-700 mb-3 text-center">כמה עומק?</p>
          <div className="flex gap-3 justify-center">
            {(["short", "deep"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-8 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  depth === d
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {d === "short" ? "בקצרה" : "בהרחבה"}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            {depth === "short" ? "שאלה אחת לנושא עם שאלת המשך אחת" : "שאלה אחת לנושא עם שתי שאלות המשך"}
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => handleStart("/prototype-e")}
          className="w-full bg-teal-600 text-white py-4 rounded-xl font-semibold hover:bg-teal-700 transition-colors mb-4"
        >
          ← בואו נתחיל
        </button>

        {/* D link */}
        <p className="text-center text-sm text-gray-400 mb-10">
          מעדיפ/ה שיחה חופשית עם AI?{" "}
          <button
            onClick={() => handleStart("/prototype-d")}
            className="text-teal-600 hover:text-teal-800 underline"
          >
            לחץ כאן
          </button>
        </p>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-6 text-center">
          <p className="text-xs text-gray-400 mb-2">גרסאות קודמות לבדיקה:</p>
          <div className="flex justify-center gap-4 text-xs text-gray-400">
            <a href="/prototype-a" className="hover:text-gray-600">א — הצהרות</a>
            <a href="/prototype-b" className="hover:text-gray-600">ב — עדיפויות</a>
            <a href="/prototype-c" className="hover:text-gray-600">ג — דילמות</a>
          </div>
        </div>

      </div>
    </main>
  );
}
