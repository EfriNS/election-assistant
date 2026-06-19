"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tone = "formal" | "personal";
type Depth = "short" | "deep";

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
        <div className="mb-12">
          <p className="text-xs font-medium text-gray-400 tracking-widest uppercase mb-3">אב-טיפוס</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">עוזר הבחירות</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            גלו איפה אתם עומדים מול כל המפלגות — בצורה שקופה ומנומקת
          </p>
        </div>

        {/* Advisor style */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            מי אני כיועץ שלכם?
          </p>
          <div className="flex flex-col gap-3">
            {([
              { t: "formal"   as Tone, label: "ענייני", desc: "נדבר בשפת מדיניות ועמדות" },
              { t: "personal" as Tone, label: "זורם",   desc: "נדבר בשפת יומיום ודאגות" },
            ]).map(({ t, label, desc }) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className="flex items-center gap-3 text-right py-2 group"
              >
                <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  tone === t ? "border-teal-500" : "border-gray-300 group-hover:border-gray-400"
                }`}>
                  {tone === t && <span className="w-2 h-2 rounded-full bg-teal-500 block" />}
                </span>
                <span>
                  <span className={`font-semibold text-base ${tone === t ? "text-teal-700" : "text-gray-800"}`}>
                    {label}
                  </span>
                  <span className="text-gray-400 text-sm"> — {desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-6" />

        {/* Depth */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            עד כמה להעמיק?
          </p>
          <div className="flex flex-col gap-3">
            {([
              { d: "short" as Depth, label: "ממוקד", desc: "נושאים מרכזיים, תשובות מהירות" },
              { d: "deep"  as Depth, label: "מעמיק", desc: "יותר שאלות, תמונה מלאה יותר" },
            ]).map(({ d, label, desc }) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className="flex items-center gap-3 text-right py-2 group"
              >
                <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  depth === d ? "border-teal-500" : "border-gray-300 group-hover:border-gray-400"
                }`}>
                  {depth === d && <span className="w-2 h-2 rounded-full bg-teal-500 block" />}
                </span>
                <span>
                  <span className={`font-semibold text-base ${depth === d ? "text-teal-700" : "text-gray-800"}`}>
                    {label}
                  </span>
                  <span className="text-gray-400 text-sm"> — {desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-6" />

        {/* CTA */}
        <button
          onClick={() => handleStart("/prototype-e")}
          className="w-full bg-teal-600 text-white py-4 rounded-xl font-semibold text-base hover:bg-teal-700 transition-colors mb-4"
        >
          התחילו ←
        </button>

        <p className="text-center text-xs text-gray-400 mb-8">
          ניטרלי · שקוף · ללא הרשמה
        </p>

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
