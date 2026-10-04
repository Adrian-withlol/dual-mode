# Architecture

Next.js (App Router) + TypeScript + Tailwind v4, static content, deployed on Vercel (GitHub-connected; push redeploys).

- `src/lib/portfolio-data.ts` — single source of truth for all content. Feeds Overview and every terminal command.
- `src/app/` routes and `globals.css`; `src/components/` Overview and Terminal client components (both stay mounted; only visibility toggles).
- URL `?view=terminal` reflects active view.
- `tests/` run with `node --test tests/`.
- No API routes, no env vars, analytics via `@vercel/analytics` only.

## Rules
- Never duplicate content outside `portfolio-data.ts`. (`~/avela-world` keeps a synced copy; update both when content changes.)
- This is a newer Next.js with breaking changes: read `node_modules/next/dist/docs/` before using unfamiliar APIs (see `AGENTS.md`).
- If the deployment isn't public, check Vercel Deployment Protection.

## Failure behavior
Unknown terminal command prints a helpful message; no network dependencies at runtime.
