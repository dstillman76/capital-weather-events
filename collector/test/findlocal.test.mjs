import assert from 'node:assert/strict';
const rows=[
 {title:"Self-Guided Trek n' Treat Trail",event_date:'2026-10-12',end_date:'2026-10-31',start_time:'00:00',end_time:null,category:'parks',event_types:[],venue_name:'Widewater State Park',venue_address:'101 Widewater Park Dr, Stafford, VA 22554',venue_type:'Park & Outdoors',detail_page_url:'https://x/1'},
 {title:'A BOOtanical Halloween Scavenger Hunt!',event_date:'2026-10-26',end_date:null,start_time:'10:00',end_time:null,category:'parks',event_types:['outdoor_activity'],venue_name:'Meadowlark Botanical Gardens',venue_address:'9750 Meadowlark Gardens Ct, Vienna, VA 22182',venue_type:'Park & Outdoors',venue_lat:38.9,venue_lng:-77.2,detail_page_url:'https://x/2',description:'10:00am - 6:00pm'},
 {title:'Bird Walk',event_date:'2026-10-27',start_time:'08:30',category:'parks',event_types:['nature_program'],venue_name:'Kenilworth',venue_address:'1550 Anacostia Avenue Northeast, Washington, DC 20019',venue_type:'Museum',detail_page_url:'https://x/3'},
 {title:'Cancelled thing',event_date:'2026-10-27',status:'cancelled',venue_address:'1 A St, Washington, DC 20001',detail_page_url:'https://x/4'},
 {title:'No address',event_date:'2026-10-27',venue_address:null,detail_page_url:'https://x/5'},
];
let calls=0;
globalThis.fetch=async(u,o)=>{calls++;assert.ok(o.headers.Authorization.startsWith('Bearer '));assert.match(String(u),/city=washington/);
 return {ok:true,status:200,headers:new Map([['x-ratelimit-remaining','57']]),json:async()=>({data:rows,meta:{total:rows.length}})}};
const {collectFindLocal}=await import('../collect.mjs');
const cache={};
const {report,records}=await collectFindLocal(cache,'2026-10-26','2026-11-03');
console.log(report);console.log(records.map(r=>[r.title,r.dates.join(','),r.time,r.city,r.state,r.outdoorHint].join(' | ')));
assert.equal(calls,1);assert.equal(records.length,2);assert.equal(records[0].outdoorHint,'a Park & Outdoors venue');assert.equal(records[1].city,'Washington');assert.equal(records[1].outdoorHint,'');
assert.equal(cache.__findlocal.remaining,57);
// budget guard
cache.__findlocal.remaining=5;const r2=await collectFindLocal(cache,'2026-10-26','2026-11-03');assert.equal(r2.report.status,'skipped');assert.equal(calls,1);
// quota error
cache.__findlocal={month:'2026-11',calls:0,remaining:null};
globalThis.fetch=async()=>({ok:false,status:429,headers:new Map([['x-ratelimit-remaining','0']]),json:async()=>({error:'Monthly quota exceeded.'})});
const r3=await collectFindLocal(cache,'2026-11-01','2026-11-09');assert.equal(r3.report.status,'failed');assert.match(r3.report.note,/429/);
console.log('findlocal ok');
