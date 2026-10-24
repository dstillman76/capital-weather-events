// Offline regression suite. Run: node capital-weather-events-regression-tests.cjs
// Tests real functions extracted from the production HTML, not reimplementations.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||__dirname+'/capital-weather-events-quality-baseline.html','utf8');
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
