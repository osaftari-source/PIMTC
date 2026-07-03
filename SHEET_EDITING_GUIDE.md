# PIMTC Sheet Editing Guide

The website is designed so the webmaster can update routine content from Google Sheets without editing code.

## General rules

- Keep header names unchanged.
- Use `YYYY-MM-DD` for dates.
- Use simple category names consistently, for example `men`, `women`, or `doubles`.
- Use direct image file URLs for photo entries.
- After editing the Sheet, check the Apps Script health endpoint: `?action=health`.

## Controlled values

### Live.status

Allowed values:

- `ongoing`
- `completed`

### Updates.type

Allowed values:

- `text`
- `photo`
- `instagram`
- `youtube`

### Gallery.type

Allowed values:

- `photo`
- `instagram`
- `youtube`

### Standings.qualified

Allowed values:

- `TRUE`
- `FALSE`
- blank

## Photo URL rule

For `type = photo`, avoid Google Drive, Google Photos, and OneDrive share pages. They are viewer pages, not direct images. Use a direct image URL or upload images to the GitHub repo under a `media/` folder and use a GitHub Pages URL.

Example:

`https://osaftari-source.github.io/PIMTC/media/photo-name.jpg`


## v16 Static Snapshot Note

The public site now tries to load `data/latest-data.json` first because GitHub Pages serves it faster than Google Apps Script cold starts. Apps Script is still used as a background refresh source, and the older per-tab local JSON files remain as final fallback data.

For v16.0 manual deployment, upload `data/latest-data.json` together with the updated HTML/CSS/JS/service worker files. If you edit the Google Sheet later, the live Apps Script refresh can still update visitors in the background, but the fastest first-load snapshot will only change after `data/latest-data.json` is updated in GitHub.
