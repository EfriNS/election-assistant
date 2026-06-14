import Link from "next/link";

const prototypes = [
  {
    id: "a",
    letter: "א",
    title: "הצהרות",
    subtitle: "Quiz קלאסי",
    description: "ענה על 6 הצהרות — הסכם, התנגד, או היה אדיש. פשוט, ישיר, וניתן לביקורת.",
    time: "~5 דקות",
    color: "bg-blue-50 border-blue-200 hover:border-blue-400",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    id: "b",
    letter: "ב",
    title: "עדיפויות",
    subtitle: "קודם מה חשוב לך",
    description: "דרג את הנושאים שחשובים לך — ואז ענה על שאלות רק בנושאים שבחרת.",
    time: "~8 דקות",
    color: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "c",
    letter: "ג",
    title: "דילמות",
    subtitle: "מצבים אמיתיים",
    description: "בחר בין שתי מדיניות קונקרטיות בנושאים שמשפיעים על חייך.",
    time: "~6 דקות",
    color: "bg-amber-50 border-amber-200 hover:border-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    id: "d",
    letter: "ד",
    title: "שיחה",
    subtitle: "עם עוזר AI",
    description: "שוחח בחופשיות עם עוזר חכם שיבין את עמדותיך ויסביר לאיזו מפלגה אתה קרוב.",
    time: "~10 דקות",
    color: "bg-purple-50 border-purple-200 hover:border-purple-400",
    badge: "bg-purple-100 text-purple-700",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-gray-400 tracking-widest mb-3">אב-טיפוס לבדיקה</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">עוזר הבחירות</h1>
          <p className="text-lg text-gray-500">
            מצא לאיזו מפלגה אתה הכי קרוב — בצורה שקופה, ללא עיוות.
          </p>
        </div>

        <p className="text-sm text-center text-gray-400 mb-6">
          4 גרסאות שונות של הכלי — נשמח לשמוע איזו מרגישה הכי נכונה לך.
        </p>

        <div className="flex flex-col gap-4">
          {prototypes.map((p) => (
            <Link
              key={p.id}
              href={`/prototype-${p.id}`}
              className={`border-2 rounded-2xl p-6 transition-all duration-150 ${p.color}`}
            >
              <div className="flex items-start gap-4">
                <div className={`text-xl font-bold px-3 py-1 rounded-lg ${p.badge} shrink-0`}>
                  {p.letter}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h2 className="text-xl font-bold">{p.title}</h2>
                    <span className="text-sm text-gray-500">{p.subtitle}</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-2">{p.description}</p>
                  <span className="text-xs text-gray-400">{p.time}</span>
                </div>
                <span className="text-gray-300 text-2xl shrink-0">←</span>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-xs text-center text-gray-300 mt-12">
          אב-טיפוס בלבד · התוכן לא מייצג עמדות פוליטיות אמיתיות
        </p>
      </div>
    </main>
  );
}
