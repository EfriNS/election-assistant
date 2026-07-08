"use client";

import { useState } from "react";
import { ShareIcon, CheckCircleIcon } from "@/components/icons";

const isPreview = process.env.DEPLOY_ENV !== "production";

const SHARE_TITLE = isPreview ? "עוזר הבחירות (גרסת Preview)" : "עוזר הבחירות";
const SHARE_TEXT = isPreview
  ? "גרסת Preview לבדיקה — עוד לא הגרסה הסופית. עוזר הבחירות: כלי חינמי שעוזר לגלות לאיזו מפלגה אתם הכי קרובים"
  : "גיליתי לאיזו מפלגה אני הכי קרוב 🗳️ רוצה לנסות גם? הכלי חינמי ומסביר למה";

type Props = {
  variant?: "prominent" | "subtle" | "landing";
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
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded"
      >
        {copied ? "✓ הקישור הועתק" : "שתפו עם חברים ←"}
      </button>
    );
  }

  if (variant === "landing") {
    return (
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
      >
        {copied ? (
          <>
            <CheckCircleIcon className="w-4 h-4 text-teal-600" />
            <span>הקישור הועתק!</span>
          </>
        ) : (
          <>
            <ShareIcon className="w-4 h-4" />
            <span>שתפו עם חברים ←</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-800 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
    >
      {copied ? (
        <>
          <CheckCircleIcon className="w-4 h-4 text-teal-600" />
          <span>הקישור הועתק!</span>
        </>
      ) : (
        <>
          <ShareIcon className="w-4 h-4" />
          <span>שתפו עם חברים</span>
        </>
      )}
    </button>
  );
}
