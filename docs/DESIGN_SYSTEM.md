# Design System

Source of truth: `:root` in `src/app/globals.css`. Tailwind CSS v4.

## Direction
Editorial, calm, honest. Overview is paper-like; Terminal is a dark green-on-black console.

## Tokens
Overview: paper `#faf9f6`, paper-raised `#ffffff`, ink `#1c1e1c`, ink-muted `#52564f`, ink-faint `#666a60`, hairline `#e2e0d8`, accent `#1f6f4f`, accent-strong `#16523a`.
Terminal: bg `#0b0f0d`, bg-raised `#101613`, fg `#d9e2dc`, fg-dim `#7c8a82`, accent `#4ade80`, accent-dim `#2f7d54`, border `#1c2622`.

## Rules
- Use the CSS variables; don't hard-code colors.
- Responsive from phone width; terminal needs tappable command shortcuts on mobile.
- Accessibility: semantic HTML, visible focus, AA contrast (faint ink was darkened to pass), keyboard operable terminal.
- Keep the two views visually distinct but sharing content.
