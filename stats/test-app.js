/* Headless harness: runs the page's own script against the real export with a
   stub DOM, so the maths and every render path get exercised without a browser.
   Run:  node stats/test-app.js  */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HERE = __dirname;
const html = fs.readFileSync(path.join(HERE, 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];
const data = JSON.parse(fs.readFileSync(path.join(HERE, 'jai-stats-latest.json'), 'utf8'));

/* ------------------------------------------------------------- stub DOM */
const NODES = [];
function makeNode(tag) {
  const node = {
    tagName: tag, children: [], _text: '', _html: '', attrs: {},
    style: {}, classList: { add() {}, remove() {}, contains: () => false },
    dataset: {}, value: '', checked: false, files: [],
    selectedOptions: [{ textContent: 'Messages sent' }],
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { return c; },
    remove() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
    addEventListener() {},
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 400 }; },
    querySelector() { return makeNode('div'); },
    querySelectorAll() { return []; },
    contains() { return false; },
    get textContent() { return this._text; },
    set textContent(v) { this._text = String(v); },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children.length = 0; },
    get className() { return this.attrs.class || ''; },
    set className(v) { this.attrs.class = v; }
  };
  NODES.push(node);
  return node;
}

const byId = new Map();
function nodeFor(sel) {
  if (!byId.has(sel)) byId.set(sel, makeNode(sel));
  return byId.get(sel);
}

const document = {
  documentElement: makeNode('html'),
  body: makeNode('body'),
  createElement: (t) => makeNode(t),
  createElementNS: (ns, t) => makeNode(t),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
  querySelector: (s) => nodeFor(s),
  querySelectorAll: () => []
};

