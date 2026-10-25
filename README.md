# Capital Weather events widget

`capital-weather-events-scalable-browser-baseline.html` is the complete HTML/CSS/JavaScript widget for embedding in the existing page. It remains entirely browser-side. This repository does not deploy the widget.

The expansion adds direct-CORS adapters for Dupont Circle BID, Capitol Hill BID, City of Rockville, NoMa BID's farmers market, and Visit Alexandria. Existing sources and the `cw:event-selected` contract used by the hourly forecast are retained.

See [the source investigation and validation report](capital-weather-source-expansion-2026-10-24.md) for all 12 investigated calendars, counts, evidence, limitations, and live results. The older audit is historical. The [editorial review](capital-weather-editorial-review-2026-10-24.md) documents the activity-level check of all original 18 occurrences, removal of Countdown, and the revised 17-occurrence count.

To run tests with Node 20 or later:

```sh
npm ci
npm test
npm run test:browser
npm run test:live
```

The browser runner uses `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installed Chromium executable. Fixture tests mock publisher responses and freeze the date to October 24, 2026. Live tests use the current date and real publisher requests, with browser CORS enforcement enabled; availability and counts naturally change.

In a managed environment that uses a TLS inspection CA, configure Chromium to trust that CA. The optional `CWE_TEST_CA_SPKI` variable accepts its public SPKI SHA-256 pin; the runner never disables CORS or general TLS verification. Live requests use the inherited HTTPS proxy. No credentials are needed for the five new adapters.

The source diagnostics show discovery, parsing, date-window, outdoor, unique-occurrence, displayed-count, timing, and request counts for each new source. Each request has an eight-second deadline. Three workers load new sources independently of the existing source queues; Rockville has a three-page cap and Alexandria uses two requests. No new public CORS proxy, backend, paid API, deployment, or event-data snapshot is used at runtime.
