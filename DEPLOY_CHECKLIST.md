# PIMTC Deploy Checklist

Use this every time you update the site so GitHub Pages, Apps Script, and the PWA cache stay aligned.

## Routine Sheet-only update

1. Edit the Google Sheet tabs.
2. Keep dates as `YYYY-MM-DD`.
3. For `type = photo`, use a direct image file URL ending in `.jpg`, `.jpeg`, `.png`, `.webp`, or `.gif`.
4. Open the Apps Script health endpoint:
   - `YOUR_WEB_APP_URL?action=health`
5. If `ok` is `true`, refresh the live PWA.
6. Check Home, Live, Results, and Gallery on mobile width.

## Code update

1. Edit the repo files.
2. Bump `CONFIG.VERSION` in `js/app.js`.
3. Bump `CACHE_NAME` in `service-worker.js`.
4. Commit and push to GitHub.
5. After GitHub Pages updates, open the site and refresh once.
6. Confirm the footer version changed.

## Apps Script update

1. Edit `apps-script/Code.gs` in Apps Script.
2. Click **Deploy → Manage deployments → Edit**.
3. Choose **New version**.
4. Deploy.
5. Test `?action=health` and one bundle URL, for example:
   - `YOUR_WEB_APP_URL?action=bundle&keys=home,live,updates`

Saving Apps Script code is not enough. The deployed Web App only changes after creating a new deployment version.


## v16 Static Snapshot Note

The public site now tries to load `data/latest-data.json` first because GitHub Pages serves it faster than Google Apps Script cold starts. Apps Script is still used as a background refresh source, and the older per-tab local JSON files remain as final fallback data.

For v16.0 manual deployment, upload `data/latest-data.json` together with the updated HTML/CSS/JS/service worker files. If you edit the Google Sheet later, the live Apps Script refresh can still update visitors in the background, but the fastest first-load snapshot will only change after `data/latest-data.json` is updated in GitHub.

## Health check after deploy

1. Open `https://osaftari-source.github.io/PIMTC/#/health`.
2. Confirm the footer shows the expected version.
3. Review any warning/error messages and correct the Google Sheet or snapshot file if needed.


## v16.1.1 Live Data Check
- After deploy, open `#/live` and confirm the footer shows `Version pimtc-v16.1.2`.
- Confirm the Live hero shows a data source note such as `Latest Google Sheet` after Apps Script responds.
- Leave the Live page open and verify it refreshes Google Sheet data automatically during live updates.

## v16.5 Social Preview Check
- Upload `media/social-preview.png` together with `index.html`, `service-worker.js`, and versioned app files.
- After deploy, open `https://osaftari-source.github.io/PIMTC/media/social-preview.png` and confirm the branded preview image loads.
- Share the homepage link in WhatsApp to check the preview. WhatsApp may cache old previews, so allow time if the previous image still appears.


### v16.6.0 knockout stage check
- Confirm footer shows `Version pimtc-v16.6.0`.
- Open `#/live` and confirm the **Bracket** button appears when semifinal/final schedule rows exist.
- Confirm the bracket stacks vertically on mobile.
- If you use the new `round`, `score`, or `winner` Schedule columns, update and redeploy `apps-script/Code.gs` once.


### v16.7.1 extra checks

- Confirm footer shows `Version pimtc-v16.7.1`.
- Confirm Live page says there is no active live tournament.
- Confirm `#/tournaments` has a Doubles Tournament tab.
- Confirm `#/results` has a Doubles Tournament tab.
- Confirm `#/doubles` shows separate individual doubles player rankings.
- If using Google Sheets, upload/import the updated workbook or add the new `Doubles` sheet manually, then update/redeploy `apps-script/Code.gs`.