const store = {};
const sandbox = {
  document,
  console,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  matchMedia: () => ({ matches: true }),
  location: { protocol: 'file:', search: '', hostname: 'localhost' },
  URLSearchParams, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  fetch: () => Promise.reject(new Error('no network in the harness')),
  innerWidth: 1400, innerHeight: 900,
  FileReader: function () {},
  Blob: function () {}, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  Math, JSON, Date, Number, String, Array, Object, isFinite, parseInt, parseFloat, Set, Map
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

/* Top-level `let`/`const` in a vm script live in script scope, not on the
   sandbox global, so the script publishes the handful of internals the tests
   drive. Accessors keep RAW writable from out here. */
const bridge = `
;globalThis.__api = {
  compact, freezeMedians, calibrate, analyse, render, rows, exportCsv, STATE, CLASSES, WINDOWS,
  get CAL() { return CAL; },
  get RAW() { return RAW; }, set RAW(v) { RAW = v; },
  get MEDIANS() { return MEDIANS; },
  get el() { return el; }, set el(v) { el = v; }
};`;
vm.createContext(sandbox);
vm.runInContext(code.replace(/^const el = /m, 'let el = ') + bridge, sandbox, { filename: 'index.html<script>' });
const app = sandbox.__api;

/* ------------------------------------------------------------ exercise */
let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

console.log('\ncompaction');
app.RAW = app.compact(data);
check('every bot keeps a contiguous daily series', () => {
  if (!app.RAW.bots.length) throw new Error('no bots');
  const bad = app.RAW.bots.filter((b) => {
    const span = (Date.parse(b.series.length ? b.start : b.start) , b.series.length);
    return span < 1;
  });
  if (bad.length) throw new Error(bad.length + ' bots with empty series');
});
check('gaps are filled with explicit zeros', () => {
  const total = app.RAW.bots.reduce((a, b) => a + b.series.length, 0);
  const rawRows = data.characters.reduce((a, c) => a + ((c.analytics && c.analytics.dailyEngagement) || []).length, 0);
  if (total <= rawRows) throw new Error('expected filled series to exceed ' + rawRows + ' rows, got ' + total);
  console.log('       ' + rawRows + ' recorded days -> ' + total + ' after filling ' + (total - rawRows) + ' zero days');
});
check('launch flag matches the tracking window', () => {
  const withLaunch = app.RAW.bots.filter((b) => b.hasLaunch).length;
  if (withLaunch === 0 || withLaunch === app.RAW.bots.length) throw new Error('suspicious count: ' + withLaunch);
  console.log('       ' + withLaunch + ' of ' + app.RAW.bots.length + ' bots have a captured launch week');
});

console.log('\nmedians frozen across the whole account');
app.freezeMedians();
app.calibrate();
check('a median exists for every metric/window pair', () => {
  const keys = Object.keys(app.MEDIANS);
  const missing = keys.filter((k) => app.MEDIANS[k] == null);
  if (keys.length !== 5 * 8) throw new Error('expected 40 pairs, got ' + keys.length);
  console.log('       ' + (keys.length - missing.length) + '/' + keys.length + ' pairs resolved; d8_35 messages median = ' +
    (app.MEDIANS['messages|d8_35'] * 100).toFixed(1) + '%');
});
check('medians ignore the active filter', () => {
  const before = app.MEDIANS['messages|d8_35'];
  app.STATE.q = 'zzz-nothing';
  app.STATE.minvol = 999999;
  const after = app.MEDIANS['messages|d8_35'];
  if (before !== after) throw new Error('median moved with the filter');
  app.STATE.q = ''; app.STATE.minvol = 100;
});

console.log('\nwindow coverage guard');
check('a young bot gets no figure for a window it has not reached', () => {
  const mi = 4;
  const young = app.RAW.bots.filter((b) => b.hasLaunch && b.series.length < 80 && b.series.length > 40);
  if (!young.length) throw new Error('no bot in the 40-80 day range to test');
  const r = app.analyse(young[0], mi, { from: 90, to: 180 });
  if (r.sustainRate !== null) throw new Error('a ' + young[0].series.length + '-day bot reported a d91-180 figure');
  console.log('       ' + young[0].series.length + '-day bot correctly reports nothing for d91-180');
});
check('half-covered windows are refused', () => {
  const mi = 4;
  const b = app.RAW.bots.find((x) => x.hasLaunch && x.series.length >= 50 && x.series.length <= 60);
  if (!b) { console.log('       (no bot in range, skipped)'); return; }
  const r = app.analyse(b, mi, { from: 35, to: 90 });
  const covered = (Math.min(90, b.series.length) - 35) / 55;
  if (covered < 0.5 && r.sustainRate !== null) throw new Error('accepted ' + (covered * 100).toFixed(0) + '% coverage');
});

console.log('\nrender paths');
for (const win of ['d8_35', 'd8_90', 'd36_90', 'd91_180', 'd181', 'flat', 'rec30', 'last30']) {
  for (const metric of ['messages', 'uniqueChatters']) {
    check('render(' + metric + ', ' + win + ')', () => {
      app.STATE.metric = metric;
      app.STATE.window = win;
      app.render();
    });
  }
}
check('render with a class hidden', () => {
  app.STATE.metric = 'messages'; app.STATE.window = 'd8_35';
  app.STATE.hiddenClasses.add('Top burner');
  app.render();
  app.STATE.hiddenClasses.clear();
});
check('render with bots selected', () => {
  app.STATE.selected = app.RAW.bots.slice(0, 4).map((b) => b.id);
  app.STATE.curveMode = 'sel';
  app.render();
  app.STATE.curveMode = 'all';
  app.render();
});
check('render with a search that matches nothing', () => {
  app.STATE.q = 'qqqqqq'; app.render(); app.STATE.q = '';
});
check('render with a floor that excludes everybody', () => {
  app.STATE.minvol = 1e9; app.render(); app.STATE.minvol = 100;
});

console.log('\nsanity of the headline numbers');
app.STATE.metric = 'messages'; app.STATE.window = 'd8_35'; app.STATE.selected = [];
const v = app.rows();
check('sustain ratios sit in a believable band', () => {
  const bad = v.eligible.filter((r) => r.sustain != null && (r.sustain < 0 || r.sustain > 3));
  if (bad.length) throw new Error(bad.length + ' bots outside 0-300%: ' + bad.map((b) => b.bot.name).join(', '));
  const vals = v.eligible.filter((r) => r.sustain != null).map((r) => r.sustain).sort((a, b) => a - b);
  console.log('       n=' + vals.length + '  min ' + (vals[0] * 100).toFixed(1) + '%  median ' +
    (vals[vals.length >> 1] * 100).toFixed(1) + '%  max ' + (vals[vals.length - 1] * 100).toFixed(1) + '%');
});
check('every eligible bot lands in exactly one class', () => {
  const missing = v.eligible.filter((r) => r.sustain != null && !r.cls);
  if (missing.length) throw new Error(missing.length + ' classified bots have no class');
});
check('loyalty ratios are bounded', () => {
  const bad = v.everyone.filter((r) => r.loyalty.convert != null && (r.loyalty.convert < 0 || r.loyalty.convert > 1.5));
  if (bad.length) throw new Error(bad.map((b) => b.bot.name + '=' + b.loyalty.convert.toFixed(2)).join(', '));
});
check('nobody is silently dropped', () => {
  const seen = v.eligible.length + v.excluded.length;
  if (seen !== v.everyone.length) throw new Error(seen + ' accounted for, ' + v.everyone.length + ' total');
  console.log('       ' + v.eligible.length + ' eligible + ' + v.excluded.length + ' excluded = ' + v.everyone.length);
});

console.log('\nsite counters');
check('calibration factor is measured, tight, and sane', () => {
  const c = app.CAL;
  if (!c) throw new Error('no calibration produced');
  if (c.factor < 1.5 || c.factor > 4) throw new Error('implausible factor ' + c.factor);
  if (c.hi / c.lo > 1.6) throw new Error('ratio spread too wide to calibrate: ' + c.lo + '-' + c.hi);
  console.log('       factor ' + c.factor.toFixed(3) + ' from ' + c.n + ' in-window bots, spread ' +
    c.lo.toFixed(2) + '-' + c.hi.toFixed(2));
});
check('in-window bots show almost nothing before the window', () => {
  const inw = v.everyone.filter((r) => r.hasLaunch && r.site.preWindowShare != null && r.site.messages > 20000);
  const wrong = inw.filter((r) => r.site.preWindowShare > 0.35);
  if (wrong.length > inw.length * 0.2) {
    throw new Error(wrong.length + '/' + inw.length + ' in-window bots claim >35% pre-window volume: ' +
      wrong.map((r) => r.bot.name).join(', '));
  }
  console.log('       ' + (inw.length - wrong.length) + '/' + inw.length + ' in-window bots correctly show ~no pre-window volume');
});
check('pre-window volume concentrates in the veterans', () => {
  const big = v.everyone.filter((r) => r.site.preWindowShare != null && r.site.preWindowShare > 0.3 && r.site.messages > 20000);
  if (!big.length) throw new Error('found none, expected the old cohort');
  const withLaunch = big.filter((r) => r.hasLaunch).length;
  console.log('       ' + big.length + ' bots understated by >30%, ' + (big.length - withLaunch) + ' of them pre-window');
  const top = big.slice().sort((a, b) => b.site.preWindow - a.site.preWindow)[0];
  console.log('       worst: ' + top.bot.name + ' — series ' + Math.round(top.total) +
    ', site ' + top.site.messages + ' (' + (top.site.preWindowShare * 100).toFixed(0) + '% pre-window)');
});
check('in-window bots fall under the materiality floor, so no false segment', () => {
  // The calibration is a median: bots with no pre-window history still land a
  // percent or two off zero. Those must stay below the 2% draw threshold.
  const inw = v.everyone.filter((r) => r.hasLaunch && r.site.preWindowShare != null && r.site.messages > 20000);
  const drawn = inw.filter((r) => r.site.preWindowShare >= 0.02);
  if (drawn.length > inw.length * 0.35) {
    throw new Error(drawn.length + '/' + inw.length + ' in-window bots would draw a pre-window segment');
  }
  console.log('       ' + (inw.length - drawn.length) + '/' + inw.length + ' in-window bots draw no pre-window segment');
});
check('estimated tracked volume never runs far past the site counter', () => {
  const bad = v.everyone.filter((r) => r.site.messages > 5000 && r.site.trackedInSiteUnits > r.site.messages * 1.35);
  if (bad.length > 3) throw new Error(bad.length + ' bots estimate more tracked volume than the site counter');
  console.log('       ' + bad.length + ' bots over the site counter by >35% (rounding noise)');
});

console.log('\ncsv');
check('exportCsv builds a row per visible bot', () => {
  let captured = null;
  sandbox.Blob = function (parts) { captured = parts[0]; };
  sandbox.document.body.appendChild = () => {};
  const origEl = app.el;
  app.el = (t, a, k) => { const n = origEl(t, a, k); n.click = () => {}; return n; };
  app.exportCsv();
  app.el = origEl;
  const lines = captured.trim().split('\n');
  if (lines.length !== v.visible.length + 1) throw new Error('expected ' + (v.visible.length + 1) + ' lines, got ' + lines.length);
  const cols = lines[0].split(',').length;
  console.log('       ' + (lines.length - 1) + ' rows x ' + cols + ' columns');
});

console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'all checks passed'));
process.exitCode = failures ? 1 : 0;
