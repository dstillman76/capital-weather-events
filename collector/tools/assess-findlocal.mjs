// One-off assessment (manual workflow): pulls FindLocal's current listings for
// the area so they can be compared with what the daily collector already has.
// Does not touch the collector's data or cache files.
import {writeFile, mkdir} from 'node:fs/promises';
const KEY = process.env.FINDLOCAL_API_KEY || '3k8TJ8RBxCC81EpnJKUKha';
const UA = 'CapitalWeatherEventsCollector/1.0 (+https://github.com/dstillman76/capital-weather-events)';
const iso = d => d.toISOString().slice(0, 10);
const tz = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York'}).format(new Date());
const from = tz, to = iso(new Date(Date.parse(tz) + 9 * 864e5));
let callsLeft = null;
async function get(path, params) {
  const url = 'https://findlocal.community' + path + '?' + new URLSearchParams(params);
  const res = await fetch(url, {headers: {'X-API-Key': KEY, Authorization: 'Bearer ' + KEY, 'user-agent': UA, accept: 'application/json'}, signal: AbortSignal.timeout(40000)});
  const left = res.headers.get('x-ratelimit-remaining'); if (left) callsLeft = left;
  const body = await res.json().catch(() => null);
  console.log(res.status, url, 'rows', body?.data?.length, 'meta', JSON.stringify(body?.meta || {}).slice(0, 300));
  if (!res.ok) throw Error('HTTP ' + res.status + ' ' + JSON.stringify(body).slice(0, 200));
  return body;
}
async function all(params, maxPages = 8) {
  const rows = []; let meta = null;
  for (let page = 1; page <= maxPages; page++) {
    const b = await get('/api/events', {...params, limit: '500', page: String(page)});
    rows.push(...(b.data || [])); meta = b.meta;
    if (!b.meta?.has_more && !(b.meta?.total > rows.length)) break;
    if (!(b.data || []).length) break;
  }
  return {meta, rows};
}
const out = {from, to, runAt: new Date().toISOString()};
out.current60 = await all({near: '38.9072,-77.0369', radius_km: '60', date_from: from, date_to: to});
out.wide120 = await all({near: '38.9,-77.03', radius_km: '120', date_from: from, date_to: to});
try { out.parkVenues = await get('/api/venues', {city: 'washington', type: 'Park & Outdoors', sort: 'upcoming', limit: '500'}); } catch (e) { out.parkVenuesError = e.message; }
out.callsLeft = callsLeft;
await mkdir('assess', {recursive: true});
await writeFile('assess/findlocal.json', JSON.stringify(out));
console.log('calls left this month:', callsLeft, '| 60 km rows:', out.current60.rows.length, '| 120 km rows:', out.wide120.rows.length);
