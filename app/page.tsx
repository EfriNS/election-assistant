"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tone = "formal" | "personal";
type Depth = "short" | "deep";

const getStorage = (key: string) =>
  typeof window !== "undefined" ? sessionStorage.getItem(key) : null;

export default function Home() {
  const router = useRouter();
  const [tone, setTone] = useState<Tone | null>(() => getStorage("landing_tone") as Tone | null);
  const [depth, setDepth] = useState<Depth | null>(() => getStorage("landing_depth") as Depth | null);
  const ready = tone !== null && depth !== null;

  const handleTone = (t: Tone) => { setTone(t); sessionStorage.setItem("landing_tone", t); };
  const handleDepth = (d: Depth) => { setDepth(d); sessionStorage.setItem("landing_depth", d); };

  const handleStart = () => {
    if (!ready) return;
    router.push(`/prototype-e?tone=${tone}&depth=${depth}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Headline */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">עוזר הבחירות</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            גלו לאיזו מפלגה אתם הכי קרובים — בצורה שקופה ומנומקת
          </p>
        </div>

        {/* How it works */}
        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-xs text-gray-500 leading-relaxed space-y-1.5">
          <p><strong className="text-gray-700">איך זה עובד?</strong> קודם בוחרים אילו נושאים חשובים לכם, אחר כך עונים על שאלות קצרות בכל נושא. התוצאה: רשימת מפלגות לפי מידת ההתאמה לעמדותיכם, עם הסבר מנומק לכל מפלגה.</p>
          <p><strong className="text-gray-700">על בסיס מה?</strong> ציוני ההתאמה מחושבים על פי מצעי המפלגות ומסמכי עמדה רשמיים, בסיוע בינה מלאכותית. מפלגות שטרם פרסמו מצע עדכני מסומנות בפירוש, ונעשה שימוש במסמכים ישנים יותר. לכל ציטוט מצורף קישור למקור.</p>
          <p><strong className="text-gray-700">פרטיות.</strong> התשובות אינן נשמרות ואינן מקושרות אליכם. הכלי ניטרלי — הוא אינו ממליץ על מפלגה ואינו מחזיק בעמדה פוליטית.</p>
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
                onClick={() => handleTone(t)}
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
                onClick={() => handleDepth(d)}
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
          onClick={handleStart}
          disabled={!ready}
          className="w-full bg-teal-600 text-white py-4 rounded-xl font-semibold text-base hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          התחילו ←
        </button>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 space-y-1">
          <p>הכלי חינמי ופתוח לכולם ·{" "}
            <a href="https://github.com/EfriNS/election-assistant" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">קוד המקור ב-GitHub</a>
          </p>
        </div>

      </div>
    </main>
  );
}
