# Launch vs Sustain

Pulls the all-time daily analytics for every character on a JanitorAI account and
analyses them together, instead of one bot page at a time.

## Getting the data

Two collectors. Both run the same way — paste into the browser console on
<https://janitorai.com/my_characters> — and both work on any creator's own
account, so they are safe to hand to other people.

### `jai-export.js` — the one to share

Produces three files:

| File | Contents |
|---|---|
| `jai-bots-<date>.csv` | one row per character, 34 columns — including `global_chats` and `global_messages`, the all-time counters from the character page |
| `jai-daily-<date>.csv` | one row per character per day, gaps filled with zeros — the file you actually want for analysis |
| `jai-stats-<date>.json` | everything, unflattened |

CSVs are UTF-8 with a BOM so Excel doesn't mangle character names, and are
RFC4180-quoted so names containing commas survive.

### `collect-jai-stats.js` — minimal, JSON only

Same JSON as above and nothing else. `jai-export.js` supersedes it; it is kept
because it is short enough to read in one sitting before running it.

### Feeding the app

Drop the JSON on the page, or save it here as `jai-stats-latest.json`.

Both scripts borrow the site's own session by watching one request the page
makes. The token stays inside the page and is never written to any output file —
`test-export.js` asserts this. The only network calls are to janitorai.com's own
API, the same ones the site makes when you open the ANALYTICS panel.

## Running the app

Open `index.html` and drop the JSON on it. Auto-loading of `jai-stats-latest.json`
only works when the page is served over http (browsers block `fetch` on
`file://`), so for that:

```
node -e "const h=require('http'),f=require('fs');h.createServer((q,s)=>{const n=q.url==='/'?'/index.html':q.url.split('?')[0];if(!f.existsSync('.'+n))return s.writeHead(404),s.end();s.writeHead(200,{'Cache-Control':'no-store'});f.createReadStream('.'+n).pipe(s)}).listen(8791)"
```

then <http://localhost:8791/>. `?data=some-other-file.json` picks a different export.

## What it measures

Week one is a different distribution from everything after it — front-page
placement, not merit — so the two are kept apart and only ever compared as a
ratio.

- **Launch week** — daily average over days 0–6.
- **Sustain** — daily average over a later window, as a share of that bot's own
  week-one pace. Default is **days 8–35**: of the windows tried it is the least
  confounded by age (correlation with tail length −0.36, against −0.62 for a flat
  post-launch mean and −0.65 recency-weighted). A flat average mostly ranks bots
  by how old they are.
- **Life stages** — d8–35, d36–90, d91–180, d181+, each blank unless the bot has
  lived through the whole of it. A 40-day-old bot gets no d36–90 figure rather
  than one built from five days.
- **Classes** — multiples of the account-wide median for the selected window.
  Medians are frozen over all bots at load, so filtering never repaints anybody.
- **Endurance** — last-30-days-per-day × (age ÷ 30)^w, with w toggleable between
  0, ½ and 1. Bots under 35 days are excluded: their last 30 days is most of
  their life, so they would be competing on recency. Weighting by age hides
  which end of the scale a bot came from, so the bars are **shaded by age** —
  sort by score and a pale bar near the top is a young bot riding recency.
  Needs no launch week, so pre-tracking veterans are included.
- **Loyalty** (last 30 days) — chats per unique chatter, messages per chat, and
  viewers who open a chat.

Closed windows must be **completely** covered, not half — scoring a 25-day-old
bot on "days 8–35" measures its freshest fortnight and nothing else, which is
the exact recency skew the windows exist to remove.

## Two things about the data that change the answers

**Tracking starts 2025-12-25.** Bots older than that have no recorded launch week
and are excluded from the launch/sustain comparison — they are listed with their
reasons under the table, and still appear in the veterans section.

**The character page counter and the analytics series count different events.**
Across bots living entirely inside the window their ratio is a tight 2.28–2.65
(median 2.43), so tracked volume is restated in site-counter units and the
remainder is life lived before tracking existed. The factor is measured from the
loaded account, not hardcoded. Chat counters do *not* hold a stable ratio
(0.44–0.95) and are never converted.

This matters: Brianna reads 67k in the series and 299k on its own page — about 45%
of its life predates tracking. Any ranking built on the daily series alone
quietly punishes veterans.

## Two reasons a bot has no launch week

Kept apart, because conflating them misstates the data:

- **truncated** — the series is pinned to the first tracked day and the bot is
  older than it. History really is missing (14 bots in the Aug 2026 export).
- **quiet start** — it went up earlier but drew no traffic for a while. Nothing
  is missing; there was nothing there (16 bots).

`jai-bots-*.csv` carries both as `daily_history_truncated` and
`daily_starts_after_launch_days`, plus `launch_week_captured`.

## Tests

```
node test-app.js      # the analysis page, under a stub DOM
node test-export.js   # jai-export.js end-to-end against a fake API
```

`test-app.js` drives every metric/window/render path, the window-coverage
guards, the frozen medians, the calibration and the CSV export. The calibration
self-checks: bots that lived entirely inside the tracking window must come out
with ~no pre-window volume, or the factor is wrong.

`test-export.js` runs the real exporter against a fake JanitorAI backed by a
captured export, and checks paging, the global counters against source, CSV
quoting of names containing commas, that both CSVs reconcile, and that the auth
token appears in none of the outputs.
