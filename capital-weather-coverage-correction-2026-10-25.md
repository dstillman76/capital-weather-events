# Missing HOWL-O-WEEN event: diagnosis and correction

Based on merged main `6ad973272f9d3d538cc4ebedd6abaa3ada0e9aa7` (including PR #3). Nothing is deployed or edited in Ghost.

## The reported miss is real

[HOWL-O-WEEN Dog Costume Contest](https://capitolhillbid.org/do/howl-o-weendog-costume-contest) is scheduled for **October 31, 2026, 1–3 p.m. at Lincoln Park, Washington, DC**. Registration starts at **noon**; it is not the contest's start time. The publisher places the actual contest, registration and local vendors at Lincoln Park—not merely a venue with outdoor amenities. The detail page was retrieved HTTP 200 and read for activity-level evidence.

The Capitol Hill CTY feed successfully returns this dated record, but supplies only its title, link and `1pm - 3pm`. Both venue and description are missing. The previous parser sent this empty description through the outdoor classifier, which rejected it. No explicit review matched either, so the widget displayed zero Capitol Hill events for this window despite a successful request. This was a **classification/metadata coverage failure**, not a missing calendar record or network outage.

The publisher's detail page has no ACAO header and Chromium fetch from `https://www.capitalweather.com` fails with **`TypeError: Failed to fetch`**. It cannot simply be crawled in visitors' browsers. The CTY calendar API has ACAO `*` and succeeds in normal Chromium. Server-side ability to read the details is not browser compatibility.

## Correction and scope

The existing activity-review mechanism now records this publisher-confirmed contest and its omitted location. The calendar must still return its actual occurrence, date and start/end times. Review enrichment supplies Lincoln Park and a description/registration note, while preserving the live 1–3 p.m. schedule. Matching is restricted to source, normalized title, exact publisher URL, the reviewed missing/Lincoln Park venue, and the reviewed October 31 date. Missing times, an altered venue/URL, absent calendar record or later year's event fail closed.

This is **reviewed metadata enrichment**, not a standalone calendar or a list of fabricated occurrences. It is also a bounded manual correction: it does not solve automatic detail verification for every future CTY event. No additional request, source, proxy, backend, new concurrency pool or weather implementation is introduced. Existing reviews and integration behavior remain intact.

Diagnostics now expose the number of CTY summaries without reviewed outdoor evidence, instead of letting an HTTP-success/zero-outdoor count conceal the coverage limitation. The number includes clearly indoor and ambiguous records; it is **not** a count of known missed outdoor events. In this window Capitol Hill has three such dated summaries after accepting the contest.

## Nearby omissions examined

- **Eastern Market Pottery Fall Student Sale:** the detail page describes shopping and wheel-throwing demonstrations at the pottery studio but does not identify an outdoor activity area. Retained as excluded; proximity to Eastern Market's outdoor vendors is not enough.
- **Dupont Little Flea:** the BID page lists the marketplace at Diego's Hair Salon without saying it occurs outside. The organizer confirms Sunday 10 a.m.–3 p.m. at 19th/Q, but the retrieved text did not establish the physical outdoor activity space. No automatic approval based on “flea market” or an assumed sidewalk.
- **Dupont Fall Festival, Pumpkin Patch, and Bluegrass Jamboree:** outdoor activities in Dupont Circle Park are clear, but the feed/detail date header says 1–3 p.m. while the description says 1–4 p.m. It remains excluded pending reliable schedule clarification, rather than silently inventing an end time. This is a genuine candidate for follow-up.
- **How on Earth? LIVE!:** the full page describes a Spooky Action Theater matinee/live studio audience. Excluded as indoor.
- Remaining Capitol Hill dated records are a bookshop author event and restaurant anniversary promotion; the ongoing Folger entries have no individual date in this feed. No invented daily recurrence was added.

The two neighborhood feeds intentionally return brief summaries, not full event descriptions. With the current browser-only architecture, generic text rules alone cannot make their outdoor coverage complete. Expanding activity reviews can recover verified misses, but a generally browser-readable, richer publisher feed would be needed to automate this reliably. The current diagnostics and reports should not be interpreted as proof that every outdoor event in a neighborhood is represented.

## Verification

- **41 regression checks** passed.
- **61 previous fixture Chromium checks** passed, preserving both expansion rounds and their editorial exclusions.
- **17 new neighborhood fixture checks** passed: reported event recovered, actual date/times/location, visible noon registration, forecast payload, existing Dupont events retained, no extra requests, missing-data/changed-venue/changed-URL/expiry guards, mobile fit and no script errors.
- **12 targeted live Chromium checks** passed against both CTY APIs from `https://www.capitalweather.com`, with CORS enforced. The replay window is deliberately October 25–31, 2026. Four outdoor occurrences are returned across these two feeds: the same three Dupont records plus this Capitol Hill occurrence, versus three before the fix. This is **one verified additional occurrence**, not a claim that all other omissions are fixed.
- **7 full-widget live Chromium checks** also passed from `https://www.capitalweather.com`; all ten direct paths succeeded and the contest was present. The run returned 104 total occurrences, including 57 from the unchanged Visit Loudoun legacy path, which had failed in earlier runs. This change only establishes **one net CTY correction**; the higher overall count is not attributed to this code and all legacy results have not been newly editorially audited. First card: 766 ms; queues complete: 39.04 seconds. A sanitized snapshot is in `tests/neighborhood-live-results-2026-10-25.json`.
- **16 Ghost HTML-card checks** passed. The same complete HTML file is still the Ghost artifact; PR #3's CSS scoping and forecast-module limitation remain unchanged.

Tests are available through `npm test`, `npm run test:browser` (now includes the new neighborhood suite), `npm run test:ghost`, and `npm run test:neighborhood -- --live`. Fixture provenance is in `tests/fixtures/neighborhood-coverage/README.md`. Counts depend on date, filtering and publisher availability. No live deployment is part of this correction.
