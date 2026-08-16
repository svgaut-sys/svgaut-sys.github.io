/* ==========================================================================
   JanitorAI creator stats exporter                                    v1.0
   --------------------------------------------------------------------------
   Exports every stat JanitorAI holds about YOUR OWN characters into three
   files you can open in Excel, Google Sheets, R, pandas — whatever you like.

   ---------------------------------------------------------------- HOW TO RUN
     1. Log in to JanitorAI in Chrome (or Edge / Firefox).
     2. Go to  https://janitorai.com/my_characters
     3. Press F12, open the "Console" tab.
     4. Chrome only, and only the first time: click in the console, type
            allow pasting
        and press Enter. (Chrome blocks pasted code until you do.)
     5. Paste this entire file, press Enter, and wait — roughly a minute for
        70 characters.
     6. Your browser will ask to "download multiple files" — say yes.

   ------------------------------------------------------------- WHAT YOU GET
     jai-bots-<date>.csv     one row per character. The global chat and message
                             counters from the character page, the analytics
                             totals, and lifetime/last-30/last-7 sums.
     jai-daily-<date>.csv    one row per character per day. This is the real
                             prize — every daily number, ready to pivot.
     jai-stats-<date>.json   everything, unflattened, nothing thrown away.

   ------------------------------------------------------------------ PRIVACY
     Runs entirely in your own browser. The only servers contacted are
     janitorai.com's own API — the same calls the site makes when you open the
     ANALYTICS panel on one of your characters. Nothing is uploaded anywhere,
     there is no telemetry, and your login token is used in-page and never
     written to any of the output files.

     It only ever reads characters on the account you are logged into. There is
     no way to point it at somebody else's bots.

   -------------------------------------------------------------------- NOTES
     * JanitorAI's daily analytics only go back to around 25 Dec 2025. Bots
       older than that have a complete global counter but a truncated daily
       series. The bots CSV flags this in `daily_history_truncated`.
     * `global_messages` (character page) and `analytics_total_messages` count
       different events and do not match — expect the former to be roughly
       2.3-2.6x the latter. Neither is wrong; they measure different things.
     * Private characters are included. Delete rows you don't want before
       sharing the CSV with anyone.
   ========================================================================== */

