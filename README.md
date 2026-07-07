# PIM Tennis Club — PWA

An installable, offline-capable rewrite of the PIMTC Google Site
(https://sites.google.com/view/pimtennisclub) — Home, Tournaments,
Results, Men, Women, and Inquiry — pulling player and tournament data
from a Google Sheet so you can update it without touching code.

## What's in here

```
index.html          app shell, all pages render into <main id="app">
css/style.css        design system (navy/gold sports-editorial theme)
js/app.js             router + data layer + PWA install logic
manifest.json         installability config
service-worker.js     offline caching
icons/                app icons
data/*.json            seed/fallback content (also used offline)
apps-script/Code.gs    Google Apps Script backend template
```

## 1. Publish it on GitHub Pages

1. Create a new GitHub repo, e.g. `pimtc-app`.
2. Upload every file in this folder, keeping the folder structure
   (`css/`, `js/`, `data/`, `icons/`, `apps-script/` as subfolders).
3. Repo → **Settings → Pages** → Source: `Deploy from a branch` →
   Branch: `main`, folder: `/ (root)` → Save.
4. Your site goes live at `https://<your-username>.github.io/pimtc-app/`
   within a minute or two.
5. Open it on your phone and use "Add to Home Screen" (or the install
   banner that pops up) — it installs like a native app and works
   offline after the first load.

Because everything uses relative paths (`css/style.css`, not
`/css/style.css`), it works whether it's served at the domain root or
under a subfolder like `/pimtc-app/`.

## 2. Connect it to a Google Sheet (dynamic data)

Right now the site reads from the bundled `data/*.json` files. To make
rankings and tournament info editable from a spreadsheet:

1. Create a new Google Sheet with these tabs (tab names and header
   rows must match exactly):

   **Men** / **Women**
   | rank | name | age | plays | wins | losses | racket | dept | photo |
   |---|---|---|---|---|---|---|---|---|

   **Home** (one data row)
   | name | tagline | about | photo | mediaType | instagram | mapEmbed | lat | lng |
   |---|---|---|---|---|---|---|---|---|
   For a plain picture: put a direct image URL in `photo`, leave `mediaType`
   blank (or `photo`). To embed an Instagram post/reel or YouTube video in
   that same spot instead, put that URL in `photo` and set `mediaType` to
   `instagram` or `youtube`. Leave `photo` blank entirely and the site shows
   a designed placeholder instead of a broken image.

   **TournamentRounds** (one row per bullet point)
   | category | roundOrder | roundName | point |
   |---|---|---|---|
   `category` isn't limited to `men`/`women` — any word works (e.g. `doubles`).
   Whatever categories appear across TournamentRounds/Format/Standings/Playoffs/
   Results automatically get their own tab on the Tournaments and Results pages,
   no code changes needed. roundOrder controls display order.

   **Format** (one row per category)
   | category | players | sets | games | tiebreak |
   |---|---|---|---|---|
   tiebreak is free text, e.g. `7pt at 5-5`. Leave blank if there's no tiebreak.

   **Standings** (one row per player per round)
   | category | round | group | ranking | player | nickname | mp | w | points | qualified |
   |---|---|---|---|---|---|---|---|---|---|
   Leave `group` blank for round-robin formats with no groups (e.g. Women's).
   `qualified` is `TRUE`/`FALSE`; leave blank for rounds with no cut (e.g. round robin).

   **Playoffs** (one row per bracket match)
   | category | stage | p1 | p2 | score | winner |
   |---|---|---|---|---|---|
   `stage` is `Semifinal 1`, `Semifinal 2`, `Final` — in that order.

   **Results**
   | category | round | summary |
   |---|---|---|

   **Live** (single data row — the current ongoing/most recent tournament)
   | id | name | status | venue | startDate | teams | sets | games | tiebreak | description |
   |---|---|---|---|---|---|---|---|---|---|
   `status` is `ongoing` or `completed` — this controls the red "LIVE" badge and
   whether the Home page teaser and nav dot show up.

   **Updates** (one row per match update)
   | date | order | round | caption | type | url |
   |---|---|---|---|---|---|
   `type` is `instagram`, `youtube`, `photo`, or `text`. For Instagram/YouTube,
   just paste the post/video URL — the site embeds it automatically. `order` is
   a plain number (1, 2, 3...) to break ties when you post more than one update
   on the same day; newest date+order shows first.

   **LiveStandings** (one row per pair per round)
   | round | group | ranking | pair | mp | w | l | gw | gl | diff | points |
   |---|---|---|---|---|---|---|---|---|---|---|
   `gw`/`gl` are games won/lost. `group` is required here since the live
   doubles format is always grouped.

   **Schedule** (one row per match)
   | date | day | time | court | team1 | team2 |
   |---|---|---|---|---|---|
   `date` format is `YYYY-MM-DD`, `time` is plain text like `17:00`. Leave
   `date`/`day` blank for matches that aren't scheduled yet — they'll show
   under "Date TBC" at the bottom of the list. For a round where the teams
   aren't known yet (e.g. "Semifinal 1" before the group stage finishes),
   put the round name in `team1` and leave `team2` blank — it displays as a
   plain label instead of "X vs Y".

   **Gallery** (one row per photo/video, standalone from the live Updates feed)
   | event | date | caption | type | url |
   |---|---|---|---|---|
   `event` is free text and groups photos together on the Gallery page —
   e.g. every row with `event = PIMTC 500 Doubles 2026` shows up under one
   heading, most recent event first. `type` is `instagram`, `youtube`, or
   `photo` (same embedding rules as Updates — see the posting workflow below
   for where to host photos so they have a real, direct link).

   **HomeGallery** (one row per photo — auto-rotating carousel on the Home page)
   | order | url | caption |
   |---|---|---|
   Photos only (no Instagram/YouTube — a carousel needs to auto-advance
   cleanly, which doesn't work well with embedded posts). `url` must be a
   direct image link (see "Hosting photos" below). `order` controls the
   sequence, `caption` is optional overlay text. **If this tab has any rows
   at all, it takes over the Home page photo spot completely** — the single
   `photo`/`mediaType` fields on the `Home` tab are ignored while HomeGallery
   has content. Delete all rows here to go back to a single Home photo/embed.

2. Populate the sheet from your current roster (the `data/*.json`
   files in this project already contain everything currently on the
   Google Site, so you can copy those values in as a starting point).
3. In the Sheet: **Extensions → Apps Script**, delete the placeholder
   code, and paste in `apps-script/Code.gs`.
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy, then copy the URL ending in `/exec`.
5. Open `js/app.js` and set:
   ```js
   const CONFIG = {
     SHEETS_API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
     ...
   };
   ```
6. Push that change to GitHub. The site now reads live from your
   Sheet, and still falls back to the bundled JSON if the Sheet is
   ever unreachable (e.g. offline).

Whenever you edit `Code.gs` later, you must **Deploy → Manage
deployments → Edit → New version** — saving the script alone doesn't
update the live `/exec` URL.

## 3. Posting a live update (once you're set up)

This is the day-to-day workflow once the Sheet is connected:

1. Post the photo/clip to Instagram or YouTube as you normally would.
2. Copy that post's URL.
3. Add one row to the **Updates** tab: today's date, a short round/match
   label, a one-line caption, `type` = `instagram` or `youtube`, and paste
   the URL.
4. That's it — no re-upload to me, no file editing. The Live page picks it
   up within a few minutes of you editing the sheet (or instantly on refresh).

For a text-only update (no media yet), leave `type` as `text` and the `url`
column blank — it'll show as a caption-only card.

**Hosting photos for `type = photo`** (used in both Updates and Gallery):
the URL needs to be a *direct* link to the image file itself, not a link to
a viewer page. Google Photos and OneDrive/Google Drive share links do **not**
work here — they open a webpage, not the raw image, so the site would just
show a broken image. Reliable options: upload to
[Imgur](https://imgur.com) and use its direct image link (looks like
`https://i.imgur.com/xxxx.jpg`), or post to Instagram and use `type = instagram`
instead, which embeds the whole post correctly.

When the tournament wraps up, see the migration steps below before flipping
`status` to `completed` — the Live tab is a working/staging area, not the
permanent archive.

## 4. When a Live tournament finishes: moving it into Tournaments/Results

The **Live**/**Updates**/**LiveStandings**/**Schedule** tabs are built for
exactly one *current* tournament at a time — they're a staging area, not a
permanent record. The **Tournaments** and **Results** pages are the permanent
archive, and they support any number of categories side by side (that's what
the `category` column across TournamentRounds/Format/Standings/Playoffs/Results
is for — it's plain text, not restricted to `men`/`women`).

So once a live tournament (e.g. the doubles competition) is over:

1. Add its final numbers as new rows in the permanent tabs, using a category
   name for it (e.g. `doubles`):
   - **Format**: one row, `category = doubles`, with its player/set/game/tiebreak info.
   - **Standings**: copy the final rows from LiveStandings, with `category = doubles`.
   - **Playoffs**: add the bracket if it had one, `category = doubles`.
   - **Results**: a short summary per round, `category = doubles`.
   - **TournamentRounds**: optional — only needed if you want the round-by-round
     rules written out like the Singles tournament has.
2. A new "Doubles Tournament" tab appears automatically on the Tournaments and
   Results pages — no code changes, since those pages build their tabs from
   whatever categories exist in the data.
3. Either flip the **Live** tab's `status` to `completed` (keeps it visible on
   the Live page, just without the LIVE badge/teaser), or overwrite the Live/
   Updates/LiveStandings/Schedule tabs with the *next* live event when one starts.

## 5. Editing the design

All colors, type, and layout live in `css/style.css` under `:root` at
the top (`--navy`, `--gold`, `--court`, fonts, etc.) — change values
there rather than hunting through individual rules.

## 6. Wiring up the Inquiry form

The Inquiry page currently just shows a confirmation alert. To
actually collect submissions, the simplest option is to point the
form at a Google Form (Form → Get pre-filled link, or embed the Form
directly) or extend `apps-script/Code.gs` with a `doPost` handler that
appends rows to an "Inquiries" tab.

## 7. Local preview

Any static file server works, e.g. from this folder:

```
python3 -m http.server 8080
```

then open `http://localhost:8080`. (Opening `index.html` directly via
`file://` will break the service worker and fetch calls — always use
a local server or GitHub Pages.)


## v16 Static Snapshot Note

The public site now tries to load `data/latest-data.json` first because GitHub Pages serves it faster than Google Apps Script cold starts. Apps Script is still used as a background refresh source, and the older per-tab local JSON files remain as final fallback data.

For v16.0 manual deployment, upload `data/latest-data.json` together with the updated HTML/CSS/JS/service worker files. If you edit the Google Sheet later, the live Apps Script refresh can still update visitors in the background, but the fastest first-load snapshot will only change after `data/latest-data.json` is updated in GitHub.

### Webmaster health page

Open `#/health` to check snapshot/API status and common Google Sheet data problems before public users notice them. This page is intentionally not linked in the main navigation.
