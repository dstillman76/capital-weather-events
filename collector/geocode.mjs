// Third collector step: give a map position (and town, when missing) to events
// that have a street address but no coordinates, so the hourly forecast can be
// shown for the event's own location ("1770 Tucker Road, Prince George's
// County" → Fort Washington). Uses OpenStreetMap's Nominatim (one request a second) and
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

const STATE_NAME = {MD: 'Maryland', VA: 'Virginia', DC: 'District of Columbia'};
// OpenStreetMap's Nominatim (the same service the page's forecast module uses),
// queried with the street, county and state; at most one request a second.
async function geocode(street, state, county) {
  const p = new URLSearchParams({format: 'jsonv2', addressdetails: '1', countrycodes: 'us', limit: '3', street, state: STATE_NAME[state] || state});
  if (county && state !== 'DC') p.set('county', county.replace(/[’]/g, "'"));
  const r = await fetch('https://nominatim.openstreetmap.org/search?' + p, {headers: {'user-agent': UA, 'accept-language': 'en-US'}, signal: AbortSignal.timeout(20000)});
  if (!r.ok) throw Error('HTTP ' + r.status);
  return (await r.json()).map(m => ({
    lat: Number(m.lat), lng: Number(m.lon),
    city: m.address?.city || m.address?.town || m.address?.village || m.address?.hamlet || m.address?.suburb || '',
    county: m.address?.county || (state === 'DC' ? 'District of Columbia' : ''),
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
  // Unique new addresses, one a second, at most four minutes a run.
  const todo = new Map();
  for (const list of lists) for (const e of list) { const k = keyOf(e); if (k && !(k.key in geo) && !todo.has(k.key)) todo.set(k.key, k); }
  const queue = [...todo.values()].slice(0, 120);
  const worker = async () => {
    while (queue.length && Date.now() - started < 4 * 60e3) {
      const {key, street, state, county} = queue.shift();
      looked++;
      try {
        const matches = await geocode(street, state, county);
        await sleep(1100);
        // The same street name exists in many counties: keep a match in the
        // event's county, or the only match when the county isn't known.
        const want = norm(county).replace(/ county$| city$/, '');
        const hit = want ? matches.find(m => norm(m.county).replace(/ county$| city$/, '') === want) : (matches.length === 1 ? matches[0] : null);
        geo[key] = hit ? {lat: hit.lat, lng: hit.lng, city: titleCase(hit.city)} : null;
      } catch { failed++; }
    }
  };
  await worker();   // one at a time: Nominatim's usage policy
  for (const [li, list] of lists.entries()) for (const e of list) {
    const k = keyOf(e); if (!k) continue;
    const g = geo[k.key];
    if (!g) continue;
    e.lat = g.lat; e.lng = g.lng;
    // A raw record with no county of its own keeps its blank town, so the
    // widget's coverage check isn't decided by a town name it may not know.
    if (!e.city && g.city && (li === 1 || e.siteCounty)) e.city = g.city;
    e.geocoded = 'OpenStreetMap Nominatim';
    filled++;
  }
  await writeFile(OUT_FILE, JSON.stringify(out, null, 1) + '\n');
  await writeFile(CACHE_FILE, JSON.stringify(cache) + '\n');
  console.log(`::notice::Geocoder: ${looked} new lookups, ${filled} events placed, ${failed} failures.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(0); });
