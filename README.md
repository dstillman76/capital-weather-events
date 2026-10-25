# Capital Weather events widget

`capital-weather-events-scalable-browser-baseline.html` is the complete HTML/CSS/JavaScript widget for embedding in the existing page. It remains entirely browser-side. This repository does not deploy the widget.

**Installing in Ghost:** follow [the private-page installation and testing guide](GHOST-TESTING.md). Copy the complete HTML file above into one HTML card. Hourly forecasts require the separate existing Capital Weather forecast module; they are not bundled in this events file. `npm run test:ghost` checks HTML-card embedding.

Round 1 added direct-CORS adapters for Dupont Circle BID, Capitol Hill BID, City of Rockville, NoMa BID's farmers market, and Visit Alexandria. Round 2 adds Rock Creek Park/NPS, National Mall/NPS, the National Arboretum through FONA, Prince George’s Parks, and an upgrade of Bethesda’s existing source to its direct API. All five round-1 integrations and the `cw:event-selected` contract used by the hourly forecast are retained.

See [the round-2 investigation and validation report](capital-weather-source-expansion-round2-2026-10-25.md) for all 20 investigated sources, browser evidence, the 19-occurrence net addition, and limitations. The earlier [round-1 investigation and validation report](capital-weather-source-expansion-2026-10-24.md) covers all 12 investigated calendars, counts, evidence, limitations, and live results. The older audit is historical. The [editorial review](capital-weather-editorial-review-2026-10-24.md) documents the activity-level check of all original 18 occurrences, removal of Countdown, and the revised 17-occurrence count.

To run tests with Node 20 or later:

```sh
npm ci
npm test
npm run test:browser
npm run test:live
```

The browser runner uses `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installed Chromium executable. Fixture tests mock captured publisher responses; round 1 freezes October 24 and round 2 freezes October 25, 2026. `npm run test:browser` runs both suites; `npm run test:round2` runs the round-2 suite alone. Live tests use the current date and real publisher requests, with browser CORS enforcement enabled; availability and counts naturally change.

In a managed environment that uses a TLS inspection CA, configure Chromium to trust that CA. The optional `CWE_TEST_CA_SPKI` variable accepts its public SPKI SHA-256 pin; the runner never disables CORS or general TLS verification. Live requests use the inherited HTTPS proxy. No credentials are needed for either round’s direct adapters.

The source diagnostics show discovery, parsing, date-window, outdoor, unique-occurrence, displayed-count, timing, and request counts for each new source. Each request has an eight-second deadline. Three workers load new sources independently of the existing source queues; Rockville has a three-page cap and Alexandria uses two requests. The round-2 sources share the same three workers, have a three-page maximum, and require six healthy requests in the verified window. Explicitly timed round-2 sessions retain separate time/venue identities; established sources keep their prior deduplication semantics and win cross-source overlaps. No new public CORS proxy, backend, paid API, deployment, or event-data snapshot is used at runtime.
