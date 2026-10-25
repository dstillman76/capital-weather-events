# Verified outdoor coverage improvements — October 25, 2026

The complete copy-and-paste Ghost widget remains `capital-weather-events-scalable-browser-baseline.html`. No backend, service, proxy, deployment, build dependency, theme change or forecast module was added. The forecast note/icon was left alone as requested.

## Matched result

Frozen Eastern window: **October 25–31, 2026**, including all of today. Both complete widgets run in Chromium at `https://capitalweather.com`, with identical captured publisher responses and identical unavailable-source responses. Baseline is latest merged main, `6ad973272f9d3d538cc4ebedd6abaa3ada0e9aa7`. PR #4 is still unmerged; its HOWL-O-WEEN correction and tests are included in this branch so that correction is preserved.

**45 → 103 unique occurrences: 66 verified additions, eight removals/consolidations, net +58.** This is a controlled comparison, not a claim that every external calendar works or that 103 is a permanent daily target. The successful archived Reston transport is replayed for both versions, specifically to distinguish editorial exclusion from lost detail-page access. Unavailable calendars are not counted as genuine empty calendars.

| Source | Before | After | Additional verified occurrences | Recovery |
|---|---:|---:|---:|---|
| Georgetown BID | 0 | 17 | 17 | Direct Events Calendar API: patio music, garden trick-or-treat, steps light show; seven walking-tour dates with two explicitly published 90-minute departures per date |
| Visit Montgomery | 0 | 13 | 13 | Direct GeoDirectory occurrence API, both `today` and `next_7_days`; full descriptions, explicit same-day schedules, coordinates and addresses |
| FRESHFARM | 0 | 16 | 16 | Producer's current-year seasons, weekdays, actual hours and activity locations; 17 qualified market occurrences minus the existing Dupont occurrence |
| Visit Alexandria | 9 | 14 | 9 | Seven encampment dates, one Mount Vernon trick-or-treat, one Halloween bike tour; four untimed craft dates removed |
| Visit Prince William / ImGoing | 10 | 14 | 7 | Adventure trail, Chinn parking-lot trunk-or-treat, campfire, museum-lawn celebration; three explicitly stated battlefield tour departures; three older unsafe/duplicate records removed |
| NPS Rock Creek | 9 | 10 | 1 | Roosevelt hike: actual scenic trails in description |
| Prince George's Parks | 5 | 6 | 1 | River boat tour; description independently identifies Bladensburg Waterfront Park |
| Ticketmaster | 1 | 2 | 1 | Towson football at Unitas Stadium, actual 13:00 start, Baltimore County mapping |
| Capitol Hill BID | 0 | 1 | 1 | Separately authorized HOWL-O-WEEN correction from PR #4 |
| Reston Town Center | 1 | 0 | 0 | Mixed retail trick-or-treat excluded; discovery/transport preserved |
| Dupont / Rockville / NoMa / National Mall / FONA / Bethesda | 11 | 11 | 0 | Existing eligible occurrences preserved |

The 48 stronger audit candidates are represented within these additions. Extra recoveries include the 14 separately scheduled Georgetown tour sessions and three battlefield departures; HOWL-O-WEEN contributes one more. This does not admit the nine conditional audit candidates with inadequate clocks/evidence. Full event names, dates, times, evidence and links are in [the verified inventory](capital-weather-coverage-inventory-2026-10-25.md). Machine-readable results and exclusions are in [the test results](tests/coverage-results-2026-10-25.json).

## Existing occurrences removed or consolidated

- **King & Rye: Cocktails & Crafts, four dates:** courtyard evidence remains valid, including its indoor weather fallback, but this feed supplies dates without actual start times. Do not invent opening hours for the craft activity. Eligible again if a future feed supplies a reliable clock.
- **Fowl Players murder-mystery dinner, one:** restaurant/waterfront wording and fictional narrative are not evidence that diners participate outside.
- **Miss Kibbles dog trick-or-treat, one:** activity described around the store; outdoor operation not independently established.
- **Occoquan Costume Parade & Contest, one duplicate:** retain the better scheduled Costume Parade & Contest, 10:00–12:00, same date and Mill Street–River Mill Park route.
- **Reston Trick or Treat Beyond Market Street, one:** mixed participation in retail businesses; the retrieved description does not establish a separately scheduled outdoor-only activity. This is an intentional editorial exclusion, not a discovery or transport regression.

