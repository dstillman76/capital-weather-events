// Last collector step: opens the widget headless with window.CW_FINALIZE_MODE,
// feeds it the collector file just written (data/events.json), and saves the
// widget's finished list (screened, de-duplicated, sorted into event types) to
// data/widget-events.json. Readers' browsers load only that small file.
//
// The widget makes no network requests here: the collector file is served
// from disk and everything else is refused, so a source that failed earlier in
// the run stays out instead of being loaded again. Every check is the widget's
// own; nothing here re-implements one.

import {readFile, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const ROOT = new URL('../', import.meta.url);
const IN_FILE = new URL('collector/data/events.json', ROOT);
const OUT_FILE = new URL('collector/data/widget-events.json', ROOT);
const WIDGET = new URL('capital-weather-events-widget.html', ROOT);
const TZ = 'America/New_York';

async function run() {
  const [html, collected] = await Promise.all([readFile(WIDGET, 'utf8'), readFile(IN_FILE, 'utf8')]);
  let browser;
  try { browser = await chromium.launch({channel: 'chrome'}); }
  catch { browser = await chromium.launch(); }
  try {
    const context = await browser.newContext({timezoneId: TZ, locale: 'en-US'});
    const page = await context.newPage();
    page.on('pageerror', e => console.log('Page error:', e.message));
    let refused = 0;
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.includes('/collector/data/events.json')) return route.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: collected});
      if (url.startsWith('http://finalize.local/')) return route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>finalize</title>'});
      refused++;
      return route.abort();
    });
    await page.goto('http://finalize.local/');
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><script>window.CW_FINALIZE_MODE = true;</script></head><body>${html}</body></html>`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => window.cwExportEvents && window.cwExportEvents().collectionComplete, null, {timeout: 8 * 60e3, polling: 1000});
    const snap = await page.evaluate(() => {
      const s = window.cwExportEvents({full: true});
      return {...s, sourceTotal: s.sources.length};
    });
    console.log(`Widget finished; ${refused} outside requests refused.`);
    return snap;
  } finally {
    await browser.close();
  }
}

async function main() {
  const started = Date.now();
  const snap = await run();
  const days = [...new Set(snap.events.map(e => e.date))].sort();
  if (!snap.events.length) throw Error('The widget produced no events; the previous finished list is kept.');
  const out = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    collectorGeneratedAt: JSON.parse(await readFile(IN_FILE, 'utf8')).generatedAt,
    window: {first: snap.window.first, last: snap.window.last},
    sourceTotal: snap.sources.length,
    // Only what the page's source count needs.
    sources: snap.sources.map(r => ({source: r.source, ok: r.ok, count: r.count || 0})),
    count: snap.events.length,
    events: snap.events,
  };
  await writeFile(OUT_FILE, JSON.stringify(out) + '\n');
  console.log(`::notice::Finished list: ${out.count} events, ${days[0]} to ${days.at(-1)}, ${out.sourceTotal} sources, ${Math.round(JSON.stringify(out).length / 1024)} KB, ${Math.round((Date.now() - started) / 1000)} s.`);
}

main().catch(e => { console.error(e); process.exit(1); });
