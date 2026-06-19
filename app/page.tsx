"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tone = "formal" | "personal";
type Depth = "short" | "deep";

const ADVISOR_STYLES: { tone: Tone; label: string; tagline: string; description: string }[] = [
  {
    tone: "formal",
    label: "ענייני",
    tagline: "שאלות בשפת מדיניות",
    description: "נדבר על עמדות ופתרונות — מה צריך לקרות לדעתך",
  },
  {
    tone: "personal",
    label: "זורם",
    tagline: "שאלות בשפת יומיום",
    description: "נדבר על מה שמרגיש לך נכון ומה מדאיג אותך",
  },
];

const DEPTH_OPTIONS: { depth: Depth; label: string; description: string }[] = [
  { depth: "short", label: "ממוקד", description: "נושאים מרכזיים, תשובות מהירות" },
  { depth: "deep",  label: "מעמיק", description: "יותר שאלות, תמונה מלאה יותר" },
];

export default function Home() {
  const router = useRouter();
  const [tone, setTone] = useState<Tone>("formal");
  const [depth, setDepth] = useState<Depth>("short");

  const handleStart = (path: "/prototype-e" | "/prototype-d") => {
    router.push(`${path}?tone=${tone}&depth=${depth}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Headline */}
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-gray-400 tracking-widest uppercase mb-3">אב-טיפוס</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">עוזר הבחירות</h1>
          <p className="text-gray-400 text-sm">
            מצאו לאיזו מפלגה אתם הכי קרובים — בצורה שקופה, ללא עיוות
          </p>
        </div>

        {/* Advisor style */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            מי אני כיועץ?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ADVISOR_STYLES.map(({ tone: t, label, tagline, description }) => {
              const selected = tone === t;
              return (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`rounded-2xl p-4 text-right transition-all border-2 ${
                    selected
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className={`text-lg font-bold mb-1 ${selected ? "text-teal-700" : "text-gray-800"}`}>
                    {label}
                  </p>
                  <p className={`text-xs font-medium mb-2 ${selected ? "text-teal-600" : "text-gray-400"}`}>
                    {tagline}
                  </p>
                  <p className="text-xs text-gray-500 leading-snug">{description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Depth */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            עומק השיחה
          </p>
          <div className="grid grid-cols-2 gap-3">
            {DEPTH_OPTIONS.map(({ depth: d, label, description }) => {
              const selected = depth === d;
              return (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className={`rounded-2xl p-4 text-right transition-all border-2 ${
                    selected
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className={`text-lg font-bold mb-1 ${selected ? "text-teal-700" : "text-gray-800"}`}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-500 leading-snug">{description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => handleStart("/prototype-e")}
          className="w-full bg-teal-600 text-white py-4 rounded-xl font-semibold text-base hover:bg-teal-700 transition-colors mb-4"
        >
          התחילו ←
        </button>

        <p className="text-center text-sm text-gray-400 mb-10">
          מעדיפים שיחה חופשית עם AI?{" "}
          <button
            onClick={() => handleStart("/prototype-d")}
            className="text-teal-600 hover:text-teal-800 underline"
          >
            לחצו כאן
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
