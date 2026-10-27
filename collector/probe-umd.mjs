const page = await (await fetch('https://calendar.umd.edu/')).text();
const token = (page.match(/data-token=["']?([A-Za-z0-9_-]{16,})/) || [])[1];
const post = async q => { const r = await fetch('https://calendar.umd.edu/graphql', {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + token}, body: JSON.stringify({query: q})}); return r.json(); };
const f = (await post('{ __schema { queryType { fields { name } } } }')).data.__schema.queryType.fields.map(x => x.name);
for (let i = 0; i < f.length; i += 25) console.log('::notice::fields ' + f.slice(i, i + 25).join(','));
