---
description: "Triage open Dependabot PRs: assess, apply the safe ones on one branch, verify, report — stops before merge"
argument-hint: "[PR numbers to limit to, optional]"
---

Triage the open Dependabot PRs (or only `$ARGUMENTS` if given). Goal: one verified branch plus a decision table for the user. **Never merge, push, or close/comment on PRs in this command** — those happen only after the user approves the report, in a separate turn.

## 1. Inventory

- `gh pr list --state open --author app/dependabot --json number,title,createdAt,headRefName`
- `gh api "repos/{owner}/{repo}/dependabot/alerts?state=open" -q length` — open security alerts
- Find PRs deliberately held in earlier sessions: grep `CHANGELOG.md` / `TODO.md` for the PR numbers and "held" / "do not merge". Re-check each held PR's blocker — don't re-decide it from scratch.

## 2. Assess each PR

For each: `gh pr view <n> --json body -q .body` (release notes), then decide.

- **Already on main?** Compare the PR's target version with `npm ls <package>` on main. Already there → verdict "superseded", nothing to do (Dependabot closes it on its own).

- **Security fix?** (GHSA/CVE in notes) → apply, and say so first in the report.
- **Major bump or breaking changes?** → read the breaking-change list; usually hold for a user decision.
- **Do we use what changed?** `grep -rn "<package>" app lib components middleware.ts scripts` — map each fix/feature to our actual usage (e.g. a rate-limit fix in an algorithm `middleware.ts` doesn't use = no impact). Scripts-only deps (e.g. `@anthropic-ai/sdk` → `scripts/auto-score.ts`) are low risk.
- **Known coupling rules** (see `docs/learnings/project/INFRA-PATTERNS.md` and `.github/dependabot.yml`):
  - `puppeteer`/`puppeteer-core` must match the Chrome build of `@sparticuz/chromium` — check `npm view @sparticuz/chromium version` against the Chrome version in puppeteer's release notes. Mismatch → hold.
  - `typescript` majors: check `typescript-eslint`'s supported range — a green Vercel build doesn't run eslint.
  - `vitest` + `@vitest/*` move together.

Verdict per PR: **superseded** / **apply** / **hold** (with the blocking condition) / **close** (with reason) / **ask** (needs a user decision).

## 3. Apply

- `git fetch origin main`, start from an up-to-date `main`, branch `chore/deps-YYYY-MM-DD`.
- `npm install <pkg>@<version> ...` for every "apply" PR in one go — one combined change, superseding the individual PRs.
- **No code changes.** If an update requires one (breaking API change), stop and report it as "ask" instead.

## 4. Verify

- Full suite: `npx vitest run`, `npx tsc --noEmit`, `npx eslint .`, `npm run build`. Any failure → report, don't work around it.
- Runtime smoke on a local production build (`PORT=3100 npm start` in the background; stop it afterwards), only for the areas touched:
  - `next` → `curl localhost:3100/apple-icon` (200, image/png) + one Gemini route below.
  - `@google/genai` → one real Gemini call (costs ~$0.001, shows up in Langfuse as environment `default`):
    ```bash
    curl -s localhost:3100/api/follow-up -H 'content-type: application/json' -d '{"conversationSoFar":[],"currentTopic":{"label":"כלכלה","openerQuestion":"מה חשוב לך יותר?","openerAnswer":"הורדת יוקר המחיה","followUpQA":[]},"nextTopic":null,"tone":"neutral","depth":"standard","followUpsAskedThisTopic":0,"sessionId":"dep-triage-smoke"}'
    ```
    Expect 200 and a Hebrew `followUp.question`.
  - `puppeteer*` / `@sparticuz/chromium` → a real PDF export, per INFRA-PATTERNS (delete a stale `/tmp/chromium` first, or it reports the old Chrome).
  - `@upstash/*` → `middleware.ts` only rate-limits when `KV_REST_API_*` are set (not locally); rely on release notes + tests, and say so.
- Commit on the branch with a message listing each bump, the PRs it supersedes, and what verified it.

## 5. Report and stop

A table: PR | update | verdict | risk / why | how verified. Then held PRs with their blockers, then open security alerts. End by asking the user whether to merge (merge = production deploy).

**After approval (next turn)**: merge `--no-ff` to main, push main + branch, wait for the Vercel commit status to succeed and spot-check production. Dependabot closes superseded PRs on its own once main has the versions. Add a CHANGELOG entry.
