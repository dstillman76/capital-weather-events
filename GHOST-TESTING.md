# Test the outdoor events widget in Ghost

## The file to copy

Use **`capital-weather-events-widget.html`** on the `main` branch. It is the complete, current widget.

Open that file on GitHub and choose **Raw**. Select and copy **all** the text, including the `<style>` and `<script>` sections and the closing `</script>`. Do not copy GitHub's surrounding page, Markdown code fences, a report, or a test fixture. There is no separate Ghost build or second widget file.

The events widget is self-contained HTML, CSS and JavaScript: no installation, compilation, plugin, server, or backend is needed. It does need JavaScript enabled and an internet connection to its event providers. Some sources go through a public CORS proxy and can fail. Extra coverage for the large tourism sites and Montgomery Parks comes from `collector/data/events.json`, which a GitHub Action in this repository refreshes once a day, at about 3 a.m. Eastern (see `collector/README.md`). If that file is unavailable or stale, the widget carries on without it. The existing Ticketmaster browser key is already embedded in the file and is visible to visitors; do not paste private credentials into the card.

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
| Source health | Click Show source diagnostics. | Each source shows an outcome: events found, none qualified, no listings, blocked by publisher, or a specific error. A valid zero-event result is different from a failed fetch. Report failures with the source name and exact message. |

Counts change with the date, filters and publisher updates, so no fixed count is a pass mark.

## Verify hourly forecasts

1. Open the draft preview and look for the existing Capital Weather hourly forecast panel. **If no panel is present, record “forecast module not installed on this draft,” not “forecast passed.”** Pasting the events file alone does not create it.
2. If the module is already supplied by the theme, it should be present without adding another copy. If the live page has a separate forecast HTML card or page-specific script, have the site maintainer copy that existing module into the **draft only**, including its current configuration. Its source is not in this repository, so this change has not been prepared or verified here. Do not change global Code Injection.
3. The forecast listener should be ready **before the events widget starts** so it receives the initial selection. Ask the maintainer to place/initialize the existing module before the events card when needed. A module loaded later may miss the first event; clicking a card afterward helps distinguish this ordering issue from a data failure.
4. Select two events in different locations, then a timed event on a different day. Check that the forecast's event label, place, date, and hourly time range change to match. Check Eastern time, including a time near noon/evening. A Washington forecast should not silently stand in for a Maryland or Virginia event.
5. Try an event without precise coordinates and one without a supplied time, if available. Missing geography/time should produce the existing module's appropriate fallback or a clear unavailable message—not made-up precision. Confirm weather contingencies remain visible in event details.
6. Some events near the end of the seven-day window may exceed the weather provider's available hourly horizon. An honest “forecast unavailable” is acceptable; showing another day's forecast is not. Then select a near-term event to confirm forecasts still work.

End-to-end forecast approval is a check on the private Ghost preview with the actual forecast module present.

## If something does not work

- **You see HTML text:** use an HTML card and the file's Raw contents, not a code card or GitHub page text.
- **The editor is blank but the preview works:** use the web preview for testing.
- **The preview is stuck at Loading with no cards:** confirm the entire file was pasted and that there is only one copy. Ask the maintainer to check for a blocked inline script or a script error.
- **A few sources fail:** open diagnostics, clear filters and check other dates. Existing older sources may already fail; do not remove working sources or introduce a proxy to make a test look successful.
- **Events work but hourly weather does not:** follow the separate forecast checklist. The most likely checks are the missing module, listener startup order, location resolution, or weather API availability.
- **Layout looks different:** send the preview link and a screenshot showing the problem to your maintainer, plus phone/browser and viewport if known. Do not change the live stylesheet.

For a useful test report, record the preview URL privately, date/time, phone/browser, filters/day, event title, expected result, actual result and any source diagnostic. Keep screenshots and preview links private. Do not include API credentials.
