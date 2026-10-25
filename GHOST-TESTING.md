# Test the outdoor events widget in Ghost

## The file to copy

Use **`capital-weather-events-scalable-browser-baseline.html`**. Despite its historical “baseline” name, this is the complete, current widget, including both expansion rounds. Use the version on this pull request's branch until it is merged; afterward use `main`.

Open that file on GitHub and choose **Raw**. Select and copy **all** the text, including the `<style>` and `<script>` sections and the closing `</script>`. Do not copy GitHub's surrounding page, Markdown code fences, a report, or a test fixture. There is no separate Ghost build or second widget file.

The events widget is self-contained HTML, CSS and JavaScript: no installation, compilation, plugin, server, or backend is needed. It does need JavaScript enabled and an internet connection to its event providers. Some older sources already use public proxies and can fail; those dependencies have been preserved, not newly introduced. The existing Ticketmaster browser key is already embedded in the file and is visible to visitors; do not paste private credentials into the card.

**Hourly weather is separate.** This file sends the selected event's date, times and location to Capital Weather's existing hourly forecast module. It does not contain that module, a weather-data service, or a forecast display. Events can work perfectly while no hourly forecast appears. See the forecast checklist below before marking the whole page ready.

## Install on an unpublished test page

1. In Ghost Admin, open **Pages** and create a **new page**. Do not open or edit the existing live events page. Give the draft an obvious title such as “Outdoor events — private test.”
2. Leave the page as a **draft**. Add an **HTML** card using the editor's plus button (or type `/html`). Use a regular HTML card, not a code/Markdown card, bookmark, or iframe.
3. Paste the complete file into that one card. Use **one copy per page**. Do not add it to site-wide Code Injection, your theme, or the live widget.
4. Save the draft, then use **Preview** and open the **web preview in a separate browser tab**. Test there. An empty or inactive card in the editing screen does not prove the widget is broken: the editor is not the visitor page. Do not use an email preview; email does not run this JavaScript.
5. Keep the page unpublished. A Ghost preview link can grant access to anyone who has the link; share it only with trusted testers. A draft preview is not a password-protected published page. Do not publish an “unlisted” page as a substitute.
6. If the preview offers a shareable web-preview link, open it on your phone too. Otherwise use the preview's mobile view as an initial check, then arrange an authorized phone preview. No theme or live-site changes are required for this step.

After changing the card, save and reopen or refresh the web preview. Ghost versions and theme options vary; if your preview does not execute HTML-card scripts, stop at the draft and have the site administrator inspect the preview. Publishing is not required or authorized by this guide.

## What to test

| Check | What to do | What should happen |
|---|---|---|
| Loading | Open the web preview with filters cleared. Wait for the first cards, then allow about a minute for slower sources. | Cards appear progressively. One failed calendar should not erase other events. A “loading” message should eventually settle. |
| Listings | Check several events across DC, Maryland and Virginia. Follow each card's source link. Compare date, time, activity and location with the publisher. | Links open a separate tab. Activities really occur outdoors; weather fallback/cancellation notes remain visible. Do not treat a park name alone as proof. |
| Geographic and type filters | Try State, County, City and event type, then clear them. Try a search term. | Matching cards change; clearing filters restores them. An empty day/filter can be legitimate. |
| Dates | Click Today, each later day and Weekend. | The active tab and card dates match. Weekend means Friday/Saturday/Sunday within the current seven-day window. Dates/times are Eastern. Refresh after midnight to start a new window. |
| Details | Click an event title/card, then Show details and Hide details. | Selection highlights the correct card. Details show that event's available schedule, place, description, publisher link and weather notes. No page reload occurs. |
| Scrolling | On desktop, use the arrows and scroll the cards. On a phone, swipe the row. | Desktop retains three columns with vertical scrolling; phone cards scroll horizontally. New selections still show the right details. |
| Phone layout | Check portrait and landscape, ideally on a real phone, plus a narrow browser window. | State/County/City, day tabs, search, cards and details are usable. The whole page should not scroll sideways, although the cards deliberately do. Source links and details controls remain tappable. |
| Surrounding page | Look at the title, navigation, nearby text, links and other buttons. | Their styling and behavior are unchanged. If the content column is too cramped, ask about a **draft-only** wider page template; do not change the live theme. |
| Source health | Click Show source diagnostics. | The ten direct paths from rounds 1/2 should complete or show a specific error. A valid zero-event result is different from a failed fetch. Report failures with the source name and exact message. |

Counts change with the date, filters and publisher updates. The October 25–31, 2026 reference was **46 unique occurrences across all seven days**, including 19 from round 2—not 46 cards on Today. Do not use that historical count as a permanent acceptance requirement. The round-2 report separates the 15 older failures/empty results observed then from the healthy direct sources.

## Verify hourly forecasts

1. Open the draft preview and look for the existing Capital Weather hourly forecast panel. **If no panel is present, record “forecast module not installed on this draft,” not “forecast passed.”** Pasting the events file alone does not create it.
2. If the module is already supplied by the theme, it should be present without adding another copy. If the live page has a separate forecast HTML card or page-specific script, have the site maintainer copy that existing module into the **draft only**, including its current configuration. Its source is not in this repository, so this change has not been prepared or verified here. Do not change global Code Injection.
3. The forecast listener should be ready **before the events widget starts** so it receives the initial selection. Ask the maintainer to place/initialize the existing module before the events card when needed. A module loaded later may miss the first event; clicking a card afterward helps distinguish this ordering issue from a data failure.
4. Select two events in different locations, then a timed event on a different day. Check that the forecast's event label, place, date, and hourly time range change to match. Check Eastern time, including a time near noon/evening. A Washington forecast should not silently stand in for a Maryland or Virginia event.
5. Try an event without precise coordinates and one without a supplied time, if available. Missing geography/time should produce the existing module's appropriate fallback or a clear unavailable message—not made-up precision. Confirm weather contingencies remain visible in event details.
6. Some events near the end of the seven-day window may exceed the weather provider's available hourly horizon. An honest “forecast unavailable” is acceptable; showing another day's forecast is not. Then select a near-term event to confirm forecasts still work.

