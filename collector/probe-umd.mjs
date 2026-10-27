// One-off check of the UMD calendar feed (run by the probe workflow).
const page = await (await fetch('https://calendar.umd.edu/')).text();
const token = (page.match(/data-token=["']?([A-Za-z0-9_-]{16,})/) || [])[1];
const qs = [
  '{ __typename }',
  '{ solspace_calendar { calendars { handle name } } }',
  '{ solspace_calendar { events(limit: 3) { title startDate } } }',
  '{ entries(limit: 3) { title sectionHandle typeHandle url } }',
];
for (const q of qs) {
  for (const auth of [true, false]) {
    const r = await fetch('https://calendar.umd.edu/graphql', {method: 'POST', headers: {'content-type': 'application/json', ...(auth ? {authorization: 'Bearer ' + token} : {})}, body: JSON.stringify({query: q})});
    console.log('::notice::' + (auth ? 'auth ' : 'noauth ') + q.slice(0, 50) + ' => ' + r.status + ' ' + (await r.text()).slice(0, 500).replace(/\n/g, ' '));
  }
}
