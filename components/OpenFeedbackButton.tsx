"use client";

export default function OpenFeedbackButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("open-feedback-widget"))}
      className="underline hover:text-gray-800"
    >
      פתיחת חלון המשוב
    </button>
  );
}
