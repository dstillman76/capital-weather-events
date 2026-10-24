# Capital Weather — event source extraction audit
Date: 2026-10-24

## Status definitions
- **Real-event evidence**: live public event pages/calendars display actual dated events. Does NOT establish that a browser on capitalweather.com can fetch and parse them.
- **Browser verified**: successful cross-origin fetch and extraction in browser on capitalweather.com. None of the new sources below meet this bar yet.

| Source | Actual records observed | Recommended extraction | Critical concerns | Browser verified |
|---|---|---|---|---|
| NoMa BID | PumpkinPalooza, Oct 28 at Alethia Tanner Park; NoMa Farmers Market Thursdays through Oct 29 | Fetch `/annual-events/`, extract linked event pages; parse recurrence separately | Homepage and annual-events page show human-readable records but generic schema/card parser yielded zero; verify CORS and recurring dates | No |
| Dupont Circle BID | Music in the Circle: Oct 24 and Oct 31 noon–3; Fall Festival Oct 31 | Fetch `/events/calendar` or links under `/do/`; parse labeled 'Dates and Times', including multiple occurrences | Fall Festival page has conflicting 1–3 and 1–4 times; prefer primary displayed schedule and flag conflicts | No |
| Visit St. Mary's | Harvest Festival Oct 25 1–4; Autumn Harvest Oct 24/25; Farm of Screams Oct 24,29,30 | Paginated `/events/?page=N`, linked detail pages; parse 'Upcoming Dates For This Event' | Listing dates may be a series start, not upcoming occurrence; filter individual occurrences | No |
| City of Rockville | Official calendar lists Oct 24 Mini-Creep and Oct 25 Nature Journaling | Fetch `/calendar/` and parse dated listing links; detail page for venue/time | Outdoor status not guaranteed (nature center can be indoors); check location and event description | No |

## Important observations
- Generic one-page schema/card extraction failed for all 27 candidate sources in the Ghost diagnostic test. Treat this as a failed experimental expansion, not 27 working adapters.
- Browser-side CORS must be established independently. A public webpage viewable in a search engine is not proof that `fetch()` from capitalweather.com is permitted.
- The execution environment for this audit could not resolve external hosts via direct Python requests, so no live browser-compatible HTTP/CORS test could be completed here. Do not activate new sources solely on this audit.
- Existing production sources should stay enabled; unverified experimental sources should remain disabled to protect speed.

## Source references
- https://nomabid.org/annual-events/
- https://nomabid.org/annual-events/pumpkinpalooza/
- https://dupontcirclebid.org/do/music-in-the-circle-fall-2026-concert-series
- https://dupontcirclebid.org/do/dupont-fall-festival-pumpkin-patch-and-bluegrass-jamboree
- https://www.visitstmarysmd.com/events/
- https://www.visitstmarysmd.com/events/harvest-festival-lexington-manor-passive-park-2026/
- https://www.visitstmarysmd.com/events/autumn-harvest-on-the-farm-2026/
- https://www.rockvillemd.gov/calendar/

## Acceptance gates before merging
1. Actual calendar/event endpoint identified.
2. Real dated records extracted from response fixtures with recurrence, times, entity decoding and outdoor status tests.
3. Cross-origin fetch from Ghost site succeeds (or an explicitly approved fallback is implemented).
4. Timeouts, request budget, concurrency and initial render latency are measured.
5. Only verified sources enabled; each new source reports discovered/parsed/in-range/outdoor/unique/shown counts.
