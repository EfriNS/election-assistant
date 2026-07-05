// Slack mrkdwn treats &, <, > as special (link/mention syntax uses <...>).
// Escape user-supplied text before embedding it in a message, per Slack's own
// escaping rule — order matters: & must be escaped first.
export function escapeSlackMrkdwn(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notifySlack(text: string): Promise<void> {
  const url = process.env.QUOTA_SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // never propagate Slack failures
  }
}