Additional source duplicates removed: three matching weekday Butler's Orchard festival aliases; one Haunted Grō/Gro Trail alias; one overlapping Dupont FRESHFARM occurrence; repeated GeoDirectory records across the two periods. **Two Butler's Orchard weekend date groups are entirely withheld** because two publisher records disagree on 09:00 versus 10:00 starts. Those conflicts cannot reappear during progressive rendering. The Gainesville market remains withheld because its API end time disagrees with its prose. The Barns at Wolf Trap is no longer in the outdoor venue matcher.

An indoor gallery/open-studio listing initially matched metaphorical language about a path. Regression coverage now rejects that case. Titles, generic categories, park names, free parking and outdoor seating alone do not qualify events.

## Discovery and diagnostics: all source entries

The old widget produces **27 diagnostic entries**, representing 25 publisher/calendar groups after accounting for overlapping Experience Prince George's and Annapolis feed/calendar paths. This branch replaces the existing Georgetown and Montgomery paths and adds FRESHFARM, producing **28 entries**. It does not introduce three duplicate publisher integrations.

`?` below means inaccessible/unmeasured, never zero. In-window counts are candidate records or schedule slots, before classification and deduplication. NPS expands multiple time slots; Georgetown's seven two-departure records generate seven additional checks. They should not be summed with displayed occurrence counts.

| Entry / path | Discovered | In-window checks | Shown after | Finding |
|---|---:|---:|---:|---|
| Dupont Circle BID | 26 | 25 | 3 | Direct CTY summaries; other summaries still require activity evidence |
| Capitol Hill BID | 6 | 4 | 1 | Direct CTY; narrowly reviewed publisher evidence for HOWL-O-WEEN |
| City of Rockville | 10 | 10 | 1 | Direct API; nine summaries lack qualifying activity evidence |
| NoMa BID | 1 season | 1 | 1 | Explicit producer season/weekly schedule |
| Visit Alexandria | 462 | 72 | 14 | Direct iCalendar plus publisher link index; six qualifying/conditional records lack clocks; mixed/indoor listings excluded |
| Georgetown BID | 74 | 81 | 17 | Direct rich API replaces failing proxy calendar path |
| Visit Montgomery | 128 raw | 92 unique date checks | 13 | Two API periods overlap; 11 repeated rows, malformed/multiday schedules, indoor/ambiguous events rejected; aliases/conflicts reduce 20 accepted candidates to 13 shown |
| FRESHFARM | 25 definitions | 25 weekly slots | 16 | 17 qualify; eight lack adequate activity-space evidence; Dupont overlaps |
| NPS Rock Creek | 20 records | 34 slots | 10 | Direct API; canceled dates, insufficient evidence and invalid schedules excluded |
| NPS National Mall | 21 records | 29 slots | 1 | Direct API; insufficient evidence and conflicting duration excluded |
| Prince George's Parks | 67 | 67 | 6 | Direct API; 61 records lack a reliable supplied/extractable location; do not invent venues |
| National Arboretum / FONA | 16 cards | 3 | 3 | Direct WordPress page; epochs must agree with Eastern start/end labels |
| Bethesda Urban Partnership | 16 | 16 | 1 | Direct API; 14 lack outdoor evidence and one lacks location |
| Visit Prince William / ImGoing | 96 records | 70 slots | 14 | Existing direct API; full activity descriptions, explicit departures and route/address deduplication |
| Ticketmaster | 200 results screened | 117 regional checks | 2 | Existing direct API; known outdoor sports/performance venues, actual clocks; TBA excluded |
| Reston Town Center | 65 selected URLs | 2 detail URLs / one distinct mixed activity | 0 | Same proxy retrieval, 30-detail cap, six-request batches; 28 fetched pages outside window; zero fixture fetch failures; discovery capped, not complete |
| Visit Fairfax RSS | ? | ? | 0 | Existing proxy access fails; not a zero-event result |
| Visit Loudoun RSS | ? | ? | 0 | Existing proxy access intermittent; see live observations below |
| Visit Frederick RSS | ? | ? | 0 | Existing proxy access fails |
| Experience Prince George's RSS | ? | ? | 0 | Existing proxy access fails |
| Experience Prince George's calendar | ? | ? | 0 | Overlapping fallback, existing proxy access fails |
| Visit Howard County RSS | ? | ? | 0 | Existing proxy access fails |
| Visit Annapolis RSS | ? | ? | 0 | Existing proxy access fails |
| Visit Annapolis calendar | ? | ? | 0 | Overlapping fallback, existing proxy access fails |
| Falls Church | ? | ? | 0 | Existing proxy access fails |
| Downtown Silver Spring | ? | ? | 0 | Existing proxy access fails; producer FRESHFARM now supplies the verified market |
| Rosslyn BID | ? | ? | 0 | Existing proxy access fails; producer FRESHFARM now supplies the verified market |
| DC HSEMA | ? | ? | 0 | Existing access failure |

