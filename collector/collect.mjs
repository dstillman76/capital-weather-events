// Capital Weather events collector.
//
// Runs on GitHub Actions once a day and writes data/events.json, which
// the Capital Weather outdoor-events widget reads. It covers only the sources
// a reader's browser cannot read in full:
//
//  * Six Simpleview tourism sites. Their RSS feeds stop at 30 items in
//    alphabetical order, and their date search is blocked to anything but
//    their own page. Every event page is listed in the public sitemap and
//    carries its own dates, so the collector reads the sitemap and opens only
//    event pages it has not seen, or whose sitemap date changed. It keeps a
//    cache, honours robots.txt and its Crawl-delay, and goes one page at a time
//    per site.
//  * Montgomery Parks, whose calendar answers only POST requests (the free
//    browser relay accepts GET only).
//
// The collector does no outdoor screening. It records what each publisher
// states (dates, times, venue, address, description) and the widget applies
// its usual date, location and outdoor checks, so the rules live in one place.
//
// No dependencies; Node 20+.

import {readFile, writeFile, mkdir} from 'node:fs/promises';

const UA = 'CapitalWeatherEventsCollector/1.0 (+https://www.capitalweather.com; outdoor events listing)';
const TZ = 'America/New_York';
const WINDOW_DAYS = 9;            // today + 8: covers the widget's 7-day window from any hour
const MAX_PAGES_PER_SITE = 500;   // per run; the cache carries progress to the next run
const RUN_BUDGET_MS = 40 * 60e3;  // stop opening pages after 40 minutes
const REFRESH_DAYS = 7;           // re-open an unchanged page after this long
const DATA_DIR = new URL('./data/', import.meta.url);
const CACHE_FILE = new URL('cache.json', DATA_DIR);
const OUT_FILE = new URL('events.json', DATA_DIR);

const SIMPLEVIEW = [
  {name: 'Visit Fairfax', host: 'www.fxva.com', county: 'Fairfax County', state: 'VA'},
  {name: 'Visit Loudoun', host: 'www.visitloudoun.org', county: 'Loudoun County', state: 'VA'},
  {name: 'Visit Frederick', host: 'www.visitfrederick.org', county: 'Frederick County', state: 'MD'},
  {name: 'Experience Prince George’s', host: 'www.experienceprincegeorges.com', county: 'Prince George’s County', state: 'MD'},
  {name: 'Visit Howard County', host: 'www.visithowardcounty.com', county: 'Howard County', state: 'MD'},
  {name: 'Visit Annapolis', host: 'www.visitannapolis.org', county: 'Anne Arundel County', state: 'MD'},
];
const MONTGOMERY_PARKS = {name: 'Montgomery Parks', host: 'montgomeryparks.org', county: 'Montgomery County', state: 'MD'};

// FindLocal (findlocal.community): an events API built from venues' own
// calendars. The free plan allows 100 calls a month (hard stop) and requires a
// visible "Event data by FindLocal" link wherever its events are shown; the
// widget adds it to each FindLocal card. The key below can be replaced by a
// GitHub Actions secret named FINDLOCAL_API_KEY, which takes precedence.
const FINDLOCAL = {
  key: process.env.FINDLOCAL_API_KEY || '3k8TJ8RBxCC81EpnJKUKha',
  // One request covers everything within 60 km of DC (Leesburg, Manassas,
  // Columbia and Annapolis are inside; Frederick and Fredericksburg are not).
  // Every category: outdoor concerts, community festivals, stadium games and
  // food-truck events are filed under music, community, sports, food_drink…
  // The widget screens each event; venues that are always indoors are dropped
  // here to keep the file small.
  near: '38.9072,-77.0369', radiusKm: 60,
  categories: '',
  indoorVenueTypes: /^(?:Theater|Comedy Club|Nightclub|Library|Bookstore|Museum|Art Gallery|Cafe)$/,
  monthlyTarget: 80,      // plan for at most 80 of the 100 monthly calls
  maxCallsPerRun: 6,
  keepInReserve: 10,      // never spend the last 10 calls of the month
  // Rows per call: 500 until 2026-11-15, 100 after (FindLocal's announced change).
  pageSize: today => today < '2026-11-15' ? 500 : 100,
};

const started = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const overBudget = () => Date.now() - started > RUN_BUDGET_MS;

