import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "אודות — עוזר הבחירות",
  description: "מי בנה את עוזר הבחירות, איך הוא עובד, ועל בסיס מה הציונים מחושבים.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16" dir="rtl">
      <div className="w-full max-w-md space-y-8">

        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← חזרה לדף הבית</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">אודות הכלי</h1>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">מי בנה את זה?</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            עוזר הבחירות נבנה על ידי מאיה ואפרי נטל-שי — ללא שיוך פוליטי וללא מימון מפלגתי. הכלי הוא פרויקט אזרחי עצמאי, חינמי לכל.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">על בסיס מה מחושבים הציונים?</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            ציוני ההתאמה מחושבים על פי מצעי המפלגות ומסמכי עמדה רשמיים. לכל ציטוט מצורף קישור למקור המקורי. מפלגות שאין להן מצע רשמי מסומנות בפירוש — ובמקרה זה נעשה שימוש במקורות האמינים ביותר שמצאנו, כגון ראיונות רשמיים ומסמכי עמדה מוסמכים.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            השאלות והתשובות נוסחו ביד, בהתבסס על הנושאים המרכזיים בסדר היום הציבורי. ניקוד ההתאמה בין העמדות למצעי המפלגות נעשה בסיוע בינה מלאכותית, ועבר סקירה של מומחה תוכן.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">האם הכלי ניטרלי?</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            הכלי אינו ממליץ על מפלגה ואינו מחזיק בעמדה פוליטית. הוא מציג את ההתאמה בין העמדות שהזנת לבין המצעים הרשמיים — ותו לא. ההחלטה שלך.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">פרטיות</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            התשובות אינן נשמרות ואינן מקושרות אליך. אין צורך בהתחברות ואין איסוף נתונים אישיים.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-gray-800">יצירת קשר ומשוב</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            מצאת שגיאה במצע מפלגה? יש לך הערה על הניסוח? אפשר לפנות דרך:
          </p>
          <ul className="text-sm text-gray-600 leading-relaxed space-y-1 list-disc list-inside">
            <li>
              <span>כפתור המשוב באפליקציה (</span>
              <Link href="/" className="underline hover:text-gray-800">חזרה לכלי</Link>
              <span>)</span>
            </li>
            <li>
              <a
                href="https://github.com/EfriNS/election-assistant/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-800"
              >
                GitHub Issues
              </a>
              {" "}— לתיקוני תוכן ושאלות מתודולוגיות
            </li>
          </ul>
        </section>

        <div className="pt-4 border-t border-gray-100">
          <a
            href="https://github.com/EfriNS/election-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            קוד המקור ב-GitHub
          </a>
        </div>

      </div>
    </main>
  );
}
