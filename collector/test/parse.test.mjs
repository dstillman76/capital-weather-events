import {simpleviewDates, parseSimpleviewPage} from '../collect.mjs';
import assert from 'node:assert/strict';
const t=(a,b,c,exp)=>assert.deepEqual(simpleviewDates(a,b,c).dates,exp,JSON.stringify([a,b,c]));
t('November 7, 2026','Saturday, November 7, 2026 9:00 AM','Saturday, November 7, 2026 11:00 AM',['2026-11-07']);
t('10/31/2026, 11/28/2026','x','y',['2026-10-31','2026-11-28']);
t('10/26/2026, 10/27/2026, 10/28/2026','','',['2026-10-26','2026-10-27','2026-10-28']);
t('November 16, 2026 - November 22, 2026','','',[]);t('November 16, 2026 - November 18, 2026','','',['2026-11-16','2026-11-17','2026-11-18']);
t('','Tuesday, October 27, 2026 12:00 PM','Tuesday, October 27, 2026 1:30 PM',['2026-10-27']);
t('','October 25, 2026','October 26, 2026',['2026-10-25']);
const html=`<html><h1>X</h1><script>var instanceId = "abc"; var cityStateZip = "Mount Rainier, MD 20712"; var streetAddress = "3309 Bunker Hill Road";
var dates = ""; var startDate = "Tuesday, October 27, 2026 12:00 PM"; var endDate = "Tuesday, October 27, 2026 1:30 PM"; var time = "12:00 PM to 1:30 PM";
var data = {"latitude":38.93,"longitude":-76.96,"recid":"30946","location":"Joe's Movement Emporium","title":"Acupuncture &amp; Bodywork","categories":[{"catName":"Ongoing","catId":"54"}],"recurrence":"Recurring weekly on Tuesday","description":"<p>Discover {the} \\"healing\\" power</p>","expired":false,"past":false,"city":"Mount Rainier"};</script></html>`;
const r=parseSimpleviewPage(html,'https://x/event/a/1/',{name:'S',county:'C',state:'MD'});
console.log(r);
assert.equal(r.time,'12:00');assert.equal(r.endTime,'13:30');assert.equal(r.city,'Mount Rainier');assert.equal(r.title,'Acupuncture & Bodywork');assert.deepEqual(r.dates,['2026-10-27']);assert.equal(r.address,'3309 Bunker Hill Road, Mount Rainier, MD 20712');
const p=parseSimpleviewPage('<script>var startDate = "Sunday, December 13, 2026 4:00 PM"; var endDate = "December 13, 2026"; var time = "4:00 PM"; var data = {"recid":"5","title":"Carol","expired":false}</script>','u',{name:'S',county:'C',state:'MD'});
assert.equal(p.time,'16:00');assert.equal(p.endTime,'');
assert.equal(parseSimpleviewPage('<script>var data = {"recid":"6","title":"Old","expired":true}</script>','u',{}).skip,'expired');
// Newer template (Visit Howard County): navigation "var data" first, then eventData + info list.
const hw=`<script>var data = {"template":"nav","items":[{"title":"Places to Stay"}]};</script>
<ul><li class="" data-name="location"><span class="info-list-label">Location:</span><span> Horowitz Center </span></li>
<li data-name="address"><span>Address:</span><span> Howard Community College 10901 Little Patuxent Parkway, Columbia, MD 21044</span></li>
<li data-name="dates"><span>Dates:</span><span> November 11, 2026 </span></li><li data-name="time"><span>Time:</span><span>5:30 PM to 8:30 PM</span></li></ul>
<script>var eventData = {"_id":"x","recid":"23547","title":"Night of Leadership","city":"Columbia","location":"Horowitz Center","latitude":39.2,"longitude":-76.8,"startDate":"2026-11-11T05:00:00.000Z","expired":false,"past":false};</script>`;
const h=parseSimpleviewPage(hw,'u',{name:'Visit Howard County',county:'Howard County',state:'MD'});
console.log(h);
assert.equal(h.title,'Night of Leadership');assert.deepEqual(h.dates,['2026-11-11']);assert.equal(h.time,'17:30');assert.equal(h.endTime,'20:30');
assert.equal(h.address,'Howard Community College 10901 Little Patuxent Parkway, Columbia, MD 21044');assert.equal(h.state,'MD');assert.equal(h.venue,'Horowitz Center');
console.log('ok');
const {parseMontgomeryParksPage}=await import('../collect.mjs');
const mp=`<h1 class="t">School's Out Sport Days</h1><meta property="og:description" content="No school? No problem!" />
<div class="content"> <strong>Time:</strong> <div class="date">Tuesday, November 3, 2026</div> <div class="time">9:00AM - 5:00PM</div> </div> </div>
<div class="location event-meta-item"> <div class="icon"><svg></svg> </div> <div class="content"> <div><strong>Location:</strong></div> <div>Wheaton Sports Pavilion</div><p>11751 Orebaugh Avenue<br /> Wheaton, MD 20902</p> </div> </div>`;
const m=parseMontgomeryParksPage(mp,'u',{name:'Montgomery Parks',county:'Montgomery County'});console.log(m);
assert.deepEqual(m.dates,['2026-11-03']);assert.equal(m.time,'09:00');assert.equal(m.endTime,'17:00');assert.equal(m.venue,'Wheaton Sports Pavilion');assert.equal(m.city,'Wheaton');assert.equal(m.address,'11751 Orebaugh Avenue, Wheaton, MD 20902');
const lr=parseMontgomeryParksPage(mp.replace('Tuesday, November 3, 2026','Saturday, September 26, 2026 - Saturday, October 31, 2026'),'u',{name:'x'});assert.deepEqual(lr.dates,[]);assert.equal(lr.dateKind,'long-range');
console.log('mp ok');
const mc=parseMontgomeryParksPage(`<h1>McCrillis Gardens Fall Tour</h1><div class="content"> <strong>Time:</strong> <div class="date">Wednesday, October 28, 2026</div> <div class="time">1:00PM - 2:00PM</div> </div> </div> <div class="location event-meta-item"> <div class="icon"></div> <div class="content"> <div><strong>Location:</strong></div> <div>McCrillis Gardens</div> </div> </div>`,'u',{name:'Montgomery Parks',county:'Montgomery County'});
assert.equal(mc.venue,'McCrillis Gardens');assert.equal(mc.address,'');console.log('mp2 ok');
