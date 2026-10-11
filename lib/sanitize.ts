// Strip HTML tags and enforce a length cap on any user-supplied text before
// it enters an AI prompt. Prevents <script> injection and runaway inputs.
//
// Truncate to maxLen BEFORE any regex work (bounds worst-case cost to a
// small constant — a paired-delimiter tag regex like /<[^>]*>/ is quadratic
// on unclosed "<" runs). Strip every "<"/">" individually rather than
// matching whole tags — a delimiter-pair regex leaves an unclosed "<script"
// (no ">") completely untouched, which a paired match can never catch.
export function sanitizeUserInput(text: string, maxLen = 500): string {
  return text
    .slice(0, maxLen)
    .replace(/[<>]/g, "")
    .trim();
}

// Answer options the client says the user was shown (opener options in their
// shuffled order, AI-generated follow-up options). Client-supplied, so bounded
// and sanitized like any other text before it enters an AI prompt. Anything
// that isn't a list of strings yields undefined — the prompt then omits them.
export function sanitizeOptionList(options: unknown, maxItems = 8, maxLen = 300): string[] | undefined {
  if (!Array.isArray(options)) return undefined;
  const cleaned = options
    .filter((o): o is string => typeof o === "string")
    .slice(0, maxItems)
    .map((o) => sanitizeUserInput(o, maxLen))
    .filter((o) => o.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}
