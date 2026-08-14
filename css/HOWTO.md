# How to use JAI Profile Studio

## 1. Open the studio

Double-click `studio/index.html`. It runs entirely in your browser.

## 1b. Load your real profile (optional but recommended)

Click **📥 My profile** in the top bar and follow the three steps: drag the **Grab JAI profile** bookmarklet to your bookmarks bar, click it while viewing *your* profile on janitorai.com (it copies your name, follower count, member-since, avatar, bots, and any existing custom CSS to your clipboard — nothing is transmitted anywhere), then paste into the dialog and hit **Apply**. The preview now shows *your actual profile* under every theme you try, and **Backup existing CSS** saves your current live CSS to a file before you overwrite it. The import is remembered until you click *Remove imported profile*.

## 1c. Feeling lucky?

**🎲 Random** rolls a new harmonious color palette, font pairing, and visual settings. It never touches your custom texts or widgets — only visuals — so you can keep rolling on top of your content until something clicks, then fine-tune.

## 2. Start from a preset (recommended)

Top-right **Preset** dropdown:

- **Poolcore Glass** — aqua glassmorphism with rising bubbles (inspired by the GeleeFish theme)
- **Retro Terminal** — squared-off VT323 pixel look with scanlines (inspired by the ShinyHero theme)
- **Neon Glitch** — black/yellow glitch aesthetic (inspired by the JFZ theme)
- **Midnight Velvet** — elegant purple starfield
- **Clean Slate** — minimal recolor that keeps JanitorAI's stock layout

## 3. The control groups

- **Colors** — six tokens drive the whole theme: page background, panel/card surface, two accents, text, muted text.
- **Fonts** — heading + body. Leave "@import" on unless you've confirmed the font renders on the live site without it.
- **Shape & glass** — corner radius (0 = sharp pixel look), frosted-glass toggle, blur amount, border strength.
- **Background** — optional image URL (delivered as an `<img>` layer, since JanitorAI strips `url()` in CSS), tint overlay, and an animated effect layer: **bubbles, snow, falling petals, fireflies, rising embers, twinkling stars, rain, drifting fog, scanlines, or a vaporwave grid**. Particle colors follow your accent colors.
- **Top bar** — replace the "JanitorAI" logo text, accent line under the bar.
- **Profile box** — replace your display name and its effect (gradient / float / glitch), custom follower label (e.g. "Aquarium Visitors"), hide avatar/badges/member-since, center layout.
- **Character cards** — "overlay" (poster-style: image fills the card, name pill on top, glass description at the bottom, tags reveal on hover) or "default" (stock layout, recolored). Size sliders, hover lift, float animation.
- **Collection & filters** — restyles search/sort/filter row; rename the "Characters" button.
- **Status pill / News panel / About panel / Banner / Friends gallery** — extra HTML blocks appended after the CSS. Friends gallery entries are one per line: `Name | image URL | profile URL`; news entries are `date | text`.
- **Misc** — cursor, scrollbar, selection color, entrance animation, theme name.

## 4. Export & paste

**Export CSS** → **Copy to clipboard** → on janitorai.com go to your profile → **Edit** → paste the whole block (including the `<style>` tag and any HTML after it) into the custom CSS field → save.

> ⚠️ Keep a copy! Use **Save** in the studio to download your `.theme.json` so you can reload and keep editing later. The site only stores the final CSS, and stripped of comments.

## 5. Checking your result

The preview is a faithful mock, but always check the live profile after pasting:

- If a font looks wrong on the live site, toggle the @import setting.
- If you use image URLs, they must be https and publicly reachable — most people upload to JanitorAI itself (avatar/media URLs like `https://ella.janitorai.com/...`) or an image host.
- Mobile: the generated CSS includes a `@media (max-width: 768px)` block; check your profile on a phone. There's a "Mobile width" toggle above the preview for a rough check.

## Tips for going further

The exported CSS is organized into commented sections (`===== TOP BAR =====`, etc.) — it's meant to be hand-editable afterwards. See `JAI-CLASS-REFERENCE.md` for every class you can target and the community tricks (text replacement via `::after`, `body:has(...)` hover triggers, per-tag styling with `.pp-tag-<name>`).
