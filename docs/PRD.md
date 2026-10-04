# Product Requirements — Adrian Vela Portfolio

## Overview
Dual-mode personal portfolio: an editorial **Overview** (`/`) and an interactive **Terminal** (`/?view=terminal`) exploring the same content via commands. Live at avelaworks.online (Namecheap DNS, Vercel).

## Users
Recruiters, internship hiring managers, professors, peers.

## Core features
1. Overview: background, current focus, education, honestly-labeled skills, projects with real progress labels, experience.
2. Terminal: `help`, `about`, `skills`, `projects`, `education`, `experience`, `clear`, `home`; Enter, up/down history, Tab autocomplete, tappable shortcuts on mobile.
3. View switching preserves terminal state (both views stay mounted).
4. Single content source: `src/lib/portfolio-data.ts`.

## Content rules
Skill levels: `learning | foundational | comfortable` only (no invented percentages). Project statuses use real progress labels, not marketing language. Never invent experience.

## Non-goals
No backend, database, CMS, auth or env vars.

## Open Questions
- None recorded.

## Definition of Done
- [ ] `npm run lint`, `npm test`, `npm run build` pass
- [ ] Both views verified in Playwright (desktop + mobile), no console errors
- [ ] Content only edited in `portfolio-data.ts`
- [ ] Docs updated
