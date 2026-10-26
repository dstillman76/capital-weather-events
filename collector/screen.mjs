// Second collector step: runs the widget itself in headless Chromium for the
// sources that are slow or unreliable in a reader's browser, and adds their
// already-screened events to data/events.json under "screened".
//
// The widget runs with window.CW_COLLECT_MODE = true. In that mode it loads
// only the sources in its COLLECTED_SOURCES list, goes direct to each
// publisher (no CORS relay) and collects one extra day. Every date, location
// and outdoor check is the widget's own, so nothing here re-implements them.
//
// Chromium runs with web security off so the page can read publishers
// directly, like any server-side fetch. That setting affects only this
// throwaway browser on the GitHub runner, and requests go only to the
// publishers the widget already uses.

import {readFile, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const ROOT = new URL('../', import.meta.url);
const OUT_FILE = new URL('collector/data/events.json', ROOT);
const WIDGET = new URL('capital-weather-events-widget.html', ROOT);
const TZ = 'America/New_York';
const LIMIT_MS = 5 * 60e3;

function todayISO() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'})
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

async function run() {
  const html = await readFile(WIDGET, 'utf8');
  // GitHub's Ubuntu runners come with Google Chrome; using it avoids a slow
  // browser download. Playwright's own Chromium is the fallback.
  let browser;
  try { browser = await chromium.launch({channel: 'chrome', args: ['--disable-web-security']}); }
  catch { browser = await chromium.launch({args: ['--disable-web-security']}); }
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('Page error:', e.message));
    // The flag goes in the page itself: setContent reuses the blank page, so an
    // init script would not run before the widget.
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><script>window.CW_COLLECT_MODE = true;</script></head><body>${html}</body></html>`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => window.cwExportEvents && window.cwExportEvents().collectionComplete, null, {timeout: LIMIT_MS, polling: 1000});
    return await page.evaluate(() => window.cwExportEvents({full: true}));
  } finally {
    await browser.close();
  }
}

async function main() {
  const started = Date.now();
  let out;
  try { out = JSON.parse(await readFile(OUT_FILE, 'utf8')); } catch { throw Error('events.json missing: run collect.mjs first'); }
  const previous = out.screened || null;
  let snapshot = null, failure = '';
  try { snapshot = await run(); } catch (e) { failure = e.message; }

  const sources = {};
  let events = [];
  if (snapshot) {
    for (const r of snapshot.sources) {
      // A source counts as read only if it actually finished; failures and
      // blocks leave it to the reader's browser.
      const ok = r.ok && !r.blocked && /^(EVENTS FOUND|COMPLETED)/.test(r.status);
      sources[r.source] = {ok, status: r.status, events: 0, outcome: r.outcome || '', error: r.error || '', ms: r.ms};
    }
    events = snapshot.events.filter(e => sources[e.source]?.ok);
    for (const e of events) sources[e.source].events++;
  } else if (previous) {
    // The headless run failed; keep the last good results until their dates pass.
    const today = todayISO();
    Object.assign(sources, previous.sources);
    events = (previous.events || []).filter(e => e.date >= today);
  }
  out.screened = {
    generatedAt: snapshot ? new Date().toISOString() : previous?.generatedAt || new Date(0).toISOString(),
    note: failure ? 'Headless run failed: ' + failure + (previous ? ' (previous results kept)' : '') : '',
    sources, count: events.length, events,
  };
  await writeFile(OUT_FILE, JSON.stringify(out, null, 1) + '\n');
  for (const [name, s] of Object.entries(sources)) console.log(`${name}: ${s.ok ? 'ok' : 'NOT USED'} · ${s.status} · ${s.events} events` + (s.error ? ` · ${s.error}` : ''));
  if (failure) console.log('Headless run failed:', failure);
  console.log(`${events.length} screened events written in ${Math.round((Date.now() - started) / 1000)} s`);
}

main().catch(e => { console.error(e); process.exit(1); });
