const page = await (await fetch('https://calendar.umd.edu/')).text();
const token = (page.match(/data-token=["']?([A-Za-z0-9_-]{16,})/) || [])[1];
const post = async (q, extra = {}) => { const r = await fetch('https://calendar.umd.edu/graphql', {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + token, ...extra}, body: JSON.stringify({query: q})}); return r.status + ' ' + (await r.text()).slice(0, 900).replace(/\n/g, ' '); };
console.log('::notice::types ' + await post('{ __schema { queryType { fields { name } } } }'));
console.log('::notice::origin ' + await post('{ solspace_calendar { events(limit: 3) { title } } }', {origin: 'https://calendar.umd.edu', referer: 'https://calendar.umd.edu/'}));
console.log('::notice::recent ' + await post('{ entries(limit: 40, orderBy: "dateUpdated DESC") { title typeHandle sectionHandle } }'));
