// Offline regression suite. Run: node capital-weather-events-regression-tests.cjs
// Tests real functions extracted from the production HTML, not reimplementations.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||__dirname+'/capital-weather-events-scalable-browser-baseline.html','utf8');
const js=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function extract(start,end){const a=js.indexOf(start),b=js.indexOf(end,a);assert(a>=0&&b>a,`Missing ${start}`);return js.slice(a,b)}
const outdoorDefs=extract('const OUTDOOR=','/* Upcoming 7-day occurrences */');
const dateFns=extract('function validISO(iso){','function parseTime(x){');
const decoding=extract('function decodeEventText(value){','/* Filter controls */');
const context={console,URL,Map,Set,Date,Intl,
 clean:x=>String(x??'').replace(/<[^>]*>/g,'').trim(),
 norm:x=>String(x??'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g,''),
 days:['2026-10-24','2026-10-25','2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30'],
 localISO:d=>d.toISOString().slice(0,10),
 document:{createElement:()=>({set innerHTML(v){this._v=v},get value(){return this._v.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}})}
};
vm.createContext(context);
// Extract EXCLUDE from production too, because outdoor() uses it.
const exclude=js.match(/const EXCLUDE\s*=\s*\/[\s\S]*?\/[gimsuy]*\s*;/);
assert(exclude,'EXCLUDE regex unavailable');
vm.runInContext(dateFns+'\n'+exclude[0]+'\n'+outdoorDefs+'\n'+decoding+'\nthis.api={outdoor,decodeEventText,dedupe,validISO,parseDate};',context);
const {outdoor,decodeEventText,dedupe,validISO,parseDate}=context.api;
let n=0;function test(name,fn){try{fn();n++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e.message);process.exitCode=1}}
test('Valid date recognized',()=>assert.equal(validISO('2026-10-27'),true));
test('Invalid calendar date rejected',()=>assert.equal(validISO('2026-02-30'),false));
test('ISO date extraction',()=>assert.equal(parseDate('2026-10-27T18:00:00-04:00'),'2026-10-27'));
test('US date extraction',()=>assert.equal(parseDate('10/27/2026'),'2026-10-27'));
test('HTML numeric ampersand',()=>assert.equal(decodeEventText('Ghosts &#038; Exorcist Steps'),'Ghosts & Exorcist Steps'));
test('Nested HTML ampersand',()=>assert.equal(decodeEventText('Ghosts &amp;#038; Steps'),'Ghosts & Steps'));
test('HTML curly apostrophe',()=>assert.equal(decodeEventText('Children&#8217;s Festival'),'Children’s Festival'));
test('Outdoor street festival',()=>assert.equal(outdoor({title:'Neighborhood street festival',description:'',venue:'Main Street',address:'',categories:''}),true));
test('Outdoor road race',()=>assert.equal(outdoor({title:'Community 5K',description:'',venue:'',address:'',categories:''}),true));
test('Indoor museum event excluded',()=>assert.equal(outdoor({title:'Autumn Festival',description:'',venue:'History Museum',address:'',categories:''}),false));
test('Indoor theater excluded',()=>assert.equal(outdoor({title:'Theater performance',description:'',venue:'',address:'',categories:''}),false));
test('Cross-source dedupe and entity normalization',()=>{
 const events=[{title:'Ghosts &#038; Exorcist Steps',date:'2026-10-27',county:'District of Columbia',url:'https://a.example',source:'A'},
 {title:'Ghosts & Exorcist Steps',date:'2026-10-27',county:'District of Columbia',url:'https://b.example',source:'B'},
 {title:'Outside window',date:'2026-11-02',county:'District of Columbia',url:'https://c.example',source:'C'}];
 const result=dedupe(events);assert.equal(result.length,1);assert.equal(result[0].title,'Ghosts & Exorcist Steps');
});
console.log(`${n} checks passed${process.exitCode?' (failures above)':''}`);

