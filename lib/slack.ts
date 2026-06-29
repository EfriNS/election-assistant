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
