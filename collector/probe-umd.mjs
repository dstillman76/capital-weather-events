const page = await (await fetch('https://calendar.umd.edu/')).text();
const token = (page.match(/data-token=["']?([A-Za-z0-9_-]{16,})/) || [])[1];
const post = async q => { const r = await fetch('https://calendar.umd.edu/graphql', {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + token}, body: JSON.stringify({query: q})}); return r.json(); };
for (const f of ['marylandDayEventsEntries', 'homecomingEventsEntries']) {
  const r = await post(`{ ${f}(limit: 3) { __typename title url postDate } c: ${f.replace('Entries', 'Entries')}(limit: 1000) { id } }`);
  console.log('::notice::' + f + ' ' + JSON.stringify(r).slice(0, 600) + ' count=' + (r.data?.c?.length));
  const t = r.data?.[f]?.[0]?.__typename;
  if (t) { const s = await post(`{ __type(name: "${t}") { fields { name type { name kind ofType { name } } } } }`); console.log('::notice::' + t + ' fields ' + s.data.__type.fields.map(x => x.name + ':' + (x.type.name || x.type.ofType?.name)).join(', ').slice(0, 2500)); }
}
