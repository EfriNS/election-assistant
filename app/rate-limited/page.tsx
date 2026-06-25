import Link from "next/link";

export default function RateLimitedPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm text-center">
        <p className="text-4xl mb-6">⏳</p>
        <h1 className="text-xl font-bold mb-3">הגעת למכסת השימוש היומית</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          כדי שהכלי יישאר זמין לכולם, מספר השימושים ביום מוגבל לכל כתובת IP.
          <br />
          חזרו מחר ונשמח לעזור!
        </p>
        <Link
          href="/"
          className="inline-block text-sm text-teal-600 hover:text-teal-800 hover:underline"
        >
          ← חזרה לדף הבית
        </Link>
      </div>
    </main>
  );
}
