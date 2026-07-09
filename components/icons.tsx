// Single-color inline icon set (currentColor) replacing platform emoji across
// the app. One shared source keeps every instance of the same concept
// (e.g. "warning") visually identical instead of drifting per call site.

type IconProps = { className?: string };

export function ShareIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V4M12 4l-4 4M12 4l4 4" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

export function MessageIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M4 5h16v11H9l-4 4V5z" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

export function DocumentIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M7 3h7l4 4v14H7V3z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

export function SpinnerIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} animate-spin`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" opacity={0.2} />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

export function ClockIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function WarningIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4l9 16H3L12 4z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// The app's own icon.svg mark (ring + dot) — echoes the answer-selection radio UI.
export function BrandMark({ className = "w-8 h-8" }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <rect x="2" y="2" width="96" height="96" rx="27" fill="#0F766E" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="#FFFFFF" strokeWidth={11} />
      <circle cx="50" cy="50" r="9" fill="#FFFFFF" />
    </svg>
  );
}