// Direct-source pure helpers: execute the actual production definitions.
vm.runInContext(extract('function parseTime(x){','/* Address parsing:')+'\n'+extract('const VERIFIED_SOURCES=','/* Load public tourism, HSEMA, and Ticketmaster sources independently. */')+'\nthis.direct={verifiedOutdoor,verifiedRange,icalStamp,icalText};',context);
const {verifiedOutdoor,verifiedRange,icalStamp,icalText}=context.direct;
test('New sources reject festival at an indoor venue',()=>assert.equal(verifiedOutdoor({title:'Fall Festival',venue:'History Museum',description:''}),false));
test('Nature center requires explicit outdoor evidence',()=>assert.equal(verifiedOutdoor({title:'Mini-Creep',venue:'Nature Center',description:'Games and crafts'}),false));
test('Nature journaling explicitly outdoors qualifies',()=>assert.equal(verifiedOutdoor({title:'Nature Journaling',venue:'Nature Center',description:'Spend time outdoors observing seasonal details'}),true));
test('Negated outdoor claim excluded',()=>assert.equal(verifiedOutdoor({title:'Workshop',venue:'Nature Center',description:'Not outdoors; indoors only'}),false));
test('Cancelled outdoor event excluded',()=>assert.equal(verifiedOutdoor({title:'Canceled: Park Festival',venue:'City Park',description:'Outdoor festival'}),false));
test('CTY shared noon meridiem',()=>{const t=verifiedRange('12-3 pm each Saturday');assert.equal(t.start,'12:00');assert.equal(t.end,'15:00')});
test('CTY morning-to-afternoon meridiem',()=>assert.equal(verifiedRange('10-1 pm').start,'10:00'));
test('iCalendar escapes decoded',()=>assert.equal(icalText('Art\\, music\\; fun\\nMore'),'Art, music; fun More'));
test('iCalendar floating local time',()=>assert.equal(icalStamp('20261025T083000').time,'08:30'));
test('iCalendar all-day date has no invented time',()=>assert.equal(icalStamp('20261025',';VALUE=DATE').time,''));
test('iCalendar UTC converted to Eastern with date rollover',()=>{const t=icalStamp('20261025T020000Z');assert.equal(t.date,'2026-10-24');assert.equal(t.time,'22:00')});
test('iCalendar daylight-saving transition',()=>assert.equal(icalStamp('20261101T063000Z').time,'01:30'));
test('Unknown iCalendar timezone rejected',()=>assert.equal(icalStamp('20261025T083000',';TZID=Europe/Paris'),null));
test('Invalid iCalendar calendar date rejected',()=>assert.equal(icalStamp('20260230T083000'),null));
console.log(`${n} total regression checks passed${process.exitCode?' (failures above)':''}`);

// Editorial standard: neither the title nor a venue amenity proves activity location.
test('Park venue alone no longer establishes outdoor activity',()=>assert.equal(verifiedOutdoor({title:'Craft Class',venue:'Riverfront Park',description:''}),false));
test('Outdoor-sounding title alone is insufficient',()=>assert.equal(verifiedOutdoor({title:'Farmers Market',venue:'Shopping Center',description:''}),false));
test('Outdoor seating amenity is insufficient',()=>assert.equal(verifiedOutdoor({title:'Cocktail Workshop',venue:'Restaurant',description:'Our restaurant has outdoor seating.'}),false));
test('Parking availability is insufficient',()=>assert.equal(verifiedOutdoor({title:'Indoor concert',venue:'Community Center',description:'Free parking in the parking lot.'}),false));
test('Outdoor sub-event does not qualify mixed site-wide program',()=>assert.equal(verifiedOutdoor({title:'Holiday Celebration',venue:'Historic Estate',description:'A site-wide program of house tours and an exhibit. Join us outdoors for a separate farm activity.'}),false));
test('King and Rye requires current courtyard evidence',()=>assert.equal(verifiedOutdoor({source:'Visit Alexandria',title:'King & Rye: Cocktails & Crafts',venue:'King & Rye',description:'The activity will be held indoors.'}),false));
console.log(`${n} total checks after editorial review${process.exitCode?' (failures above)':''}`);
