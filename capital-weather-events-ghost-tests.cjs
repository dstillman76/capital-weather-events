// HTML-card embedding checks. Optional local copies of the live theme are test-only.
const {chromium}=require('playwright');
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/capital-weather-events-scalable-browser-baseline.html','utf8');
const baseline=JSON.parse(fs.readFileSync(__dirname+'/tests/fixtures/round2/baseline-events.json','utf8'));
const hooks='window.ghostTest={state,render,geography};';
const fragment=html.replace(/load\(\)\.catch\(err=>\{[\s\S]*?\n\}\);/,hooks);
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS',name)};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},timezoneId:'America/New_York'});
  await page.clock.install({time:new Date('2026-10-25T16:00:00Z')});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const theme=(process.env.CWE_GHOST_THEME_CSS||'').split(',').filter(Boolean).map(p=>fs.readFileSync(p,'utf8')).join('\n');
  const css='body{margin:0;font-family:Arial,sans-serif}.gh-content{max-width:720px;margin:auto;padding:16px}.kg-html-card{min-width:0}';
  await page.route('**/*',r=>r.request().url()==='https://www.capitalweather.com/__ghost_card_test__'?r.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${theme}\n${css}</style></head><body><main class="gh-content"><button id="outside">Theme button</button><div class="cwe-diagnostics-controls" id="outside-diagnostics">Outside card</div><div class="kg-card kg-html-card">${fragment}</div></main></body></html>`}):r.abort());
  await page.addInitScript(()=>{window.selections=[];window.addEventListener('cw:event-selected',e=>selections.push(e.detail))});
  await page.goto('https://www.capitalweather.com/__ghost_card_test__');
  await page.evaluate(events=>{ghostTest.state.events=events;ghostTest.geography();ghostTest.render()},baseline);
  check('Fragment has no document wrapper, external script, or stylesheet dependency',()=>assert(!/<(?:html|head|body)\b|<script[^>]+src=|<link\b/i.test(html)));
  check('Inline script has isolated scope and a single-instance guard',()=>assert(html.includes('(function(){')&&html.includes('root.dataset.initialized')))
  const scope=await page.evaluate(()=>{const sheet=[...document.styleSheets].at(-1);const selectors=[];function walk(rules){for(const r of rules){if(r.selectorText)selectors.push(...r.selectorText.split(','));else if(r.cssRules)walk(r.cssRules)}}walk(sheet.cssRules);return selectors.every(s=>s.trim().startsWith('#cw-weekend-events'))});
  check('Every widget CSS selector is scoped to the card root',()=>assert(scope));
  const initialized=await page.locator('#cw-weekend-events[data-initialized="1"]').count();
  check('Exactly one initialized widget in HTML card',()=>assert.equal(initialized,1));
  const cards=await page.locator('.cwe-card').count();
  check('Event cards render within a Ghost-sized desktop column',()=>assert(cards>0));
  const grid=await page.locator('#cwe-cards').evaluate(e=>({display:getComputedStyle(e).display,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length}));
  check('Desktop retains three event columns under theme CSS',()=>assert(grid.display==='grid'&&grid.columns===3));
  await page.locator('.cwe-show-details').first().click();
  const details=await page.locator('#cwe-detail').isVisible();
  check('Details open inside HTML card',()=>assert(details));
  const target=await page.locator('.cwe-source a').first().evaluate(a=>({target:a.target,rel:a.rel}));
  check('Publisher links open separately with safe relationship attributes',()=>assert(target.target==='_blank'&&target.rel.includes('noopener')));
  await page.locator('[data-day="2"]').click();
  const date=await page.locator('[data-day="2"]').getAttribute('class');
  check('Date navigation updates active day',()=>assert(date.includes('active')));
  await page.locator('[data-day="0"]').click();await page.locator('.cwe-card').last().click();
  const selection=await page.evaluate(()=>selections.at(-1));
  check('Forecast integration publishes event identity, date, time and location',()=>assert(selection.id&&selection.date&&'startTime' in selection&&'latitude' in selection&&'county' in selection));
  const outside=await page.locator('#outside-diagnostics').evaluate(e=>getComputedStyle(e).borderTopWidth);
  check('Widget diagnostics CSS does not escape to surrounding page',()=>assert.equal(outside,'0px'));
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});
   const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
   check(`No page overflow at ${width}px phone width`,()=>assert(fits));
   assert(await page.locator('[data-day="6"]').isVisible());
  }
  check('No uncaught script errors in Ghost wrapper',()=>assert.deepEqual(errors,[]));
  const blocked=await browser.newPage();
  await blocked.route('**/*',r=>r.fulfill({contentType:'text/html',headers:{'content-security-policy':"script-src 'none'; style-src 'unsafe-inline'"},body:fragment}));
  await blocked.goto('https://www.capitalweather.com/__ghost_csp_test__');
  const blockedInit=await blocked.locator('#cw-weekend-events').getAttribute('data-initialized');
  check('Enforcing CSP can block the inline widget script',()=>assert.equal(blockedInit,null));
  await blocked.close();
  const connections=await browser.newPage();
  await connections.route('**/*',r=>r.fulfill({contentType:'text/html',headers:{'content-security-policy':"connect-src 'none'"},body:'<p>CSP connection check</p>'}));
  await connections.goto('https://www.capitalweather.com/__ghost_connect_test__');
  const connectionError=await connections.evaluate(async()=>{try{await fetch('https://home.nps.gov/common/components/nps/eventcalendar/EventCalendarService.cfc');return null}catch(e){return e.name}});
  check('Enforcing connect-src can block an otherwise usable event API',()=>assert.equal(connectionError,'TypeError'));
  await connections.close();
  console.log(`${passed} Ghost HTML-card checks passed${theme?' with downloaded Capital Weather theme CSS':''}`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
