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

## Quick health check

After editing the Sheet or uploading a new snapshot, open `#/health`. Correct rows flagged as invalid date, invalid media type, blank required field, bad photo URL, or duplicate rank.


## Live knockout stage (v16.6.0)

The `Schedule` tab supports three optional columns after `team2`:

`round | score | winner`

Recommended values for `round` are `Group Stage`, `Semifinal`, and `Final`. The Live page automatically shows a bracket when at least one semifinal or final row exists. For a completed knockout match, enter the displayed score in `score` and enter the winning pair exactly as written in `team1` or `team2` in `winner`.

The older six-column Schedule layout remains supported. Placeholder names such as `Semifinal 1`, `Semifinal 2`, and `Final` are automatically recognized.


## Doubles rankings

Use the `Doubles` sheet for individual doubles player rankings. This keeps doubles ranking separate from the Men/Women singles ranking sheets. Required headers:

```text
rank | name | partner | pair | wins | losses | mp | gw | gl | diff | points | result | note | photo
```

When a live tournament is completed, set `Live.status` to `completed`, then copy the tournament structure/results into `TournamentRounds`, `Format`, `Standings`, `Playoffs`, and `Results` using category `doubles`.