Diagnostics now distinguish access failure, partial access, discovery caps, unmeasured coverage, missing location, missing schedule, conflicting schedule, insufficient activity evidence, indoor/mixed activity, cancellations, source duplicates, and true fetched zero-in-window results. Display counts are recomputed after cross-publisher deduplication. Partial pages remain visible. These are pipeline measurements, not an assertion that the entire publisher calendar was crawled.

## Browser access, performance and remaining gaps

New runtime requests use legitimate publisher APIs:

- `https://www.georgetowndc.com/wp-json/tribe/events/v1/events`
- `https://visitmontgomery.com/wp-json/geodir/v2/events`
- `https://www.freshfarm.org/wp-json/wp/v2/market`

Normal Chromium fetches from Capital Weather were used, with CORS enforced. Fixture responses deliberately carry CORS headers; **live** tests use actual publisher responses and do not intercept API requests. The optional managed-environment CA pin is narrowly scoped TLS trust, not a CORS or general certificate bypass.

Healthy current-window discovery adds six direct requests: Georgetown two pages, Montgomery three pages, FRESHFARM one. Montgomery uses projected fields, 50-row pages and one source-wide retry for transient network/5xx/timeout failure; never one retry per page. Its hard cap is five requests including retry, with three pages per period. Other new paths remain capped at four requests/three pages. Request timeout remains eight seconds. Existing three-source direct pool, five-worker legacy discovery, four-worker legacy enrichment and Reston's original limits remain. No new detail-page enrichment or proxy dependency is introduced. First cards do not wait for Montgomery or failed legacy sources.

Live totals fluctuate. One baseline run returned **95**, including **51 Visit Loudoun occurrences**, through an intermittently successful existing proxy. Later runs could not retrieve that feed. Many of those 51 have no clocks, and season-wide ranges were previously expanded into daily occurrences without proof. The RSS fallback now requires an actual time and explicit recurrence/daily evidence or a single date. We cannot count all 51 as code-caused removals when the after-run feed was inaccessible. This is why the controlled 45→103 comparison is the attribution result.

A healthy after-run returned **100**, with all 13 direct paths successful, first cards at **1.17 s**, all queues complete at **34.26 s**. The baseline observation took **41.79 s**, first cards **0.76 s**. These are individual network observations, not a performance benchmark: response caching, feed changes and proxy outages differ. In other observations, Montgomery timed out on later pages (four or ten verified events retained), and the existing Ticketmaster request failed once. These partial failures are visible, not silent zero calendars. One bounded retry was added after this testing. The final www-origin run also returned **100**, with all 13 direct paths successful, first cards at **0.59 s** and all queues complete at **33.47 s**. See [the saved live results](tests/coverage-live-results-2026-10-25.json) for hostname-specific observations.

The controlled fixture keeps a delayed market response to test progressive rendering and verifies the old/new totals under the same inputs. Its wall times are simulated-network test measurements, not production forecasts.

Remaining exclusions: Montgomery Parks RSS/calendar/AJAX and Fairfax Park Authority feeds remain blocked from browser access; readable server responses are not sufficient. Their actual event data cannot be safely integrated here without an architectural discussion. Visit Montgomery supplies four verified parks train occurrences independently. Ambiguous museum/estate programs, untimed patio activities, unspecified venues and TBA sports remain excluded. FRESHFARM uses only explicit year-qualified seasons, honors enabled closure notices and date-ranged winter hours, and ignores disabled stale banners. Older proxy-based discovery remains fragile; no new proxy or backend was added to mask it.

## Validation and review boundaries

- `npm test`: **44** regression checks.
- `npm run test:browser`: **121** fixture Chromium checks (29 round 1, 32 round 2, 17 neighborhood, 43 coverage).
- `npm run test:ghost`: **16** Ghost HTML-card checks, including 320/390px layouts and negative CSP checks.
- `npm run test:coverage:live`: real apex and www Capital Weather-origin requests, CORS enforced; all 13 direct paths succeeded in the final runs; see the live result artifact for source successes/errors.
- Coverage tests exercise two actual walking-tour departures, three start-only battlefield departures, aliases, persistent conflicting schedules, disabled/enabled closures, explicit winter hours, missing clocks, gallery/indoor/mixed exclusions, RSS date-range safety, transient retry and persistent later-page failure isolation.
- Event selection, day navigation, filters, details and mobile layout remain intact. Tests validate the `cw:event-selected` payload; rendered hourly forecasts still require the separate existing forecast module on the private Ghost page.

No merge, publication, Ghost edit or deployment was performed.
