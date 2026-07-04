# Security Policy

Found a security issue? Please report it privately rather than opening a public issue — the same reasoning as any responsible-disclosure request.

**How to report:**
- Preferred: GitHub's [private vulnerability reporting](https://github.com/EfriNS/election-assistant/security/advisories/new) (Security tab → Report a vulnerability).
- If that's not available: open a regular GitHub issue asking to be contacted, without details, and we'll follow up privately.

**Scope:** this is a small, independently-run civic tool, not a funded product with a dedicated security team. Every report gets looked at, but there's no fixed response-time commitment.

**Please don't:**
- Run load, DoS, or availability-degrading tests against the live site (voteassist.me).
- Try to access or exfiltrate user data — by design, quiz answers aren't stored or linked to identity (see [`/terms`](https://voteassist.me/terms)), so there shouldn't be any to find.