(async function () {
  'use strict';

  const VERSION = '1.0';
  const TAG = '%c[JAI export]';
  const CSS = 'color:#3987e5;font-weight:bold';
  const log = (...a) => console.log(TAG, CSS, ...a);
  const warn = (...a) => console.warn(TAG, CSS, ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ------------------------------------------------------------ 0. checks */

  if (!location.hostname.endsWith('janitorai.com')) {
    warn('Wrong site. Open https://janitorai.com/my_characters and run this there.');
    return;
  }
  if (!/my_characters/.test(location.pathname)) {
    warn('Go to https://janitorai.com/my_characters first (this is where the character list lives), then run this again.');
    return;
  }

  log('v' + VERSION + ' starting.');

  /* ------------------------------------------------------------- 1. hooks
     The site signs its API calls with an Authorization header. Rather than
     digging around for the token, we watch one request the site makes and
     reuse the header it already sent. It stays in this function and is never
     put in a file. We also capture the URL shape of the character-list call so
     we do not have to guess its query parameters. */

  const seen = { auth: null, listUrl: null };

  if (!window.__jaiExportHooked) {
    window.__jaiExportHooked = seen;
    const rawOpen = XMLHttpRequest.prototype.open;
    const rawHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method, url) {
      try { if (String(url).includes('/characters/v2/mine')) seen.listUrl = String(url); }
      catch (e) { /* ignore */ }
      return rawOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.setRequestHeader = function (key, value) {
      try { if (String(key).toLowerCase() === 'authorization') seen.auth = value; }
      catch (e) { /* ignore */ }
      return rawHeader.apply(this, arguments);
    };
  } else {
    seen.auth = window.__jaiExportHooked.auth;
    seen.listUrl = window.__jaiExportHooked.listUrl;
    window.__jaiExportHooked = seen;
  }

  /* -------------------------------------------------- 2. make the site talk
     The hooks went on after the page loaded, so nudge the site into making a
     fresh list request. Clicking a page number does it; so does toggling the
     Privacy filter. If neither control exists we just ask the user to click. */

  function nudge() {
    const pages = [...document.querySelectorAll('button')].filter((b) => /^\d+$/.test(b.innerText.trim()));
    if (pages.length > 1) {
      const away = pages.find((b) => b.getAttribute('aria-current') !== 'page') || pages[1];
      away.click();
      setTimeout(() => { const first = pages.find((b) => b.innerText.trim() === '1'); if (first) first.click(); }, 700);
      return 'the pager';
    }
    const radios = [...document.querySelectorAll('input[type="radio"]')];
    if (radios.length > 1) {
      const on = radios.find((r) => r.checked) || radios[0];
      const off = radios.find((r) => r !== on);
      off.click();
      setTimeout(() => on.click(), 700);
      return 'the privacy filter';
    }
    return null;
  }

  log('waking the API up using ' + (nudge() || 'the page') + '...');

  const until = Date.now() + 25000;
  let asked = false;
  while ((!seen.auth || !seen.listUrl) && Date.now() < until) {
    await sleep(150);
    if (!asked && Date.now() > until - 15000) {
      asked = true;
      log('still waiting — please click a page number at the bottom of your character list, or a Privacy option on the left.');
    }
  }
  if (!seen.auth || !seen.listUrl) {
    warn('Never saw an API call, so there is no way in. Click a page number or a Privacy option, then run this again.');
    return;
  }

  /* ----------------------------------------------------------- 3. fetching */

  async function api(url) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, { headers: { authorization: seen.auth } });
        if (res.ok) return { ok: true, status: res.status, data: await res.json() };
        if (res.status === 429 || res.status >= 500) { await sleep(900 * attempt); continue; }
        return { ok: false, status: res.status, data: null };
      } catch (e) {
        if (attempt === 3) return { ok: false, status: 0, data: null };
        await sleep(900 * attempt);
      }
    }
    return { ok: false, status: 0, data: null };
  }

  // The list response shape is undocumented, so find the array of records.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function findRecords(payload) {
    const visited = new Set();
    const stack = [payload];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object' || visited.has(node)) continue;
      visited.add(node);
      if (Array.isArray(node)) {
        if (node.length && node.every((x) => x && typeof x === 'object' && UUID.test(String(x.id)))) return node;
        node.forEach((x) => stack.push(x));
      } else {
        Object.values(node).forEach((x) => stack.push(x));
      }
    }
    return [];
  }

  const characters = [];
  const ids = new Set();

  for (let page = 1; page <= 60; page++) {
    const url = new URL(seen.listUrl, location.origin);
    url.searchParams.set('page', String(page));
    const res = await api(url.toString());
    if (!res.ok) { warn('character list page ' + page + ' failed (' + res.status + ')'); break; }

    const found = findRecords(res.data);
    const fresh = found.filter((r) => !ids.has(r.id));
    fresh.forEach((r) => { ids.add(r.id); characters.push(r); });
    log('  list page ' + page + ': +' + fresh.length + ' (' + characters.length + ' total)');
    if (!found.length || !fresh.length) break;
    await sleep(200);
  }

  if (!characters.length) {
    warn('No characters found on this account.');
    return;
  }

  log('fetching all-time analytics for ' + characters.length + ' characters...');

  const rows = [];
  let done = 0, failed = 0;
  const queue = characters.slice();

  async function worker() {
    while (queue.length) {
      const c = queue.shift();
      const res = await api('/hampter/character-analytics/' + c.id + '?timeRange=all');
      if (!res.ok) failed++;
      rows.push({ character: c, analyticsStatus: res.status, analytics: res.data });
      done++;
      if (done % 10 === 0 || done === characters.length) log('  ' + done + '/' + characters.length);
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  if (failed) warn(failed + ' character(s) returned no analytics — brand new bots often have none yet.');

  rows.sort((a, b) => (b.character.stats && b.character.stats.message || 0) - (a.character.stats && a.character.stats.message || 0));

  /* ------------------------------------------------------------ 4. shaping */

  const DAY = 86400000;
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const num = (x) => (typeof x === 'number' && isFinite(x) ? x : 0);

  // Where the daily series begins across the whole account. Bots whose series
  // starts here but that were created earlier have a truncated history.
  let windowStart = null;
  rows.forEach((r) => {
    const d = (r.analytics && r.analytics.dailyEngagement) || [];
    d.forEach((x) => { if (windowStart === null || x.date < windowStart) windowStart = x.date; });
  });

  const DAILY_COLS = ['views', 'uniqueViewers', 'chats', 'uniqueChatters', 'messages',
    'avgChatDurationSec', 'avgViewDurationSec', 'impressions', 'clicks'];

  const bots = rows.map((r) => {
    const c = r.character;
    const a = (r.analytics && r.analytics.character) || {};
    const daily = (r.analytics && r.analytics.dailyEngagement) || [];
    const byDate = new Map(daily.map((d) => [d.date, d]));
    const dates = daily.map((d) => d.date).sort();

    // Fill gaps: the API omits zero-traffic days, which quietly inflates any
    // average taken over "the days that exist".
    const series = [];
    if (dates.length) {
      for (let t = Date.parse(dates[0] + 'T00:00:00Z'); t <= Date.parse(dates[dates.length - 1] + 'T00:00:00Z'); t += DAY) {
        const key = iso(t);
        const d = byDate.get(key);
        const row = { date: key };
        DAILY_COLS.forEach((k) => { row[k] = d ? num(d[k]) : 0; });
        series.push(row);
      }
    }

    const sum = (k, from) => series.slice(from == null ? 0 : Math.max(0, series.length - from))
      .reduce((x, d) => x + d[k], 0);

    const created = (c.created_at || '').slice(0, 10);
    const published = (c.first_published_at || '').slice(0, 10);

    return {
      raw: r,
      series,
      flat: {
        name: c.name || '',
        character_id: c.id,
        url: 'https://janitorai.com/characters/' + c.id,
        creator: c.creator_name || '',
        created: created,
        first_published: published,
        is_public: c.is_public === false ? 0 : 1,
        is_nsfw: c.is_nsfw ? 1 : 0,
        total_tokens: num(c.total_tokens),
        public_chat_count: num(c.public_chat_count),

        // The counters shown on the character page: all-time, no window.
        global_chats: num(c.stats && c.stats.chat),
        global_messages: num(c.stats && c.stats.message),

        // The analytics panel's own totals. These count different events from
        // the two above and will not match them.
        analytics_total_chats: num(a.total_chats),
        analytics_total_messages: num(a.total_messages),
        analytics_total_views: num(a.total_views),
        analytics_unique_chatters: num(a.unique_chatters),
        analytics_unique_viewers: num(a.unique_viewers),
        avg_messages_per_session: +num(a.avg_messages_per_session).toFixed(3),
        avg_session_minutes: +(num(a.avg_session_duration_ms) / 60000).toFixed(2),

        // Sums over the daily series actually returned.
        first_tracked_day: dates[0] || '',
        last_tracked_day: dates[dates.length - 1] || '',
        days_tracked: series.length,

        /* Two different reasons a daily series may not begin at launch, worth
           keeping apart: the history was cut off by when tracking started, or
           the bot simply had no traffic for a while after going up. Only the
           first one means data is missing. */
        daily_history_truncated: (dates.length && windowStart && dates[0] === windowStart &&
          created && created < windowStart) ? 1 : 0,
        daily_starts_after_launch_days: (dates.length && (published || created))
          ? Math.round((Date.parse(dates[0]) - Date.parse(published || created)) / DAY)
          : '',
        launch_week_captured: (dates.length && (published || created) &&
          Math.abs((Date.parse(dates[0]) - Date.parse(published || created)) / DAY) <= 2 &&
          (published || created) >= windowStart) ? 1 : 0,

        tracked_messages: sum('messages'),
        tracked_chats: sum('chats'),
        tracked_views: sum('views'),
        tracked_unique_chatters: sum('uniqueChatters'),
        tracked_unique_viewers: sum('uniqueViewers'),

        messages_last_30d: sum('messages', 30),
        chats_last_30d: sum('chats', 30),
        unique_chatters_last_30d: sum('uniqueChatters', 30),
        messages_last_7d: sum('messages', 7),

        tags: [].concat(c.tags || [], c.custom_tags || [])
          .map((t) => (typeof t === 'string' ? t : (t && (t.name || t.slug)) || ''))
          .filter(Boolean).join(' '),
        analytics_status: r.analyticsStatus
      }
    };
  });

  /* -------------------------------------------------------------- 5. files */

  function csv(headers, records) {
    const cell = (v) => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.join(',')];
    records.forEach((rec) => lines.push(headers.map((h) => cell(rec[h])).join(',')));
    // BOM so Excel opens UTF-8 names correctly instead of mangling them.
    return '﻿' + lines.join('\r\n');
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const botHeaders = Object.keys(bots[0].flat);
  const botCsv = csv(botHeaders, bots.map((b) => b.flat));

  const dailyHeaders = ['character_id', 'name', 'date', 'day_index'].concat(DAILY_COLS);
  const dailyRecords = [];
  bots.forEach((b) => {
    b.series.forEach((d, i) => {
      const rec = { character_id: b.flat.character_id, name: b.flat.name, date: d.date, day_index: i };
      DAILY_COLS.forEach((k) => {
        rec[k] = (k === 'avgChatDurationSec' || k === 'avgViewDurationSec') ? +d[k].toFixed(1) : d[k];
      });
      dailyRecords.push(rec);
    });
  });
  const dailyCsv = csv(dailyHeaders, dailyRecords);

  const json = JSON.stringify({
    schema: 'jai-stats/1',
    exporterVersion: VERSION,
    exportedAt: new Date().toISOString(),
    dailyWindowStart: windowStart,
    characterCount: rows.length,
    characters: rows
  });

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }

  // Staggered: browsers treat three downloads in a burst as suspicious.
  download('jai-bots-' + stamp + '.csv', botCsv, 'text/csv');
  await sleep(600);
  download('jai-daily-' + stamp + '.csv', dailyCsv, 'text/csv');
  await sleep(600);
  download('jai-stats-' + stamp + '.json', json, 'application/json');

  /* ------------------------------------------------------------ 6. summary */

  window.jaiExport = { bots, rows, botCsv, dailyCsv, json };

  const totalGlobalMsgs = bots.reduce((a, b) => a + b.flat.global_messages, 0);
  const totalGlobalChats = bots.reduce((a, b) => a + b.flat.global_chats, 0);
  const truncated = bots.filter((b) => b.flat.daily_history_truncated).length;

  log('done.');
  console.log(
    '%c  ' + bots.length + ' characters\n' +
    '  ' + totalGlobalMsgs.toLocaleString() + ' messages and ' + totalGlobalChats.toLocaleString() +
    ' chats all time (character-page counters)\n' +
    '  ' + dailyRecords.length.toLocaleString() + ' character-days in the daily file\n' +
    '  daily analytics begin ' + windowStart +
    (truncated ? ' — ' + truncated + ' character(s) are older than that and have a truncated daily history' : ''),
    'color:#52514e');

  console.table(bots.slice(0, 15).map((b) => ({
    character: b.flat.name.slice(0, 40),
    messages: b.flat.global_messages,
    chats: b.flat.global_chats,
    'msgs/30d': b.flat.messages_last_30d,
    days: b.flat.days_tracked
  })));

  log('If no downloads appeared, allow them for this site and re-run — or use:  copy(jaiExport.botCsv)');
})();
