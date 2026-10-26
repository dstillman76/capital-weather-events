import assert from 'node:assert/strict';
import {parseParktakesPage, parsePatchCalendar} from '../collect.mjs';

const pt = `<span>page 1 Of 6</span><h2 class="FindTour page_title" title="Bird Walk With a Naturalist">Bird Walk With a Naturalist </h2> <div class="description"> <p>(6-Adult) Use your eyes and ears to identify native birds.</p> <div class="spacer15"></div> </div>
<table><tbody><tr class=""> <td data-label="Session">UP9.Z2OZ</td> <td data-label="Place">Frying Pan Farm Park</td> <td data-label="Schedule" data-wg-notranslate="manual"> 10/30/2026 - 10/30/2026 Fri : 5:00 PM - 6:00 PM </td> <td data-label="Select"> <a href="Details.aspx?session_id=593392&back_url=x">Sign Up!</a></td></tr>
<tr class=""> <td data-label="Place">Lake Accotink Park</td> <td data-label="Schedule"> 01/12/2027 - 02/02/2027 Tue : 10:00 AM - 11:25 AM </td><td><a href="Details.aspx?session_id=1">x</a></td></tr></tbody></table>
<a href="javascript:__doPostBack('ctl01$mainContent$bNext','')">Next</a>`;
const r = parseParktakesPage(pt);
assert.equal(r.pages, 6); assert.equal(r.hasNext, true);
assert.equal(r.activities[0].title, 'Bird Walk With a Naturalist');
assert.deepEqual(r.activities[0].sessions[0], {id: '593392', place: 'Frying Pan Farm Park', start: '2026-10-30', end: '2026-10-30', time: '17:00', endTime: '18:00'});
assert.equal(r.activities[0].sessions[1].end, '2027-02-02');

const nd = {props: {pageProps: {mainContent: {allEvents: {'1793311200': [{id: 'a', type: 'event', status: 1, title: 'Trunk or Treat', canonicalUrl: '/maryland/gaithersburg/calendar/event/20261031/a/trunk', displayDate: '2026-10-31T21:00:00.000Z', address: {name: '', streetAddress: '119 N Frederick Ave', city: 'Gaithersburg', region: 'MD', latitude: 39.1, longitude: -77.2}, body: '<p>Candy in the lot</p>', patch: {county: {name: 'Montgomery County'}}, flags: {spamCount: 0}}]}}}}};
const ev = parsePatchCalendar(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nd)}</script>`, '2026-10-26', '2026-11-03');
assert.equal(ev.length, 1);
assert.equal(ev[0].dates[0], '2026-10-31'); assert.equal(ev[0].time, '17:00'); assert.equal(ev[0].city, 'Gaithersburg');
assert.equal(ev[0].url, 'https://patch.com/maryland/gaithersburg/calendar/event/20261031/a/trunk');
console.log('sources2 ok');
