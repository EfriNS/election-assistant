"use client";

import { useEffect, useState } from "react";

// Normal Gemini calls finish in ~2–6s; under free-tier load (2026-09-15) successful
// follow-ups took 57–72s behind an unchanging spinner and read as "stuck". 8s sits
// above the normal range, so the notice only appears when something is actually slow.
export const SLOW_AI_NOTICE_MS = 8000;

// Mount alongside any loading state that waits on a Gemini call — the timer starts
// on mount, so the notice resets naturally each time the loading UI re-mounts.
export default function SlowAiNotice({ message, className = "text-center mt-3" }: { message: string; className?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_AI_NOTICE_MS);
    return () => clearTimeout(id);
  }, []);

  // The live region exists from mount so screen readers announce the text when it appears.
  return (
    <p role="status" aria-live="polite" className={`text-xs text-gray-400 ${className}`}>
      {slow ? message : ""}
    </p>
  );
}
