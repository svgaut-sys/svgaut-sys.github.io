# JAI Profile Studio

A local web app for building **JanitorAI profile custom CSS** without hand-writing hundreds of lines of overrides.

## What it does

- Left panel: friendly controls (colors, fonts, glass/corners, background effects, card layout, custom text, extra HTML blocks like an about panel and friends gallery).
- Right panel: a **live preview** of a mock JanitorAI profile page. The mock uses the *real* class names and DOM structure of janitorai.com profile pages (extracted from a live-page inspect dump and re-verified against the live site on 2026-08-14), so what you see is what you get.
- **Export CSS** produces the complete paste-ready block: `<style>…</style>` plus any extra HTML your theme uses. Paste it into your JanitorAI profile's custom CSS field.
- **📥 My profile**: a bookmarklet grabs your real JanitorAI profile (name, followers, member-since, avatar, bots, existing CSS) to your clipboard so the preview shows *your* page — fully client-side, nothing is uploaded. Also lets you back up your current live CSS to a file.
- **🎲 Random**: rolls harmonious random visuals (palette, fonts, shapes, effects) without touching your texts or widgets.

## How to run it

Just open `studio/index.html` in a browser (double-click it). Everything is local — no build step, no dependencies. Google Fonts are fetched for the preview if you're online; everything else works offline.

## Quick start

1. Open the studio.
2. Pick a **Preset** from the top bar (Poolcore Glass, Retro Terminal, Neon Glitch, Midnight Velvet, Clean Slate) — the first three are modeled on the example themes in this repo.
3. Tweak controls; the preview updates as you type.
4. Click **Export CSS** → **Copy to clipboard**.
5. On janitorai.com: Profile → Edit → paste into the custom CSS field → save.

## Files

| Path | Purpose |
|---|---|
| `studio/index.html` | The app shell |
| `studio/studio.css` | Styling for the app UI itself |
| `studio/studio.js` | Control panel, state, presets, save/load, export |
| `studio/generator.js` | Turns your settings into JanitorAI-ready CSS + HTML |
| `studio/preview.js` | The mock JanitorAI profile page shown in the preview iframe |
| `studio/presets.js` | Default state + the built-in presets |
| `docs/HOWTO.md` | Step-by-step usage guide + tips |
| `docs/JAI-CLASS-REFERENCE.md` | Reference of JanitorAI's profile-page class names + platform quirks |
| `docs/FONTS.md` | The 56 fonts natively available on JanitorAI |
| `privacy-note.md` | Privacy statement & credits (repo root) |
| `.nojekyll` | Tells GitHub Pages to skip the Jekyll build (repo root) |
| `oldversions/` | Dated RAR backups of the codebase (not for the public repo) |
| `*.css`, `*.txt` in the root | The original example themes and the HTML dump they were derived from |

## Save & share themes

- **Save** downloads your theme as a small `.theme.json` file; **Load** restores it. Your work-in-progress is also auto-saved to the browser's localStorage.
- The exported CSS is self-contained — anyone can paste it without the studio.

## Notes & limitations

- JanitorAI's markup uses stable semantic classes (`pp-uc-*`, `pp-cc-*`, `pp-top-bar-*`, …) alongside auto-generated ones (`css-xxxxxx`). The generator **only targets the stable classes**, so themes should survive site updates better than hand-written themes that lean on `css-*` hashes.
- Fonts: 56 Google fonts are natively available on JanitorAI (see `docs/FONTS.md`); non-native fonts get a Google Fonts @import added to the export automatically.
- JanitorAI **erases comments** on save (and stripping can corrupt surrounding code) and **doesn't support CSS variables** — the exported CSS is therefore comment-free and uses only literal values.
- The preview is a faithful mock, not the real site — always give your theme one final look on your actual profile after pasting.
