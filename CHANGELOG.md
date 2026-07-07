# Changelog

## pimtc-v16.4.1 — Desktop Width Polish

- Expanded Home hero text width on desktop so the copy uses the available page width better.
- Expanded Live hero description width on desktop while keeping mobile layout unchanged.
- Expanded latest update caption width on desktop so long match summaries do not look unnecessarily narrow.
- Bumped footer version to `pimtc-v16.4.1` and service worker cache to `pimtc-v16-4-1`.

## pimtc-v16.4.0 — Live UX Polish + Tournament Stats Alignment

- Added a public-friendly Next Match spotlight card on the Live page.
- Highlighted the most recent Live update with a stronger card treatment and Latest badge.
- Kept Live Google Sheet refresh behavior from v16.1.1 while keeping technical data source/timestamp hidden from the public Live page.
- Changed Home page season stat from 2025 to 2026.
- Centered tournament format stats so 1 Set / Games / Tiebreak align visually under the player count for both Men and Women tournament tabs.
- Bumped footer version to `pimtc-v16.4.0` and service worker cache to `pimtc-v16-4-0`.


## v16.1.3 — Hide Live Refreshed Timestamp
- Removed the visible `Data refreshed` timestamp from the public Live hero.
- Kept Live's faster 30-second Google Sheet refresh behavior.
- Moved the Live refreshed timestamp into `#/health` under the Live page data source card.
- Bumped footer version to `pimtc-v16.1.3` and service worker cache to `pimtc-v16-1-3`.

# Changelog

## pimtc-v16.1.2 — Live Source Indicator Relocation
- Hid the Live page data-source indicator from the public Live hero.
- Moved Live page data-source visibility into the hidden `#/health` webmaster page.
- `#/health` now checks the Live Google Sheet bundle and shows whether Live data is from Latest Google Sheet, Cached Google Sheet, GitHub snapshot, or local fallback.
- Bumped visible app version to `pimtc-v16.1.2` and service worker cache to `pimtc-v16-1-2`.

## v16.1.1 — Live Google Sheet Refresh + Data Source Indicator
- Live page now refreshes directly from Google Sheet immediately after the fast snapshot render.
- Live page then checks Google Sheet again every 30 seconds while the user stays on Live.
- Added a visible Live data source indicator: Latest Google Sheet, Cached Google Sheet, GitHub snapshot, or Local fallback.
- Live refresh updates only the Live content areas, avoiding the blue-background full-page flash.
- Bumped visible app version to `pimtc-v16.1.1` and service worker cache to `pimtc-v16-1-1`.

## pimtc-v16.1.0 — Webmaster Health Page
- Added hidden `#/health` route for webmaster data checks.
- Checks static snapshot version/timestamp, Apps Script health endpoint, missing snapshot keys, required fields, invalid dates, media type/url problems, duplicate ranks, and schedule/update issues.
- Bumped visible footer version and service worker cache to `pimtc-v16.1.0`.


## pimtc-v16.0.1 — Background Refresh Stability Fix
- Prevented Apps Script background refresh from fully re-rendering the current page after static snapshot load.
- Fixes the Live page flashing/jumping back to the dark-blue hero/background when Sheet data catches up.
- Fresh background data is still cached and used on the next refresh/navigation.
- Bumped visible footer version and service worker cache to `pimtc-v16.0.1`.

## pimtc-v16.0.0 — Static Data Snapshot Loader
- Added `data/latest-data.json` as a fast GitHub-hosted public data snapshot.
- Updated the data layer so pages render from the static snapshot first, then refresh from Apps Script in the background.
- Preserved the existing fallback chain: snapshot → Apps Script/background refresh → local JSON fallback.
- Data refreshed labels now use the snapshot `publishedAt` timestamp when snapshot data is shown.
- Updated cache-busting, visible footer version, and service worker cache to `pimtc-v16.0.0`.

## pimtc-v15.2.7 — Persistent Sticky Live Sub-nav Fix
- Replaced the constrained native sticky Live sub-nav with a JS-pinned behavior that stays visible through Standings, Schedule, and Updates.
- Added a same-height placeholder only when pinned so the page does not jump while avoiding the previous large visual gap.
- Calculates the fixed top position from the actual site header position.
- Updated visible footer version and service worker cache to `pimtc-v15.2.7`.


