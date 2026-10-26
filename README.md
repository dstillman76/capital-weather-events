# Capital Weather outdoor events widget

This repository has two parts:

- **`capital-weather-events-widget.html`** is the widget: one self-contained file of HTML, CSS and
  JavaScript, pasted into a Ghost HTML card. It finds outdoor events in DC, Maryland and Northern
  Virginia for the next seven days, then checks each event's date, location and outdoor setting in
  the reader's browser. [GHOST-TESTING.md](GHOST-TESTING.md) explains how to install and test it.
- **`collector/`** is a small scheduled job. GitHub Actions runs it every 6 hours, and it writes
  `collector/data/events.json`. It covers the sources a browser can't read in full: the six large
  tourism sites, whose feeds stop at 30 items, and Montgomery Parks. The widget reads the file and
  applies its usual checks. If the file is missing or more than 18 hours old, the widget ignores it.
  [collector/README.md](collector/README.md) has the details.

The widget has to be able to read the events file, so this repository must stay **public**.

## Updating the widget in Ghost

1. Open `capital-weather-events-widget.html` on GitHub and choose **Raw**.
2. Copy all of the text.
3. Replace the contents of the existing HTML card.

## Running the collector by hand

Open **Actions → Collect events → Run workflow**. **Probe sources** is a one-minute check that
each source still answers.
