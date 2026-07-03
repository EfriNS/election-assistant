import type { Metadata } from "next";
import Link from "next/link";
import OpenFeedbackButton from "@/components/OpenFeedbackButton";

export const metadata: Metadata = {
  title: "תנאי שימוש ומדיניות פרטיות — עוזר הבחירות",
  description: "מה נאסף בשימוש בכלי, למה, ובאילו תנאים הוא מוצע.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16" dir="rtl">
      <div className="w-full max-w-md space-y-8">

        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← חזרה לדף הבית</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">תנאי שימוש ומדיניות פרטיות</h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">תנאי שימוש</h2>

          <p className="text-sm text-gray-600 leading-relaxed">
            עוזר הבחירות הוא כלי מידע עצמאי. הוא אינו ייעוץ משפטי, אינו גורם רשמי בבחירות, ואינו ממליץ על אופן ההצבעה — הבחירה נשארת שלכם בלבד.
          </p>

          <p className="text-sm text-gray-600 leading-relaxed">
            הכלי אינו קשור, ממומן, או פועל מטעם אף מפלגה. שמות המפלגות מוזכרים לצורך זיהוי והשוואה בלבד, ואין בכך משום אישור, שיוך, או מטעם מי מהן.
          </p>

          <p className="text-sm text-gray-600 leading-relaxed">
            הציטוטים ממצעי המפלגות מבוססים על מקורות רשמיים במידת האפשר, עם קישור למקור לכל ציטוט. ציוני ההתאמה וניתוחי הטקסט נוצרים בסיוע בינה מלאכותית ומשקפים את הניתוח של הכלי — לא הצהרה של המפלגה עצמה על עצמה.
          </p>

          <p className="text-sm text-gray-600 leading-relaxed">
            <strong className="text-gray-800">הכלי מסופק כפי שהוא (&ldquo;AS IS&rdquo;), ללא אחריות לדיוק מוחלט או לשלמות המידע. השימוש בו הוא באחריות המשתמש/ת, ואינו תחליף לשיקול דעת עצמאי.</strong>
          </p>

          <p className="text-sm text-gray-600 leading-relaxed">
            מצאתם ציטוט שנראה לא מדויק? נשמח לבדוק ולתקן —
          </p>
          <ul className="text-sm text-gray-600 leading-relaxed space-y-1 list-disc list-inside">
            <li><OpenFeedbackButton /></li>
            <li>
              <a
                href="https://github.com/EfriNS/election-assistant/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-800"
              >
                GitHub Issues
              </a>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">מדיניות פרטיות</h2>

          <p className="text-sm text-gray-600 leading-relaxed">
            אין צורך בהרשמה או התחברות. תשובותיכם בשאלון — כולל כל מה שכתבתם בתיבות הטקסט החופשי — אינן נשמרות ואינן מקושרות לזהותכם.
          </p>

          <p className="text-sm text-gray-600 leading-relaxed">
            עם זאת, האתר משתמש בכלי אנליטיקס אנונימיים כדי להבין איך הכלי משמש בפועל ולשפר אותו. הפירוט:
          </p>

          <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-gray-700">Mixpanel</strong> — אילו נושאים דורגו כחשובים, כמה שאלות נענו, ולאיזו מפלגה הייתה ההתאמה הגבוהה ביותר (ברמת האחוזים בלבד). מקושר למזהה אנונימי חד-פעמי שנוצר לכל ביקור, לא לשמכם או לפרטים מזהים.</li>
            <li><strong className="text-gray-700">Langfuse</strong> — ניטור טכני של מערכת הבינה המלאכותית: זמני תגובה, שגיאות, ואיזו מפלגה הייתה ההתאמה המובילה. לעולם לא תוכן התשובות החופשיות שלכם.</li>
            <li><strong className="text-gray-700">Hotjar, Microsoft Clarity, ContentSquare</strong> — כלים שמראים לנו איך אנשים מנווטים באתר (קליקים, גלילה, מסכים שבהם משתמשים מתעכבים). תיבות הטקסט החופשי בשאלון אינן מוקלטות על ידם.</li>
            <li><strong className="text-gray-700">Vercel Analytics</strong> — נתוני צפיות וביצועים בסיסיים של האתר.</li>
          </ul>

          <p className="text-sm text-gray-600 leading-relaxed">
            המידע הזה משמש אך ורק לשיפור הכלי — לאתר תקלות ולהבין איפה משתמשים מתקשים. הוא אינו נמכר, אינו משותף עם אף מפלגה או גורם מסחרי, ואין באתר פרסומות, פיקסלים שיווקיים, או מעקב לצורכי תעמולה.
          </p>
        </section>

        <div className="pt-4 border-t border-gray-100">
          <Link href="/about" className="text-xs text-gray-400 underline hover:text-gray-600">
            אודות הכלי
          </Link>
        </div>

      </div>
    </main>
  );
}
