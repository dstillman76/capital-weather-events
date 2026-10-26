import assert from 'node:assert/strict';
globalThis.fetch=async()=>({ok:true,text:async()=>`User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nCrawl-delay: 3\n\nUser-agent: Bingbot\nDisallow: /x`});
const m=await import('../collect.mjs');
const r=await m.robotsFor('a.test');
assert.deepEqual(r,{allow:['/wp-admin/admin-ajax.php'],disallow:['/wp-admin/'],delay:3});
assert.equal(m.allowedBy(r,'/wp-admin/admin-ajax.php'),true);
assert.equal(m.allowedBy(r,'/wp-admin/x'),false);
assert.equal(m.allowedBy(r,'/event/a/1/'),true);
console.log('robots ok');
