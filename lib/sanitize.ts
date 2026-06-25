// Strip HTML tags and enforce a length cap on any user-supplied text before
// it enters an AI prompt. Prevents <script> injection and runaway inputs.
export function sanitizeUserInput(text: string, maxLen = 500): string {
  return text
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLen);
}
