// Third collector step: give a map position (and town, when missing) to events
// that have a street address but no coordinates, so the hourly forecast can be
// shown for the event's own location ("1770 Tucker Road, Prince George's
// County" → Fort Washington). Uses the U.S. Census Bureau's free geocoder and
// keeps only a match in the event's own county; results are cached.

import {readFile, writeFile} from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const OUT_FILE = new URL('collector/data/events.json', ROOT);
const CACHE_FILE = new URL('collector/data/cache.json', ROOT);
const UA = 'CapitalWeatherEventsCollector/1.0 (+https://www.capitalweather.com; outdoor events listing)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();

export function streetOf(address) {
  const a = String(address || '').replace(/\s+/g, ' ').trim();
  const m = a.match(/^(\d{1,6}[A-Za-z]?\s+[^,]{3,60}?)(?:,|$)/);
  return m ? m[1].trim() : '';
}

async function geocode(street, state) {
  const u = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=' +
    encodeURIComponent(street + ', ' + state) + '&benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=json';
  const r = await fetch(u, {headers: {'user-agent': UA}, signal: AbortSignal.timeout(12000)});
  if (!r.ok) throw Error('HTTP ' + r.status);
  const j = await r.json();
  return (j.result?.addressMatches || []).map(m => ({
    lat: m.coordinates?.y, lng: m.coordinates?.x,
    city: m.addressComponents?.city || '', zip: m.addressComponents?.zip || '',
    county: m.geographies?.Counties?.[0]?.NAME || '',
  }));
}
const titleCase = s => String(s).toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

async function main() {
  const out = JSON.parse(await readFile(OUT_FILE, 'utf8'));
  let cache = {};
  try { cache = JSON.parse(await readFile(CACHE_FILE, 'utf8')); } catch { /* none yet */ }
  const geo = cache.__geocode ||= {};
  const lists = [out.events || [], out.screened?.events || []];
  const started = Date.now();
  let looked = 0, filled = 0, failed = 0;
  const keyOf = e => {
    if (Number.isFinite(e.lat) && e.lat && Number.isFinite(e.lng) && e.lng) return null;
    const state = String(e.state || '').toUpperCase();
    if (!['MD', 'VA', 'DC'].includes(state)) return null;
    const street = streetOf(e.address) || streetOf(e.venue);
    if (!street) return null;
    const county = e.county || e.siteCounty || '';
    return {key: norm(street) + '|' + state + '|' + norm(county), street, state, county};
  };
  // Unique new addresses, looked up four at a time, at most four minutes a run.
  const todo = new Map();
  for (const list of lists) for (const e of list) { const k = keyOf(e); if (k && !(k.key in geo) && !todo.has(k.key)) todo.set(k.key, k); }
  const queue = [...todo.values()].slice(0, 120);
  const worker = async () => {
    while (queue.length && Date.now() - started < 4 * 60e3) {
      const {key, street, state, county} = queue.shift();
      looked++;
      try {
        const matches = await geocode(street, state);
        // The same street name exists in many counties: keep a match in the
        // event's county, or the only match when the county isn't known.
        const want = norm(county).replace(/ county$| city$/, '');
        const hit = want ? matches.find(m => norm(m.county).replace(/ county$| city$/, '') === want) : (matches.length === 1 ? matches[0] : null);
        geo[key] = hit ? {lat: hit.lat, lng: hit.lng, city: titleCase(hit.city)} : null;
      } catch { failed++; }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  for (const [li, list] of lists.entries()) for (const e of list) {
    const k = keyOf(e); if (!k) continue;
    const g = geo[k.key];
    if (!g) continue;
    e.lat = g.lat; e.lng = g.lng;
    // A raw record with no county of its own keeps its blank town, so the
    // widget's coverage check isn't decided by a town name it may not know.
    if (!e.city && g.city && (li === 1 || e.siteCounty)) e.city = g.city;
    e.geocoded = 'U.S. Census geocoder';
    filled++;
  }
  await writeFile(OUT_FILE, JSON.stringify(out, null, 1) + '\n');
  await writeFile(CACHE_FILE, JSON.stringify(cache) + '\n');
  console.log(`Geocoder: ${looked} new lookups, ${filled} events placed, ${failed} failures.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(0); });
