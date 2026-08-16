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
| `jai-bots-<date>.csv` | one row per character — including `global_chats` and `global_messages`, the all-time counters from the character page, and publish-anchored `week1_*` |
| `jai-daily-<date>.csv` | one row per character per day, gaps filled with zeros, with `days_since_publish` and `is_pre_publish` — the file you actually want for analysis |
| `jai-stats-<date>.json` | everything, unflattened |

CSVs are UTF-8 with a BOM so Excel doesn't mangle character names, and are
RFC4180-quoted so names containing commas survive.

### `collect-jai-stats.js` — minimal, JSON only

Same JSON as above and nothing else. `jai-export.js` supersedes it; it is kept
because it is short enough to read in one sitting before running it.

### Feeding the app

Drop the JSON on the page, or leave it here — when served over http the app
auto-loads `jai-stats-latest.json` or today's `jai-stats-<date>.json`.

Both scripts borrow the site's own session by watching one request the page
makes. The token stays inside the page and is never written to any output file —
`test-export.js` asserts this. The only network calls are to janitorai.com's own
API, the same ones the site makes when you open the ANALYTICS panel.

## Running the app

Open `index.html` and drop the JSON on it. Auto-loading only works when the page
is served over http (browsers block `fetch` on `file://`), so for that:

```
node -e "const h=require('http'),f=require('fs');h.createServer((q,s)=>{const n=q.url==='/'?'/index.html':q.url.split('?')[0];if(!f.existsSync('.'+n))return s.writeHead(404),s.end();s.writeHead(200,{'Cache-Control':'no-store'});f.createReadStream('.'+n).pipe(s)}).listen(8791)"
```

then <http://localhost:8791/>. `?data=some-other-file.json` picks a specific export.

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

**Tracking starts 2025-12-25.** Bots published before that have no recorded
launch week and are excluded from the launch/sustain comparison — they are
listed with their reasons under the table, and still appear in the endurance
section, which needs no launch week.

**The character page counter and the analytics series count different events.**
Across bots living entirely inside the window their ratio is a tight 2.28–2.65
(median 2.43), so tracked volume is restated in site-counter units and the
remainder is life lived before tracking existed. The factor is measured from the
loaded account, not hardcoded. Chat counters do *not* hold a stable ratio
(0.44–0.95) and are never converted.

This matters: Brianna reads 67k in the series and 299k on its own page — about 45%
of its life predates tracking. Any ranking built on the daily series alone
quietly punishes veterans.

## Day zero is the publish date

**Not** the first day the analytics series has a number for. A character
normally exists privately before release, and the creator's own test chats land
in the daily series days or weeks ahead of publication — **38 of 70 characters**
in the August 2026 export start that way.

Anchoring to the first data point instead gets it wrong twice over:

- *Waiting for your arrival* was created 17 Jan and published 9 Mar. Its "week
  one" was 8 private days totalling **39 test messages**; the real week one is
  **34,663**.
- *Sleepover dick-pic incident*, the largest bot in the account, had a 2-day
  lead. Its week-1 average was diluted by two days of 73 test messages —
  38k/day reported against 49k/day actual.

So the app trims everything before the publish date, pads with real zeros if a
bot drew no traffic in its first days, and reports how much it removed. The
exporter carries `pre_publish_days`, `pre_publish_messages`,
`first_data_minus_publish_days`, and per-day `days_since_publish` /
`is_pre_publish` so anyone analysing the CSV can do the same.

A bot published **before** tracking began is a different case: that is missing
history, not a fixable offset, so it gets no launch week at all
(`launch_week_captured = 0`, `daily_history_truncated = 1`) and `week1_*` is
left blank rather than filled with whatever the first seven available rows
happened to be.

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
quoting of names containing commas, that both CSVs reconcile, that `week1_*`
matches `days_since_publish` 0-6 in the daily file, and that the auth token
appears in none of the outputs. Both harnesses pick the newest
`jai-stats-*.json` in this folder automatically.
