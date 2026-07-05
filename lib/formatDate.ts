// Localized date display for user-facing pages/PDF — matches the "5 ביולי 2026"
// format already used for the PDF's generatedAt timestamp. timeZone: "UTC" keeps
// a date-only string (e.g. "2026-07-05") from shifting a day in either direction
// depending on the viewer's or server's local timezone.
export function formatHebrewDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
