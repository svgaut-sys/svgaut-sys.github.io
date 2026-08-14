# JanitorAI profile page — class reference

Extracted from a full-page inspect dump of a live profile (`exaerie-FULL-PAGE-HTML-OBJECT.txt`) and re-verified against janitorai.com on **2026-08-14**. Additional selectors and quirks were mined from top-creator profiles with rich custom CSS (found via datacat.run: @darkmountain 91KB, @SEPHA 64KB, @Iorveths 50KB, @Emi Yuu 46KB).

## ⚠️ Platform quirks (important)

- **CSS custom properties (`--my-var`) do not work** in profile custom CSS. Bake literal values everywhere. (Chakra's own `var(--chakra-*)` values exist but don't rely on them.)
- **Comments are erased when the site saves your CSS/HTML**, and the stripping can leave broken gaps — especially HTML comments. Ship comment-free code (the studio's export strips comments automatically).
- **`<label>` elements reportedly don't survive** in the custom HTML part; avoid them (use `div`/`span`).
- 56 Google fonts are **natively available** without any @import — see `FONTS.md`. Fonts outside that list need `@import url('https://fonts.googleapis.com/css2?family=...')`.

## Rule of thumb

Each element carries three kinds of classes:

- **Stable semantic classes** — `pp-*` and `profile-*`. **Target these.**
- Chakra-UI classes — `chakra-*`, generic component names. Usable but broad.
- Emotion hashes — `css-xxxxxx` and `_name_hash_n`. **Avoid**; they change when the site rebuilds. If you must catch a hashed module class, use an attribute-contains selector like `[class*="notificationsBadge_"]`.

## Top bar

| Selector | Element |
|---|---|
| `.pp-top-bar-inner` | The top bar itself |
| `.pp-top-bar-logo-name` / `.pp-top-bar-logo-sub-name` | "JanitorAI" logo text / "beta" subtext |
| `.pp-top-bar-search-box`, `.pp-top-bar-search-input-group` | Search field container |
| `.pp-top-bar-search`, `#search-input` | The search input |
| `.pp-top-bar-search-icon` | Magnifier icon holder |
| `[aria-label="Notifications"]`, `[class*="notificationsBadge_"]` | Bell button / unread badge |
| `[class*="notificationsPopover_"]`, `[class*="notificationItem_"]`, `[class*="popoverTitle_"]` | Notifications dropdown |
| `.glow-on-hover` (`.pp-top-bar-create-char`) | "Create character" button |

## Profile card (user info)

| Selector | Element |
|---|---|
| `.pp-page-background` | Full-page background layer |
| `.pp-uc-background` | The profile info panel |
| `.pp-uc-back-container`, `.pp-uc-back` | Background image (an `<img>`) inside the profile panel — style, blur, or hide it |
| `.profile-verified-mark` | Verified checkmark image (can be `filter`ed to match a theme) |
| `.pp-tabs-wrapper`, `.pp-tabs-button`, `.pp-tabs-indicator` | The "Collection" tab bar above the cards — rename via the `font-size:0` + `::after` trick |
| `.pp-uc-avatar`, `.pp-uc-avatar-container` | User avatar |
| `.pp-uc-title` | Username heading (replace text via `font-size:0` + `::after{content}`) |
| `.pp-uc-followers-count` | Follower count line (2nd `span` = "following") |
| `.pp-uc-member-since` | "Member since" line |
| `.profile-badges`, `.profile-badge` | Badge row |
| `.pp-uc-about-me` | About-me text |
| `.pp-uc-follow-button`, `.pp-uc-follow-text` (`.css-e9kr8m`) | Follow button |
| `.pp-uc-options-menu` | "•••" options button |
| `.profile-info-hstack`, `.profile-info-stack-inner` | Layout stacks (flip `flex-direction` to center the layout) |

## Collection header & filters

| Selector | Element |
|---|---|
| `.Btn2-purple` (`.pp-pg-total`) | "Characters" collection button |
| `.pp-pg-total-text` / `.pp-pg-total-count` | Its label / count |
| `.profile-filters-flex-outer/-inner` | Filter row containers |
| `.profile-character-search-input-group`, `.pp-fl-search-input` | Character search box / input |
| `.transparent .react-select__control` | Sort dropdown control |
| `.react-select__menu/-option/--is-focused/--is-selected` | Dropdown menu & options |
| `.pp-fl-filter-button` | Funnel filter button |
| `.pp-pg-page-button`, `.pp-pg-page-button-active`, `.pp-pg-prev-button`, `.pp-pg-next-button` | Pagination |

## Character cards

| Selector | Element |
|---|---|
| `.pp-cc-list-container` | Card grid |
| `.pp-cc-wrapper` | One card |
| `.profile-character-card-stack` | Inner stack |
| `.profile-character-card-stack-link-component(-box)` | Link wrapper (set `position:static` when absolutely positioning children) |
| `.pp-cc-name` | Character name |
| `.pp-cc-star-line`, `.pp-cc-creator-name` | Star rating / creator byline |
| `.profile-character-card-avatar-aspect-ratio`, `.pp-cc-avatar` | Image frame / image |
| `.profile-character-card-description-box`, `.pp-cc-description` | Description container / markdown body |
| `.profile-character-card-stats-box`, `.pp-cc-ribbon(-wrap)`, `.pp-cc-chats(-count)` | Chat-count ribbon |
| `.profile-character-card-box`, `.pp-cc-tokens-count` | Token-count badge |
| `.pp-cc-tags` | Tag list (a `chakra-wrap` `<ul>`) |
| `.pp-cc-tags-wrap(-regular/-custom)` | Tag list items |
| `.pp-cc-tags-item`, `.pp-cc-tags-regular`, `.pp-cc-tags-custom` | Tag pills |
| `.pp-tag-<name>` | Per-tag class (e.g. `.pp-tag-limitless`, `.pp-tag-smut`) — style individual tags! |
| `.pp-cc-gradient-1/2/3` | Decorative gradient overlays on the card |

## Misc / global

- `::selection`, `::-webkit-scrollbar*` — work globally.
- `body::before` / `body::after` — free fixed overlay layers (scanlines, vignettes, grain).
- Custom HTML after `</style>` is injected into the page — the community pattern for about-panels, `<details>` galleries, bubble/particle layers, fixed banners (`.topimage`).
- Hide the profile Edit button: `.css-1qnhk0n, ._btnPrimary_1fl1d_80 { display:none }` (hash-based — may break).

## Proven tricks (from the example themes)

- **Replace any text**: `font-size: 0;` on the element, then `::after { content: "New text"; font-size: 1.5rem; }`.
- **Glass**: translucent background + `backdrop-filter: blur(...)` + 1px white-alpha border.
- **Hover-reveal**: default `opacity:0; transform:translateY(20px)` on tags/description, transition in on `.pp-cc-wrapper:hover`.
- **Page-wide hover triggers**: `body:has(.some-link:hover) .some-fixed-layer { opacity:1 }`.
- **Poster cards**: make the aspect-ratio frame fill the card height, absolutely position name/description/tags over it.
