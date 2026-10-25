# Coverage replay fixtures

Public publisher responses captured during the October 25, 2026 investigation. These files are used only by tests; the widget fetches current schedules at runtime. WordPress/Events Calendar, NPS, iCalendar, ImGoing and Ticketmaster fixtures preserve consumed fields and full activity descriptions. Unused image/marketing metadata was removed. The Visit Montgomery responses retain every captured row and are partitioned into the same 50-row pages used at runtime. Banner-enabled flags are merged from a separate verified FRESHFARM REST projection.

`reston-cassette.json.gz.b64` is gzip-compressed UTF-8 JSON mapping actual publisher URLs to captured HTML, encoded as base64 to keep repetitive HTML small. Node's built-in zlib reads it in tests only. The fixture routes replay the existing proxy transport, 65 selected URLs and 30-detail budget for both implementations. It does not add a production transport or event list.

The complete-widget comparison uses merged main 6ad973272f9d3d538cc4ebedd6abaa3ada0e9aa7 versus the working HTML, a frozen October 25–31 Eastern window and the same publisher inputs. Sources without captured successful responses fail consistently in both versions. It is a controlled attribution test, not a claim that uncaptured sources are always offline. Live Chromium checks separately test real CORS from the requested Capital Weather origin.

Run `npm run test:coverage`. See the investigation report and `tests/coverage-results-2026-10-25.json` for the 45→103 result, source counts, evidence, exclusions and testing limits.
