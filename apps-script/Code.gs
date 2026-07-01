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
 *    Format         | category | players | sets | games | tiebreak |
 *                     (one row per category; tiebreak e.g. "7pt at 5-5", leave blank if none)
 *    Standings      | category | round | group | ranking | player | nickname | mp | w | points | qualified |
 *                     (one row per player per round; leave group blank for round-robin
 *                      formats like the Women's tournament; qualified = TRUE/FALSE,
 *                      leave blank if the round has no cut e.g. round robin)
 *    Playoffs       | category | stage | p1 | p2 | score | winner |
 *                     (stage = "Semifinal 1", "Semifinal 2", "Final", in that order)
 *    Results        | category | round | summary |
 *                     (category = "men" or "women")
 *    Live           | id | name | status | venue | startDate | teams | sets | games | tiebreak | description |
 *                     (single data row for the current ongoing/most-recent live tournament;
 *                      status = "ongoing" or "completed")
 *    Updates        | date | order | round | caption | type | url |
 *                     (one row per match update; newest shows first automatically.
 *                      type = "instagram", "youtube", "photo", or "text";
 *                      order is a plain number to break ties when several updates share a date —
 *                      just count up 1, 2, 3... for that day)
 *    LiveStandings  | round | group | ranking | pair | mp | w | l | gw | gl | diff | points |
 *                     (one row per pair per round; group is required here — e.g. "Group A" —
 *                      since the live doubles format is always grouped. gw/gl = games won/lost.)
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
    case "standings":
      payload = getStandings_();
      break;
    case "playoffs":
      payload = getPlayoffs_();
      break;
    case "live":
      payload = getLive_();
      break;
    case "updates":
      payload = getUpdates_();
      break;
    case "livestandings":
      payload = getLiveStandings_();
      break;
    default:
      payload = { error: "Unknown action. Use one of: men, women, home, tournaments, results, standings, playoffs, live, updates, liveStandings." };
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

function getFormats_() {
  const out = {};
  sheetRows_("Format").forEach((r) => {
    const cat = String(r.category || "").toLowerCase() === "women" ? "women" : "men";
    out[cat] = {
      players: Number(r.players) || null,
      sets: Number(r.sets) || null,
      games: Number(r.games) || null,
      tiebreak: r.tiebreak ? String(r.tiebreak) : null
    };
  });
  return out;
}

function getTournaments_() {
  const rows = sheetRows_("TournamentRounds");
  const formats = getFormats_();
  const out = {
    men: { format: formats.men || null, rounds: [] },
    women: { format: formats.women || null, rounds: [] }
  };
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

function getStandings_() {
  const rows = sheetRows_("Standings");
  const out = { men: {}, women: {} };

  rows.forEach((r) => {
    const cat = String(r.category || "").toLowerCase() === "women" ? "women" : "men";
    const round = String(r.round || "");
    const group = String(r.group || "").trim();
    const entry = {
      ranking: Number(r.ranking) || null,
      player: String(r.player || ""),
      mp: Number(r.mp) || 0,
      w: Number(r.w) || 0,
      points: Number(r.points) || 0
    };
    if (r.nickname) entry.nickname = String(r.nickname);
    if (r.qualified === true || String(r.qualified).toUpperCase() === "TRUE") entry.qualified = true;
    else if (r.qualified === false || String(r.qualified).toUpperCase() === "FALSE") entry.qualified = false;

    if (!out[cat][round]) out[cat][round] = group ? {} : [];

    if (group) {
      if (!out[cat][round][group]) out[cat][round][group] = [];
      out[cat][round][group].push(entry);
    } else {
      out[cat][round].push(entry);
    }
  });

  return out;
}

function getPlayoffs_() {
  const rows = sheetRows_("Playoffs");
  const out = { men: { semifinals: [], final: null }, women: { semifinals: [], final: null } };

  rows.forEach((r) => {
    const cat = String(r.category || "").toLowerCase() === "women" ? "women" : "men";
    const match = {
      p1: String(r.p1 || ""),
      p2: String(r.p2 || ""),
      score: String(r.score || ""),
      winner: String(r.winner || "")
    };
    if (String(r.stage || "").toLowerCase().indexOf("final") === 0) {
      out[cat].final = match;
    } else {
      out[cat].semifinals.push(match);
    }
  });

  return out;
}

function getLive_() {
  const rows = sheetRows_("Live");
  const r = rows[0] || {};
  return {
    id: String(r.id || ""),
    name: String(r.name || ""),
    status: String(r.status || "completed").toLowerCase(),
    venue: String(r.venue || ""),
    startDate: String(r.startDate || ""),
    format: {
      teams: r.teams === "" || r.teams == null ? null : Number(r.teams),
      sets: r.sets === "" || r.sets == null ? null : Number(r.sets),
      games: r.games === "" || r.games == null ? null : Number(r.games),
      tiebreak: r.tiebreak ? String(r.tiebreak) : null
    },
    description: String(r.description || "")
  };
}

function getUpdates_() {
  return sheetRows_("Updates")
    .map((r) => ({
      date: String(r.date || ""),
      order: Number(r.order) || 0,
      round: String(r.round || ""),
      caption: String(r.caption || ""),
      type: String(r.type || "text").toLowerCase(),
      url: String(r.url || "")
    }))
    .filter((u) => u.date || u.caption);
}

function getLiveStandings_() {
  const rows = sheetRows_("LiveStandings");
  const out = {};
  rows.forEach((r) => {
    const round = String(r.round || "");
    const group = String(r.group || "");
    const entry = {
      ranking: Number(r.ranking) || null,
      pair: String(r.pair || ""),
      mp: Number(r.mp) || 0,
      w: Number(r.w) || 0,
      l: Number(r.l) || 0,
      gw: Number(r.gw) || 0,
      gl: Number(r.gl) || 0,
      diff: Number(r.diff) || 0,
      points: Number(r.points) || 0
    };
    if (!out[round]) out[round] = {};
    if (!out[round][group]) out[round][group] = [];
    out[round][group].push(entry);
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
