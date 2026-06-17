"use client";

import { useState } from "react";

const SHARE_TITLE = "עוזר הבחירות";
const SHARE_TEXT =
  "גיליתי לאיזו מפלגה אני הכי קרוב 🗳️ רוצה לנסות גם? (אב-טיפוס חינמי)";

type Props = {
  variant?: "prominent" | "subtle";
};

export default function ShareButton({ variant = "prominent" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
      } catch {
        // user cancelled — nothing to do
      }
      return;
    }

    // Clipboard fallback for browsers without Web Share API
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard also unavailable — silently fail
    }
  };

  if (variant === "subtle") {
    return (
      <button
        onClick={handleShare}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {copied ? "✓ הקישור הועתק" : "שתף עם חברים →"}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-800 transition-all shadow-sm"
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>הקישור הועתק!</span>
        </>
      ) : (
        <>
          <span>🗳️</span>
          <span>שתף עם חבר</span>
        </>
      )}
    </button>
  );
}
