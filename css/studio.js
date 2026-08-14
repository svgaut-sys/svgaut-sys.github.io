/* studio.js — UI wiring: builds the control panel from a schema, keeps theme
   state, refreshes the preview iframe, and handles presets / save / export. */

(() => {
  const STORAGE_KEY = 'jai-profile-studio-theme';
  const PROFILE_KEY = 'jai-profile-studio-profile';

  let state = structuredClone(DEFAULT_STATE);
  let profileData = null;
  try { profileData = JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch (_) {}

  /* ------- state helpers (dot-path access) ------- */
  const get = (path) => path.split('.').reduce((o, k) => o[k], state);
  const set = (path, val) => {
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], state)[last] = val;
  };

  /* ------- control schema ------- */
  const FONT_OPTIONS = Object.keys(GENERATOR.FONTS);
  const SCHEMA = [
    { title: '🎨 Colors', open: true, rows: [
      ['color', 'colors.pageBg', 'Page background'],
      ['color', 'colors.surface', 'Panels / cards'],
      ['color', 'colors.accent', 'Accent'],
      ['color', 'colors.accent2', 'Accent 2'],
      ['color', 'colors.text', 'Text'],
      ['color', 'colors.muted', 'Muted text'],
    ]},
    { title: '🔤 Fonts', rows: [
      ['select', 'fonts.heading', 'Headings', FONT_OPTIONS],
      ['select', 'fonts.body', 'Body', FONT_OPTIONS],
      ['hint', 'Every font in this list is natively available on JanitorAI (verified against the community @fonts showcase). Other fonts can\'t be used — the site blocks @import.'],
    ]},
    { title: '⬜ Shape & glass', rows: [
      ['range', 'shape.radius', 'Corner radius', 0, 32, 1, 'px'],
      ['check', 'shape.glass', 'Frosted glass panels'],
      ['range', 'shape.blur', 'Glass blur', 0, 24, 1, 'px'],
      ['range', 'shape.borderAlpha', 'Border strength', 0, 0.6, 0.05, ''],
    ]},
    { title: '🌌 Background', rows: [
      ['text', 'background.image', 'Image URL (optional)'],
      ['color', 'background.tint', 'Tint color'],
      ['range', 'background.tintAlpha', 'Tint strength', 0, 0.9, 0.05, ''],
      ['select', 'background.effect', 'Effect layer', ['none', 'bubbles', 'snow', 'petals', 'fireflies', 'embers', 'stars', 'rain', 'fog', 'scanlines', 'vaporgrid']],
      ['hint', 'The image is delivered as an <img> layer because JanitorAI strips url() in CSS. You can also set a background in JanitorAI settings; the effect layer sits on top of either.'],
    ]},
    { title: '📌 Top bar', rows: [
      ['check', 'topbar.enabled', 'Restyle top bar'],
      ['text', 'topbar.logoText', 'Replace logo text (blank = keep)'],
      ['check', 'topbar.accentLine', 'Accent line under bar'],
      ['check', 'topbar.animateLine', 'Animate accent line'],
    ]},
    { title: '👤 Profile box', rows: [
      ['text', 'profile.titleText', 'Display name (blank = keep)'],
      ['range', 'profile.titleSize', 'Name size', 2, 8, 0.5, 'rem'],
      ['select', 'profile.titleEffect', 'Name effect', ['none', 'gradient', 'float', 'glitch']],
      ['text', 'profile.followerLabel', 'Follower label (e.g. "Visitors")'],
      ['check', 'profile.centerLayout', 'Center the profile layout'],
      ['check', 'profile.hideAvatar', 'Hide avatar'],
      ['check', 'profile.hideBadges', 'Hide badges'],
      ['check', 'profile.hideMemberSince', 'Hide "member since"'],
      ['check', 'profile.hideCardBg', 'Hide profile-card background image'],
    ]},
    { title: '🃏 Character cards', rows: [
      ['select', 'cards.style', 'Card style', ['overlay', 'default']],
      ['range', 'cards.width', 'Card width', 180, 360, 10, 'px'],
      ['range', 'cards.height', 'Card height', 320, 560, 10, 'px'],
      ['check', 'cards.hoverLift', 'Lift & glow on hover'],
      ['check', 'cards.floatAnim', 'Gentle floating animation'],
      ['check', 'cards.tagsOnHover', 'Show tags only on hover'],
      ['check', 'cards.hideCreator', 'Hide creator name / stars'],
      ['hint', '"overlay" = poster-style card with the image filling the card, name pill on top and a glass description panel at the bottom. "default" keeps JanitorAI\'s layout and just recolors it.'],
    ]},
    { title: '🗂 Collection & filters', rows: [
      ['check', 'collection.styleControls', 'Restyle search / sort / filters'],
      ['text', 'collection.buttonText', 'Collection button text (blank = keep)'],
      ['text', 'collection.tabLabel', 'Collection tab label (blank = keep)'],
    ]},
    { title: '🟢 Status pill (extra HTML)', rows: [
      ['check', 'extras.status.enabled', 'Add a status pill under the profile'],
      ['text', 'extras.status.emoji', 'Emoji'],
      ['text', 'extras.status.text', 'Status text (e.g. "Slow replies this week")'],
    ]},
    { title: '📰 News panel (extra HTML)', rows: [
      ['check', 'extras.news.enabled', 'Add a news / updates panel'],
      ['text', 'extras.news.title', 'Panel title'],
      ['news', 'extras.news.items', 'Entries — one per line:\ndate | text'],
    ]},
    { title: '📝 About panel (extra HTML)', rows: [
      ['check', 'extras.about.enabled', 'Add an about panel'],
      ['text', 'extras.about.title', 'Panel title'],
      ['area', 'extras.about.body', 'Panel text (blank line = new paragraph)'],
    ]},
    { title: '🖼 Banner image (extra HTML)', rows: [
      ['check', 'extras.banner.enabled', 'Add a fading top banner'],
      ['text', 'extras.banner.url', 'Banner image URL'],
    ]},
    { title: '🧑‍🤝‍🧑 Friends gallery (extra HTML)', rows: [
      ['check', 'extras.gallery.enabled', 'Add a friends gallery'],
      ['text', 'extras.gallery.title', 'Gallery title'],
      ['gallery', 'extras.gallery.items', 'Friends — one per line:\nName | image URL | profile URL'],
    ]},
    { title: '⚙️ Misc', rows: [
      ['select', 'misc.cursor', 'Cursor', ['auto', 'pointer', 'crosshair']],
      ['check', 'misc.scrollbar', 'Custom scrollbar'],
      ['check', 'misc.selection', 'Custom text-selection color'],
      ['check', 'misc.entrance', 'Entrance animation on page load'],
      ['check', 'misc.hideEditButton', 'Hide the profile Edit button'],
      ['hint', 'Careful with "hide edit button": you can still reach profile editing from the site menu, but the shortcut disappears.'],
      ['text', 'meta.themeName', 'Theme name'],
    ]},
  ];

  /* ------- build controls ------- */
  const controlsEl = document.getElementById('controls');
  const inputs = new Map(); // path -> update fn

  function buildControls() {
    controlsEl.innerHTML = '';
    inputs.clear();
    for (const group of SCHEMA) {
      const det = document.createElement('details');
      det.className = 'ctrl-group';
      if (group.open) det.open = true;
      const sum = document.createElement('summary');
      sum.textContent = group.title;
      det.appendChild(sum);
      const body = document.createElement('div');
      body.className = 'group-body';
      for (const row of group.rows) body.appendChild(buildRow(row));
      det.appendChild(body);
      controlsEl.appendChild(det);
    }
  }

  function buildRow(row) {
    const [type, path, label, ...rest] = row;
    if (type === 'hint') {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = path; // for hints, path slot holds the text
      return p;
    }
    const wrap = document.createElement('div');
    wrap.className = (type === 'area' || type === 'gallery') ? 'ctrl-col' : 'ctrl-row';
    const lab = document.createElement('label');
    lab.textContent = label.split('\n')[0];
    wrap.appendChild(lab);

    let input;
    if (type === 'color') {
      input = document.createElement('input');
      input.type = 'color';
      input.addEventListener('input', () => { set(path, input.value); refresh(); });
      inputs.set(path, () => { input.value = get(path); });
    } else if (type === 'text') {
      input = document.createElement('input');
      input.type = 'text';
      input.addEventListener('input', () => { set(path, input.value); refresh(); });
      inputs.set(path, () => { input.value = get(path); });
    } else if (type === 'check') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.addEventListener('change', () => { set(path, input.checked); refresh(); });
      inputs.set(path, () => { input.checked = get(path); });
    } else if (type === 'select') {
      input = document.createElement('select');
      for (const opt of rest[0]) {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        input.appendChild(o);
      }
      input.addEventListener('change', () => { set(path, input.value); refresh(); });
      inputs.set(path, () => { input.value = get(path); });
    } else if (type === 'range') {
      const [min, max, step, unit] = rest;
      input = document.createElement('input');
      input.type = 'range';
      input.min = min; input.max = max; input.step = step;
      const val = document.createElement('span');
      val.className = 'range-val';
      input.addEventListener('input', () => {
        set(path, parseFloat(input.value));
        val.textContent = input.value + unit;
        refresh();
      });
      inputs.set(path, () => { input.value = get(path); val.textContent = get(path) + unit; });
      wrap.appendChild(input);
      wrap.appendChild(val);
      return wrap;
    } else if (type === 'area') {
      input = document.createElement('textarea');
      input.addEventListener('input', () => { set(path, input.value); refresh(); });
      inputs.set(path, () => { input.value = get(path); });
    } else if (type === 'news') {
      lab.textContent = '';
      lab.append(...label.split('\n').flatMap((l, i) => i ? [document.createElement('br'), l] : [l]));
      input = document.createElement('textarea');
      input.placeholder = 'Aug 14 | New bot released: Captain Mordake';
      input.addEventListener('input', () => {
        const items = input.value.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
          const idx = line.indexOf('|');
          return idx === -1
            ? { date: '', text: line.trim() }
            : { date: line.slice(0, idx).trim(), text: line.slice(idx + 1).trim() };
        }).filter(it => it.text);
        set(path, items);
        refresh();
      });
      inputs.set(path, () => {
        input.value = get(path).map(it => (it.date ? it.date + ' | ' : '') + it.text).join('\n');
      });
    } else if (type === 'gallery') {
      lab.textContent = '';
      lab.append(...label.split('\n').flatMap((l, i) => i ? [document.createElement('br'), l] : [l]));
      input = document.createElement('textarea');
      input.placeholder = 'ShinyHero | https://…/avatar.webp | https://janitorai.com/profiles/…';
      input.addEventListener('input', () => {
        const items = input.value.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
          const [name = '', img = '', url = ''] = line.split('|').map(x => x.trim());
          return { name, img, url };
        }).filter(it => it.name && it.img);
        set(path, items);
        refresh();
      });
      inputs.set(path, () => {
        input.value = get(path).map(it => `${it.name} | ${it.img} | ${it.url || ''}`.trim()).join('\n');
      });
    }
    wrap.appendChild(input);
    return wrap;
  }

  function syncControls() {
    for (const fn of inputs.values()) fn();
  }

  /* ------- preview ------- */
  const previewEl = document.getElementById('preview');
  let refreshTimer = null;

  function refresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      const css = GENERATOR.buildCSS(state);
      const html = GENERATOR.buildHTML(state);
      const fonts = GENERATOR.previewFontLinks(state);
      previewEl.srcdoc = PREVIEW.buildSrcdoc(css, html, fonts, profileData);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    }, 120);
  }

  /* ------- presets ------- */
  const presetSelect = document.getElementById('preset-select');
  for (const name of Object.keys(PRESETS)) {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    presetSelect.appendChild(o);
  }
  presetSelect.addEventListener('change', () => {
    const name = presetSelect.value;
    if (!name) return;
    const preset = PRESETS[name];
    state = structuredClone(DEFAULT_STATE);
    deepMerge(state, structuredClone(preset));
    state.meta.themeName = name;
    syncControls();
    refresh();
  });

  function deepMerge(target, src) {
    for (const k of Object.keys(src)) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && target[k]) {
        deepMerge(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    }
  }

  /* ------- save / load / reset ------- */
  document.getElementById('btn-save').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    downloadBlob(blob, safeName(state.meta.themeName) + '.theme.json');
  });
  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-load').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const loaded = JSON.parse(await file.text());
      state = structuredClone(DEFAULT_STATE);
      deepMerge(state, loaded);
      syncControls();
      refresh();
    } catch (e) {
      alert('Could not read that file as a theme JSON: ' + e.message);
    }
    fileInput.value = '';
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('Reset all settings to defaults?')) return;
    state = structuredClone(DEFAULT_STATE);
    presetSelect.value = '';
    syncControls();
    refresh();
  });

  /* ------- export ------- */
  const dialog = document.getElementById('export-dialog');
  const output = document.getElementById('export-output');
  const stats = document.getElementById('export-stats');
  document.getElementById('btn-export').addEventListener('click', () => {
    const text = GENERATOR.buildExport(state);
    output.value = text;
    const kb = (new Blob([text]).size / 1024).toFixed(1);
    stats.textContent = `${text.split('\n').length} lines · ${kb} KB`;
    dialog.showModal();
  });
  document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
  document.getElementById('btn-copy').addEventListener('click', async () => {
    await navigator.clipboard.writeText(output.value);
    const btn = document.getElementById('btn-copy');
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = 'Copy to clipboard'; }, 1500);
  });
  document.getElementById('btn-download').addEventListener('click', () => {
    const blob = new Blob([output.value], { type: 'text/css' });
    downloadBlob(blob, safeName(state.meta.themeName) + '.css');
  });

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function safeName(name) {
    return (name || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
  }

  /* ------- profile import (bookmarklet bridge) ------- */
  // Runs on the user's own janitorai.com profile page when they click the
  // bookmark; scrapes the visible profile into JSON and copies it to the
  // clipboard. Everything stays on the user's machine.
  const BOOKMARKLET_SRC = `(()=>{
    const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
    const t=e=>e?e.innerText.trim():'';
    const cards=$$('.pp-cc-wrapper').slice(0,12).map(w=>({
      name:t(w.querySelector('.pp-cc-name')),
      img:(w.querySelector('.pp-cc-avatar')||{}).src||'',
      desc:t(w.querySelector('.pp-cc-description')).slice(0,300),
      tags:[...w.querySelectorAll('.pp-cc-tags-item')].map(x=>x.innerText.trim()).filter(Boolean).slice(0,8),
      chats:t(w.querySelector('.pp-cc-chats-count')),
      tokens:t(w.querySelector('.pp-cc-tokens-count'))
    }));
    const css=[...document.querySelectorAll('style')].map(s=>s.textContent)
      .filter(x=>x.length>800&&(x.includes('.pp-')||x.includes('.profile-'))).join('\\n');
    const p={v:1,src:'jai-bookmarklet',grabbed:new Date().toISOString().slice(0,10),
      name:t($('.pp-uc-title')),followers:t($('.pp-uc-followers-count')),
      member:t($('.pp-uc-member-since')),avatar:($('.pp-uc-avatar')||{}).src||'',
      cardBg:($('.pp-uc-back')||{}).src||'',about:t($('.pp-uc-about-me')).slice(0,1200),
      badges:$$('.profile-badge').map(b=>b.innerText.trim()).filter(Boolean).slice(0,6),cards,css};
    const s=JSON.stringify(p);
    const done=ok=>{const d=document.createElement('div');
      d.textContent=ok?'\\u2705 Profile copied \\u2014 paste it into JAI Profile Studio':'\\u26a0 Copy failed \\u2014 try again';
      d.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#141420;color:#fff;padding:10px 18px;border-radius:8px;font:14px sans-serif;border:1px solid #666;box-shadow:0 4px 20px rgba(0,0,0,.5)';
      document.body.appendChild(d);setTimeout(()=>d.remove(),3500)};
    const fb=()=>{const ta=document.createElement('textarea');ta.value=s;document.body.appendChild(ta);
      ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();done(ok)};
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(s).then(()=>done(true)).catch(fb)
    }else fb();
  })()`;

  const importDialog = document.getElementById('import-dialog');
  const importInput = document.getElementById('import-input');
  const importStatus = document.getElementById('import-status');
  const importSaveCss = document.getElementById('import-savecss');
  document.getElementById('bookmarklet-link').href =
    'javascript:' + encodeURIComponent(BOOKMARKLET_SRC.replace(/\n\s*/g, ''));

  function describeProfile(p) {
    const norm = PREVIEW.normalizeProfile(p);
    if (!norm) return null;
    const bits = [`name: ${norm.name}`];
    if (norm.cards) bits.push(`${norm.cards.length} bots`);
    if (norm.followers) bits.push(norm.followers.split('\n')[0]);
    if (p.css) bits.push(`existing CSS: ${(p.css.length / 1024).toFixed(1)} KB`);
    if (p.grabbed) bits.push(`grabbed ${p.grabbed}`);
    return bits.join(' · ');
  }
  function refreshImportStatus() {
    const desc = profileData ? describeProfile(profileData) : null;
    importStatus.textContent = desc
      ? `Imported profile active — ${desc}`
      : 'No profile imported; the preview shows mock data.';
    importSaveCss.disabled = !(profileData && profileData.css);
  }

  document.getElementById('btn-import').addEventListener('click', () => {
    importInput.value = '';
    refreshImportStatus();
    importDialog.showModal();
  });
  document.getElementById('import-close').addEventListener('click', () => importDialog.close());
  document.getElementById('import-apply').addEventListener('click', () => {
    const raw = importInput.value.trim();
    if (!raw) { importStatus.textContent = 'Paste the bookmarklet output first.'; return; }
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) {
      importStatus.textContent = 'That is not valid JSON — make sure you paste the whole clipboard content.';
      return;
    }
    if (!parsed || parsed.src !== 'jai-bookmarklet' || !PREVIEW.normalizeProfile(parsed)) {
      importStatus.textContent = 'JSON is valid but does not look like bookmarklet output.';
      return;
    }
    profileData = parsed;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(parsed)); } catch (_) {}
    refreshImportStatus();
    refresh();
  });
  document.getElementById('import-clear').addEventListener('click', () => {
    profileData = null;
    localStorage.removeItem(PROFILE_KEY);
    refreshImportStatus();
    refresh();
  });
  importSaveCss.addEventListener('click', () => {
    if (!profileData || !profileData.css) return;
    downloadBlob(new Blob([profileData.css], { type: 'text/css' }),
      safeName((profileData.name || 'profile') + '-existing') + '.css');
  });

  /* ------- randomizer ------- */
  // Randomizes visual settings only — never touches user-entered text or widgets.
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rndRange = (min, max) => min + Math.random() * (max - min);
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
  }

  const HEADING_FONTS = ['Pacifico', 'Lobster', 'Cinzel Decorative', 'Cinzel', 'Pirata One',
    'Monoton', 'Abril Fatface', 'Black Ops One', 'Grenze Gotisch', 'Berkshire Swash',
    'Sigmar One', 'Caveat Brush', 'Oleo Script', 'Dancing Script', 'Special Elite',
    'Rubik Glitch', 'VT323', 'Press Start 2P', 'Silkscreen'];
  const BODY_FONTS = ['DM Sans', 'Poppins', 'Montserrat', 'Raleway', 'Jura', 'Mitr', 'Jua',
    'Crimson Text', 'Cardo', 'Roboto Condensed', 'Alegreya Sans SC', 'Courier Prime'];
  const PIXEL_FONTS = ['VT323', 'Press Start 2P', 'Silkscreen', 'DotGothic16'];

  function randomizeTheme() {
    const h = Math.floor(Math.random() * 360);
    const scheme = rnd(['complement', 'triad', 'analog']);
    const h2 = (h + { complement: 180, triad: 120, analog: 40 }[scheme]) % 360;
    const dark = Math.random() < 0.85; // occasionally a light theme
    state.colors.pageBg = dark
      ? hslToHex((h + rnd([0, 0, 20, 340])) % 360, Math.round(rndRange(15, 45)), Math.round(rndRange(5, 11)))
      : hslToHex(h, Math.round(rndRange(20, 45)), Math.round(rndRange(88, 95)));
    state.colors.surface = dark
      ? hslToHex(h, Math.round(rndRange(15, 40)), Math.round(rndRange(12, 20)))
      : hslToHex(h, Math.round(rndRange(25, 50)), Math.round(rndRange(78, 86)));
    state.colors.accent = hslToHex(h, Math.round(rndRange(65, 95)), Math.round(rndRange(55, 68)));
    state.colors.accent2 = hslToHex(h2, Math.round(rndRange(60, 90)), Math.round(rndRange(55, 70)));
    state.colors.text = dark ? hslToHex(h, 25, 95) : hslToHex(h, 30, 12);
    state.colors.muted = dark ? hslToHex(h, 18, 68) : hslToHex(h, 15, 38);

    const heading = rnd(HEADING_FONTS);
    const pixel = PIXEL_FONTS.includes(heading);
    state.fonts.heading = heading;
    state.fonts.body = pixel ? rnd(['VT323', 'Courier Prime', 'Cutive Mono', 'Silkscreen']) : rnd(BODY_FONTS);

    state.shape.radius = pixel ? rnd([0, 0, 4]) : rnd([8, 12, 16, 20, 24, 28]);
    state.shape.glass = pixel ? false : Math.random() < 0.7;
    state.shape.blur = Math.round(rndRange(6, 16));
    state.shape.borderAlpha = Math.round(rndRange(0.1, 0.4) * 20) / 20;

    state.background.effect = rnd(['none', 'none', 'bubbles', 'snow', 'petals', 'fireflies', 'embers', 'stars', 'rain', 'fog', 'scanlines', 'vaporgrid']);
    state.topbar.accentLine = Math.random() < 0.8;
    state.topbar.animateLine = Math.random() < 0.6;
    state.profile.titleEffect = rnd(['gradient', 'gradient', 'float', 'glitch', 'none']);
    state.cards.style = rnd(['overlay', 'overlay', 'overlay', 'default']);
    state.cards.hoverLift = Math.random() < 0.85;
    state.cards.floatAnim = Math.random() < 0.3;
    state.cards.tagsOnHover = Math.random() < 0.75;
    state.misc.entrance = Math.random() < 0.6;

    presetSelect.value = '';
    syncControls();
    refresh();
  }
  document.getElementById('btn-random').addEventListener('click', randomizeTheme);

  /* ------- mobile preview toggle ------- */
  document.getElementById('mobile-preview').addEventListener('change', (e) => {
    previewEl.classList.toggle('mobile', e.target.checked);
  });

  /* ------- init ------- */
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) deepMerge(state, JSON.parse(saved));
  } catch (_) {}
  buildControls();
  syncControls();
  refresh();
})();
