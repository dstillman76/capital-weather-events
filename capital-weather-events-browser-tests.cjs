// Run: node capital-weather-events-browser-tests.cjs [--live]
// Chromium enforces CORS. Only the test document is fulfilled in live mode.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const live=process.argv.includes('--live'),base=__dirname;
const html=fs.readFileSync(path.join(base,'capital-weather-events-scalable-browser-baseline.html'),'utf8');
const hooks='window.__cweTest={state,days,VERIFIED_SOURCES,parseCTYCalendar,parseTribeRecords,parseNoMaMarket,parseAlexandriaICAL,loadVerifiedSources,loadVerifiedSource,fetchDirectText,createEvent,dedupe,geography,render,parseDate};';
const content=live?html.replace('load().catch(err=>{',hooks+'\nload().catch(err=>{'):html.replace(/load\(\)\.catch\(err=>\{[\s\S]*?\n\}\);/,hooks);
const origin=new URL('/__widget_test__',process.env.CWE_TEST_ORIGIN||'https://capitalweather.com').href;
const fixture=name=>fs.readFileSync(path.join(base,'tests/fixtures',name),'utf8');
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS',name)}
(async()=>{
 const args=['--no-sandbox'];
 // Optional pin for this managed environment's trusted TLS inspection CA.
 // No general certificate-validation or CORS bypass is enabled.
 if(process.env.CWE_TEST_CA_SPKI)args.push('--ignore-certificate-errors-spki-list='+process.env.CWE_TEST_CA_SPKI);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args,
  ...(live?{proxy:{server:process.env.HTTPS_PROXY||'http://proxy:8080'}}:{})});
 try{
 const page=await browser.newPage({timezoneId:'America/New_York',viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!live)await page.clock.install({time:new Date('2026-10-24T16:00:00Z')});
 await page.addInitScript(()=>{window.firstCardMs=null;new MutationObserver(()=>{if(window.firstCardMs===null&&document.querySelector('.cwe-card'))window.firstCardMs=performance.now()}).observe(document,{childList:true,subtree:true});window.selections=[];window.addEventListener('cw:event-selected',e=>window.selections.push(e.detail))});
 const calls=[];
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(url===origin)return route.fulfill({contentType:'text/html; charset=utf-8',body:content});
  if(live)return route.continue();
  calls.push(url);let body;
  if(url.includes('xapi.citylightstudio.net'))body=fixture(url.includes('fid=65')?'dupont-xapi.html':'hill-xapi.html');
  else if(url.includes('rockvillemd.gov/wp-json'))body=fixture('rockville.json');
  else if(url.includes('nomabid.org/wp-json'))body=fixture('noma.json');
  else if(url.includes('visitalexandria.com/wp-json/wp/v2/pages'))body=fixture('alexandria-index.json');
  else if(url.includes('visitalexandria.com/wp-json')){
   // Deliberately slow one source to prove independent progressive rendering.
   await new Promise(r=>setTimeout(r,350));body=fixture('alexandria.ics');
  }else return route.abort();
  return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},body});
 });
 const start=Date.now();await page.goto(origin);
 if(!live){
  await page.evaluate(()=>{window.loadPromise=window.__cweTest.loadVerifiedSources(window.__cweTest.VERIFIED_SOURCES.filter(s=>!s.round2&&!s.coverage))});
  await page.waitForFunction(()=>window.__cweTest.state.events.some(e=>e.source==='Dupont Circle BID'));

 }
 if(!live){
  const progress=await page.evaluate(()=>({cards:document.querySelectorAll('.cwe-card').length,pending:!window.__cweTest.state.reports.find(r=>r.source==='Visit Alexandria')?.ms}));
  check('Early source produces cards',()=>assert(progress.cards>0));
  check('Progressive rendering before slow source finishes',()=>assert(progress.pending));
  await page.evaluate(()=>window.loadPromise);
 }else{
  await page.waitForFunction(()=>window.__cweTest?.state.reports.filter(r=>window.__cweTest.VERIFIED_SOURCES.some(s=>s.name===r.source)&&r.ms!==undefined).length===window.__cweTest.VERIFIED_SOURCES.length,{},{timeout:45000});
 }
 const snapshot=await page.evaluate(()=>({days:window.__cweTest.days,events:window.__cweTest.state.events,reports:window.__cweTest.state.reports,firstCardMs:window.firstCardMs,selected:window.selections.at(-1)}));
 if(live){
  const names=['Dupont Circle BID','Capitol Hill BID','City of Rockville','NoMa BID','Visit Alexandria'];
  check('Five round-1 direct adapters succeed',()=>assert.equal(snapshot.reports.filter(r=>names.includes(r.source)&&r.ok).length,5));
  check('Five round-2 direct discovery paths succeed',()=>assert.equal(snapshot.reports.filter(r=>r.round2&&r.ok).length,5));
 }
 if(!live){
  check('All five adapters succeed',()=>assert.equal(snapshot.reports.filter(r=>r.ok).length,5));
  const counts=Object.fromEntries(snapshot.reports.map(r=>[r.source,r.count]));
  fs.writeFileSync('work/coverage-implementation/round1-snapshot.json',JSON.stringify(snapshot,null,2));
  check('Expanded evidence leaves 21 unique occurrences',()=>assert.equal(snapshot.events.length,21));
  check('Source counts match verified fixtures',()=>assert.deepEqual(counts,{'Dupont Circle BID':3,'Capitol Hill BID':1,'City of Rockville':2,'NoMa BID':1,'Visit Alexandria':14}));
  check('Indoor nature-center craft sessions excluded',()=>assert(!snapshot.events.some(e=>e.title==='Mini-Creep')));
  const market=snapshot.events.find(e=>e.source==='NoMa BID');
  check('NoMa explicit weekly schedule',()=>assert.deepEqual([market.date,market.time,market.endTime,market.address],['2026-10-29','16:00','20:00','Third Street NE']));
  const music=snapshot.events.find(e=>e.title.startsWith('Music in the Circle'));
  check('Dupont date, meridiem, venue and link',()=>assert.deepEqual([music.date,music.time,music.endTime,music.venue,music.url],['2026-10-24','12:00','15:00','Dupont Circle park','https://dupontcirclebid.org/do/music-in-the-circle-fall-2026-concert-series']));
  const alex=snapshot.events.filter(e=>e.source==='Visit Alexandria');
  check('Alexandria links use matched publisher event pages',()=>assert(alex.every(e=>e.url.startsWith('https://visitalexandria.com/events/'))));
  check('Duplicate Alexandria publisher records removed',()=>assert.equal(alex.filter(e=>e.title==='Lost Boy Cider: Fall Fest 2026').length,1));
  check('Courtyard events without published clocks excluded',()=>assert.equal(alex.filter(e=>e.title==='King & Rye: Cocktails & Crafts').length,0));
  check('Mixed Woodlawn all-day event excluded',()=>assert(!alex.some(e=>e.title.includes('Countdown to the Holidays'))));
  check('Activity-level evidence accompanies every new occurrence',()=>assert(snapshot.events.every(e=>e.outdoorEvidence&&e.outdoorEvidenceURL)));
  await page.locator('#cwe-search').fill('Patriots Path');
  check('Seven explicitly scheduled encampment dates recovered',()=>assert.equal(alex.filter(e=>e.title.startsWith('Patriots Path')).length,7));
  await page.locator('.cwe-show-details').first().click();
  const activityDetails=await page.locator('#cwe-detail').innerText();
  check('Full activity evidence is visible in event details',()=>assert(activityDetails.includes('encampment')));
  await page.locator('#cwe-search').fill('');
  check('Woodlawn physical county retained',()=>assert(alex.filter(e=>e.venue==='Woodlawn & Pope-Leighey House').every(e=>e.county==='Fairfax County')));
  check('Only direct publisher/API requests used',()=>assert(calls.length===6&&calls.every(u=>!u.includes('cors.dev')&&!u.includes('allorigins'))));
  const edge=await page.evaluate(data=>{
   const t=window.__cweTest,report=()=>({discovered:0,parsed:0,inRange:0,outdoor:0});
   const old=JSON.parse(data.noma);old[0].content.rendered=old[0].content.rendered.replaceAll('2026','2025');
   const noOld=t.parseNoMaMarket(old,t.VERIFIED_SOURCES[3],report());
   let malformed=false;try{t.parseCTYCalendar('<div>no dates</div>',t.VERIFIED_SOURCES[0],report())}catch{malformed=true}
   const ics='BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Park Walk\r\nDESCRIPTION:An out\r\n door walk\r\nDTSTART:20261025T140000\r\nDTEND:20261025T150000\r\nLOCATION:City Park\r\nURL:https://example.com/event\r\nBEGIN:VALARM\r\nDESCRIPTION:Indoor reminder\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR';
   const parsed=t.parseAlexandriaICAL(ics,t.VERIFIED_SOURCES[4],report());
   return {old:noOld.length,malformed,folded:parsed[0]?.description,events:parsed.length};
  },{noma:fixture('noma.json')});
  check('Expired season does not recur into this year',()=>assert.equal(edge.old,0));
  check('Malformed CTY calendar fails closed',()=>assert.equal(edge.malformed,true));
  check('RFC line folding and nested alarms handled',()=>assert.deepEqual([edge.events,edge.folded],[1,'An outdoor walk']));
  await page.route('https://example.com/timeout',async r=>{await new Promise(resolve=>setTimeout(resolve,150));await r.fulfill({body:'late'}).catch(()=>{})});
  await page.route('https://example.com/unavailable',r=>r.fulfill({status:503,body:'Unavailable'}));
  const failures=await page.evaluate(async()=>{
   const t=window.__cweTest,out=[];
   for(const url of ['https://example.com/timeout','https://example.com/unavailable'])try{await t.fetchDirectText(url,25)}catch(e){out.push(e.name==='AbortError'?'timeout':e.message)}
   return out;
  });
  check('Timeout aborts and HTTP errors remain visible',()=>assert.deepEqual(failures,['timeout','HTTP 503']));
  const before=snapshot.events.length;
  const isolated=await page.evaluate(async()=>{
   const t=window.__cweTest;
   await t.loadVerifiedSource({...t.VERIFIED_SOURCES[3],name:'Unavailable fixture source',endpoint:'https://example.com/unavailable'});
   return {report:t.state.reports.at(-1),count:t.state.events.length};
  });
  check('One failed source preserves already rendered events',()=>assert.equal(isolated.count,before));
  check('Source diagnostics expose HTTP failure',()=>assert.equal(isolated.report.ok,false));
  check('Source diagnostics preserve exact HTTP status',()=>assert.equal(isolated.report.error,'HTTP 503'));

 }
 await page.locator('[data-day="weekend"]').click();
 await page.locator('.cwe-card').first().click();
 const selection=await page.evaluate(()=>window.selections.at(-1));
 check('Hourly forecast integration receives event and location',()=>assert(selection&&selection.date&&selection.startTime&&selection.city&&selection.url&&'latitude' in selection));
 await page.locator('.cwe-show-details').first().click();
 const detailVisible=await page.locator('#cwe-detail').isVisible();
 check('Detail panel visible',()=>assert(detailVisible));
 await page.locator('[data-day="1"]').click();
 const active=await page.locator('[data-day="1"]').getAttribute('class');
 check('Daily tab updates selection',()=>assert(active.includes('active')));
 await page.setViewportSize({width:390,height:844});
 const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 check('Mobile layout stays within viewport',()=>assert(fits));
 await page.locator('#cwe-diagnostics-button').click();
 assert(await page.locator('#cwe-diagnostics').isVisible());
 check('No uncaught browser errors',()=>assert.deepEqual(errors,[]));
 if(live){
  // Allow unchanged legacy sources to finish; take a bounded observation.
  await page.waitForFunction(()=>!window.__cweTest.state.enriching,{},{timeout:120000}).catch(()=>{});
  const result=await page.evaluate(()=>({events:window.__cweTest.state.events,reports:window.__cweTest.state.reports,enriching:window.__cweTest.state.enriching}));
  fs.mkdirSync(path.join(base,'work'),{recursive:true});
  fs.writeFileSync(path.join(base,'work/live-browser-results.json'),JSON.stringify({...result,firstCardMs:snapshot.firstCardMs,elapsedMs:Date.now()-start},null,2));
  console.log('LIVE',JSON.stringify({elapsedMs:Date.now()-start,enriching:result.enriching,reports:result.reports},null,2));
 }
 console.log(`${passed} browser checks passed (${live?'live':'fixtures'})`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
