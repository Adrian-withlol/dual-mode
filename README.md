# Adrian Vela — Portfolio

A dual-mode personal portfolio: an editorial **Overview** page and an interactive
**Terminal** that explores the same content through commands. Built with Next.js
(App Router), TypeScript, and Tailwind CSS, with a real Anthropic-powered `ask`
command.

## What's here

- **Overview** (`/`) — editorial landing page: background, current focus,
  education, honestly-labeled skills, projects with real progress labels, and
  experience.
- **Terminal** (`/?view=terminal`) — the same content via commands: `help`,
  `about`, `skills`, `projects`, `education`, `experience`, `ask [question]`,
  `clear`, `home`. Supports Enter to submit, ↑/↓ command history, Tab
  autocomplete, Esc/Ctrl+C to stop an in-progress AI response, and tappable
  command shortcuts for mobile. Switching between views preserves terminal
  state (both views stay mounted; only visibility toggles).
- **`ask` command** — calls a server-side `/api/ask` route that streams a real
  answer from the Claude Messages API, restricted to the facts in
  `src/lib/portfolio-data.ts`.

## Content — single source of truth

All content (name, summary, skills, projects, education, experience) lives in
**one file**: `src/lib/portfolio-data.ts`. It feeds the Overview page, every
terminal command, and the system prompt the AI assistant is restricted to.
**Edit that file to update the site — there is nowhere else content should be
duplicated.**

Keep entries honest: skill levels use `"learning" | "foundational" |
"comfortable"` (no invented percentages), and project statuses use real
progress labels, not marketing language. The AI assistant is instructed to
answer only from this file and to say plainly when something isn't documented
yet — it will not invent achievements, metrics, or qualifications.

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and set ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable            | Required | Purpose                                                        |
| -------------------- | -------- | ---------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`  | For `ask`| Server-side only. Without it, `ask` clearly reports "AI is disconnected" — every other command and the whole Overview page work normally. |
| `ANTHROPIC_MODEL`    | No       | Defaults to `claude-opus-5`. Change to point at a different Claude model. |

Never expose these through `NEXT_PUBLIC_*` variables, client code, or git —
`.env*` is gitignored (see `.gitignore`); only `.env.example` (no real values)
is committed.

## Rate limiting on Vercel

`src/lib/rate-limit.ts` implements a best-effort, in-memory limiter (8
requests / 10 minutes per client) to stop naive abuse of `/api/ask`. On Vercel,
serverless function instances don't share memory, so this limit is **not**
durable or globally consistent across instances/cold starts — a determined
visitor spread across instances could exceed it. For a real, durable limit
that holds across every instance, add a shared store in front of it:

- **Upstash Redis + `@upstash/ratelimit`** (recommended — works well on
  Vercel, generous free tier), or
- **Vercel KV** (managed, Upstash-backed Redis via the Vercel dashboard).

Swap the body of `checkRateLimit` in `src/lib/rate-limit.ts` for a call to
whichever you choose; the rest of `/api/ask` doesn't need to change.

## Deploying to Vercel (GitHub-connected)

1. Push this repository to GitHub.
2. In the [Vercel dashboard](https://vercel.com/new), import the GitHub repo.
   Framework preset (Next.js) is auto-detected — no build config changes
   needed.
3. Under **Project Settings → Environment Variables**, add `ANTHROPIC_API_KEY`
   (and optionally `ANTHROPIC_MODEL`) for Production (and Preview, if you want
   `ask` working on preview deployments too).
4. Deploy. Every push to the connected branch redeploys automatically.

## Status: implemented, tested, and what still needs configuration

**Implemented and verified** (production build + manual browser/API testing
in this environment):

- Overview and Terminal views, view-switching with state preservation, URL
  reflects the active view (`?view=terminal`).
- All non-AI terminal commands (`help`, `about`, `skills`, `projects`,
  `education`, `experience`, `clear`, `home`), unknown-command handling,
  missing-argument handling (`ask` with no question).
- Keyboard behavior: Enter, ↑/↓ history, Tab autocomplete (falls through to
  normal focus movement when there's nothing to complete — it never traps
  focus), Esc/Ctrl+C to stop a stream, and mobile shortcut buttons.
- `/api/ask`: real Anthropic Messages API streaming (SSE) with the SDK's
  `messages.stream`, input validation (missing/empty/over-length question),
  a 30s timeout, client- and server-side cancellation via `AbortController`,
  a `max_tokens` output cap, and the in-memory rate limiter (8 req/10 min,
  verified to return `429` after the limit).
- "AI disconnected" behavior when `ANTHROPIC_API_KEY` is unset (`503`, clear
  message, rest of the site unaffected) — verified without a key.
- Streaming error handling for auth failures, rate limiting, and interrupted
  streams — verified with a deliberately invalid key and via cancellation.
- `npm run lint` and `npm run build` both pass cleanly.

**Requires your configuration / credentials to fully verify:**

- A real, valid `ANTHROPIC_API_KEY` — this environment only tested against an
  intentionally invalid key (to exercise the disconnected/error paths) and
  the missing-key path. The happy-path answer content itself has not been
  seen streaming end-to-end with real credentials.
- A durable rate-limit backend (Upstash/Vercel KV) if you expect meaningful
  public traffic — see "Rate limiting on Vercel" above.
- Public contact links (GitHub/LinkedIn/etc.) — left empty in
  `portfolio-data.ts` rather than guessed; add them there if you want them
  shown on the Overview page.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · `@anthropic-ai/sdk`
