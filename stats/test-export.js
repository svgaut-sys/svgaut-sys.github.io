/* End-to-end harness for jai-export.js.
   Runs the real script against a fake JanitorAI backed by a previously captured
   export, so the hook / paging / shaping / CSV path is all exercised offline.
   Run:  node stats/test-export.js  */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HERE = __dirname;
const script = fs.readFileSync(path.join(HERE, 'jai-export.js'), 'utf8');
const DATA_FILE = (() => {
  const cands = fs.readdirSync(HERE).filter((f) => /^jai-stats-.*\.json$/.test(f));
  if (!cands.length) throw new Error('no jai-stats-*.json in ' + HERE);
  // newest by mtime, so a fresh export is picked up without editing anything
  return cands.map((f) => ({ f, t: fs.statSync(path.join(HERE, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0].f;
})();
const fixture = JSON.parse(fs.readFileSync(path.join(HERE, DATA_FILE), 'utf8'));

const PAGE_SIZE = 34;
const allChars = fixture.characters.map((r) => r.character);
const analyticsById = new Map(fixture.characters.map((r) => [r.character.id, r.analytics]));

/* --------------------------------------------------------------- fake DOM */
const downloads = [];

function node(tag) {
  return {
    tagName: tag, innerText: '', style: {}, children: [],
    href: '', download: '',
    setAttribute() {}, getAttribute: () => null,
    appendChild(c) { this.children.push(c); return c; },
    remove() {}, addEventListener() {},
    click() {
      if (tag === 'a') downloads.push({ name: this.download, body: blobBodies.get(this.href) });
    }
  };
}

// The pager button the script clicks to make the site issue a signed request.
const pagerButtons = ['1', '2', '3'].map((n) => {
  const b = node('button');
  b.innerText = n;
  b.click = () => {
    const x = new sandbox.XMLHttpRequest();
    x.open('GET', 'https://janitorai.com/hampter/characters/v2/mine?page=1&page_size=' + PAGE_SIZE + '&sort=latest');
    x.setRequestHeader('authorization', 'Bearer TEST-TOKEN-NEVER-LEAVES-THE-PAGE');
    x.send();
  };
  return b;
});

const blobBodies = new Map();
let blobSeq = 0;

const document = {
  body: node('body'),
  createElement: (t) => node(t),
  querySelector: () => null,
  querySelectorAll: (sel) => (sel === 'button' ? pagerButtons : [])
};

/* ------------------------------------------------------------- fake network */
function FakeXHR() {}
FakeXHR.prototype.open = function () {};
FakeXHR.prototype.setRequestHeader = function () {};
FakeXHR.prototype.send = function () {};

let sawAuthHeader = null;
let leakedToken = false;

async function fakeFetch(url, opts) {
  const u = new URL(String(url), 'https://janitorai.com');
  const auth = opts && opts.headers && opts.headers.authorization;
  sawAuthHeader = auth || sawAuthHeader;
  if (!auth) return { ok: false, status: 401, json: async () => ({}) };

  if (u.pathname.includes('/characters/v2/mine')) {
    const page = Number(u.searchParams.get('page') || 1);
    const slice = allChars.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return { ok: true, status: 200, json: async () => ({ data: { characters: slice } }) };
  }
  const m = u.pathname.match(/character-analytics\/([0-9a-f-]{36})/i);
  if (m) {
    const a = analyticsById.get(m[1]);
    return a
      ? { ok: true, status: 200, json: async () => a }
      : { ok: false, status: 404, json: async () => ({}) };
  }
  return { ok: false, status: 404, json: async () => ({}) };
}

/* ------------------------------------------------------------------ sandbox */
const sandbox = {
  console: {
    log(...a) { if (process.env.VERBOSE) console.log('   >', a.filter((x) => typeof x !== 'string' || !/^color:|^%c/.test(x)).join(' ')); },
    warn(...a) { const m = a.filter((x) => typeof x !== 'string' || !/^color:|^%c/.test(x)).join(' '); warnings.push(m); if (process.env.VERBOSE) console.log('   !', m); },
    table() {}
  },
  document,
  location: { hostname: 'janitorai.com', pathname: '/my_characters', origin: 'https://janitorai.com' },
  XMLHttpRequest: FakeXHR,
  fetch: fakeFetch,
  URL, URLSearchParams,
  Blob: function (parts) { this._body = parts[0]; blobBodies.set('blob:' + (++blobSeq), parts[0]); this._id = 'blob:' + blobSeq; },
  setTimeout, clearTimeout,
  Date, Math, JSON, Number, String, Array, Object, Set, Map, Promise, isFinite, parseInt, parseFloat
};
sandbox.URL = Object.assign(function () {}, URL);
sandbox.URL = URL;
// createObjectURL must hand back the id we recorded when the Blob was built
const realBlob = sandbox.Blob;
sandbox.Blob = function (parts, opts) { return new realBlob(parts, opts); };
sandbox.URL = class extends URL {};
sandbox.URL.createObjectURL = (b) => b._id;
sandbox.URL.revokeObjectURL = () => {};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const warnings = [];

process.on('unhandledRejection', (e) => {
  console.log('\n  UNHANDLED REJECTION inside jai-export.js:\n  ' + (e && e.stack || e) + '\n');
  process.exitCode = 1;
});

vm.createContext(sandbox);
vm.runInContext(script, sandbox, { filename: 'jai-export.js' });

/* -------------------------------------------------------------------- tests */
let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

(async function waitForRun() {
  // The exporter paces itself to be polite to the API, so poll rather than
  // guessing a fixed delay.
  const deadline = Date.now() + 60000;
  while (!sandbox.jaiExport && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200));
  }
  const out = sandbox.jaiExport;

  console.log('\nrun');
  check('the script completed and published its output', () => {
    if (!out) throw new Error('jaiExport never appeared. warnings: ' + warnings.join(' | '));
  });
  if (!out) { process.exitCode = 1; return; }

  check('it captured the auth header and used it', () => {
    if (!sawAuthHeader) throw new Error('no Authorization header was ever sent');
  });
  check('every character was collected across pages', () => {
    if (out.bots.length !== allChars.length) {
      throw new Error('expected ' + allChars.length + ' bots, got ' + out.bots.length);
    }
    console.log('       ' + out.bots.length + ' characters over ' + Math.ceil(allChars.length / PAGE_SIZE) + ' pages');
  });
  check('three files were produced', () => {
    const names = downloads.map((d) => d.name);
    if (downloads.length !== 3) throw new Error('got ' + downloads.length + ': ' + names.join(', '));
    console.log('       ' + names.join('  '));
  });

  console.log('\nbots csv');
  const botLines = out.botCsv.replace(/^﻿/, '').trim().split('\r\n');
  const botHead = botLines[0].split(',');
  check('one row per character plus a header', () => {
    if (botLines.length !== allChars.length + 1) throw new Error('got ' + botLines.length + ' lines');
    console.log('       ' + (botLines.length - 1) + ' rows x ' + botHead.length + ' columns');
  });
  check('the global counters are present and populated', () => {
    ['global_messages', 'global_chats'].forEach((c) => {
      if (!botHead.includes(c)) throw new Error('missing column ' + c);
    });
    const idx = botHead.indexOf('global_messages');
    const vals = botLines.slice(1).map((l) => Number(splitCsv(l)[idx]));
    const zero = vals.filter((v) => !v).length;
    if (zero > allChars.length * 0.15) throw new Error(zero + ' rows have no global_messages');
    console.log('       global_messages total ' + vals.reduce((a, b) => a + b, 0).toLocaleString() +
      ', ' + zero + ' empty');
  });
  check('global counters match the source data exactly', () => {
    const idName = botHead.indexOf('character_id');
    const idMsg = botHead.indexOf('global_messages');
    const idChat = botHead.indexOf('global_chats');
    let bad = 0;
    botLines.slice(1).forEach((l) => {
      const cells = splitCsv(l);
      const src = allChars.find((c) => c.id === cells[idName]);
      if (!src) { bad++; return; }
      if (Number(cells[idMsg]) !== (src.stats.message || 0)) bad++;
      if (Number(cells[idChat]) !== (src.stats.chat || 0)) bad++;
    });
    if (bad) throw new Error(bad + ' mismatched values');
  });
  check('names with commas and quotes survive the CSV', () => {
    const tricky = allChars.filter((c) => /[",]/.test(c.name || ''));
    const idx = botHead.indexOf('name');
    tricky.forEach((c) => {
      const row = botLines.slice(1).find((l) => splitCsv(l)[botHead.indexOf('character_id')] === c.id);
      if (!row) throw new Error('row missing for ' + c.name);
      if (splitCsv(row)[idx] !== c.name) throw new Error('mangled: ' + splitCsv(row)[idx] + ' != ' + c.name);
    });
    console.log('       ' + tricky.length + ' names containing a comma or quote round-tripped');
  });
  check('truncated histories are flagged', () => {
    const idx = botHead.indexOf('daily_history_truncated');
    const n = botLines.slice(1).filter((l) => splitCsv(l)[idx] === '1').length;
    if (!n) throw new Error('none flagged, expected the pre-window cohort');
    console.log('       ' + n + ' characters flagged as older than the analytics window');
  });

  console.log('\ndaily csv');
  const dayLines = out.dailyCsv.replace(/^﻿/, '').trim().split('\r\n');
  const dayHead = dayLines[0].split(',');
  check('one row per character-day, gaps filled', () => {
    const recorded = fixture.characters.reduce((a, r) =>
      a + ((r.analytics && r.analytics.dailyEngagement) || []).length, 0);
    const got = dayLines.length - 1;
    if (got < recorded) throw new Error('fewer rows (' + got + ') than recorded days (' + recorded + ')');
    console.log('       ' + got.toLocaleString() + ' rows x ' + dayHead.length + ' columns (' +
      recorded.toLocaleString() + ' recorded + ' + (got - recorded) + ' filled zero days)');
  });
  check('day_index starts at 0 and is contiguous per character', () => {
    const iId = dayHead.indexOf('character_id'), iIdx = dayHead.indexOf('day_index');
    const perBot = new Map();
    dayLines.slice(1).forEach((l) => {
      const c = splitCsv(l);
      if (!perBot.has(c[iId])) perBot.set(c[iId], []);
      perBot.get(c[iId]).push(Number(c[iIdx]));
    });
    for (const [id, idxs] of perBot) {
      if (idxs[0] !== 0) throw new Error(id + ' starts at ' + idxs[0]);
      for (let i = 1; i < idxs.length; i++) {
        if (idxs[i] !== idxs[i - 1] + 1) throw new Error(id + ' jumps at ' + idxs[i]);
      }
    }
    console.log('       ' + perBot.size + ' characters, all contiguous from day 0');
  });
  check('daily message sums reconcile with the bots csv', () => {
    const iId = dayHead.indexOf('character_id'), iMsg = dayHead.indexOf('messages');
    const sums = new Map();
    dayLines.slice(1).forEach((l) => {
      const c = splitCsv(l);
      sums.set(c[iId], (sums.get(c[iId]) || 0) + Number(c[iMsg]));
    });
    const bId = botHead.indexOf('character_id'), bMsg = botHead.indexOf('tracked_messages');
    let bad = 0;
    botLines.slice(1).forEach((l) => {
      const c = splitCsv(l);
      if ((sums.get(c[bId]) || 0) !== Number(c[bMsg])) bad++;
    });
    if (bad) throw new Error(bad + ' characters disagree between the two files');
    console.log('       every character reconciles across both CSVs');
  });

  console.log('\npublish anchoring');
  check('pre-publish testing is measured, not folded into week one', () => {
    const iPre = botHead.indexOf('pre_publish_days');
    const iMsg = botHead.indexOf('pre_publish_messages');
    if (iPre < 0 || iMsg < 0) throw new Error('missing pre_publish columns');
    const recs = botLines.slice(1).map(splitCsv).filter((c) => Number(c[iPre]) > 0);
    if (!recs.length) throw new Error('none found, but the fixture has pre-publish rows');
    console.log('       ' + recs.length + ' characters had private activity before release, ' +
      recs.reduce((a, c) => a + Number(c[iPre]), 0) + ' days / ' +
      recs.reduce((a, c) => a + Number(c[iMsg]), 0) + ' messages');
  });
  check('week1 columns exclude everything before the publish date', () => {
    const iId = botHead.indexOf('character_id'), iW1 = botHead.indexOf('week1_messages');
    const dId = dayHead.indexOf('character_id'), dSince = dayHead.indexOf('days_since_publish');
    const dMsg = dayHead.indexOf('messages'), dPre = dayHead.indexOf('is_pre_publish');
    const expect = new Map();
    dayLines.slice(1).forEach((l) => {
      const c = splitCsv(l);
      const since = Number(c[dSince]);
      if (c[dPre] === '1' || c[dSince] === '' || since < 0 || since > 6) return;
      expect.set(c[dId], (expect.get(c[dId]) || 0) + Number(c[dMsg]));
    });
    const iCap = botHead.indexOf('launch_week_captured');
    let bad = 0, blank = 0;
    botLines.slice(1).forEach((l) => {
      const c = splitCsv(l);
      if (c[iCap] !== '1') {
        // never recorded, so it must be blank rather than a wrong number
        if (c[iW1] !== '') bad++; else blank++;
        return;
      }
      if (Number(c[iW1]) !== (expect.get(c[iId]) || 0)) bad++;
    });
    if (bad) throw new Error(bad + ' characters disagree between week1_messages and the daily file');
    console.log('       reconciles for every character; ' + blank + ' correctly blank (release predates tracking)');
  });
  check('negative days_since_publish only ever appears on pre-publish rows', () => {
    const dSince = dayHead.indexOf('days_since_publish'), dPre = dayHead.indexOf('is_pre_publish');
    let bad = 0, neg = 0;
    dayLines.slice(1).forEach((l) => {
      const c = splitCsv(l);
      if (c[dSince] === '') return;
      const n = Number(c[dSince]);
      if (n < 0) { neg++; if (c[dPre] !== '1') bad++; }
      else if (c[dPre] === '1') bad++;
    });
    if (bad) throw new Error(bad + ' rows disagree between the flag and the offset');
    console.log('       ' + neg + ' pre-release rows, all flagged');
  });

  console.log('\nsafety');
  check('the auth token appears in none of the three files', () => {
    const token = 'TEST-TOKEN-NEVER-LEAVES-THE-PAGE';
    downloads.forEach((d) => {
      if (String(d.body).includes(token)) throw new Error('token leaked into ' + d.name);
    });
    if (out.json.includes(token) || out.botCsv.includes(token) || out.dailyCsv.includes(token)) {
      throw new Error('token leaked into an in-memory output');
    }
  });
  check('the json keeps the schema the analysis app expects', () => {
    const j = JSON.parse(out.json);
    if (j.schema !== 'jai-stats/1') throw new Error('schema is ' + j.schema);
    if (!Array.isArray(j.characters) || !j.characters[0].character || !j.characters[0].analytics) {
      throw new Error('shape changed');
    }
    if (j.characters.length !== allChars.length) throw new Error('character count differs');
  });

  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'all checks passed'));
  process.exitCode = failures ? 1 : 0;
})();

/* minimal RFC4180 splitter, enough for these files */
function splitCsv(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
