# Soft & Hard Guardrails

*Guardrails for coding agents: guidance that steers, enforcement that refuses.* Talk by Juan G. Carmona. Event, date and length are still open ([`content/open-questions.md`](content/open-questions.md)).

Same deck engine and conventions as [*Aligned*](../talk-aligned): a fixed 1920×1080 sheet, scenes with steps in the URL, a presenter window, EN/ES and one recurring visual under every scene. Here that visual is a **mountain pass drawn in glyphs, from sunset to night**: the paint and the curve chevrons are the soft guardrails, the red and white barrier over the ravine is the hard one.

## What is where

| Path | What |
| --- | --- |
| [`content/thesis.md`](content/thesis.md) | The idea and what the audience takes home |
| [`content/visual.md`](content/visual.md) | The visual thread: the road, the colour code, the chrome of the sheet |
| [`content/outline.md`](content/outline.md) | Scene by scene, mapped to the source deck |
| [`content/speaker-notes.md`](content/speaker-notes.md), [`speaker-notes.es.md`](content/speaker-notes.es.md) | What Juan says (pending) |
| [`content/open-questions.md`](content/open-questions.md) | Decisions still open |
| [`research/`](research/) | Text extracted from the original concept decks |
| `src/scenes.tsx` | The scenes; mirrors `outline.md` |
| `src/road/` | The glyph mountain pass (Canvas 2D), its forms and its light |

Content source: `presentations/talks/soft-and-hard-guardrails` (Slidev deck, `deck/pages/*.md`).

## Run

Requires Node.js 22.

```bash
npm ci
```

```bash
npm run dev
```

| Key | Action |
| --- | --- |
| → ↓ PageDown Space Enter | next step or scene |
| ← ↑ PageUp Backspace | previous |
| Home / End | first / last scene |
| P | presenter window |
| B or . | blackout |
| F | fullscreen |

The title sheet has an EN/ES toggle at the bottom left; the choice is kept in the URL (`?lang=es`).

## Build, PDF, screenshots

```bash
npm run build
```

Then `npm run pdf`, `npm run shots` or `npm run og`, as in *Aligned* (`LANG_DECK=es` for Spanish). For a quick look at a few positions:

```bash
node scripts/peek.mjs screenshots es '#/title' '#/two-kinds/2'
```

## Dependencies and why

| Dependency | Why |
| --- | --- |
| `react`, `react-dom` | Same base as *Aligned* |
| `qrcode` | The closing QR, as crisp SVG |
| `vite`, `@vitejs/plugin-react`, `typescript` | Build |
| `@playwright/test` | Screenshots, PDF and OG image |

No three.js: the road is a few thousand glyph sprites per frame on a 2D canvas, which is enough. Everything is bundled, with system fonts, so `dist/` works offline.
