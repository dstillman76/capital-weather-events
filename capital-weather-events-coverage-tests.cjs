// Same publisher responses, same window, normal Chromium CORS enforcement.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert'),zlib=require('zlib');
const dir=path.join(__dirname,'tests/fixtures/coverage'),read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const live=process.argv.includes('--live'),compare=process.argv.includes('--compare');
const current=fs.readFileSync(path.join(__dirname,'capital-weather-events-scalable-browser-baseline.html'),'utf8');
const reston=JSON.parse(zlib.gunzipSync(Buffer.from(read('reston-cassette.json.gz.b64'),'base64')).toString());
const hook='window.coverageTest={state,days,dedupe,createEvent,render,geography,coverageReport,parseFreshfarm,parseGeoDirectory,coverageSessions,coverageMarketConflict,COVERAGE_SOURCES,outdoorEvidence,outdoorDenial,diagnosticStatus,round2Text,coverageReason,parseTime,parseRSS,processCandidate,loadCoverageSource};';
const oldHook='window.coverageTest={state,days};';
const origin=new URL('/__coverage_test__',process.env.CWE_TEST_ORIGIN||'https://capitalweather.com').href;let passed=0;
function check(name,fn){fn();passed++;console.log('PASS',name)}
(async()=>{
 const args=['--no-sandbox'];if(process.env.CWE_TEST_CA_SPKI)args.push('--ignore-certificate-errors-spki-list='+process.env.CWE_TEST_CA_SPKI);
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args,...(live?{proxy:{server:process.env.HTTPS_PROXY||'http://proxy:8080'}}:{})});
 const results={};
 try{for(const version of compare?['before','after']:['after']){
  const html=version==='before'?(process.env.CWE_BASELINE_HTML?fs.readFileSync(process.env.CWE_BASELINE_HTML,'utf8'):require('child_process').execFileSync('git',['show','6ad973272f9d3d538cc4ebedd6abaa3ada0e9aa7:capital-weather-events-scalable-browser-baseline.html'],{encoding:'utf8'})):current;
  const doc=html.replace('load().catch(err=>{',(version==='before'?oldHook:hook)+'\nload().catch(err=>{');
  const page=await browser.newPage({timezoneId:'America/New_York',viewport:{width:1280,height:900}});
  await page.clock.install({time:new Date('2026-10-25T16:00:00Z')});
  const errors=[],calls=[];let active=0,peak=0;page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.firstCardMs=null;window.selections=[];window.addEventListener('cw:event-selected',e=>window.selections.push(e.detail));new MutationObserver(()=>{if(window.firstCardMs===null&&document.querySelector('.cwe-card'))window.firstCardMs=performance.now()}).observe(document,{childList:true,subtree:true})});
  await page.route('**/*',async r=>{
   const url=r.request().url();if(url===origin)return r.fulfill({body:doc,contentType:'text/html; charset=utf-8'});
   calls.push({url,start:Date.now()});if(live)return r.continue();
   active++;peak=Math.max(peak,active);
   try{
    const u=new URL(url);let file;
    if(u.hostname==='xapi.citylightstudio.net')file=u.searchParams.get('fid')==='65'?'dupont.html':'hill.html';
    else if(u.hostname==='www.rockvillemd.gov')file='rockville.json';
    else if(u.hostname==='nomabid.org')file='noma.json';
    else if(u.hostname==='visitalexandria.com')file=u.pathname.endsWith('/pages')?'alexandria-index.json':'alexandria.ics';
    else if(u.hostname==='home.nps.gov')file=u.searchParams.get('parkCode')==='nama'?'nps-mall.json':'nps-rock.json';
    else if(u.hostname==='www.pgparks.com')file=u.searchParams.get('page')==='2'?'pg-2.json':'pg-1.json';
    else if(u.hostname==='www.fona.org')file='fona.json';
    else if(u.hostname==='www.bethesda.org')file='bethesda.json';
    else if(u.hostname==='www.georgetowndc.com')file=u.searchParams.get('page')==='2'?'georgetown-2.json':'georgetown-1.json';
    else if(u.hostname==='visitmontgomery.com')file='mont-'+(u.searchParams.get('event_type')==='today'?'today':'next')+'-'+u.searchParams.get('page')+'.json';
    else if(u.hostname==='www.freshfarm.org'){await new Promise(resolve=>setTimeout(resolve,300));file='freshfarm.json'}
    else if(u.hostname==='api.imgoingcalendar.com')file='pwc-'+u.searchParams.get('page')+'.json';
    else if(u.hostname==='app.ticketmaster.com')file='ticketmaster.json';
    if(file&&fs.existsSync(path.join(dir,file)))return r.fulfill({body:read(file),headers:{'access-control-allow-origin':'*','content-type':file.endsWith('.json')?'application/json':'text/plain; charset=utf-8'}});
    const target=url.includes('restontowncenter.com')?decodeURIComponent(url.slice(url.indexOf('https://www.restontowncenter.com'))):'';
    if(reston[target])return r.fulfill({body:reston[target],headers:{'access-control-allow-origin':'*'}});
    return r.abort();
   }finally{active--}
  });
  const start=Date.now();await page.goto(origin);await page.waitForFunction(()=>window.coverageTest?.state.reports.length>5);
  await page.waitForFunction(()=>!coverageTest.state.enriching,{},{timeout:180000});
  const snapshot=await page.evaluate(()=>({days:coverageTest.days,events:coverageTest.state.events,reports:coverageTest.state.reports,stages:coverageTest.state.coverageStages,conflicts:[...(coverageTest.state.conflictedEntities||[])],firstCardMs:window.firstCardMs}));
  snapshot.totalMs=Date.now()-start;snapshot.requests=calls.length;snapshot.peak=peak;snapshot.errors=errors;results[version]=snapshot;
  fs.mkdirSync('work/coverage-implementation',{recursive:true});fs.writeFileSync('work/coverage-implementation/'+(live?'live-':'fixture-')+version+'.json',JSON.stringify(snapshot,null,2));
  console.log(version,JSON.stringify({total:snapshot.events.length,counts:Object.fromEntries([...new Set(snapshot.events.map(e=>e.source))].map(s=>[s,snapshot.events.filter(e=>e.source===s).length])),ms:snapshot.totalMs,firstCard:snapshot.firstCardMs,errors}));
  check(version+' has no browser errors',()=>assert.deepEqual(errors,[]));
  if(version==='after'){
   if(live){check('All 13 direct discovery paths finish successfully',()=>assert.equal(snapshot.reports.filter(r=>(r.coverage||r.round2||['Dupont Circle BID','Capitol Hill BID','City of Rockville','NoMa BID','Visit Alexandria'].includes(r.source))&&r.ok&&!r.partial&&!r.error).length,13));}
   if(!live){
    check('103 unique fixture occurrences',()=>assert.equal(snapshot.events.length,103));
    if(results.before){const key=e=>[e.source,e.title,e.date,e.time].join('|'),old=new Set(results.before.events.map(key)),now=new Set(snapshot.events.map(key));check('Same-input baseline contains 45 occurrences',()=>assert.equal(results.before.events.length,45));check('66 additions survive cross-publisher deduplication',()=>assert.equal(snapshot.events.filter(e=>!old.has(key(e))).length,66));check('Eight unsafe or duplicate baseline occurrences removed',()=>assert.equal(results.before.events.filter(e=>!now.has(key(e))).length,8));}
    const restonReport=snapshot.reports.find(r=>r.source==='Reston Town Center');check('Reston retains 65 URLs and 30-detail budget',()=>assert(restonReport.urlCandidates===65&&restonReport.detailAttempts===30&&restonReport.detailAccessFailures===0));
    const rss=await page.evaluate(async()=>{const t=coverageTest,feed={name:'Synthetic RSS safety test',county:'Loudoun County',state:'VA'},parse=(description)=>t.parseRSS('<rss><channel><item><title>Guided walk</title><link>https://example.com/synthetic-test</link><description>'+description+'</description></item></channel></rss>',feed).candidates[0];const ranged=parse('10/01/2026 to 10/31/2026 - Join us outdoors for a guided walk.');const untimed=parse('10/25/2026 to 10/25/2026 - Join us outdoors for a guided walk.');return {expanded:ranged.dates.length,untimed:(await t.processCandidate(untimed)).length}});
    check('RSS date bounds do not manufacture daily occurrences',()=>assert.equal(rss.expanded,0));check('RSS events without actual start times fail closed',()=>assert.equal(rss.untimed,0));
    const edge=await page.evaluate(({markets,mont})=>{
     const t=coverageTest,report=()=>({discovered:0,inRange:0,outdoor:0,seen:new Set(),duplicates:0,outsideWindow:0,conflictingSchedule:0,missingSchedule:0,missingLocation:0,insufficientEvidence:0,indoorOrMixed:0,cancelled:0,invalidRecords:0});
     const base=markets.find(e=>e.link.endsWith('/mosaic')),parse=e=>t.parseFreshfarm([e],t.COVERAGE_SOURCES[2],report());
     const expired=structuredClone(base);expired.acf.market.close_date='December 31, 2025';
     const unknown=structuredClone(base);unknown.acf.market.open_date='January 4';unknown.acf.market.close_date='December 27';
     const closed=structuredClone(base);closed.acf.market.individual_banner=true;closed.acf.market.banner.text='Market closed October 25, 2026 due to unsafe weather.';
     const inactive=structuredClone(closed);inactive.acf.market.individual_banner=false;
     const winter=structuredClone(base);winter.acf.market.optional_date_range_text='Year-Round Market; Winter Season Hours: 10am - 2pm, Oct. 2026 - Mar. 2027';
     const winterTime=parse(winter)[0]?.time;
     const badClock=structuredClone(base);badClock.acf.market.open_time='';
     const indoor=structuredClone(base);indoor.acf.market.location_notes='Community Center';indoor.acf.market.about_content.text='Our building has outdoor seating and free parking.';
     const invalid=structuredClone(mont.find(e=>e.title.rendered.includes('Leech')));invalid.end_datetime.raw=invalid.start_datetime.raw;
     const multi=structuredClone(invalid);multi.end_datetime.raw='2026-10-31T21:30:00';
     const gallery=t.outdoorEvidence({title:'October in the Galleries and Open Studios',description:'The artist walks a different path forward through a forest of ideas.'});
     const museum=t.outdoorEvidence({title:'Indoor Concert',description:'Concert inside the museum. Our museum has outdoor seating and a trail nearby.'});
     const estate=t.outdoorEvidence({title:'Holiday Event',description:'A site-wide program of house tours and an exhibit. Join us outdoors for another activity.'});
     const tour=t.coverageSessions('Tours are available nightly at 7pm and 8pm. Tour duration: 90 minutes.','19:00','21:30');
     const battlefield=t.coverageSessions('Tours begin at 11 a.m., 1 p.m., and 3 p.m.','11:00','15:00');
     const changed=t.coverageSessions('Tours are available nightly at 7pm and 8pm. Tour duration: 60 minutes.','19:00','21:30');
     const source='Visit Montgomery',event=(title,time,url)=>({title,date:'2026-10-25',time,endTime:'18:00',source,venue:"Butler's Orchard",county:'Montgomery County',occurrenceTime:time,coverage:true,url});
     const one=event('Pumpkin Festival at Butler’s Orchard','09:00','https://example.com/one'),two=event('Butler’s Orchard Pumpkin Festival','10:00','https://example.com/two');
     const conflicts=t.state.conflictedEntities;t.state.conflictedEntities=new Set();const withheld=t.dedupe([one,two]).length,persisted=t.dedupe([one]).length;t.state.conflictedEntities=conflicts;
     const sameTime=t.dedupe([{...one,time:'13:00',occurrenceTime:'13:00',date:'2026-10-28'},{...two,time:'13:00',occurrenceTime:'13:00',date:'2026-10-28'}]).length;
     return {winterTime,expired:parse(expired).length,unknown:parse(unknown).length,closed:parse(closed).length,inactive:parse(inactive).length,badClock:parse(badClock).length,indoor:parse(indoor).length,
      invalid:t.parseGeoDirectory([invalid],t.COVERAGE_SOURCES[1],report()).length,multi:t.parseGeoDirectory([multi],t.COVERAGE_SOURCES[1],report()).length,gallery,museum,estate,tour,battlefield,changed,withheld,persisted,sameTime,
      status:[t.diagnosticStatus({ok:false}),t.diagnosticStatus({ok:true,count:0,discovered:3,inRange:0}),t.diagnosticStatus({ok:true,count:0,missingSchedule:1}),t.diagnosticStatus({ok:true,partial:true}),t.diagnosticStatus({ok:true,limited:true})]};
    },{markets:JSON.parse(read('freshfarm.json')),mont:JSON.parse(read('mont-today-1.json'))});
    for(const k of ['expired','unknown','closed','badClock','indoor','invalid','multi'])check(k+' schedule/location fails closed',()=>assert.equal(edge[k],0));
    check('Date-ranged winter hours apply only during their stated season',()=>assert.equal(edge.winterTime,'10:00'));
    check('Disabled stale closure does not override current season',()=>assert.equal(edge.inactive,1));
    for(const k of ['gallery','museum','estate'])check(k+' does not establish outdoor activity',()=>assert.equal(edge[k],''));
    check('Published tour duration splits two real departures',()=>assert.deepEqual(edge.tour,[{time:'19:00',endTime:'20:30'},{time:'20:00',endTime:'21:30'}]));
    check('Start-only departures retain unknown ends',()=>assert.deepEqual(edge.battlefield,[{time:'11:00',endTime:''},{time:'13:00',endTime:''},{time:'15:00',endTime:''}]));
    check('Conflicting tour duration rejects schedule',()=>assert.equal(edge.changed.length,0));
    check('Conflicting publisher aliases withheld',()=>assert.equal(edge.withheld,0));
    check('Withheld conflict cannot reappear during progressive rendering',()=>assert.equal(edge.persisted,0));
    check('Same schedule under reordered festival titles deduplicates',()=>assert.equal(edge.sameTime,1));
    check('Diagnostics distinguish failure, zero, uncertainty and caps',()=>assert.deepEqual(edge.status,['ACCESS FAILED','LOADED — zero in-window records','LOADED — unresolved candidates','PARTIAL — access error','PARTIAL — discovery capped']));
    check('FRESHFARM overlap with Dupont publisher appears once',()=>assert.equal(snapshot.events.filter(e=>e.date==='2026-10-25'&&/dupont/i.test(e.title)&&/market/i.test(e.title)).length,1));
    check('Mosaic postal Fairfax address resolves to Fairfax County',()=>assert.equal(snapshot.events.find(e=>e.title==='FRESHFARM Mosaic Market').county,'Fairfax County'));
    check('Train wet-track contingency retained',()=>assert(snapshot.events.filter(e=>e.title.includes('Eye Spy')).every(e=>e.outdoorNote.includes('wet'))));
    check('Known unsafe listings and conflicting festival dates excluded',()=>assert(!snapshot.events.some(e=>/Fowl Players|Miss Kibbles|Cocktails & Crafts|in the Galleries/.test(e.title)||(/Butler/.test(e.title)&&['2026-10-25','2026-10-31'].includes(e.date)))));
    check('Howl omission corrected without title-only admission',()=>assert.equal(snapshot.events.filter(e=>e.title.startsWith('HOWL-O-WEEN')).length,1));
    check('All 14 actual walking-tour departures survive',()=>assert.equal(snapshot.events.filter(e=>e.source==='Georgetown BID'&&e.title.startsWith('Ghosts of Georgetown')).length,14));
    check('All three direct coverage adapters succeed',()=>assert.equal(snapshot.reports.filter(r=>r.coverage&&r.ok).length,3));
    check('Six bounded direct coverage requests',()=>assert.equal(snapshot.reports.filter(r=>r.coverage).reduce((n,r)=>n+r.requests,0),6));
    check('Progressive first cards precede slow market completion',()=>assert(snapshot.firstCardMs<snapshot.totalMs));
    let transient=0;await page.route(url=>url.hostname==='visitmontgomery.com'&&url.searchParams.get('page')==='2',r=>r.fulfill(transient++===0?{status:503,body:'Unavailable',headers:{'access-control-allow-origin':'*'}}:{body:read('mont-next-2.json'),headers:{'access-control-allow-origin':'*'}}));
    const retried=await page.evaluate(async()=>{await coverageTest.loadCoverageSource(coverageTest.COVERAGE_SOURCES[1]);return coverageTest.state.reports.at(-1)});
    check('One source-wide retry recovers a transient HTTP failure',()=>assert(retried.retries===1&&retried.requests===4&&retried.discoveryComplete&&!retried.partial));
    await page.route(url=>url.hostname==='visitmontgomery.com'&&url.searchParams.get('page')==='2',r=>r.fulfill({status:503,body:'Unavailable',headers:{'access-control-allow-origin':'*'}}));
    const partial=await page.evaluate(async()=>{const t=coverageTest,before=t.state.events.length,candidates=await t.loadCoverageSource(t.COVERAGE_SOURCES[1]);return {before,after:t.state.events.length,count:candidates.length,report:t.state.reports.at(-1)}});
    check('Later GeoDirectory page failure keeps completed pages',()=>assert(partial.count>0&&partial.report.partial&&partial.report.error==='HTTP 503'));
    check('Partial source access does not erase rendered events',()=>assert.equal(partial.after,partial.before));
   }
   await page.locator('[data-day="weekend"]').click();await page.locator('.cwe-card').first().click();
   const selection=await page.evaluate(()=>window.selections.at(-1));check('Forecast event contract preserved',()=>assert(selection?.date&&selection.startTime&&selection.county&&'latitude'in selection));
   await page.locator('.cwe-show-details').first().click();const visible=await page.locator('#cwe-detail').isVisible();check('Details open',()=>assert(visible));
   await page.setViewportSize({width:390,height:844});const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);check('Mobile stays within viewport',()=>assert(fits));
  }
  await page.close();
 }
 console.log(passed+' coverage Chromium checks passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
