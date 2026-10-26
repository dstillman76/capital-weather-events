# Daily events collector

`collect.mjs` runs on GitHub Actions once a day, at about 3 a.m. Eastern (`.github/workflows/collect.yml`) and writes
`collector/data/events.json`. From v22, the widget reads that file. If the file is missing, unreadable
or more than 36 hours old, the widget ignores it and uses its own sources.

## Why it exists

Some sources can't be read in full from a reader's browser:

| Source | Browser limitation | What the collector does |
|---|---|---|
| Visit Fairfax, Visit Loudoun, Visit Frederick, Experience Prince George’s, Visit Howard County, Visit Annapolis | The RSS feed stops at 30 items, sorted alphabetically. The date search answers only the site's own page; scripted requests get HTTP 403. | Reads the public sitemap and opens each event page, which states its own dates, times, venue and address. |
| Montgomery Parks | The calendar feed answers only POST requests, which the free CORS relay doesn't forward. robots.txt also disallows that feed. | Reads the public events sitemaps and the event pages they list (each page states "Time:" and "Location:"). |

A second step (`screen.mjs`) runs the widget itself in headless Chromium, for sources that are slow or
unreliable in readers' browsers: the nine extra NPS parks, Visit Alexandria (its calendar file is too large for the browser), Prince
George's Parks, Visit Montgomery, Visit Fredericksburg, Reston Town Center and Downtown Silver Spring. In
this mode (`window.CW_COLLECT_MODE`), the widget loads only those sources, goes direct to each
publisher and collects an eighth day. It applies its own checks as usual. The results go in `screened` in
the events file.

In the browser, when `screened` is fresh and a source completed there, the widget uses those events and
skips loading that source. Otherwise, for example when the file is stale or the source failed in the
collector, the widget loads the source live as before.

For example, on 2026-10-25 Visit Fairfax's sitemap listed 386 events. Fifty-eight fell in the coming
week, and only 2 of those were in its 30-item feed.

## Rules it follows

- It reads only pages that `robots.txt` allows, and waits the `Crawl-delay` between requests (at least
  1 second, 2 seconds by default). It makes one request at a time per site.
- It identifies itself in its user agent.
- It caches every page it opens, in the GitHub Actions cache rather than the repository. A page is opened again only when its sitemap `lastmod` changes,
  when a recurring event's next date has passed, or a week after the last visit.
- A run opens at most 500 pages per site and stops opening pages after 40 minutes. The first run
  might not reach every page; later runs pick up where it left off.
- It never works around refusals. If a site answers 403 to five pages in a row, that site stops
  for the run and is reported as `blocked`.
- If a source fails, its previous records are kept until their dates pass.

## What it records

The collector does no outdoor screening. Each record has what the publisher's page states:

- title, link and in-window dates
- start and end time
- venue, address, city and state
- coordinates
- description, categories and recurrence

The widget then applies its usual date, location, outdoor and duplicate checks. Events whose span
covers more than three days with no daily schedule are left out, as they are in the widget.

## Running it locally

```sh
node collector/collect.mjs              # needs Node 20+
node collector/test/parse.test.mjs
node collector/test/robots.test.mjs
```

To run it now on GitHub, open Actions → **Collect events** → **Run workflow**.