/* ---------- dates ---------- */

function todayISO() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'})
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const MONTHS = {jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12};
const pad = n => String(n).padStart(2, '0');
function isoFrom(y, m, d) {
  y = +y; m = +m; d = +d;
  if (!y || !m || !d || m > 12 || d > 31) return '';
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  return new Date(iso + 'T12:00:00Z').toISOString().slice(0, 10) === iso ? iso : '';
}
// "Tuesday, October 27, 2026 12:00 PM", "December 12, 2026", "10/31/2026"
function parseUSDate(text) {
  const s = String(text || '');
  let m = s.match(/\b([A-Z][a-z]{2,8})\.?\s+(\d{1,2}),?\s+(20\d\d)\b/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return isoFrom(m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], m[2]);
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/);
  if (m) return isoFrom(m[3], m[1], m[2]);
  m = s.match(/\b(20\d\d)(\d\d)(\d\d)\b/);
  if (m) return isoFrom(m[1], m[2], m[3]);
  return '';
}
function parseClock(text) {
  const m = String(text || '').match(/\b(\d{1,2})(?::([0-5]\d))?\s*([ap])\.?\s*m\b\.?/i);
  if (!m) return '';
  let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12;
  return `${pad(h)}:${m[2] || '00'}`;
}
// "8:00 AM to 6:00 PM", "7:00PM - 8:30PM", "4:00 PM"
function parseTimeRange(text) {
  const parts = String(text || '').split(/\s+(?:to|-|–|—|until)\s+/i);
  const start = parseClock(parts[0]);
  const end = parts.length > 1 ? parseClock(parts[1]) : '';
  return {start, end: end && end > start ? end : ''};
}
function daysBetween(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
function rangeDates(a, b) { const out = []; for (let d = a; d <= b && out.length < 400; d = addDays(d, 1)) out.push(d); return out; }

/* ---------- text ---------- */

const ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…'};
function decode(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n ? String.fromCodePoint(n) : all; }
    return ENTITIES[e.toLowerCase()] ?? all;
  });
}
function textOf(html) {
  return decode(String(html || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/li>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/* ---------- polite fetching ---------- */

const robotsCache = new Map();
export async function robotsFor(host) {
  if (robotsCache.has(host)) return robotsCache.get(host);
  const rules = {allow: [], disallow: [], delay: 0};
  try {
    const res = await fetch(`https://${host}/robots.txt`, {headers: {'user-agent': UA}, signal: AbortSignal.timeout(15000)});
    if (res.ok) {
      // Groups of User-agent lines followed by rules; use the group(s) for "*".
      let agents = [], inRules = false;
      for (const raw of (await res.text()).split(/\r?\n/)) {
        const line = raw.replace(/#.*/, '').trim(); if (!line) continue;
        const i = line.indexOf(':'); if (i < 0) continue;
        const key = line.slice(0, i).trim().toLowerCase(), val = line.slice(i + 1).trim();
        if (key === 'user-agent') { if (inRules) { agents = []; inRules = false; } agents.push(val.toLowerCase()); continue; }
        inRules = true;
        if (!agents.includes('*')) continue;
        if (key === 'disallow' && val) rules.disallow.push(val);
        else if (key === 'allow' && val) rules.allow.push(val);
        else if (key === 'crawl-delay') rules.delay = Math.min(10, parseFloat(val) || 0);
      }
    }
  } catch { /* no robots.txt reachable: default rules */ }
  robotsCache.set(host, rules);
  return rules;
}
export function allowedBy(rules, path) {
  const match = list => Math.max(-1, ...list.filter(p => path.startsWith(p.replace(/\*.*$/, ''))).map(p => p.length));
  return match(rules.allow) >= match(rules.disallow);
}
class Site {
  constructor(host) { this.host = host; this.last = 0; this.requests = 0; this.refused = 0; }
  async init() { this.rules = await robotsFor(this.host); this.delay = Math.max(1000, (this.rules.delay || 2) * 1000); }
  async get(url, opts = {}) {
    const u = new URL(url);
    if (!allowedBy(this.rules, u.pathname + u.search)) throw Object.assign(Error('robots.txt disallows ' + u.pathname), {robots: true});
    const wait = this.last + this.delay - Date.now(); if (wait > 0) await sleep(wait);
    this.last = Date.now(); this.requests++;
    const res = await fetch(url, {...opts, headers: {'user-agent': UA, 'accept-language': 'en-US', ...(opts.headers || {})}, redirect: 'follow', signal: AbortSignal.timeout(30000)});
    if (res.status === 401 || res.status === 403) { this.refused++; throw Object.assign(Error('HTTP ' + res.status + ' (publisher refused)'), {refused: true}); }
    if (res.status === 429 || res.status >= 500) { this.delay = Math.min(this.delay * 2, 20000); throw Error('HTTP ' + res.status); }
    if (!res.ok) throw Object.assign(Error('HTTP ' + res.status), {status: res.status});
    return res.text();
  }
}

/* ---------- Simpleview ---------- */

function sitemapEntries(xml) {
  return [...xml.matchAll(/<(url|sitemap)>([\s\S]*?)<\/\1>/g)].map(m => ({
    kind: m[1],
    loc: decode((m[2].match(/<loc>\s*([^<]+?)\s*<\/loc>/) || [])[1] || ''),
    lastmod: ((m[2].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/) || [])[1] || ''),
  })).filter(x => x.loc);
}
async function simpleviewEventURLs(site) {
  const seen = new Set(), events = new Map(), queue = [`https://${site.host}/sitemap.xml`];
  while (queue.length && seen.size < 30) {
    const url = queue.shift(); if (seen.has(url)) continue; seen.add(url);
    const xml = await site.get(url);
    for (const e of sitemapEntries(xml)) {
      if (e.kind === 'sitemap') { if (!/blog|article|listing|page/i.test(e.loc) || /event/i.test(e.loc)) queue.push(e.loc); continue; }
      if (/\/event\/[^/]+\/\d+\/?$/.test(new URL(e.loc).pathname)) events.set(e.loc, e.lastmod);
    }
  }
  return events;
}
function extractVar(html, name) {
  const m = html.match(new RegExp('\\bvar\\s+' + name + '\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"'));
  return m ? decode(m[1].replace(/\\(.)/g, '$1')) : '';
}
// The event's own JSON object. Pages carry several "var data = {...}" blocks
// (navigation widgets too), so take the first one that describes an event.
// Older templates call it "data", the newer one (Visit Howard County) "eventData".
function extractEventObject(html) {
  const re = /\bvar\s+(eventData|data)\s*=\s*\{/g; let m;
  while ((m = re.exec(html))) {
    const s = html.indexOf('{', m.index); let depth = 0, inStr = false, esc = false, obj = null;
    for (let k = s; k < html.length; k++) {
      const c = html[k];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true; else if (c === '{') depth++;
      else if (c === '}' && !--depth) { try { obj = JSON.parse(html.slice(s, k + 1)); } catch { /* not JSON */ } break; }
    }
    if (obj && (obj.recid || obj.recId) && obj.title) return obj;
  }
  return null;
}
// Newer template: <li data-name="dates"><span>Dates:</span><span>November 11, 2026</span></li>
function infoList(html) {
  const out = {};
  for (const m of html.matchAll(/<li[^>]*\bdata-name="([\w-]+)"[^>]*>([\s\S]*?)<\/li>/g))
    out[m[1]] ??= textOf(m[2]).replace(/^[A-Z][\w ]{0,20}:\s*/, '');
  return out;
}
// Occurrence dates the page states. Returns {dates, kind} where kind explains
// how they were read; an empty list means the page gave no usable date.
export function simpleviewDates(datesVar, startVar, endVar) {
  const list = String(datesVar || '').trim();
  if (list) {
    const range = list.split(/\s+-\s+/);
    if (range.length === 2) {
      const a = parseUSDate(range[0]), b = parseUSDate(range[1]);
      // A span of more than three days with no daily schedule does not say
      // which days the event actually runs; the widget rejects those too.
      if (a && b && b >= a) return daysBetween(a, b) > 3 ? {dates: [], kind: 'long-range'} : {dates: rangeDates(a, b), kind: 'range'};
    }
    const many = list.split(/\s*,\s*(?=\d{1,2}\/|[A-Z][a-z]+\s+\d)/).map(parseUSDate).filter(Boolean);
    if (many.length) return {dates: [...new Set(many)].sort(), kind: many.length > 1 ? 'list' : 'single'};
  }
  // No date list: the page shows the next (or only) occurrence.
  const a = parseUSDate(startVar);
  if (!a) return {dates: [], kind: 'none'};
  const b = parseUSDate(endVar) || a;
  return {dates: [a], kind: b > a ? 'next-of-range' : 'next'};
}
export function parseSimpleviewPage(html, url, src) {
  const data = extractEventObject(html) || {};
  if (data.expired === true || data.past === true) return {skip: 'expired'};
  const li = infoList(html);
  const title = decode(data.title || (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
  const startVar = extractVar(html, 'startDate'), endVar = extractVar(html, 'endDate');
  const {dates, kind} = simpleviewDates(extractVar(html, 'dates') || li.dates || '', startVar, endVar);
  const tr = parseTimeRange(extractVar(html, 'time') || li.time || '');
  const time = tr.start || parseClock(startVar), endTime = tr.end || parseClock(endVar);
  const liAddress = (li.address || '').match(/^(.*?),\s*([^,]+,\s*[A-Z]{2}\b.*)$/);
  const cityStateZip = extractVar(html, 'cityStateZip') || (liAddress ? liAddress[2] : '');
  const street = extractVar(html, 'streetAddress') || (liAddress ? liAddress[1] : '');
  const csz = cityStateZip.match(/^(.*?),\s*([A-Z]{2})\b/);
  return {
    source: src.name, siteCounty: src.county, title, url,
    dates, dateKind: kind, time, endTime: endTime && endTime > time ? endTime : '',
    venue: decode(data.location || li.location || '').trim(),
    address: [street, cityStateZip].filter(Boolean).join(', '),
    city: decode(data.city || (csz ? csz[1] : '')).trim(),
    state: csz ? csz[2] : src.state,
    lat: Number(data.latitude) || null, lng: Number(data.longitude) || null,
    description: textOf(data.description).slice(0, 2000),
    categories: (data.categories || []).map(c => decode(c.catName || '')).filter(Boolean).join(', '),
    recurrence: decode(data.recurrence || '').trim(),
    admission: decode(data.admission || '').trim(),
  };
}
function needsRefetch(entry, lastmod, today) {
  if (!entry) return true;
  if (lastmod && entry.lastmod !== lastmod) return true;
  if (Date.now() - entry.fetched > REFRESH_DAYS * 864e5) return true;
  // "Next occurrence" pages move forward without a sitemap change.
  const r = entry.record;
  if (r && /^next/.test(r.dateKind) && r.recurrence && r.dates.every(d => d < today)) return true;
  return false;
}
async function collectSimpleview(src, cache, today, windowEnd) {
  const report = {source: src.name, kind: 'simpleview', status: 'ok', sitemapEvents: 0, opened: 0, cached: 0, refused: 0, errors: 0, robotsSkipped: 0, inWindow: 0, pending: 0, note: ''};
  const site = new Site(src.host); await site.init();
  const store = cache[src.host] ||= {};
  let urls;
  try { urls = await simpleviewEventURLs(site); } catch (e) {
    report.status = e.refused ? 'blocked' : 'failed'; report.note = 'Sitemap: ' + e.message; return {report, records: []};
  }
  report.sitemapEvents = urls.size;
  for (const key of Object.keys(store)) if (!urls.has(key)) delete store[key];   // removed from the site
  // Pages never seen first, then the oldest fetches.
  const todo = [...urls].filter(([u, lm]) => needsRefetch(store[u], lm, today))
    .sort((a, b) => (store[a[0]]?.fetched || 0) - (store[b[0]]?.fetched || 0));
  let consecutiveRefusals = 0;
  for (const [url, lastmod] of todo) {
    if (report.opened >= MAX_PAGES_PER_SITE || overBudget()) { report.pending = todo.length - report.opened; break; }
    try {
      const html = await site.get(url);
      const rec = parseSimpleviewPage(html, url, src);
      store[url] = {lastmod, fetched: Date.now(), record: rec.skip ? null : rec};
      report.opened++; consecutiveRefusals = 0;
      if (report.opened % 50 === 0) console.log(`${src.name}: opened ${report.opened} of ${todo.length}`);
    } catch (e) {
      if (e.robots) { report.robotsSkipped++; store[url] = {lastmod, fetched: Date.now(), record: null}; continue; }
      if (e.status === 404 || e.status === 410) { delete store[url]; continue; }
      report.errors++;
      if (e.refused && ++consecutiveRefusals >= 5) { report.status = 'blocked'; report.note = 'Publisher refused event pages (HTTP 403); stopped. Not bypassed.'; break; }
    }
  }
  report.refused = site.refused;
  report.cached = Object.values(store).filter(x => x.record).length;
  const records = [];
  for (const {record} of Object.values(store)) {
    if (!record) continue;
    const inWin = record.dates.filter(d => d >= today && d <= windowEnd);
    if (!inWin.length) continue;
    records.push({...record, dates: inWin});
  }
  report.inWindow = records.length;
  if (report.status === 'ok' && report.pending) report.status = 'partial';
  if (report.pending) report.note ||= `${report.pending} event pages still to open; later runs continue from the cache.`;
  return {report, records};
}

/* ---------- Montgomery Parks ---------- */

// Montgomery Parks' calendar feed (admin-ajax.php) is disallowed by its
// robots.txt, so the collector uses its public events sitemaps and event pages
// instead. Each page states "Time:" (date or date range, clock range) and
// "Location:" (venue, street, town).
export function parseMontgomeryParksPage(html, url, src) {
  const block = (cls) => (html.match(new RegExp('<div class="' + cls + '">([\\s\\S]*?)<\\/div>')) || [])[1] || '';
  const dateText = textOf(block('date')), timeText = textOf(block('time'));
  const title = textOf((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
  if (!title || !dateText) return {skip: 'no schedule'};
  const parts = dateText.split(/\s+-\s+/);
  const a = parseUSDate(parts[0]), b = parts[1] ? parseUSDate(parts[1]) : a;
  let dates = [], kind = 'none';
  if (a && b && b >= a) {
    if (daysBetween(a, b) > 3) kind = 'long-range';
    else { dates = rangeDates(a, b); kind = a === b ? 'single' : 'range'; }
  }
  const tr = parseTimeRange(timeText);
  const locHTML = (html.match(/<strong>Location:<\/strong>[\s\S]*?<\/div>\s*([\s\S]*?)<\/div>\s*<\/div>/) || [])[1] || '';
  // Some pages give only the park name, with no address paragraph after it.
  const venue = textOf((locHTML.match(/<div>([\s\S]*?)(?:<\/div>|<p>|$)/) || [])[1] || '');
  const addr = textOf(((locHTML.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || '').replace(/<br\s*\/?>/gi, ', '));
  const csz = addr.match(/,\s*([^,]+),\s*(MD|DC|VA)\b/);
  const og = (html.match(/property="og:description" content="([^"]*)"/) || [])[1] || '';
  return {
    source: src.name, siteCounty: src.county, title, url, dates, dateKind: kind,
    time: tr.start, endTime: tr.end, venue, address: addr.replace(/\s*,\s*,/g, ','),
    city: csz ? csz[1].trim() : '', state: csz ? csz[2] : 'MD', lat: null, lng: null,
    description: decode(og).slice(0, 2000), categories: '', recurrence: '', admission: '',
  };
}
async function collectMontgomeryParks(cache, today, windowEnd) {
  const src = MONTGOMERY_PARKS;
  const report = {source: src.name, kind: 'sitemap+pages', status: 'ok', sitemapEvents: 0, opened: 0, cached: 0, refused: 0, errors: 0, inWindow: 0, pending: 0, note: ''};
  const site = new Site(src.host); await site.init();
  const store = cache[src.host] ||= {};
  const urls = new Map();
  try {
    const index = await site.get(`https://${src.host}/sitemap_index.xml`);
    for (const sm of sitemapEntries(index).filter(e => /\/events-sitemap\d*\.xml$/.test(e.loc))) {
      for (const e of sitemapEntries(await site.get(sm.loc)))
        if (/\/events\/[^/]+\/?$/.test(new URL(e.loc).pathname)) urls.set(e.loc, e.lastmod);
    }
  } catch (e) {
    report.status = e.refused ? 'blocked' : 'failed'; report.note = 'Sitemap: ' + e.message; return {report, records: []};
  }
  report.sitemapEvents = urls.size;
  for (const key of Object.keys(store)) if (!urls.has(key)) delete store[key];
  // An event page's own dates never move, so unchanged pages are not re-opened
  // until the weekly refresh.
  const todo = [...urls].filter(([u, lm]) => !store[u] || (lm && store[u].lastmod !== lm) || Date.now() - store[u].fetched > REFRESH_DAYS * 864e5 ||
      (store[u].record && !store[u].record.venue))   // re-read pages an older parser left without a venue
    .sort((x, y) => (store[x[0]]?.fetched || 0) - (store[y[0]]?.fetched || 0));
  let consecutiveRefusals = 0;
  for (const [url, lastmod] of todo) {
    if (report.opened >= MAX_PAGES_PER_SITE || overBudget()) { report.pending = todo.length - report.opened; break; }
    try {
      const rec = parseMontgomeryParksPage(await site.get(url), url, src);
      store[url] = {lastmod, fetched: Date.now(), record: rec.skip ? null : rec};
      report.opened++; consecutiveRefusals = 0;
      if (report.opened % 50 === 0) console.log(`${src.name}: opened ${report.opened} of ${todo.length}`);
    } catch (e) {
      if (e.robots) { store[url] = {lastmod, fetched: Date.now(), record: null}; continue; }
      if (e.status === 404 || e.status === 410) { delete store[url]; continue; }
      report.errors++;
      if (e.refused && ++consecutiveRefusals >= 5) { report.status = 'blocked'; report.note = 'Publisher refused event pages (HTTP 403); stopped. Not bypassed.'; break; }
    }
  }
  report.refused = site.refused;
  report.cached = Object.values(store).filter(x => x.record).length;
  const records = Object.values(store).filter(x => x.record)
    .map(({record}) => ({...record, dates: record.dates.filter(d => d >= today && d <= windowEnd)})).filter(r => r.dates.length);
  report.inWindow = records.length;
  if (report.status === 'ok' && report.pending) { report.status = 'partial'; report.note = `${report.pending} event pages still to open; later runs continue from the cache.`; }
  return {report, records};
}

/* ---------- main ---------- */

/* ---------- FindLocal ---------- */

export async function collectFindLocal(cache, today, windowEnd) {
  const report = {source: 'FindLocal', kind: 'api', status: 'ok', calls: 0, remaining: null, listings: 0, inWindow: 0, skipped: 0, note: ''};
  const month = today.slice(0, 7);
  // The budget record is per month and per key, so a new key starts fresh.
  const keyId = FINDLOCAL.key.slice(-4);
  const budget = cache.__findlocal && cache.__findlocal.month === month && cache.__findlocal.keyId === keyId ? cache.__findlocal : (cache.__findlocal = {month, keyId, calls: 0, remaining: null});
  const state = cache.__findlocalState ||= {lastFetch: '', callsPerRefresh: 1};
  // A changed request (radius, categories) is fetched at once, not on schedule.
  const query = FINDLOCAL.near + '|' + FINDLOCAL.radiusKm + '|' + FINDLOCAL.categories;
  if (state.query !== query) { state.lastFetch = ''; state.query = query; }
  // Refresh as often as the quota allows: with 3 calls per refresh (100-row
  // pages), every 2 days; with 1 call (500-row pages), daily. Each refresh
  // covers the widget's 7 days plus the days until the next refresh.
  const everyDays = Math.max(1, Math.ceil(state.callsPerRefresh * 31 / FINDLOCAL.monthlyTarget));
  if (state.lastFetch && daysBetween(state.lastFetch, today) < everyDays && keyId === state.keyId) {
    report.status = 'reused'; report.note = `Refreshed ${state.lastFetch}; next refresh in ${everyDays - daysBetween(state.lastFetch, today)} day(s) to stay within the monthly quota.`;
    return {report, records: []};
  }
  if (budget.remaining !== null && budget.remaining <= FINDLOCAL.keepInReserve) {
    report.status = 'skipped'; report.note = `Monthly quota nearly spent (${budget.remaining} calls left); waiting for the 1st.`;
    return {report, records: []};
  }
  windowEnd = addDays(today, 7 + everyDays);
  const limit = FINDLOCAL.pageSize(today);
  const rows = [];
  for (let page = 1; page <= FINDLOCAL.maxCallsPerRun; page++) {
    const params = new URLSearchParams({near: FINDLOCAL.near, radius_km: String(FINDLOCAL.radiusKm), date_from: today, date_to: windowEnd,
      limit: String(limit), page: String(page)});
    if (FINDLOCAL.categories) params.set('cat', FINDLOCAL.categories);
    const res = await fetch('https://findlocal.community/api/events?' + params, {
      headers: {Authorization: 'Bearer ' + FINDLOCAL.key, 'user-agent': UA, accept: 'application/json'},
      signal: AbortSignal.timeout(30000),
    });
    report.calls++; budget.calls++;
    const left = parseInt(res.headers.get('x-ratelimit-remaining'), 10);
    if (Number.isFinite(left)) budget.remaining = report.remaining = left;
    let body = null; try { body = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) {
      report.status = 'failed';
      report.note = `HTTP ${res.status}` + (body && body.error ? `: ${body.error}` : '');
      if (res.status === 429) budget.remaining = 0;
      break;
    }
    const data = Array.isArray(body && body.data) ? body.data : [];
    rows.push(...data);
    const total = Number(body && body.meta && body.meta.total) || 0;
    if (page === 1 && total) state.callsPerRefresh = Math.min(FINDLOCAL.maxCallsPerRun, Math.ceil(total / limit));
    if (!data.length || rows.length >= total) break;
    if (budget.remaining !== null && budget.remaining <= FINDLOCAL.keepInReserve) { report.note = 'Stopped early to keep the monthly reserve. '; break; }
  }
  if (report.status === 'ok') { state.lastFetch = today; state.keyId = keyId; }
  report.listings = rows.length;
  const records = [];
  for (const e of rows) {
    if (e.is_deleted || /cancel|postpon/i.test(e.status || '')) { report.skipped++; continue; }
    if (FINDLOCAL.indoorVenueTypes.test(e.venue_type || '')) { report.indoorVenue = (report.indoorVenue || 0) + 1; continue; }
    const start = e.event_date, end = e.end_date || e.event_date;
    if (!/^\d{4}-\d\d-\d\d$/.test(start || '')) { report.skipped++; continue; }
    if (daysBetween(start, end) > 3) { report.skipped++; continue; }   // a long run with no daily schedule
    const dates = rangeDates(start, end).filter(d => d >= today && d <= windowEnd);
    const url = e.detail_page_url || e.ticket_page_url || e.venue_url;
    const where = String(e.venue_address || '').match(/,\s*([^,]+?),\s*(DC|MD|VA)\b/);
    if (!dates.length || !url || !where) { report.skipped++; continue; }
    // A 90 km circle reaches Baltimore city, which is outside the coverage area.
    if (/^baltimore$/i.test(where[1].trim())) { report.skipped++; continue; }
    const types = Array.isArray(e.event_types) ? e.event_types : [];
    records.push({
      source: 'FindLocal', siteCounty: '', title: decode(e.title || '').trim(), url,
      dates, dateKind: start === end ? 'single' : 'range',
      time: e.start_time && e.start_time !== '00:00' ? e.start_time : '', endTime: e.end_time || '',
      venue: decode(e.venue_name || '').trim(), address: decode(e.venue_address || '').trim(),
      city: where[1].trim(), state: where[2], lat: e.venue_lat ?? null, lng: e.venue_lng ?? null,
      description: textOf(e.description).slice(0, 1200),
      categories: [e.category, ...types].filter(Boolean).join(', '),
      recurrence: '', admission: e.price || '',
      outdoorHint: e.venue_type === 'Park & Outdoors' ? 'a Park & Outdoors venue' : types.includes('outdoor_activity') ? 'an outdoor activity' : '',
    });
  }
  report.inWindow = records.length;
  if (report.status === 'ok' && report.remaining !== null) report.note += `${report.calls} call(s) used; ${report.remaining} left this month; next refresh in ${Math.max(1, Math.ceil(state.callsPerRefresh * 31 / FINDLOCAL.monthlyTarget))} day(s).`;
  return {report, records};
}

async function main() {
  await mkdir(DATA_DIR, {recursive: true});
  let cache = {};
  try { cache = JSON.parse(await readFile(CACHE_FILE, 'utf8')); } catch { /* first run */ }
  let previous = {events: []};
  try { previous = JSON.parse(await readFile(OUT_FILE, 'utf8')); } catch { /* first run */ }
  const today = todayISO(), windowEnd = addDays(today, WINDOW_DAYS - 1);
  const results = await Promise.all([
    ...SIMPLEVIEW.map(src => collectSimpleview(src, cache, today, windowEnd).catch(e => ({report: {source: src.name, status: 'failed', note: e.message}, records: []}))),
    collectMontgomeryParks(cache, today, windowEnd).catch(e => ({report: {source: MONTGOMERY_PARKS.name, status: 'failed', note: e.message}, records: []})),
    collectFindLocal(cache, today, windowEnd).catch(e => ({report: {source: 'FindLocal', status: 'failed', note: e.message}, records: []})),
  ]);
  // A source that could not be read this run keeps its previous records (still
  // in the window), so one bad run does not empty the widget's extra coverage.
  for (const r of results) {
    if (r.records.length || !['failed', 'blocked', 'reused', 'skipped'].includes(r.report.status)) continue;
    const kept = (previous.events || []).filter(e => e.source === r.report.source)
      .map(e => ({...e, dates: (e.dates || []).filter(d => d >= today)})).filter(e => e.dates.length);
    if (kept.length) { r.records = kept; r.report.keptPrevious = kept.length; r.report.inWindow = kept.length; }
  }
  const events = results.flatMap(r => r.records).sort((a, b) => a.dates[0].localeCompare(b.dates[0]) || a.title.localeCompare(b.title));
  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    window: {start: today, end: windowEnd},
    sources: results.map(r => r.report),
    count: events.length,
    events,
    // collector/screen.mjs replaces this after it runs; carried over meanwhile.
    ...(previous.screened ? {screened: previous.screened} : {}),
  };
  await writeFile(OUT_FILE, JSON.stringify(out, null, 1) + '\n');
  await writeFile(CACHE_FILE, JSON.stringify(cache) + '\n');
  for (const r of out.sources) console.log(`${r.source}: ${r.status}` + (r.inWindow != null ? ` · ${r.inWindow} in window` : '') + (r.opened != null ? ` · opened ${r.opened}, cached ${r.cached}, sitemap ${r.sitemapEvents}` : '') + (r.note ? ` · ${r.note}` : ''));
  console.log(`${events.length} events written in ${Math.round((Date.now() - started) / 1000)} s`);
}


/* ---------- quick probe: node collect.mjs --probe ---------- */

async function probe() {
  const today = todayISO();
  const line = (name, msg) => console.log(`${name}: ${msg}`);
  await Promise.all([...SIMPLEVIEW.map(async src => {
    try {
      const site = new Site(src.host); await site.init();
      const urls = [...(await simpleviewEventURLs(site)).keys()];
      if (!urls.length) return line(src.name, 'sitemap read, but no event pages listed');
      const html = await site.get(urls[Math.floor(urls.length / 2)]);
      const rec = parseSimpleviewPage(html, urls[0], src);
      line(src.name, `OK: sitemap lists ${urls.length} event pages; sample page parsed: ${rec.skip ? 'expired listing' : JSON.stringify({title: rec.title, dates: rec.dates.slice(0, 3), time: rec.time, venue: rec.venue})}; crawl delay ${site.delay / 1000}s`);
    } catch (e) { line(src.name, 'FAILED: ' + e.message); }
  }), (async () => {
    try {
      const site = new Site(MONTGOMERY_PARKS.host); await site.init();
      const index = await site.get(`https://${MONTGOMERY_PARKS.host}/sitemap_index.xml`);
      const sm = sitemapEntries(index).find(e => /\/events-sitemap\d*\.xml$/.test(e.loc));
      const pages = sitemapEntries(await site.get(sm.loc)).filter(e => /\/events\/[^/]+\/?$/.test(new URL(e.loc).pathname));
      const rec = parseMontgomeryParksPage(await site.get(pages[pages.length - 1].loc), pages[0].loc, MONTGOMERY_PARKS);
      line(MONTGOMERY_PARKS.name, `OK: first events sitemap lists ${pages.length} pages; sample: ${JSON.stringify({title: rec.title, dates: rec.dates, time: rec.time, venue: rec.venue, city: rec.city, skip: rec.skip})}`);
    } catch (e) { line(MONTGOMERY_PARKS.name, 'FAILED: ' + e.message); }
  })()]);
}

if (import.meta.url === `file://${process.argv[1]}`) (process.argv.includes('--probe') ? probe() : main()).catch(e => { console.error(e); process.exit(1); });
