// Response-order randomization — a neutrality invariant, not cosmetics:
// fixed option order leaks the instrument-author's axis (8 of 9 opener
// questions listed the left-liberal/consensus position first), and
// AI-generated option order leaks the user's own prior answers back at them.
// Display order is never a scoring input (opener scores are keyed by option
// id, follow-up answers are stored as self-contained numbered text), so
// shuffling is safe by construction.

// Non-mutating Fisher-Yates copy. Must not mutate: opener options are
// module-singleton constants (QUESTIONS_FORMAL/QUESTIONS_PERSONAL).
export function shuffleArray<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Shuffles options while pinning the free-text escape hatch ("אחר — פרט")
// to the last position, matching the openers' always-last free-text box.
export function shuffleOptionsKeepLast(options: readonly string[], last: string): string[] {
  const rest = options.filter((o) => o !== last);
  const shuffled = shuffleArray(rest);
  return rest.length === options.length ? shuffled : [...shuffled, last];
}
