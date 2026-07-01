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
   | name | tagline | about | instagram | mapEmbed | lat | lng |
   |---|---|---|---|---|---|---|

   **TournamentRounds** (one row per bullet point)
   | category | roundOrder | roundName | point |
   |---|---|---|---|
   category is `men` or `women`; roundOrder controls display order.

   **Results**
   | category | round | summary |
   |---|---|---|

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

## 3. Editing the design

All colors, type, and layout live in `css/style.css` under `:root` at
the top (`--navy`, `--gold`, `--court`, fonts, etc.) — change values
there rather than hunting through individual rules.

## 4. Wiring up the Inquiry form

The Inquiry page currently just shows a confirmation alert. To
actually collect submissions, the simplest option is to point the
form at a Google Form (Form → Get pre-filled link, or embed the Form
directly) or extend `apps-script/Code.gs` with a `doPost` handler that
appends rows to an "Inquiries" tab.

## 5. Local preview

Any static file server works, e.g. from this folder:

```
python3 -m http.server 8080
```

then open `http://localhost:8080`. (Opening `index.html` directly via
`file://` will break the service worker and fetch calls — always use
a local server or GitHub Pages.)
