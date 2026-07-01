/**
 * PIMTC Apps Script backend.
 *
 * SETUP
 * 1. Create a Google Sheet with these tabs (exact names, header row exactly as below):
 *
 *    Men            | rank | name | age | plays | wins | losses | racket | dept | photo |
 *    Women          | rank | name | age | plays | wins | losses | racket | dept | photo |
 *    Home           | name | tagline | about | instagram | mapEmbed | lat | lng |
 *                     (single data row)
 *    TournamentRounds | category | roundOrder | roundName | point |
 *                     (one row per bullet point; category = "men" or "women")
 *    Results        | category | round | summary |
 *                     (category = "men" or "women")
 *
 * 2. Extensions > Apps Script, paste this file in as Code.gs.
 * 3. Deploy > New deployment > Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the deployment URL (ends in /exec) into js/app.js CONFIG.SHEETS_API_URL.
 * 5. Re-run "Deploy > Manage deployments > Edit" and bump version whenever you
 *    edit this script (new code doesn't go live on the same URL until redeployed).
 */

function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();
  let payload;

  switch (action) {
    case "men":
      payload = getPlayers_("Men");
      break;
    case "women":
      payload = getPlayers_("Women");
      break;
    case "home":
      payload = getHome_();
      break;
    case "tournaments":
      payload = getTournaments_();
      break;
    case "results":
      payload = getResults_();
      break;
    default:
      payload = { error: "Unknown action. Use one of: men, women, home, tournaments, results." };
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function sheetRows_(name) {
  const sheet = getSheet_(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map((h) => String(h).trim());
  return values
    .filter((row) => row.some((cell) => cell !== "" && cell !== null))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

function getPlayers_(tabName) {
  return sheetRows_(tabName).map((r) => ({
    rank: Number(r.rank) || null,
    name: String(r.name || ""),
    age: r.age === "" ? null : Number(r.age),
    plays: String(r.plays || ""),
    wins: Number(r.wins) || 0,
    losses: Number(r.losses) || 0,
    racket: String(r.racket || ""),
    dept: String(r.dept || ""),
    photo: String(r.photo || "")
  }));
}

function getHome_() {
  const rows = sheetRows_("Home");
  const r = rows[0] || {};
  return {
    name: String(r.name || "Pupuk Iskandar Muda Tennis Club"),
    tagline: String(r.tagline || "Serve, Rally, Win!"),
    about: String(r.about || ""),
    instagram: String(r.instagram || ""),
    mapEmbed: String(r.mapEmbed || ""),
    lat: Number(r.lat) || null,
    lng: Number(r.lng) || null
  };
}

function getTournaments_() {
  const rows = sheetRows_("TournamentRounds");
  const out = { men: { rounds: [] }, women: { rounds: [] } };
  const roundIndex = {}; // key: category|roundName -> round object

  rows
    .sort((a, b) => Number(a.roundOrder) - Number(b.roundOrder))
    .forEach((r) => {
      const cat = String(r.category || "").toLowerCase() === "women" ? "women" : "men";
      const key = cat + "|" + r.roundName;
      if (!roundIndex[key]) {
        const round = { name: String(r.roundName || ""), points: [] };
        roundIndex[key] = round;
        out[cat].rounds.push(round);
      }
      if (r.point) roundIndex[key].points.push(String(r.point));
    });

  return out;
}

function getResults_() {
  const rows = sheetRows_("Results");
  const out = { men: [], women: [] };
  rows.forEach((r) => {
    const cat = String(r.category || "").toLowerCase() === "women" ? "women" : "men";
    out[cat].push({ round: String(r.round || ""), summary: String(r.summary || "") });
  });
  return out;
}
