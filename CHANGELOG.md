# Changelog

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
