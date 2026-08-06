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
