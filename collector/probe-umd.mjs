// One-off check of the UMD calendar feed (run by the probe workflow).
const page = await (await fetch('https://calendar.umd.edu/')).text();
const token = (page.match(/data-token=["']?([A-Za-z0-9_-]{16,})/) || [])[1];
console.log('::notice::token found: ' + !!token);
for (const startDate of [new Date().toDateString(), new Date().toISOString().slice(0, 10)]) {
  const q = `query { entries: solspace_calendar { events(loadOccurrences: true, startsAfterOrAt: "${startDate}", limit: 5) { ... on communications_Event { id title url startDate } ... on submission_Event { id title url startDate } } } }`;
  const r = await fetch('https://calendar.umd.edu/graphql', {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + token}, body: JSON.stringify({query: q})});
  const t = await r.text();
  console.log('::notice::' + startDate + ' HTTP ' + r.status + ' ' + t.slice(0, 700).replace(/\n/g, ' '));
}
