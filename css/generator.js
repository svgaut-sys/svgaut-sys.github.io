/* generator.js — turns a theme state object into JanitorAI-ready custom CSS + HTML.
   All selector patterns are taken from working profile themes, so output is
   known-good against the live site's class names. */

const GENERATOR = (() => {

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }
  function rgba(hex, a) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  function esc(text) {
    return String(text || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
  function escHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Fonts verified natively available on janitorai.com (source: the community
     "@fonts" showcase profile, checked 2026-08-14; Jura is the site default).
     Fonts marked native:false are NOT shipped by JanitorAI and always get a
     Google Fonts @import added to the export. */
  const NATIVE = { native: true }, IMPORTED = { native: false };
  const FONTS = {};
  const addFonts = (fallback, native, names) => {
    for (const n of names) FONTS[n] = { fallback, native, g: n.replace(/ /g, '+') };
  };
  addFonts('sans-serif', true, ['Aldrich', 'Alegreya Sans SC', 'DM Sans', 'Jua', 'Jura', 'Mitr',
    'Montserrat', 'Montserrat Alternates', 'Poppins', 'Raleway', 'Roboto Condensed', 'Share Tech',
    'Pixelify Sans', 'Silkscreen', 'Notable', 'Graduate']);
  addFonts('serif', true, ['Abril Fatface', 'Cardo', 'Cinzel', 'Cinzel Decorative', 'Crimson Text',
    'DM Serif Text', 'Grenze Gotisch']);
  addFonts('monospace', true, ['Courier Prime', 'Cutive Mono', 'DotGothic16', 'Press Start 2P',
    'Special Elite', 'VT323']);
  addFonts('cursive', true, ['Aladin', 'Berkshire Swash', 'Black Ops One', 'Caveat', 'Caveat Brush',
    'Chango', 'Cherry Bomb One', 'Courgette', 'Dancing Script', 'Fascinate', 'Jacquard 12',
    'Jacquard 24', 'Jim Nightshade', 'Lacquer', 'Lobster', 'Monoton', 'Oleo Script', 'Pacifico',
    'Pangolin', 'Petit Formal Script', 'Pirata One', 'Playpen Sans Hebrew', 'Rock Salt',
    'Rubik Glitch', 'Sigmar One', 'Sunshiney', 'Tagesschrift']);
  // NOTE: JanitorAI blocks @import (per the community rulebook), so only
  // natively-available fonts are offered — no non-native extras.

  function fontStack(name) {
    const f = FONTS[name];
    return `'${name}', ${f ? f.fallback : 'sans-serif'}`;
  }

  /** Google Fonts URL — used ONLY by the local preview (JanitorAI blocks @import
      but ships all these fonts natively; our preview page has to fetch them). */
  function fontImportURL(state) {
    const names = [...new Set([state.fonts.heading, state.fonts.body])].filter(n => FONTS[n]);
    if (!names.length) return null;
    const families = names.map(n => `family=${FONTS[n].g}`).join('&');
    return `https://fonts.googleapis.com/css2?${families}&display=swap`;
  }

  /* ---------------- CSS modules ---------------- */

  function mBase(s) {
    const c = s.colors;
    return `
/* ===== BASE ===== */
a:hover { color: ${c.accent}; }
.pp-uc-background { z-index: 1; }
${s.misc.hideEditButton ? `.css-1qnhk0n, ._btnPrimary_1fl1d_80 { display: none !important; }` : ''}
${s.misc.selection ? `::selection { background: ${c.accent}; color: ${c.pageBg}; }` : ''}
${s.misc.cursor !== 'auto' ? `.pp-cc-wrapper, .gallery-item, a, button { cursor: ${s.misc.cursor} !important; }` : ''}`;
  }

  /* Deterministic pseudo-random helper so particle layouts are stable per index. */
  function seeded(i, off) {
    const x = Math.sin(i * 127.1 + off * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /** Per-particle rule builder: n spans with classes .p1..pn inside `sel`. */
  function particleRules(sel, n, fn) {
    let out = '';
    for (let i = 1; i <= n; i++) out += `${sel} .p${i} { ${fn(i)} }\n`;
    return out;
  }

  const PARTICLE_EFFECTS = ['bubbles', 'snow', 'petals', 'fireflies', 'embers'];

  function mBackground(s) {
    const b = s.background;
    const c = s.colors;
    const parts = [];
    // NOTE: JanitorAI strips url() in CSS, so a custom page background must be
    // delivered as an <img> layer in the extra HTML (see buildHTML), never as
    // a CSS background-image.
    parts.push(`
.pp-page-background {
    background: ${c.pageBg} !important;
}`);
    if (b.image) {
      parts.push(`
.bg-image-layer {
    position: fixed;
    inset: 0;
    z-index: -25;
    overflow: hidden;
    pointer-events: none;
}
.bg-image-layer img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}`);
    }
    if (b.tintAlpha > 0) {
      parts.push(`
.bg-tint-layer {
    position: fixed;
    inset: 0;
    z-index: -22;
    background: ${rgba(b.tint, b.tintAlpha)};
    pointer-events: none;
}`);
    }

    const fx = b.effect;
    if (PARTICLE_EFFECTS.includes(fx)) {
      parts.push(`
.fx-layer {
    position: fixed;
    inset: 0;
    z-index: -20;
    overflow: hidden;
    pointer-events: none;
}
.fx-layer span { position: absolute; display: block; }`);
    }

    if (fx === 'bubbles') {
      parts.push(`
.fx-bubbles span {
    bottom: -60px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%,
        rgba(255,255,255,0.6), rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.08) 70%);
    border: 1px solid rgba(255,255,255,0.15);
    animation: fx-rise 16s linear infinite;
}
${particleRules('.fx-bubbles', 8, i => {
  const sz = Math.round(14 + seeded(i, 1) * 44);
  return `left: ${Math.round(seeded(i, 2) * 92)}%; width: ${sz}px; height: ${sz}px; animation-duration: ${Math.round(13 + seeded(i, 3) * 14)}s; animation-delay: ${Math.round(seeded(i, 4) * 9)}s;`;
})}
@keyframes fx-rise {
    0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
    10%  { opacity: 0.7; }
    50%  { transform: translateY(-50vh) translateX(15px) scale(1.1); }
    90%  { opacity: 0.4; }
    100% { transform: translateY(-110vh) translateX(-10px) scale(0.85); opacity: 0; }
}`);
    }

    if (fx === 'snow') {
      parts.push(`
.fx-snow span {
    top: -20px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.4) 70%);
    animation: fx-snowfall linear infinite;
}
${particleRules('.fx-snow', 12, i => {
  const sz = Math.round(3 + seeded(i, 1) * 7);
  return `left: ${Math.round(seeded(i, 2) * 98)}%; width: ${sz}px; height: ${sz}px; opacity: ${(0.4 + seeded(i, 5) * 0.5).toFixed(2)}; animation-duration: ${Math.round(9 + seeded(i, 3) * 12)}s; animation-delay: ${(-seeded(i, 4) * 20).toFixed(1)}s;`;
})}
@keyframes fx-snowfall {
    0%   { transform: translateY(-5vh) translateX(0); }
    25%  { transform: translateY(25vh) translateX(24px); }
    50%  { transform: translateY(52vh) translateX(-18px); }
    75%  { transform: translateY(78vh) translateX(20px); }
    100% { transform: translateY(108vh) translateX(-8px); }
}`);
    }

    if (fx === 'petals') {
      parts.push(`
.fx-petals span {
    top: -30px;
    border-radius: 65% 35% 60% 40%;
    background: linear-gradient(135deg, ${rgba(c.accent2, 0.9)}, ${rgba(c.accent2, 0.45)});
    box-shadow: 0 0 6px ${rgba(c.accent2, 0.25)};
    animation: fx-petalfall linear infinite;
}
${particleRules('.fx-petals', 10, i => {
  const w = Math.round(10 + seeded(i, 1) * 10);
  return `left: ${Math.round(seeded(i, 2) * 96)}%; width: ${w}px; height: ${Math.round(w * 0.75)}px; opacity: ${(0.5 + seeded(i, 5) * 0.4).toFixed(2)}; animation-duration: ${Math.round(10 + seeded(i, 3) * 10)}s; animation-delay: ${(-seeded(i, 4) * 18).toFixed(1)}s;`;
})}
@keyframes fx-petalfall {
    0%   { transform: translateY(-5vh) translateX(0) rotate(0deg); }
    30%  { transform: translateY(30vh) translateX(-45px) rotate(140deg); }
    60%  { transform: translateY(62vh) translateX(25px) rotate(230deg); }
    100% { transform: translateY(108vh) translateX(-30px) rotate(360deg); }
}`);
    }

    if (fx === 'fireflies') {
      parts.push(`
.fx-fireflies span {
    border-radius: 50%;
    background: ${c.accent};
    box-shadow: 0 0 8px 2px ${rgba(c.accent, 0.7)};
    animation: fx-drift ease-in-out infinite alternate, fx-blink 3s ease-in-out infinite;
}
${particleRules('.fx-fireflies', 10, i => {
  const sz = Math.round(3 + seeded(i, 1) * 4);
  return `left: ${Math.round(5 + seeded(i, 2) * 88)}%; top: ${Math.round(8 + seeded(i, 6) * 80)}%; width: ${sz}px; height: ${sz}px; animation-duration: ${Math.round(6 + seeded(i, 3) * 8)}s, ${(2 + seeded(i, 7) * 3).toFixed(1)}s; animation-delay: ${(-seeded(i, 4) * 10).toFixed(1)}s, ${(seeded(i, 5) * 3).toFixed(1)}s;`;
})}
@keyframes fx-drift {
    0%   { transform: translate(0, 0); }
    33%  { transform: translate(45px, -35px); }
    66%  { transform: translate(-30px, 25px); }
    100% { transform: translate(25px, 45px); }
}
@keyframes fx-blink {
    0%, 100% { opacity: 0.9; }
    50% { opacity: 0.1; }
}`);
    }

    if (fx === 'embers') {
      parts.push(`
.fx-embers span {
    bottom: -20px;
    border-radius: 50%;
    background: radial-gradient(circle, #ffd9a0, #ff7a3d 60%, rgba(255,90,40,0.4));
    box-shadow: 0 0 6px 1px rgba(255, 122, 61, 0.6);
    animation: fx-ember linear infinite;
}
${particleRules('.fx-embers', 11, i => {
  const sz = Math.round(2 + seeded(i, 1) * 5);
  return `left: ${Math.round(seeded(i, 2) * 96)}%; width: ${sz}px; height: ${sz}px; animation-duration: ${Math.round(6 + seeded(i, 3) * 8)}s; animation-delay: ${(-seeded(i, 4) * 12).toFixed(1)}s;`;
})}
@keyframes fx-ember {
    0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
    10%  { opacity: 0.9; }
    50%  { transform: translateY(-55vh) translateX(22px) scale(0.9); opacity: 0.7; }
    100% { transform: translateY(-108vh) translateX(-18px) scale(0.5); opacity: 0; }
}`);
    }

    if (fx === 'stars') {
      // Tiled star field: dots positioned inside a repeating background tile.
      parts.push(`
body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        radial-gradient(1.6px 1.6px at 25px 35px, rgba(255,255,255,0.9), transparent),
        radial-gradient(1px 1px at 110px 80px, rgba(255,255,255,0.7), transparent),
        radial-gradient(2px 2px at 190px 140px, ${rgba(c.accent, 0.85)}, transparent),
        radial-gradient(1.2px 1.2px at 60px 160px, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 160px 30px, ${rgba(c.accent2, 0.7)}, transparent),
        radial-gradient(1.4px 1.4px at 90px 120px, rgba(255,255,255,0.8), transparent);
    background-size: 230px 190px;
    pointer-events: none;
    z-index: -18;
    animation: fx-twinkle 4s ease-in-out infinite alternate;
}
body::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        radial-gradient(1px 1px at 45px 60px, rgba(255,255,255,0.5), transparent),
        radial-gradient(1.3px 1.3px at 150px 20px, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 220px 110px, ${rgba(c.accent, 0.5)}, transparent),
        radial-gradient(1px 1px at 80px 170px, rgba(255,255,255,0.45), transparent);
    background-size: 290px 240px;
    pointer-events: none;
    z-index: -18;
    animation: fx-twinkle 6s ease-in-out infinite alternate-reverse;
}
@keyframes fx-twinkle {
    from { opacity: 0.45; }
    to { opacity: 1; }
}`);
    }

    if (fx === 'rain') {
      parts.push(`
body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: linear-gradient(115deg,
        transparent 44%,
        rgba(180, 200, 224, 0.28) 48%,
        rgba(180, 200, 224, 0.28) 51%,
        transparent 55%);
    background-size: 38px 110px;
    pointer-events: none;
    z-index: 9998;
    opacity: 0.55;
    animation: fx-rainfall 0.7s linear infinite;
}
body::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: linear-gradient(115deg,
        transparent 46%,
        rgba(180, 200, 224, 0.18) 49%,
        rgba(180, 200, 224, 0.18) 51%,
        transparent 54%);
    background-size: 24px 70px;
    pointer-events: none;
    z-index: 9998;
    opacity: 0.4;
    animation: fx-rainfall 0.45s linear infinite;
}
@keyframes fx-rainfall {
    from { background-position: 0 0; }
    to { background-position: -76px 220px; }
}`);
    }

    if (fx === 'fog') {
      parts.push(`
body::before {
    content: '';
    position: fixed;
    top: 0; left: -50vw;
    width: 200vw; height: 100vh;
    background:
        radial-gradient(ellipse 60vw 30vh at 30% 30%, ${rgba(c.text, 0.07)}, transparent 70%),
        radial-gradient(ellipse 70vw 34vh at 70% 65%, ${rgba(c.text, 0.06)}, transparent 70%),
        radial-gradient(ellipse 50vw 26vh at 50% 85%, ${rgba(c.accent, 0.05)}, transparent 70%);
    pointer-events: none;
    z-index: 9998;
    animation: fx-fogdrift 26s ease-in-out infinite alternate;
}
@keyframes fx-fogdrift {
    from { transform: translateX(0); }
    to { transform: translateX(18vw); }
}`);
    }

    if (fx === 'scanlines') {
      parts.push(`
body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(to bottom,
        transparent 0px, transparent 2px,
        rgba(0, 0, 0, 0.18) 3px, transparent 4px);
    pointer-events: none;
    z-index: 9999;
}`);
    }

    if (fx === 'vaporgrid') {
      parts.push(`
body::before {
    content: '';
    position: fixed;
    left: -25vw; right: -25vw;
    bottom: 0; height: 46vh;
    background-image:
        linear-gradient(to top, ${rgba(c.accent, 0.35)} 1px, transparent 1px),
        linear-gradient(to right, ${rgba(c.accent, 0.35)} 1px, transparent 1px);
    background-size: 100% 42px, 64px 100%;
    transform: perspective(320px) rotateX(58deg);
    transform-origin: bottom center;
    mask-image: linear-gradient(to top, #000 30%, transparent 95%);
    -webkit-mask-image: linear-gradient(to top, #000 30%, transparent 95%);
    pointer-events: none;
    z-index: -18;
    animation: fx-gridscroll 3.5s linear infinite;
}
@keyframes fx-gridscroll {
    from { background-position: 0 0, 0 0; }
    to { background-position: 0 42px, 0 0; }
}`);
    }
    return parts.join('\n');
  }

  function surfaceBG(s) {
    return s.shape.glass
      ? rgba(s.colors.surface, 0.55)
      : s.colors.surface;
  }
  function surfaceBorder(s) {
    return `1px solid ${rgba('#ffffff', s.shape.borderAlpha)}`;
  }
  function glassFilter(s) {
    return s.shape.glass
      ? `backdrop-filter: blur(${s.shape.blur}px);\n    -webkit-backdrop-filter: blur(${s.shape.blur}px);`
      : '';
  }

  function mTopbar(s) {
    if (!s.topbar.enabled) return '';
    const c = s.colors;
    const r = s.shape.radius;
    const parts = [`
/* ===== TOP BAR ===== */
.pp-top-bar-inner {
    background: ${surfaceBG(s)} !important;
    border-bottom: ${surfaceBorder(s)};
    ${glassFilter(s)}
}`];
    if (s.topbar.accentLine) {
      parts.push(`
.pp-top-bar-inner::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: 100%;
    background: linear-gradient(90deg, transparent, ${c.accent}, ${c.accent2}, ${c.accent}, transparent);
    background-size: 200% 100%;
    ${s.topbar.animateLine ? 'animation: accent-slide 6s linear infinite;' : ''}
}
@keyframes accent-slide {
    0% { background-position: 0% 0; }
    100% { background-position: 200% 0; }
}`);
    }
    if (s.topbar.logoText) {
      parts.push(`
.pp-top-bar-logo-name, .pp-top-bar-logo-sub-name {
    color: ${c.text};
    border: none;
    box-shadow: none;
    font-size: 0;
    font-family: ${fontStack(s.fonts.heading)};
    text-shadow: 0 0 10px ${rgba(c.accent, 0.3)};
}
.pp-top-bar-logo-name::after {
    content: "${esc(s.topbar.logoText)}";
    text-wrap: nowrap;
    font-size: 1.4rem;
}`);
    }
    parts.push(`
.profile-top-bar-search-input-group,
.pp-top-bar-search-input-group {
    background: ${rgba(c.text, 0.08)} !important;
    border: ${surfaceBorder(s)} !important;
    box-shadow: none !important;
    border-radius: ${r}px !important;
}
.pp-top-bar-search, .profile-top-bar-search, #search-input {
    background-color: transparent !important;
    color: ${c.text} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
    border: none !important;
}
.pp-top-bar-search:focus, #search-input:focus { outline: none !important; box-shadow: none !important; }
.pp-top-bar-search::placeholder { color: ${rgba(c.text, 0.45)} !important; }

[aria-label="Notifications"], ._notificationsButton_abfem_7 {
    background: ${rgba(c.text, 0.08)} !important;
    border: ${surfaceBorder(s)} !important;
    border-radius: ${Math.min(r, 50)}px !important;
    transition: all 0.3s ease;
}
[aria-label="Notifications"] svg, ._notificationsButton_abfem_7 svg {
    fill: ${c.accent} !important;
}
[aria-label="Notifications"]:hover svg {
    fill: ${c.text} !important;
    filter: drop-shadow(0 0 8px ${c.accent});
}
[class*="notificationsBadge_"], ._notificationsBadge_abfem_41 {
    background-color: ${c.accent2} !important;
    color: #ffffff !important;
    border-radius: ${Math.min(r, 50)}px !important;
}

/* notifications popover */
[class*="notificationsPopover_"], [class*="contentWrapper_"] {
    background: ${s.shape.glass ? rgba(c.surface, 0.94) : c.surface} !important;
    border-radius: ${r}px !important;
    border: ${surfaceBorder(s)} !important;
    ${glassFilter(s)}
}
[class*="popoverHeader_"] { background: transparent !important; }
[class*="popoverTitle_"] { color: ${c.text} !important; font-family: ${fontStack(s.fonts.heading)} !important; }
[class*="notificationItem_"] { background: transparent !important; border-radius: ${Math.max(r - 4, 0)}px !important; }
[class*="notificationItem_"]:hover { background: ${rgba(c.text, 0.08)} !important; }
[class*="_subject_"] { color: ${c.text} !important; }
[class*="_body_"] { color: ${c.muted} !important; font-family: ${fontStack(s.fonts.body)} !important; }`);
    return parts.join('\n');
  }

  function mProfile(s) {
    const c = s.colors;
    const p = s.profile;
    const r = s.shape.radius;
    const parts = [`
/* ===== PROFILE BOX ===== */
.pp-uc-background {
    background: ${surfaceBG(s)};
    border: ${surfaceBorder(s)};
    border-radius: ${r}px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    ${glassFilter(s)}
}
.pp-uc-background:hover { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25); }`];

    if (p.centerLayout) {
      parts.push(`
.profile-page-flex { flex-direction: column; }
.profile-info-hstack { flex-direction: column; }
.profile-info-stack-inner { align-items: center; text-align: center; }
.pp-uc-about-me { margin: 0 auto; }
.pp-uc-follow-flex { justify-content: center; }
.profile-badges { justify-content: center; }`);
    }

    const hidden = [];
    if (p.hideAvatar) hidden.push('.pp-uc-avatar', '.pp-uc-avatar-container');
    if (p.hideBadges) hidden.push('.profile-badge');
    if (p.hideMemberSince) hidden.push('.pp-uc-member-since');
    if (p.hideCardBg) hidden.push('.pp-uc-back', '.pp-uc-back-container');
    if (hidden.length) parts.push(`\n${hidden.join(', ')} { display: none !important; }`);

    // Title
    if (p.titleText) {
      parts.push(`
.pp-uc-title {
    color: transparent;
    font-size: 0rem;
    border: none;
    box-shadow: none;
    font-family: ${fontStack(s.fonts.heading)};
}
.pp-uc-title::after {
    content: "${esc(p.titleText)}";
    font-size: ${p.titleSize}rem;
    text-wrap: nowrap;
    display: inline-block;
    ${titleEffectCSS(s)}
}`);
    } else {
      parts.push(`
.pp-uc-title {
    color: ${c.text};
    font-family: ${fontStack(s.fonts.heading)};
    ${p.titleEffect === 'gradient' ? `
    background: linear-gradient(135deg, ${c.text} 0%, ${c.accent} 40%, ${c.accent2} 70%, ${c.text} 100%);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: title-shimmer 6s ease-in-out infinite;` : ''}
}`);
    }
    parts.push(`
@keyframes title-shimmer {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}
@keyframes title-float {
    0%, 100% { transform: translateY(0) rotate(-0.5deg); }
    50% { transform: translateY(-10px) rotate(0.5deg); }
}
@keyframes title-glitch {
    0%, 70%, 100% { text-shadow: none; transform: translate(0); }
    10% { text-shadow: -4px 0 ${c.accent2}, 4px 0 ${c.accent}; transform: translate(-3px, 2px) skewX(-2deg); }
    20% { text-shadow: 6px 0 ${c.accent2}, -6px 0 ${c.accent}; transform: translate(3px, -1px) skewX(2deg); }
    40% { text-shadow: 0 0 15px ${c.text}; transform: translate(0, 0); }
    50% { text-shadow: -8px 0 ${c.accent2}, 8px 0 ${c.accent}; transform: translate(-4px, 0) skewX(3deg); }
}`);

    // Followers
    if (p.followerLabel) {
      parts.push(`
.pp-uc-followers-count {
    color: ${c.text};
    font-family: ${fontStack(s.fonts.body)};
}
.pp-uc-followers-count::after {
    content: " ${esc(p.followerLabel)}";
    text-wrap: nowrap;
}
.pp-uc-followers-count span:nth-of-type(2) { display: none; }`);
    } else {
      parts.push(`
.pp-uc-followers-count { color: ${c.muted}; font-family: ${fontStack(s.fonts.body)}; }`);
    }

    parts.push(`
.pp-uc-about-me { color: ${c.muted}; font-family: ${fontStack(s.fonts.body)}; }

/* follow / options buttons */
.pp-uc-follow-button, .pp-uc-options-menu {
    background: ${rgba(c.accent, 0.12)} !important;
    border: 1px solid ${c.accent} !important;
    color: ${c.accent} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
    font-weight: 600 !important;
    border-radius: ${r}px !important;
    letter-spacing: 1px;
    transition: all 0.3s ease;
    ${glassFilter(s)}
}
.pp-uc-follow-button:hover, .pp-uc-options-menu:hover {
    background: ${c.accent} !important;
    color: ${c.pageBg} !important;
    box-shadow: 0 0 16px ${rgba(c.accent, 0.4)};
}
.css-e9kr8m { font-family: ${fontStack(s.fonts.body)}; font-weight: 600 !important; }`);
    return parts.join('\n');
  }

  function titleEffectCSS(s) {
    const c = s.colors;
    switch (s.profile.titleEffect) {
      case 'gradient':
        return `background: linear-gradient(135deg, ${c.text} 0%, ${c.accent} 40%, ${c.accent2} 70%, ${c.text} 100%);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 6px ${rgba(c.accent, 0.6)}) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
    animation: title-shimmer 6s ease-in-out infinite;`;
      case 'float':
        return `color: ${c.text};
    filter: drop-shadow(0 0 8px ${rgba(c.accent, 0.6)});
    animation: title-float 5s ease-in-out infinite;`;
      case 'glitch':
        return `color: ${c.text};
    animation: title-glitch 2.4s steps(1) infinite;`;
      default:
        return `color: ${c.text};`;
    }
  }

  function mFilters(s) {
    if (!s.collection.styleControls) return '';
    const c = s.colors;
    const r = s.shape.radius;
    const btnLabel = s.collection.buttonText;
    return `
/* ===== COLLECTION HEADER & FILTERS ===== */
.profile-filters-flex-outer,
.profile-filters-flex-inner,
.profile-filters-flex-inner-onorderchanged,
.profile-filters-flex-inner-hassearchfilter {
    background: transparent !important;
    border: none !important;
}
.transparent { background: transparent !important; }

.Btn2-purple {
    background: ${surfaceBG(s)} !important;
    border: ${surfaceBorder(s)} !important;
    color: ${c.text} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
    font-weight: 600 !important;
    border-radius: ${r}px !important;
    height: 40px;
    letter-spacing: 1px;
    ${btnLabel ? 'font-size: 0rem;' : ''}
    ${glassFilter(s)}
}
${btnLabel ? `.Btn2-purple::after {
    content: "${esc(btnLabel)}";
    font-size: 0.9rem;
    letter-spacing: 1px;
}` : ''}
.Btn:before { background: transparent !important; }
.pp-pg-total-count { font-weight: 700; color: ${c.accent}; }
${s.collection.tabLabel ? `
/* rename the "Collection" tab */
.pp-tabs-button {
    font-size: 0 !important;
    color: ${c.muted} !important;
    font-family: ${fontStack(s.fonts.heading)} !important;
}
.pp-tabs-button::after {
    content: "${esc(s.collection.tabLabel)}";
    font-size: 1rem;
    letter-spacing: 1px;
}
.pp-tabs-button[aria-selected="true"] { color: ${c.accent} !important; }
.pp-tabs-indicator { background: ${c.accent} !important; }` : ''}

.profile-character-search-input-group,
.chakra-input__group,
.transparent .react-select__control,
.pp-fl-filter-button {
    background: ${surfaceBG(s)} !important;
    border: ${surfaceBorder(s)} !important;
    border-radius: ${r}px !important;
    height: 40px !important;
    box-shadow: none !important;
    transition: all 0.3s ease;
    ${glassFilter(s)}
}
.profile-character-search-input-group:hover,
.transparent .react-select__control:hover,
.pp-fl-filter-button:hover {
    border-color: ${c.accent} !important;
    box-shadow: 0 0 12px ${rgba(c.accent, 0.3)} !important;
}
.pp-fl-search-input {
    background: transparent !important;
    color: ${c.text} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
}
.pp-fl-search-input::placeholder { color: ${rgba(c.text, 0.5)} !important; }
.profile-character-search-input-group svg { fill: ${c.accent} !important; }
.pp-fl-filter-button svg { fill: ${c.accent} !important; }
.transparent .react-select__value-container > div {
    color: ${c.text} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
}
.css-8mmkcg { fill: ${c.accent} !important; }
.css-1wy0on6 span { background-color: ${c.accent} !important; }

.react-select__menu {
    background: ${s.shape.glass ? rgba(c.surface, 0.95) : c.surface} !important;
    border: ${surfaceBorder(s)} !important;
    border-radius: ${r}px !important;
    overflow: hidden;
}
.react-select__option {
    background-color: transparent !important;
    color: ${c.text} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
}
.react-select__option--is-focused { background-color: ${rgba(c.accent, 0.2)} !important; }
.react-select__option--is-selected { background-color: ${rgba(c.accent2, 0.25)} !important; color: ${c.accent2} !important; }

/* pagination */
.pp-pg-page-button, .pp-pg-prev-button, .pp-pg-next-button {
    background: ${surfaceBG(s)} !important;
    border: ${surfaceBorder(s)} !important;
    color: ${c.text} !important;
    border-radius: ${r}px !important;
    font-family: ${fontStack(s.fonts.body)} !important;
}
.pp-pg-page-button-active {
    background: ${c.accent} !important;
    color: ${c.pageBg} !important;
    border-color: ${c.accent} !important;
}`;
  }

  function mCards(s) {
    const c = s.colors;
    const cd = s.cards;
    const r = s.shape.radius;
    if (cd.style === 'default') {
      return `
/* ===== CARDS (recolor only) ===== */
.pp-cc-wrapper {
    background: ${surfaceBG(s)} !important;
    border: ${surfaceBorder(s)} !important;
    border-radius: ${r}px !important;
    ${glassFilter(s)}
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
${cd.hoverLift ? `.pp-cc-wrapper:hover {
    border-color: ${c.accent} !important;
    box-shadow: 0 0 24px ${rgba(c.accent, 0.3)}, 0 12px 40px rgba(0,0,0,0.3) !important;
    transform: translateY(-6px);
}` : ''}
.pp-cc-name { color: ${c.text} !important; font-family: ${fontStack(s.fonts.heading)} !important; }
.pp-cc-description, .pp-cc-description p { color: ${c.muted} !important; font-family: ${fontStack(s.fonts.body)} !important; }
${cd.hideCreator ? '.pp-cc-creator-name, .pp-cc-star-line { display: none !important; }' : ''}
.pp-cc-tags-item, .pp-cc-tags-custom {
    background: ${rgba(c.text, 0.08)} !important;
    border: ${surfaceBorder(s)} !important;
    color: ${c.accent} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
    border-radius: ${Math.min(r, 12)}px !important;
}`;
    }

    // "overlay" style — poster card: full image, name pill on top, glass description at bottom, tags reveal on hover
    return `
/* ===== CARDS — POSTER OVERLAY STYLE ===== */
.pp-cc-list-container {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
    gap: 20px !important;
}
.pp-cc-wrapper {
    background: ${surfaceBG(s)} !important;
    border: ${surfaceBorder(s)} !important;
    border-radius: ${r}px !important;
    height: ${cd.height}px;
    width: ${cd.width}px;
    position: relative;
    flex: 0 0 auto !important;
    overflow: hidden;
    ${glassFilter(s)}
    transition: border-color 0.4s ease, box-shadow 0.4s ease,
                transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    ${cd.floatAnim ? 'animation: card-float 6s ease-in-out infinite;' : ''}
}
${cd.floatAnim ? `.pp-cc-wrapper:nth-child(2n) { animation-delay: 1s; }
.pp-cc-wrapper:nth-child(3n) { animation-delay: 2s; }
@keyframes card-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
}` : ''}
${cd.hoverLift ? `.pp-cc-wrapper:hover {
    border-color: ${c.accent} !important;
    box-shadow: 0 0 24px ${rgba(c.accent, 0.3)}, 0 12px 40px rgba(0,0,0,0.3) !important;
    transform: translateY(-10px) scale(1.02) !important;
    animation: none !important;
}` : ''}
.profile-character-card-stack-link-component,
.profile-character-card-stack-link-component-box {
    position: static !important;
}
.pp-cc-avatar {
    filter: brightness(0.92);
    transition: filter 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pp-cc-wrapper:hover .pp-cc-avatar {
    filter: brightness(1) saturate(1.2);
    transform: scale(1.08);
}
.profile-character-card-avatar-aspect-ratio { height: ${cd.height}px !important; }
.css-nlxhw4 { padding-top: 0px; padding-bottom: 0px; }

/* name pill */
.pp-cc-name {
    position: absolute !important;
    top: 10px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: 92% !important;
    text-align: center !important;
    color: ${c.text} !important;
    font-family: ${fontStack(s.fonts.heading)} !important;
    font-size: 1.05rem !important;
    font-weight: 700 !important;
    z-index: 14 !important;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8) !important;
    padding: 3px 8px !important;
    box-sizing: border-box !important;
    background: ${rgba(c.surface, 0.7)} !important;
    border-radius: ${r}px !important;
    border: ${surfaceBorder(s)} !important;
    ${glassFilter(s)}
    transition: all 0.4s ease !important;
}
.pp-cc-wrapper:hover .pp-cc-name {
    background: ${rgba(c.accent, 0.25)} !important;
    border-color: ${c.accent} !important;
}

/* stats badges */
.profile-character-card-stats-box {
    position: absolute !important;
    top: 50px !important;
    right: 14px !important;
    z-index: 20 !important;
}
.pp-cc-ribbon {
    width: auto !important;
    opacity: 1 !important;
    background: ${rgba(c.surface, 0.85)} !important;
    border: ${surfaceBorder(s)} !important;
    border-radius: ${Math.min(r, 12)}px !important;
    height: auto !important;
    overflow: visible !important;
}
.pp-cc-ribbon-wrap { padding: 6px 10px !important; background: transparent !important; height: auto !important; box-shadow: none !important; }
.pp-cc-chats {
    color: ${c.text} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
    font-weight: 600 !important;
    font-size: 0.7rem !important;
}
.profile-character-card-box {
    position: absolute !important;
    top: 88px !important;
    right: 14px !important;
    left: auto !important;
    z-index: 20 !important;
    padding: 4px 10px !important;
    background: ${rgba(c.surface, 0.85)} !important;
    border: ${surfaceBorder(s)} !important;
    border-radius: ${Math.min(r, 12)}px !important;
}
.pp-cc-tokens-count {
    color: ${c.text} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
    font-size: 0.7rem !important;
    margin: 0 !important;
}

/* description glass panel */
.profile-character-card-description-box {
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: ${Math.round(cd.height * 0.32)}px !important;
    background: linear-gradient(to bottom,
        ${rgba(c.surface, 0.3)} 0%,
        ${rgba(c.surface, 0.75)} 50%,
        ${rgba(c.surface, 0.9)} 100%) !important;
    padding: 12px 14px ${s.cards.tagsOnHover ? '38px' : '12px'} 14px !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    ${glassFilter(s)}
    z-index: 12 !important;
    transition: height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.4s ease !important;
}
.pp-cc-wrapper:hover .profile-character-card-description-box {
    height: ${Math.round(cd.height * 0.42)}px !important;
    border-top: 1px solid ${c.accent} !important;
}
.pp-cc-description {
    color: ${rgba(c.text, 0.8)} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
    font-size: 0.72rem !important;
    line-height: 1.5 !important;
    text-align: center !important;
    max-height: ${Math.round(cd.height * 0.24)}px;
    overflow: hidden auto;
}
.pp-cc-description p { margin: 0 0 4px 0 !important; }
.pp-cc-description strong, .pp-cc-description b { color: ${c.accent} !important; }
.pp-cc-description em, .pp-cc-description i { color: ${c.accent2} !important; }
.pp-cc-description::-webkit-scrollbar { width: 3px; }
.pp-cc-description::-webkit-scrollbar-thumb { background: ${c.accent}; border-radius: 3px; }

${cd.hideCreator ? '.pp-cc-creator-name, .pp-cc-star-line { display: none !important; }' : ''}

/* tags */
.pp-cc-tags {
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    width: 100% !important;
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
    gap: 4px !important;
    padding: 8px !important;
    background: transparent !important;
    border: none !important;
    z-index: 13 !important;
    ${cd.tagsOnHover ? `opacity: 0 !important;
    transform: translateY(20px) !important;
    pointer-events: none !important;
    transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;` : ''}
}
${cd.tagsOnHover ? `.pp-cc-wrapper:hover .pp-cc-tags {
    opacity: 1 !important;
    transform: translateY(0) !important;
    pointer-events: auto !important;
    transition-delay: 0.15s !important;
}` : ''}
.pp-cc-tags-item, .pp-cc-tags-custom {
    background: ${rgba(c.text, 0.1)} !important;
    border: ${surfaceBorder(s)} !important;
    color: ${c.accent} !important;
    font-family: ${fontStack(s.fonts.body)} !important;
    font-size: 0.6rem !important;
    font-weight: 600 !important;
    border-radius: ${Math.min(r, 12)}px !important;
    padding: 3px 8px !important;
    white-space: nowrap !important;
    transition: all 0.3s ease !important;
}
.pp-cc-tags-item:hover, .pp-cc-tags-custom:hover {
    background: ${c.accent} !important;
    color: ${c.pageBg} !important;
    transform: translateY(-2px);
}
.pp-cc-tags-wrap { width: auto !important; height: auto !important; }
.pp-cc-tags-wrap span { height: auto !important; width: auto !important; overflow: visible !important; }
.pp-tag-limitless, span.pp-tag-limitless {
    border-color: ${c.accent2} !important;
    background: ${rgba(c.accent2, 0.15)} !important;
    color: ${c.accent2} !important;
    font-weight: 700 !important;
}

/* corner gloss */
.pp-cc-gradient-1 {
    background: linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 60%) !important;
    border-radius: ${r}px 0 0 0 !important;
    border: none !important;
    width: 50% !important;
    height: 50% !important;
    top: 0 !important;
    left: 0 !important;
    right: auto !important;
    bottom: auto !important;
    z-index: 6 !important;
    pointer-events: none !important;
}
.pp-cc-gradient-2 { display: none !important; }
.pp-cc-gradient-3 {
    background: linear-gradient(to top, ${rgba(c.pageBg, 0.5)} 0%, transparent 30%) !important;
    z-index: 6 !important;
    pointer-events: none !important;
    border: none !important;
    border-radius: 0 0 ${r}px ${r}px !important;
}

@media (max-width: 768px) {
    .pp-cc-wrapper { width: 160px !important; height: ${Math.round(cd.height * 0.88)}px !important; animation: none !important; }
    .profile-character-card-avatar-aspect-ratio { height: ${Math.round(cd.height * 0.88)}px !important; }
}`;
  }

  function mScrollbar(s) {
    if (!s.misc.scrollbar) return '';
    const c = s.colors;
    return `
/* ===== SCROLLBAR ===== */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: ${rgba(c.surface, 0.4)}; }
::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, ${c.accent}, ${c.accent2});
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: ${c.accent}; }`;
  }

  function mEntrance(s) {
    if (!s.misc.entrance) return '';
    return `
/* ===== ENTRANCE ANIMATION ===== */
@keyframes boot-in {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
}
.pp-uc-title, .pp-uc-followers-count, .pp-uc-follow-button,
.Btn2-purple, .profile-filters-flex-inner, .pp-cc-list-container {
    animation: boot-in 0.8s ease-out both;
}
.pp-uc-followers-count { animation-delay: 0.2s; }
.pp-uc-follow-button { animation-delay: 0.35s; }
.Btn2-purple { animation-delay: 0.5s; }
.profile-filters-flex-inner { animation-delay: 0.65s; }
.pp-cc-list-container { animation-delay: 0.8s; }`;
  }

  function mExtras(s) {
    const c = s.colors;
    const r = s.shape.radius;
    const parts = [];
    if (s.extras.status.enabled && s.extras.status.text) {
      parts.push(`
/* ===== STATUS PILL ===== */
.status-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    margin: 0 auto 16px auto;
    padding: 6px 16px;
    background: ${surfaceBG(s)};
    border: ${surfaceBorder(s)};
    border-radius: ${Math.max(r, 4)}px;
    font-family: ${fontStack(s.fonts.body)};
    font-size: 0.85rem;
    color: ${c.text};
    ${glassFilter(s)}
}
.status-pill .status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${c.accent};
    box-shadow: 0 0 6px ${c.accent};
    animation: status-blink 2.4s ease-in-out infinite;
}
@keyframes status-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
}`);
    }
    if (s.extras.news.enabled && s.extras.news.items.length) {
      parts.push(`
/* ===== NEWS PANEL ===== */
.news-panel {
    width: 100%;
    max-width: 640px;
    margin: 0 auto 20px auto;
    background: ${surfaceBG(s)};
    border: ${surfaceBorder(s)};
    border-radius: ${r}px;
    padding: 18px 24px;
    box-sizing: border-box;
    ${glassFilter(s)}
}
.news-panel-title {
    color: ${c.accent};
    font-family: ${fontStack(s.fonts.heading)};
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-align: center;
    margin: 0 0 12px 0;
}
.news-item {
    display: flex;
    gap: 12px;
    align-items: baseline;
    padding: 7px 0;
    border-bottom: 1px solid ${rgba(c.text, 0.08)};
    font-family: ${fontStack(s.fonts.body)};
}
.news-item:last-child { border-bottom: none; }
.news-date {
    flex-shrink: 0;
    color: ${c.accent2};
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.5px;
}
.news-text {
    color: ${rgba(c.text, 0.85)};
    font-size: 0.85rem;
    line-height: 1.5;
}`);
    }
    if (s.extras.about.enabled) {
      parts.push(`
/* ===== CUSTOM ABOUT PANEL ===== */
.about-panel { width: 100%; max-width: 800px; margin: 0 auto 20px auto; padding: 0 20px; box-sizing: border-box; }
.about-panel-inner {
    background: ${surfaceBG(s)};
    border: ${surfaceBorder(s)};
    border-radius: ${r}px;
    padding: 24px 32px;
    ${glassFilter(s)}
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}
.about-panel-title {
    margin: 0 0 12px 0;
    color: ${c.accent};
    font-family: ${fontStack(s.fonts.heading)};
    font-weight: 700;
    font-size: 1.4rem;
    text-align: center;
    letter-spacing: 2px;
}
.about-panel-body {
    color: ${rgba(c.text, 0.85)};
    font-family: ${fontStack(s.fonts.body)};
    font-size: 0.95rem;
    line-height: 1.7;
    text-align: center;
}
.about-panel-body a { color: ${c.accent}; border-bottom: 1px dashed ${c.accent}; }`);
    }
    if (s.extras.banner.enabled && s.extras.banner.url) {
      parts.push(`
/* ===== TOP BANNER IMAGE ===== */
.topimage {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    z-index: -1;
    pointer-events: none;
    overflow: hidden;
    mask-image: linear-gradient(to bottom, #000 0%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 100%);
}
.topimage img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }`);
    }
    if (s.extras.gallery.enabled && s.extras.gallery.items.length) {
      parts.push(`
/* ===== FRIENDS GALLERY ===== */
details.friends-gallery {
    width: 80%;
    max-width: 800px;
    margin: 20px auto;
    background: ${surfaceBG(s)};
    border: ${surfaceBorder(s)};
    border-radius: ${r}px;
    ${glassFilter(s)}
    overflow: hidden;
}
details.friends-gallery summary {
    padding: 12px 20px;
    font-family: ${fontStack(s.fonts.heading)};
    font-size: 1.3rem;
    color: ${c.accent};
    cursor: pointer;
    list-style: none;
    text-align: center;
    letter-spacing: 2px;
    font-weight: 600;
}
details.friends-gallery summary::-webkit-details-marker { display: none; }
.image-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    padding: 0 20px 20px 20px;
}
.gallery-item {
    position: relative;
    display: block;
    width: 72px; height: 72px;
    border-radius: ${s.shape.radius >= 20 ? '50%' : s.shape.radius + 'px'} !important;
    overflow: hidden;
    border: 2px solid transparent;
    transition: all 0.3s ease;
}
.gallery-item:hover {
    border-color: ${c.accent};
    box-shadow: 0 0 12px ${rgba(c.accent, 0.35)};
    transform: scale(1.1);
    z-index: 10;
}
.gallery-item img {
    display: block;
    width: 100%; height: 100%;
    object-fit: cover;
    filter: brightness(0.85);
    transition: all 0.4s ease;
}
.gallery-item:hover img { filter: brightness(1) saturate(1.3); }
.overlay-text {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    text-align: center;
    background: ${rgba(c.surface, 0.85)};
    color: ${c.text};
    font-family: ${fontStack(s.fonts.body)};
    font-size: 0.62rem;
    font-weight: 600;
    padding: 2px 4px;
    opacity: 0;
    transition: all 0.3s ease;
}
.gallery-item:hover .overlay-text { opacity: 1; }
@media (max-width: 768px) { .gallery-item { width: 52px; height: 52px; } }`);
    }
    return parts.join('\n');
  }

  /* ---------------- Extra HTML blocks ---------------- */

  const PARTICLE_COUNTS = { bubbles: 8, snow: 12, petals: 10, fireflies: 10, embers: 11 };

  function buildHTML(s) {
    const parts = [];
    if (s.background.image) {
      parts.push(`<div class="bg-image-layer"><img src="${escHtml(s.background.image)}" alt=""></div>`);
    }
    if (s.background.tintAlpha > 0) {
      parts.push(`<div class="bg-tint-layer"></div>`);
    }
    const fx = s.background.effect;
    if (PARTICLE_COUNTS[fx]) {
      const spans = [];
      for (let i = 1; i <= PARTICLE_COUNTS[fx]; i++) spans.push(`<span class="p${i}"></span>`);
      parts.push(`<div class="fx-layer fx-${fx}">${spans.join('')}</div>`);
    }
    if (s.extras.banner.enabled && s.extras.banner.url) {
      parts.push(`<div class="topimage">
  <img src="${escHtml(s.extras.banner.url)}" alt="Banner">
</div>`);
    }
    if (s.extras.status.enabled && s.extras.status.text) {
      parts.push(`<div class="status-pill">
  <span class="status-dot"></span>
  <span>${escHtml(s.extras.status.emoji)} ${escHtml(s.extras.status.text)}</span>
</div>`);
    }
    if (s.extras.news.enabled && s.extras.news.items.length) {
      const items = s.extras.news.items.map(it => `    <div class="news-item">
      <span class="news-date">${escHtml(it.date)}</span>
      <span class="news-text">${escHtml(it.text)}</span>
    </div>`).join('\n');
      parts.push(`<div class="news-panel">
  <div class="news-panel-title">${escHtml(s.extras.news.title)}</div>
${items}
</div>`);
    }
    if (s.extras.about.enabled) {
      const body = escHtml(s.extras.about.body).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
      parts.push(`<div class="about-panel">
  <div class="about-panel-inner">
    <div class="about-panel-title">${escHtml(s.extras.about.title)}</div>
    <div class="about-panel-body"><p>${body}</p></div>
  </div>
</div>`);
    }
    if (s.extras.gallery.enabled && s.extras.gallery.items.length) {
      const items = s.extras.gallery.items.map(it => `    <a href="${escHtml(it.url || '#')}" class="gallery-item">
      <img src="${escHtml(it.img)}" alt="${escHtml(it.name)}">
      <div class="overlay-text">${escHtml(it.name)}</div>
    </a>`).join('\n');
      parts.push(`<details class="friends-gallery">
  <summary>${escHtml(s.extras.gallery.title)}</summary>
  <div class="image-gallery">
${items}
  </div>
</details>`);
    }
    return parts.join('\n\n');
  }

  /* ---------------- Assembly ---------------- */

  function buildCSS(s) {
    const header = `/* ============================================
   ${s.meta.themeName || 'Untitled Theme'}
   Generated with JAI Profile Studio
   ============================================ */`;
    const chunks = [
      header,
      mBase(s),
      mBackground(s),
      mTopbar(s),
      mProfile(s),
      mFilters(s),
      mCards(s),
      mScrollbar(s),
      mEntrance(s),
      mExtras(s),
    ].filter(Boolean);
    return chunks.join('\n');
  }

  /** Preview font link tags (always loaded in preview regardless of import toggle). */
  function previewFontLinks(s) {
    const url = fontImportURL(s);
    return url ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${url}">` : '';
  }

  /** JanitorAI erases comments when saving custom CSS, and the stripping can
      leave broken gaps — so the export ships with comments already removed. */
  function stripComments(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function buildExport(s) {
    const css = stripComments(buildCSS(s));
    const html = buildHTML(s);
    return `<style>\n${css}\n</style>\n${html ? '\n' + html : ''}`;
  }

  return { buildCSS, buildHTML, buildExport, previewFontLinks, FONTS };
})();