## v15.2.3 — Live Sub-nav Sticky Cache-Bust Fix

- Added a stronger CSS override so the Live `Standings / Schedule / Updates` sub-nav behaves as normal page content and scrolls away with the page.
- Added query-string cache busting to `index.html` for `css/style.css` and `js/app.js` so browsers/service workers do not keep serving older sticky CSS.
- Bumped service worker cache to `pimtc-v15-2-3`.

# Changelog

## v15.2.4 — Live Sub-Nav Sticky Clarification Fix
- Restored the Live Standings / Schedule / Updates controls as a sticky bar so the buttons stay visible and move with the user while scrolling.
- Positioned the sticky Live sub-nav below the main site header on desktop and mobile.
- Updated section-scroll offset so tapped sections are not hidden behind the header/sub-nav.
- Bumped service worker cache to `pimtc-v15-2-4`.

## v15.2.2 — Live Sub-Nav Scroll Action Fix
- Changed the Live section navigation controls from same-route links to buttons so they no longer fight the hash-based router.
- Added delegated click handling that is active immediately after page load, even while Live data is still fetching.
- Added header-offset scrolling so Standings / Schedule / Updates moves the page to the correct section instead of appearing to do nothing behind the sticky main header.

## pimtc-v15.2.1

- Fixed Live section navigation so `Standings / Schedule / Updates` scrolls normally with the page on both desktop and mobile.
- Removed sticky positioning and blur treatment from the Live sub-navigation.
- Bumped service worker cache to `pimtc-v15-2-1`.

## v15.2 — Mobile Subnav & Cold-Load Perception Fix
- On mobile, Live section sub-navigation now scrolls normally with the page instead of sticking to the viewport.
- Added Apps Script preconnect/dns-prefetch hints.
- Added quick local-data fallback if the Apps Script bundle is slow on a cold first load, then refreshes the current route when live Sheet data arrives.
- Bumped service worker cache to `pimtc-v15-2`.

## v15.1 — Mobile Standings Overflow Fix
- Fixed mobile standings tables forcing the page wider than the phone viewport.
- Added grid/item min-width guards so the table scroll container owns horizontal overflow.
- Bumped service worker cache to `pimtc-v15-1` so the CSS update is picked up after deploy.

## pimtc-v15

- Added short-lived persistent browser cache for Sheet/API data using `localStorage`.
- Added Live page data refreshed timestamp.
- Added sticky Live section navigation and collapsible Live sections.
- Improved mobile schedule layout with card-style rows.
- Added table captions, scoped table headers, and mobile table scroll hints.
- Added ARIA tab semantics and keyboard arrow navigation for tournament/result category tabs.
- Improved mobile menu accessibility: `aria-controls`, dynamic label, Escape close, and focus handling.
- Added route focus management so screen-reader/keyboard users land on the new page heading.
- Replaced inactive Inquiry form with an Instagram contact CTA so messages are not accidentally lost.
- Added SEO/Open Graph metadata, static fallback content, `robots.txt`, and `sitemap.xml`.
- Added Apps Script data normalization helpers and `?action=health` validation endpoint.
- Bumped service worker cache to `pimtc-v15` and added runtime media caching.
- Added deploy and Sheet editing guides.

## pimtc-v15.2.5 — Robust Sticky Live Sub-Nav + Visible Version

- Reworked the Live Standings / Schedule / Updates sub-nav so it follows the user while scrolling by pinning under the main site header after the nav reaches the top of the viewport.
- Added a layout placeholder while the sub-nav is pinned, preventing content jump.
- Made the footer version easier to see: `Version pimtc-v15.2.5`.
- Added cache-busting for `css/style.css` and `js/app.js` in `index.html`.
- Bumped the service worker cache to `pimtc-v15-2-5`.

## v15.2.6 — Sticky Sub-nav Gap Fix
- Replaced the JS fixed-position Live sub-nav pinning with native CSS sticky behavior.
- Removed the placeholder/fixed-position layout that caused a visible vertical gap above the sub-nav on some browsers.
- Bumped visible footer version to `pimtc-v15.2.6` and service worker cache to `pimtc-v15-2-6`.
