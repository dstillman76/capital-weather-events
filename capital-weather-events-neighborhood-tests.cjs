const {chromium}=require('playwright');
const fs=require('fs'),assert=require('assert');
const live=process.argv.includes('--live');
const html=fs.readFileSync(__dirname+'/capital-weather-events-scalable-browser-baseline.html','utf8');
const hooks='window.coverage={state,VERIFIED_SOURCES,loadVerifiedSources,parseCTYCalendar,verifiedOutdoor};';
const content=html.replace(/load\(\)\.catch\(err=>\{[\s\S]*?\n\}\);/,hooks);
const read=file=>fs.readFileSync(__dirname+'/tests/fixtures/neighborhood-coverage/'+file,'utf8');
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS',name)};
(async()=>{
 const args=['--no-sandbox'];if(process.env.CWE_TEST_CA_SPKI)args.push('--ignore-certificate-errors-spki-list='+process.env.CWE_TEST_CA_SPKI);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args,...(live?{proxy:{server:process.env.HTTPS_PROXY||'http://proxy:8080'}}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},timezoneId:'America/New_York'});
  await page.clock.install({time:new Date('2026-10-25T16:00:00Z')});
  const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.selections=[];addEventListener('cw:event-selected',e=>selections.push(e.detail))});
  await page.route('**/*',r=>{
   const u=r.request().url();if(u==='https://www.capitalweather.com/__coverage_test__')return r.fulfill({body:content,contentType:'text/html'});
   calls.push(u);if(live)return r.continue();
   if(u.startsWith('https://xapi.citylightstudio.net/'))return r.fulfill({body:read(new URL(u).searchParams.get('fid')==='19'?'hill.html':'dupont.html'),headers:{'access-control-allow-origin':'*'}});
   return r.abort();
  });
  await page.goto('https://www.capitalweather.com/__coverage_test__');
  await page.evaluate(()=>coverage.loadVerifiedSources(coverage.VERIFIED_SOURCES.filter(s=>s.kind==='cty')));
  const snapshot=await page.evaluate(()=>({events:coverage.state.events,reports:coverage.state.reports}));
  const dog=snapshot.events.find(e=>e.url.endsWith('/howl-o-weendog-costume-contest'));
  check('User-reported contest is recovered from the live dated calendar',()=>assert(dog));
  check('October 31 contest time remains 13:00–15:00',()=>assert(dog.date==='2026-10-31'&&dog.time==='13:00'&&dog.endTime==='15:00'));
  check('Reviewed publisher evidence fills the missing Lincoln Park location',()=>assert(dog.venue==='Lincoln Park'&&dog.city==='Washington'&&dog.outdoorEvidenceURL===dog.url));
  check('Noon registration is a note, not a fabricated contest start',()=>assert(dog.outdoorNote.includes('noon')&&dog.description.includes('Registration')));
  check('All three previously working Dupont occurrences survive',()=>assert.equal(snapshot.events.filter(e=>e.source==='Dupont Circle BID').length,3));
  check('Both direct calendar sources remain healthy',()=>assert(snapshot.reports.every(r=>r.ok)));
  check('Unclassified short summaries are visible in diagnostics',()=>assert(snapshot.reports.find(r=>r.source==='Capitol Hill BID').unreviewed===3));
  check('No extra requests or new proxy are introduced',()=>assert(calls.length===2&&calls.every(u=>u.startsWith('https://xapi.citylightstudio.net/'))));
  await page.locator('[data-day="6"]').click();
  await page.getByRole('button',{name:'Show details',exact:true}).last().click();
  const details=await page.locator('#cwe-detail').textContent();
  check('Details show the registration note',()=>assert(details.includes('noon')));
  const selected=await page.evaluate(()=>selections.at(-1));
  check('Forecast receives Lincoln Park and actual contest hours',()=>assert(selected.venue==='Lincoln Park'&&selected.startTime==='13:00'&&selected.endTime==='15:00'));
  if(!live){
   const variants=await page.evaluate(raw=>{
    const source=coverage.VERIFIED_SOURCES.find(s=>s.name==='Capitol Hill BID');
    const parse=s=>coverage.parseCTYCalendar(s,source,{discovered:0,parsed:0,inRange:0,outdoor:0});
    const noDog=raw.replace(/<li><a href="\/do\/howl-o-weendog-costume-contest">[\s\S]*?<\/li>/,'');
    return {absent:parse(noDog).some(e=>e.title.includes('HOWL')),missingTime:parse(raw.replace('1pm - 3pm','TBA')).some(e=>e.title.includes('HOWL')),
     changedVenue:parse(raw.replace('1pm - 3pm','1pm - 3pm / Indoor Hall')).some(e=>e.title.includes('HOWL')),
     expired:coverage.verifiedOutdoor({source:source.name,title:'HOWL-O-WEEN Dog Costume Contest',venue:'',url:'https://capitolhillbid.org/do/howl-o-weendog-costume-contest',dates:['2027-10-31'],time:'13:00',endTime:'15:00'}),
     wrongURL:parse(raw.replace('/do/howl-o-weendog-costume-contest','/do/unrelated-event')).some(e=>e.title.includes('HOWL'))};
   },read('hill.html'));
   check('No event is invented if it disappears from the feed',()=>assert(!variants.absent));
   check('Missing contest times remain excluded',()=>assert(!variants.missingTime));
   check('Changed venue requires a new activity review',()=>assert(!variants.changedVenue));
   check('This review cannot authorize next year’s event',()=>assert(!variants.expired));
   check('A same-title different URL cannot inherit this evidence',()=>assert(!variants.wrongURL));
  }
  await page.setViewportSize({width:390,height:844});
  const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  check('Recovered event still fits the mobile widget',()=>assert(fits));
  check('No uncaught browser errors',()=>assert.deepEqual(errors,[]));
  console.log(`${passed} neighborhood coverage checks passed (${live?'live CORS':'fixtures'})`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
