# Neighborhood coverage fixtures

Retrieved October 25, 2026, for the October 25–31 Eastern-time window.

- `hill.html`: actual `https://xapi.citylightstudio.net/_bbq/_bbq_results.php?fid=19&key=106243126&bbqparam=10-25-26-to-10-31-26` response, including the user's HOWL-O-WEEN record with no venue or description, indoor listings, and undated ongoing rows.
- `dupont.html`: same direct API with `fid=65`, all returned summaries preserved.
- `howl-detail.html`: the complete `<main>` from `https://capitolhillbid.org/do/howl-o-weendog-costume-contest`, documenting the separately reviewed date, 1–3 p.m. contest, noon registration, Lincoln Park activity location and vendors. Site navigation/scripts omitted.

These are tests and editorial provenance, not runtime calendars. The production widget still requires the dated live feed to return the contest. The activity review cannot manufacture an occurrence, supply absent start/end times, carry over to another URL/venue, or approve a future year's event. `npm run test:neighborhood` exercises the actual widget, and its `--live` option uses real publisher requests from `https://www.capitalweather.com` with normal CORS enforcement. The fixture clock freezes October 25; this targeted live reproduction also freezes that window deliberately, rather than claiming a timeless current-event check.