The automated checks verify that selection messages carry the correct event data. **They do not verify rendered hourly weather or weather-provider access.** End-to-end forecast approval remains a check on the private Ghost preview with the actual forecast module present.

## If something does not work

- **You see HTML text:** use an HTML card and the file's Raw contents, not a code card or GitHub page text.
- **The editor is blank but the preview works:** use the web preview for testing.
- **The preview is stuck at Loading with no cards:** confirm the entire file was pasted and that there is only one copy. Ask the maintainer to check for a blocked inline script or a script error.
- **A few sources fail:** open diagnostics, clear filters and check other dates. Existing older sources may already fail; do not remove working sources or introduce a proxy to make a test look successful.
- **Events work but hourly weather does not:** follow the separate forecast checklist. The most likely checks are the missing module, listener startup order, location resolution, or weather API availability.
- **Layout looks different:** send the preview link and a screenshot showing the problem to your maintainer, plus phone/browser and viewport if known. Do not change the live stylesheet.

For a useful test report, record the preview URL privately, date/time, phone/browser, filters/day, event title, expected result, actual result and any source diagnostic. Keep screenshots and preview links private. Do not include API credentials.

## Maintainer notes and verified limits

Prepared from merged main `c1233e4924f6854ef9db68b9154b372f8097ea06` on October 25, 2026. The only widget changes are an installation comment and CSS selectors scoped to `#cw-weekend-events`. Its event-source and forecast-dispatch JavaScript is byte-for-byte unchanged. The fragment has no document wrapper, external script tags, stylesheet downloads, build step, DOM-ready dependency, or inline event-handler attributes. It must be parsed as part of the page; injecting it later with `innerHTML` alone does not execute its script. The single-instance initialization guard does not support two copies in one page.

The public homepage and `/forecast-lab/` returned HTTP 200 without CSP or report-only CSP headers in this check; neither contained the `cw:event-selected` listener. That is **not** proof about a private draft, another page's injection, or a later hosting policy. The test wrapper uses current downloaded `app.css` and Ghost `cards.min.css`; the actual draft and theme JavaScript were not executed or modified. No authenticated Ghost preview was available during preparation.

If a preview has CSP, check its response headers **and** any `meta` policy. An enforcing policy must permit this specific inline script/style (for example, through administrator-managed hashes or correctly generated nonces) and the widget's outbound `connect-src` destinations. `default-src` may apply when a more specific directive is absent. A nonce cannot simply be invented in this static card. Do not disable CSP, browser CORS, certificate checks or site security to pass the test. This assignment does not change server headers or theme policy. Report-only CSP logs warnings without blocking.

The ten direct paths use `https://xapi.citylightstudio.net`, `https://www.rockvillemd.gov`, `https://nomabid.org`, `https://visitalexandria.com`, `https://home.nps.gov`, `https://www.pgparks.com`, `https://www.fona.org` and `https://www.bethesda.org`. Existing other paths also use Ticketmaster, ImGoing, publisher hosts, `proxy.cors.dev` and `api.allorigins.win`. These are dependency information, **not a suggested blanket allow-list**: use the browser's actual blocked-request message to review the existing host policy. A forecast module adds its own weather/geocoding destinations. Publisher CORS must also allow the actual preview origin: a staging Ghost hostname is not necessarily equivalent to `www.capitalweather.com`. HTTPS event links do not require `connect-src` permission merely to open in a new tab.

Forecast contract: the widget dispatches `cw:event-selected` on `window` with `id`, `title`, `date`, `startTime`, `endTime`, `venue`, `address`, `city`, `county`, `state`, `latitude`, `longitude`, `source`, `url` and `dateConfidence`. Missing fields can be null/undefined. `cw:events-day-changed` is also preserved. No forecast listener, provider request or weather rendering is implemented here.

Reproduction: `npm test`, `npm run test:browser`, `npm run test:ghost`, and `npm run test:live`. For the theme check, set `CWE_GHOST_THEME_CSS` to comma-separated local stylesheet paths; copies are test-only and are not runtime dependencies. For the actual production hostname use `CWE_TEST_ORIGIN=https://www.capitalweather.com` with the live runner. These are developer test commands, not installation steps for the Ghost editor.

Validation completed: **41 regression checks, 61 existing fixture-based Chromium checks, 16 Ghost-card Chromium checks** (both with and without the downloaded theme styles), and **7 live Chromium checks** passed. The Ghost checks include normal desktop/320px/390px layout and negative CSP tests confirming that an enforcing policy can block the inline script or API connections. The live test document used `https://www.capitalweather.com` with real cross-origin publisher requests and normal CORS enforcement; it did not open a real draft. All ten direct source paths succeeded. The current run returned 51 occurrences, including the same 19 round-2 occurrences; older sources' responses varied from the previous 46-record snapshot. First cards appeared in about 1.02 seconds; all queues completed in 55.69 seconds, with older source failures still isolated. No new event adapter, classification rule or forecast implementation changed. Exact comparison confirmed that the inline script matches merged main. `git diff --check` also passed.

Nothing was deployed, published, or changed in Ghost or the live widget. Keep the new page a draft until separate review authorizes any later action.
