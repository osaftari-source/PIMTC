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
