# Live-source fixture provenance

Retrieved October 24, 2026 from the official public calendar endpoints below. These are parser regression fixtures, not runtime event data. Dates are frozen in the fixture browser suite.

- `dupont-xapi.html`: `https://xapi.citylightstudio.net/_bbq/_bbq_results.php?fid=65&key=106243126&bbqparam=` (the public URL used by Dupont Circle's calendar).
- `hill-xapi.html`: same public endpoint with `fid=19` (Capitol Hill's calendar).
- `rockville.json`: `https://www.rockvillemd.gov/wp-json/tribe/events/v1/events?per_page=50&start_date=2026-10-24&end_date=2026-10-30`. Unused WordPress metadata removed; all returned event records preserved with fields consumed by the adapter.
- `noma.json`: `https://nomabid.org/wp-json/wp/v2/pages?slug=farmersmarket&_fields=id,link,title,content`. Contains the exact two schedule paragraphs, page ID, title and link; vendor catalogue omitted.
- `alexandria.ics`: `https://visitalexandria.com/wp-json/ical/v1/events/all`. The 75 explicit occurrences starting October 24–30, including duplicate and indoor records. Preserves the publisher's literal escaped CRLF transport and RFC line folding.
- `alexandria-index.json`: `https://visitalexandria.com/wp-json/wp/v2/pages?slug=events-sitemap&_fields=id,link,content`. Publisher-generated event title/link index, used to replace stale third-party booking URLs.

Fixture tests exercise the functions extracted from the actual widget, browser UI interactions, progressive rendering, source failures, deadlines, Eastern time conversion, seasonal recurrence boundaries and deduplication. No hand-authored upcoming events are supplied to the widget.

The editorial revision intentionally retains Countdown to the Holidays in the raw fixture as a negative case. The updated expected result is 17 occurrences; King & Rye remains a positive case because the organizer explicitly reserves outdoor courtyard tables, with an indoor weather fallback shown in the UI.
