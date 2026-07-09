"use client";

import { useState } from "react";

interface TermHintProps {
  definition: string;
  label?: string;
}

export function TermHint({ definition, label = "מה זה אומר?" }: TermHintProps) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded"
        aria-expanded={open}
      >
        <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center leading-none">?</span>
        <span>{label}</span>
      </button>
      {open && (
        <span className="block mt-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
          {definition}
        </span>
      )}
    </span>
  );
}
