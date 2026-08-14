/* preview.js — builds the mock JanitorAI profile page shown inside the preview iframe.
   The DOM structure and class names replicate the real janitorai.com profile page
   (extracted from a live-page inspect dump), so generated CSS behaves the same
   here as it will on the real site. */

const PREVIEW = (() => {

  // Offline-safe placeholder avatars: gradient SVGs as data URIs
  function svgAvatar(c1, c2, label) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>
      </linearGradient></defs>
      <rect width='400' height='600' fill='url(#g)'/>
      <circle cx='200' cy='210' r='80' fill='rgba(255,255,255,0.25)'/>
      <rect x='110' y='330' width='180' height='150' rx='75' fill='rgba(255,255,255,0.18)'/>
      <text x='200' y='560' font-family='sans-serif' font-size='36' fill='rgba(255,255,255,0.55)' text-anchor='middle'>${label}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const MOCK_CARDS = [
    { name: 'Velvet Thorn',   c1: '#5b2a86', c2: '#d94f8e', tokens: '2.1k', chats: '48.2k',
      desc: 'A rival duelist with a razor tongue and a soft spot she will deny to her grave. <b>Enemies to lovers</b>, slow burn.',
      tags: ['female', 'enemies-to-lovers', 'angst', 'anypov'] },
    { name: 'Captain Mordake', c1: '#1c3f5e', c2: '#3ea8c9', tokens: '1.6k', chats: '12.9k',
      desc: 'Weathered privateer captain who owes you a life debt. <i>Adventure on the high seas</i>, treasure, mutiny.',
      tags: ['male', 'adventure', 'historical', 'dominant'] },
    { name: 'Unit K-88',       c1: '#232526', c2: '#8e9eab', tokens: '3.4k', chats: '77.0k',
      desc: 'Decommissioned combat android found in a scrapyard. It remembers one order: protect you. <b>Sci-fi</b>, found family.',
      tags: ['robot', 'scifi', 'protective', 'anypov'] },
    { name: 'Madame Sosette',  c1: '#4a1d3f', c2: '#c98b3e', tokens: '1.9k', chats: '9.4k',
      desc: 'Fortune teller of the wandering carnival. Her cards always tell the truth — usually the worst one.',
      tags: ['female', 'mystery', 'supernatural', 'comedy'] },
    { name: 'Ash & Ember',     c1: '#601818', c2: '#e2793e', tokens: '2.7k', chats: '31.5k',
      desc: 'Twin fire spirits bound to your hearth. One warms your home, the other wants to burn the town down.',
      tags: ['multiple-people', 'fantasy', 'chaos', 'anypov'] },
    { name: 'Professor Lyle',  c1: '#1f3d2b', c2: '#88b04b', tokens: '1.2k', chats: '5.8k',
      desc: 'Absent-minded botanist whose greenhouse plants have started whispering back. <b>Cozy horror</b>.',
      tags: ['male', 'horror', 'academia', 'switch'] },
  ];

  function escHtml(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function cardHTML(card, i) {
    const av = card.img || svgAvatar(card.c1, card.c2, card.name.split(' ')[0]);
    const tagItems = card.tags.map(t => {
      const slug = String(t).toLowerCase().replace(/[^a-z0-9]+/g, '');
      return `<li class="chakra-wrap__listitem pp-cc-tags-wrap pp-cc-tags-wrap-regular profile-character-card-tags-wrap profile-character-card-tags-wrap-regular">
         <span class="pp-cc-tags-item pp-cc-tags-regular pp-tag-${slug}">${escHtml(t)}</span>
       </li>`;
    }).join('');
    return `
    <div class="pp-cc-wrapper profile-character-card-wrapper">
      <div class="chakra-stack profile-character-card-stack css-1s5evre">
        <a class="profile-character-card-stack-link-component" href="javascript:void(0)">
          <div class="profile-character-card-stack-link-component-box css-nlxhw4">
            <div class="pp-cc-name profile-character-card-name-box">${escHtml(card.name)}</div>
            <div class="pp-cc-star-line profile-character-card-star-line">★★★★☆</div>
            <div class="pp-cc-creator-name profile-character-card-creator-name-box">@mockuser</div>
          </div>
          <div class="chakra-aspect-ratio profile-character-card-avatar-aspect-ratio css-1q7rmf0">
            <img class="pp-cc-avatar profile-character-card-avatar-image" src="${escHtml(av)}" alt="${escHtml(card.name)}">
          </div>
        </a>
        <div class="profile-character-card-description-box css-199gcrh">
          <div class="pp-cc-description profile-character-card-description-markdown-container">
            <p>${card.desc}</p>
          </div>
        </div>
        <div class="profile-character-card-stats-box css-10cv7r2">
          <div class="_content_67d1x_11 pp-cc-ribbon-wrap profile-character-card-ribbon-wrap">
            <div class="_ribbon_67d1x_1 pp-cc-ribbon profile-character-card-ribbon">
              <div class="chakra-stack pp-cc-chats profile-character-card-chats-hstack">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.6V21l3.6-2c1.1.3 2.2.4 3.4.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/></svg>
                <span class="pp-cc-chats-count profile-character-card-chats-count">${escHtml(card.chats)}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="profile-character-card-box css-1c9wmts">
          <p class="chakra-text pp-cc-tokens-count profile-character-card-tokens-count">${escHtml(card.tokens)}${/tokens/i.test(card.tokens) ? '' : ' tokens'}</p>
        </div>
        <ul class="chakra-wrap pp-cc-tags profile-character-card-tags">${tagItems}</ul>
        <div class="pp-cc-gradient-1"></div>
        <div class="pp-cc-gradient-2"></div>
        <div class="pp-cc-gradient-3"></div>
      </div>
    </div>`;
  }

  // Baseline CSS approximating JanitorAI's default dark theme, so overrides
  // read the same way they will on the live site.
  const BASELINE_CSS = `
    * { box-sizing: border-box; margin: 0; }
    html, body { min-height: 100%; }
    body {
      background: #101014; color: #e8e8ee;
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 15px;
    }
    a { color: #a78bfa; text-decoration: none; }
    button { cursor: pointer; }
    .pp-page-background { position: fixed; inset: 0; z-index: -30; background: #101014; }

    /* top bar */
    .pp-top-bar-inner {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; gap: 16px;
      padding: 10px 20px; background: #17171d;
      border-bottom: 1px solid #26262e;
    }
    .pp-top-bar-logo-name { font-size: 1.25rem; font-weight: 700; color: #fff; }
    .pp-top-bar-logo-sub-name { font-size: 0.7rem; color: #8b8b9a; }
    .pp-top-bar-search-box { flex: 1; max-width: 480px; }
    .pp-top-bar-search-input-group {
      display: flex; align-items: center; gap: 6px;
      background: #1f1f27; border: 1px solid #2c2c36; border-radius: 8px;
      padding: 0 10px; height: 38px;
    }
    .pp-top-bar-search-icon { color: #8b8b9a; display: flex; }
    .pp-top-bar-search {
      flex: 1; background: transparent; border: none; outline: none;
      color: #e8e8ee; font: inherit;
    }
    .pp-top-bar-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
    ._notificationsButton_abfem_7 {
      position: relative; background: #1f1f27; border: 1px solid #2c2c36;
      border-radius: 8px; width: 38px; height: 38px;
      display: flex; align-items: center; justify-content: center;
    }
    ._notificationsButton_abfem_7 svg { fill: #b9b9c6; }
    ._notificationsBadge_abfem_41 {
      position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff;
      font-size: 0.65rem; border-radius: 999px; min-width: 17px; height: 17px;
      display: flex; align-items: center; justify-content: center; padding: 0 4px;
    }
    .glow-on-hover {
      background: #7c3aed; color: #fff; border: none; border-radius: 8px;
      height: 38px; padding: 0 14px; font: inherit; font-weight: 600;
    }

    /* profile section */
    .profile-page-flex { display: flex; flex-direction: column; gap: 18px; padding: 28px 24px 60px; max-width: 1180px; margin: 0 auto; }
    .pp-uc-background {
      background: #191920; border: 1px solid #26262e; border-radius: 14px;
      padding: 26px 30px; box-shadow: 0 8px 30px rgba(0,0,0,0.35);
      position: relative; overflow: hidden;
    }
    .pp-uc-back-container { position: absolute; inset: 0; z-index: 0; }
    .pp-uc-back { width: 100%; height: 100%; object-fit: cover; opacity: 0.35; }
    .profile-info-hstack { position: relative; z-index: 1; }
    .pp-tabs-wrapper { display: flex; gap: 4px; border-bottom: 1px solid #26262e; position: relative; }
    .pp-tabs-button {
      background: transparent; border: none; color: #b9b9c6; font: inherit;
      font-weight: 600; padding: 9px 16px; position: relative;
    }
    .pp-tabs-button[aria-selected="true"] { color: #fff; }
    .pp-tabs-indicator { position: absolute; bottom: -1px; left: 0; width: 92px; height: 2px; background: #7c3aed; }
    .profile-info-hstack { display: flex; gap: 22px; align-items: center; }
    .profile-info-stack-inner { display: flex; flex-direction: column; gap: 8px; }
    .pp-uc-avatar-container { flex-shrink: 0; }
    .pp-uc-avatar { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 3px solid #2c2c36; }
    .pp-uc-title { font-size: 2rem; font-weight: 800; color: #fff; }
    .pp-uc-followers-count { color: #b9b9c6; }
    .pp-uc-member-since { color: #77778a; font-size: 0.85rem; }
    .profile-badges { display: flex; gap: 8px; }
    .profile-badge {
      background: #24242e; border: 1px solid #33333f; color: #b9b9c6;
      border-radius: 999px; font-size: 0.72rem; padding: 3px 10px;
    }
    .pp-uc-about-me { color: #9c9cae; max-width: 640px; line-height: 1.5; margin-top: 4px; }
    .pp-uc-follow-flex { display: flex; gap: 10px; margin-top: 10px; }
    .pp-uc-follow-button {
      background: #7c3aed; color: #fff; border: none; border-radius: 8px;
      height: 36px; padding: 0 20px; font: inherit; font-weight: 600;
    }
    .pp-uc-options-menu {
      background: #24242e; color: #b9b9c6; border: 1px solid #33333f;
      border-radius: 8px; height: 36px; padding: 0 12px; font: inherit;
    }

    /* collection header + filters */
    .Btn2-purple {
      background: #7c3aed22; border: 1px solid #7c3aed66; color: #d6bcfa;
      border-radius: 10px; height: 40px; padding: 0 16px; font: inherit; font-weight: 700;
      display: inline-flex; align-items: center; gap: 8px;
    }
    .pp-pg-total-count { font-weight: 700; }
    .profile-filters-flex-outer { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
    .profile-filters-flex-inner { display: flex; align-items: center; gap: 10px; }
    .profile-character-search-input-group {
      display: flex; align-items: center; background: #1f1f27;
      border: 1px solid #2c2c36; border-radius: 8px; height: 40px; padding: 0 6px; width: 210px;
    }
    .profile-character-search-input-group svg { fill: #8b8b9a; width: 16px; margin-left: 6px; flex-shrink: 0; }
    .pp-fl-search-input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: #e8e8ee; font: inherit; padding: 0 8px; }
    .transparent .react-select__control {
      display: flex; align-items: center; background: #1f1f27;
      border: 1px solid #2c2c36; border-radius: 8px; height: 40px; padding: 0 10px; min-width: 150px;
    }
    .react-select__value-container > div { color: #b9b9c6; }
    .react-select__indicators { margin-left: auto; display: flex; }
    .css-8mmkcg { fill: #8b8b9a; width: 18px; height: 18px; }
    .pp-fl-filter-button {
      background: #1f1f27; border: 1px solid #2c2c36; border-radius: 8px;
      width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
    }
    .pp-fl-filter-button svg { fill: #8b8b9a; width: 18px; }

    /* cards */
    .pp-cc-list-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
    .pp-cc-wrapper {
      position: relative; background: #191920; border: 1px solid #26262e;
      border-radius: 12px; overflow: hidden; min-height: 380px;
    }
    .chakra-stack.profile-character-card-stack { position: relative; height: 100%; display: flex; flex-direction: column; }
    .css-nlxhw4 { padding: 10px 12px; }
    .pp-cc-name { font-weight: 700; color: #fff; }
    .pp-cc-star-line { color: #f0c86a; font-size: 0.7rem; margin-top: 2px; }
    .pp-cc-creator-name { color: #77778a; font-size: 0.75rem; }
    .css-1q7rmf0 { position: relative; width: 100%; aspect-ratio: 3/4; overflow: hidden; }
    .pp-cc-avatar.profile-character-card-avatar-image { width: 100%; height: 100%; object-fit: cover; border-radius: 0; border: none; }
    .profile-character-card-description-box { padding: 10px 12px; }
    .pp-cc-description { color: #9c9cae; font-size: 0.8rem; line-height: 1.45; max-height: 76px; overflow: hidden; }
    .profile-character-card-stats-box { position: absolute; top: 8px; right: 8px; }
    .pp-cc-ribbon { background: rgba(0,0,0,0.65); border-radius: 6px; padding: 3px 8px; }
    .pp-cc-chats { display: flex; align-items: center; gap: 5px; color: #e8e8ee; font-size: 0.72rem; }
    .profile-character-card-box { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.65); border-radius: 6px; padding: 3px 8px; }
    .pp-cc-tokens-count { color: #e8e8ee; font-size: 0.72rem; }
    .pp-cc-tags { list-style: none; display: flex; flex-wrap: wrap; gap: 5px; padding: 0 12px 12px; }
    .pp-cc-tags-item {
      display: inline-block; background: #24242e; border: 1px solid #33333f;
      color: #b9b9c6; font-size: 0.65rem; border-radius: 999px; padding: 2px 8px;
    }
    .pp-cc-gradient-1, .pp-cc-gradient-2, .pp-cc-gradient-3 { position: absolute; inset: 0; pointer-events: none; }
    .pp-cc-gradient-3 { background: linear-gradient(to top, rgba(0,0,0,0.35), transparent 35%); }

    /* pagination */
    .profile-pagination-flex-outer { display: flex; justify-content: center; gap: 8px; margin-top: 10px; }
    .pp-pg-page-button, .pp-pg-prev-button, .pp-pg-next-button {
      background: #1f1f27; border: 1px solid #2c2c36; color: #b9b9c6;
      border-radius: 8px; min-width: 34px; height: 34px; font: inherit;
    }
    .pp-pg-page-button-active { background: #7c3aed; color: #fff; border-color: #7c3aed; }
  `;

  /** Convert bookmarklet-imported profile JSON into the card/profile shapes the mock uses. */
  function normalizeProfile(p) {
    if (!p || typeof p !== 'object') return null;
    const cards = (Array.isArray(p.cards) ? p.cards : []).slice(0, 12)
      .filter(c => c && c.name)
      .map(c => ({
        name: String(c.name).slice(0, 80),
        img: /^https:\/\//.test(c.img || '') ? c.img : '',
        c1: '#3a3a4a', c2: '#5a4a6a',
        desc: escHtml(String(c.desc || '').slice(0, 300)),
        tags: (Array.isArray(c.tags) ? c.tags : []).slice(0, 8).map(String),
        chats: String(c.chats || '—'),
        tokens: String(c.tokens || '—'),
      }));
    return {
      name: String(p.name || 'You').slice(0, 60),
      followers: String(p.followers || '').slice(0, 80),
      member: String(p.member || '').slice(0, 60),
      avatar: /^https:\/\//.test(p.avatar || '') ? p.avatar : '',
      cardBg: /^https:\/\//.test(p.cardBg || '') ? p.cardBg : '',
      about: String(p.about || '').slice(0, 1200),
      badges: (Array.isArray(p.badges) ? p.badges : []).slice(0, 6).map(String),
      cards: cards.length ? cards : null,
    };
  }

  function buildMockBody(profile) {
    const pr = normalizeProfile(profile);
    const name = pr ? escHtml(pr.name) : 'MockUser';
    const followersLine = pr && pr.followers
      ? escHtml(pr.followers)
          .replace(/^([\d.,km]+)/i, '<span>$1</span>')
          .replace(/(·[^·]*following[^<]*)$/i, '<span>$1</span>')
      : '<span>1,204</span> followers <span>· 87 following</span>';
    const member = pr && pr.member ? escHtml(pr.member) : 'Member since Jan 2024';
    const avatar = pr && pr.avatar ? escHtml(pr.avatar) : svgAvatar('#7c3aed', '#ec4899', '');
    const cardBg = pr && pr.cardBg ? escHtml(pr.cardBg) : svgAvatar('#26263a', '#3d2c52', '');
    const about = pr && pr.about ? escHtml(pr.about)
      : 'This is the default about-me text on the profile card. Your custom theme can restyle, move, or hide it.';
    const badges = (pr && pr.badges.length ? pr.badges : ['✦ Creator', '★ Verified'])
      .map(b => `<span class="profile-badge">${escHtml(b)}</span>`).join('\n              ');
    const cards = (pr && pr.cards) ? pr.cards : MOCK_CARDS;
    return buildBodyTemplate({ name, followersLine, member, avatar, cardBg, about, badges, cards });
  }

  function buildBodyTemplate(d) {
    return `
    <div class="pp-page-background profile-page-background"></div>
    <header class="pp-top-bar profile-top-bar pp-top-bar-inner">
      <div class="profile-top-bar-logo-box">
        <h1 class="chakra-heading pp-top-bar-logo-name profile-top-bar-logo-name">JanitorAI</h1>
        <p class="chakra-text pp-top-bar-logo-sub-name profile-top-bar-logo-sub-name">beta</p>
      </div>
      <div class="profile-top-bar-search-box pp-top-bar-search-box">
        <div class="profile-top-bar-search-input-group pp-top-bar-search-input-group">
          <div class="pp-top-bar-search-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg></div>
          <input class="pp-top-bar-search profile-top-bar-search" id="search-input" placeholder="Search characters...">
        </div>
      </div>
      <div class="pp-top-bar-right">
        <button class="_notificationsButton_abfem_7" aria-label="Notifications">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 22a2.1 2.1 0 0 0 2.1-2.1H9.9A2.1 2.1 0 0 0 12 22zm6.3-6.3V10.5c0-3.2-1.7-5.9-4.7-6.6v-.7a1.6 1.6 0 0 0-3.2 0v.7c-3 .7-4.7 3.4-4.7 6.6v5.2L4 17.4v1h16v-1z"/></svg>
          <span class="_notificationsBadge_abfem_41">3</span>
        </button>
        <button class="pp-top-bar-create-char glow-on-hover">Create character</button>
      </div>
    </header>

    <div class="profile-page-flex">
      <div class="pp-uc-background profile-uc-background profile-uc-background-flex">
        <div class="pp-uc-back-container">
          <img class="pp-uc-back" src="${d.cardBg}" alt="">
        </div>
        <div class="profile-info-hstack chakra-stack">
          <div class="pp-uc-avatar-container profile-avatar-container">
            <img class="pp-uc-avatar profile-avatar" src="${d.avatar}" alt="avatar">
          </div>
          <div class="profile-info-stack-inner chakra-stack">
            <div class="profile-info-stack-inner-flex">
              <h1 class="chakra-heading pp-uc-title profile-title-heading">${d.name}</h1>
            </div>
            <div class="pp-uc-followers-count profile-followers-count">${d.followersLine}</div>
            <div class="pp-uc-member-since">${d.member}</div>
            <div class="chakra-stack profile-badges">
              ${d.badges}
            </div>
            <div class="pp-uc-about-me profile-about-me">${d.about}</div>
            <div class="pp-uc-follow-flex profile-uc-follow-flex">
              <button class="Btn pp-uc-follow-button profile-uc-follow-button"><span class="chakra-text pp-uc-follow-text css-e9kr8m">Follow</span></button>
              <button class="chakra-button chakra-menu__menu-button pp-uc-options-menu profile-uc-options-menu">•••</button>
            </div>
          </div>
        </div>
      </div>

      <div class="chakra-tabs__tablist pp-tabs-wrapper profile-tabs-wrapper">
        <button class="chakra-tabs__tab pp-tabs-button profile-tabs-button" aria-selected="true">Collection</button>
        <div class="chakra-tabs__tab-indicator pp-tabs-indicator"></div>
      </div>

      <div class="profile-filters-flex-outer">
        <button class="profile-badge-flex-outer Btn2-purple pp-pg-total">
          <span class="chakra-text pp-pg-total-text">Characters</span>
          <span class="pp-pg-total-count">24</span>
        </button>
        <div class="profile-filters-flex-inner">
          <div class="chakra-input__group profile-character-search-input-group">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>
            <input class="chakra-input pp-fl-search-input profile-character-search-input" placeholder="Search...">
          </div>
          <div class="transparent">
            <div class="react-select__control">
              <div class="react-select__value-container"><div>Popular</div></div>
              <div class="react-select__indicators"><svg class="css-8mmkcg" viewBox="0 0 20 20"><path d="M4.5 7.5L10 13l5.5-5.5H4.5z"/></svg></div>
            </div>
          </div>
          <button class="chakra-button pp-fl-filter-button profile-filter-button">
            <svg viewBox="0 0 24 24"><path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7V5z"/></svg>
          </button>
        </div>
      </div>

      <div class="pp-cc-list-container">
        ${d.cards.map(cardHTML).join('\n')}
      </div>

      <div class="profile-pagination-flex-outer">
        <button class="_navButton_1jhaa_84 pp-pg-prev-button">‹</button>
        <button class="_pageButton_1jhaa_112 pp-pg-page-button pp-pg-page-button-active">1</button>
        <button class="_pageButton_1jhaa_112 pp-pg-page-button">2</button>
        <button class="_pageButton_1jhaa_112 pp-pg-page-button">3</button>
        <button class="_navButton_1jhaa_84 pp-pg-next-button">›</button>
      </div>
    </div>`;
  }

  /** Full iframe document: baseline page + user's generated CSS + extra HTML.
      `profile` (optional) is bookmarklet-imported data to personalize the mock. */
  function buildSrcdoc(generatedCSS, extraHTML, fontImports, profile) {
    return `<!doctype html><html><head><meta charset="utf-8">
      ${fontImports}
      <style>${BASELINE_CSS}</style>
      <style>${generatedCSS}</style>
    </head><body>
      ${buildMockBody(profile)}
      ${extraHTML}
    </body></html>`;
  }

  return { buildSrcdoc, svgAvatar, normalizeProfile };
})();
