# Adrian Vela — Portfolio

A dual-mode personal portfolio: an editorial **Overview** page and an
interactive **Terminal** that explores the same content through commands.
Built with Next.js (App Router), TypeScript, and Tailwind CSS. No external
API, database, or environment variables required — it's fully static content
served by a couple of client components.

## What's here

- **Overview** (`/`) — editorial landing page: background, current focus,
  education, honestly-labeled skills, projects with real progress labels, and
  experience.
- **Terminal** (`/?view=terminal`) — the same content via commands: `help`,
  `about`, `skills`, `projects`, `education`, `experience`, `clear`, `home`.
  Supports Enter to submit, ↑/↓ command history, Tab autocomplete, and
  tappable command shortcuts for mobile. Switching between views preserves
  terminal state (both views stay mounted; only visibility toggles).

## Content — single source of truth

All content (name, summary, skills, projects, education, experience, contact
links) lives in **one file**: `src/lib/portfolio-data.ts`. It feeds the
Overview page and every terminal command. **Edit that file to update the
site — there is nowhere else content should be duplicated.**

Keep entries honest: skill levels use `"learning" | "foundational" |
"comfortable"` (no invented percentages), and project statuses use real
progress labels, not marketing language.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel (GitHub-connected)

1. Push this repository to GitHub.
2. In the [Vercel dashboard](https://vercel.com/new), import the GitHub repo.
   Framework preset (Next.js) is auto-detected — no build config or
   environment variables needed.
3. Deploy. Every push to the connected branch redeploys automatically.

If the deployment isn't publicly visible, check **Settings → Deployment
Protection** in the Vercel dashboard — "Vercel Authentication" is on by
default for new projects and requires visitors to log into Vercel to view any
deployment. Turn it off (or scope it to preview-only) for a public portfolio.

## Status

Implemented and verified in this environment: Overview and Terminal views,
view-switching with state preservation (URL reflects the active view via
`?view=terminal`), all terminal commands, unknown-command handling,
keyboard behavior (Enter, ↑/↓ history, Tab autocomplete that falls through to
normal focus movement when there's nothing to complete), and mobile shortcut
buttons. `npm run lint` and `npm run build` both pass cleanly.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS v4
