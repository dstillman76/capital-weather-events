// Deterministic Chromium tests against captured round-2 publisher responses.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const read=name=>fs.readFileSync(path.join(__dirname,'tests/fixtures/round2',name),'utf8');
const html=fs.readFileSync(path.join(__dirname,'capital-weather-events-scalable-browser-baseline.html'),'utf8');
const hooks='window.r2={state,days,ROUND2_SOURCES,loadVerifiedSources,loadRound2Source,parseNPSRound2,parseTribeRound2,parseFONARound2,round2OutdoorEvidence,dedupe,createEvent};';
const doc=html.replace(/load\(\)\.catch\(err=>\{[\s\S]*?\n\}\);/,hooks);
let passed=0;function check(name,test){test();passed++;console.log('PASS',name)}
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const p=await b.newPage({timezoneId:'America/New_York',viewport:{width:1280,height:900}});
 await p.clock.install({time:new Date('2026-10-25T16:00:00Z')});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.selected=[];window.addEventListener('cw:event-selected',e=>window.selected.push(e.detail))});
 let active=0,peak=0;const calls=[];
 await p.route('**/*',async r=>{
  const url=r.request().url();if(url==='https://capitalweather.com/__round2_fixture__')return r.fulfill({body:doc,contentType:'text/html; charset=utf-8'});
  calls.push(url);active++;peak=Math.max(peak,active);let file;
  try{
   const u=new URL(url);
   if(u.hostname==='home.nps.gov')file=u.searchParams.get('parkCode')==='nama'?'nps-mall.json':'nps-rocr.json';
   else if(u.hostname==='www.pgparks.com'){await new Promise(resolve=>setTimeout(resolve,350));file=u.searchParams.get('page')==='2'?'pg-api-page2.json':'pg-api.json'}
   else if(u.hostname==='www.fona.org')file='fona.json';
   else if(u.hostname==='www.bethesda.org')file='bethesda-api.json';
   else return r.abort();
   await r.fulfill({body:read(file),headers:{'access-control-allow-origin':'*','content-type':'application/json; charset=utf-8'}});
  }finally{active--}
 });
 await p.goto('https://capitalweather.com/__round2_fixture__');
 const baseline=JSON.parse(read('baseline-events.json'));
 await p.evaluate(baseline=>{r2.state.events=baseline;r2.state.reports=[];window.loaded=r2.loadVerifiedSources(r2.ROUND2_SOURCES)},baseline);
 await p.waitForFunction(()=>r2.state.events.some(e=>e.source==='NPS Rock Creek Park'));
 const early=await p.evaluate(()=>({pending:!r2.state.reports.find(r=>r.source==='M-NCPPC Prince George’s Parks')?.ms,cards:document.querySelectorAll('.cwe-card').length}));
 check('NPS renders while slower PG source is pending',()=>assert(early.pending&&early.cards>0));
 await p.evaluate(()=>window.loaded);
 const snapshot=await p.evaluate(()=>({events:r2.state.events,reports:r2.state.reports}));
 const added=snapshot.events.filter(e=>e.round2);
 check('Five round-2 discovery paths succeed',()=>assert.equal(snapshot.reports.filter(r=>r.ok).length,5));
 check('21 unique outdoor occurrences added after deduplication',()=>assert.equal(added.length,21));
 check('26 baseline occurrences remain after removing the known duplicate parade',()=>assert.equal(snapshot.events.filter(e=>!e.round2).length,26));
 check('Combined fixture widget has 47 unique occurrences',()=>assert.equal(snapshot.events.length,47));
 check('Per-source verified counts',()=>assert.deepEqual(Object.fromEntries(snapshot.reports.map(r=>[r.source,r.count])),{'NPS Rock Creek Park':10,'NPS National Mall':1,'M-NCPPC Prince George’s Parks':6,'National Arboretum (FONA)':3,'Bethesda Urban Partnership':1}));
 check('Each new occurrence has schedule, location and evidence',()=>assert(added.every(e=>e.date&&e.time&&e.endTime&&e.venue&&e.outdoorEvidence&&e.outdoorEvidenceURL&&e.url.startsWith('https://'))));
 check('No source proxy requests added',()=>assert(calls.length===6&&calls.every(x=>!x.includes('cors.dev')&&!x.includes('allorigins'))));
 check('Requests share the existing three-worker bound',()=>assert(peak<=3));
 const pg=added.filter(e=>e.source==='M-NCPPC Prince George’s Parks');
 check('PG named parks remain separate from outdoor classification',()=>assert(pg.every(e=>e.description&&e.venue)));
 check('PG same-title 17:00 and 18:00 sessions both survive',()=>assert.deepEqual(pg.filter(e=>e.title.includes('@ Watkins')).map(e=>e.time),['17:00','18:00']));
 check('Distinct sessions have distinct selection IDs',()=>assert.equal(new Set(added.map(e=>e.id)).size,added.length));
 check('Canceled NPS dates are rejected',()=>assert.equal(snapshot.reports.filter(r=>r.source.startsWith('NPS')).reduce((n,r)=>n+r.cancelled,0),7));
 check('Indoor mill and house tours rejected',()=>assert(!added.some(e=>/Ranger Tours at/.test(e.title))));
 check('Front-porch meeting point alone does not qualify a nature talk',()=>assert(!added.some(e=>e.title==='Fun with Flora and Fauna')));
 check('Ambiguous indoor/outdoor PG show excluded',()=>assert(!added.some(e=>e.title==='BEST Horse Show')));
 check('PG outdoor activity with missing venue is excluded',()=>assert(!added.some(e=>e.title.includes('Strength in Motion'))));
 check('Mixed toddler craft programs excluded',()=>assert(!added.some(e=>e.title.startsWith('Toddler Time'))));
 check('Inconsistent 90-minute prose versus one-hour schedule excluded',()=>assert(!added.some(e=>e.title.startsWith('The Unfinished America'))));
 const moon=added.filter(e=>/Full Moon/.test(e.title));
 check('FONA epoch and published Eastern clocks agree',()=>assert(moon.length===2&&moon.every(e=>e.date==='2026-10-25'&&e.time==='19:00'&&e.endTime==='21:00')));
 check('FONA feature description provides activity evidence for the 5K',()=>assert(added.some(e=>e.title==='Fall 5K & Festival'&&e.description.includes('fall foliage'))));
 check('Weather cancellation contingency retained',()=>assert(added.some(e=>e.title.startsWith('The Civil War')&&e.outdoorNote.includes('bad weather'))));
 const edge=await p.evaluate(({nps,fona})=>{
  const report=()=>({discovered:0,parsed:0,outdoor:0,outside:0,cancelled:0,invalid:0,missingLocation:0,rejectedOutdoor:0});
  const sample=structuredClone(nps);sample.data=[sample.data.find(e=>e.title.startsWith('The Civil War'))];sample.data[0].date='2026-10-24';
  const outside=r2.parseNPSRound2(sample,r2.ROUND2_SOURCES[0],report());
  const bad=structuredClone(fona);bad[0].content.rendered=bad[0].content.rendered.replaceAll('2026-10-25T19:00','2026-10-25T18:00');
  const mismatches=r2.parseFONARound2(bad,r2.ROUND2_SOURCES[3],report()).filter(e=>e.title.includes('Full Moon'));
  const badEnd=structuredClone(fona);badEnd[0].content.rendered=badEnd[0].content.rendered.replaceAll('2026-10-25T21:00','2026-10-25T22:00');
  const endMismatches=r2.parseFONARound2(badEnd,r2.ROUND2_SOURCES[3],report()).filter(e=>e.title.includes('Full Moon'));
  return {outside:outside.length,mismatches:mismatches.length,endMismatches:endMismatches.length};
 },{nps:JSON.parse(read('nps-rocr.json')),fona:JSON.parse(read('fona.json'))});
 check('NPS explicit occurrence date overrides recurrence-date lists',()=>assert.equal(edge.outside,0));
 check('FONA inconsistent local start label fails closed',()=>assert.equal(edge.mismatches,0));
 check('FONA inconsistent local end label fails closed',()=>assert.equal(edge.endMismatches,0));
 await p.route(url=>url.hostname==='www.pgparks.com'&&url.pathname==='/wp-json/tribe/events/v1/events',r=>r.fulfill(new URL(r.request().url()).searchParams.get('page')==='2'?{status:503,body:'Unavailable',headers:{'access-control-allow-origin':'*'}}:{body:read('pg-api.json'),headers:{'access-control-allow-origin':'*'}}));
 const partial=await p.evaluate(async()=>{const candidates=await r2.loadRound2Source({...r2.ROUND2_SOURCES[2],name:'Partial PG fixture'});return {candidates:candidates.length,report:r2.state.reports.at(-1),total:r2.state.events.length}});
 check('Later-page failure retains five valid PG sessions',()=>assert.equal(partial.candidates,5));
 check('Later-page failure records exact HTTP error',()=>assert.equal(partial.report.error,'HTTP 503'));
 check('Partial source failure leaves all rendered events intact',()=>assert.equal(partial.total,47));
 await p.locator('#cwe-search').fill('Get Fit Mobile');await p.locator('[data-day="4"]').click();
 const cards=p.locator('.cwe-card');const cardCount=await cards.count();check('Three scheduled fitness cards rendered',()=>assert.equal(cardCount,3));
 await cards.last().click();const selected=await p.evaluate(()=>window.selected.at(-1));
 check('Forecast selection retains actual PG session and county',()=>assert(selected.startTime==='18:00'&&selected.county==='Prince George’s County'&&selected.state==='MD'));
 await p.locator('.cwe-show-details').last().click();assert(await p.locator('#cwe-detail').isVisible());
 await p.setViewportSize({width:390,height:844});const fits=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 check('Mobile layout remains within viewport',()=>assert(fits));
 check('No uncaught browser errors',()=>assert.deepEqual(errors,[]));
 console.log(`${passed} round-2 Chromium checks passed`);
 fs.mkdirSync(path.join(__dirname,'work/r2'),{recursive:true});fs.writeFileSync(path.join(__dirname,'work/r2/fixture-results.json'),JSON.stringify({passed,added:added.length,total:snapshot.events.length,reports:snapshot.reports},null,2));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
