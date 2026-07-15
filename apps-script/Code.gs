/**
 * PIMTC Apps Script backend.
 *
 * SETUP
 * 1. Create a Google Sheet with these tabs (exact names, header row exactly as below):
 *
 *    Men            | rank | name | age | plays | wins | losses | racket | dept | photo |
 *    Women          | rank | name | age | plays | wins | losses | racket | dept | photo |
 *    Home           | name | tagline | about | photo | mediaType | instagram | mapEmbed | lat | lng |
 *                     (single data row; photo is a URL — for a plain picture, use a direct
 *                      image link and leave mediaType blank/"photo". To embed an Instagram
 *                      post/reel or YouTube video instead, put that URL in photo and set
 *                      mediaType to "instagram" or "youtube".)
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
 *    Schedule       | date | day | time | court | team1 | team2 |
 *                     (one row per match; leave date and day blank for matches without a
 *                      confirmed date yet — they'll show under "Date TBC". date format YYYY-MM-DD,
 *                      time as plain text e.g. "17:00". For rounds without known teams yet
 *                      (e.g. "Semifinal 1"), put the round name in team1 and leave team2 blank —
 *                      it'll display as a plain label instead of "X vs Y".)
 *    Gallery        | event | date | caption | type | url |
 *                     (one row per photo/video; event is a free-text group name, e.g.
 *                      "PIMTC 500 Doubles 2026" — photos with the same event text are
 *                      grouped together on the Gallery page, most recent event first.
 *                      type = "instagram", "youtube", or "photo".)
 *    HomeGallery    | order | url | caption |
 *                     (one row per photo for the auto-rotating carousel on the Home page.
 *                      url must be a direct image link, same rule as any type="photo" field.
 *                      order controls the sequence; caption is optional. If this tab has
 *                      any rows, it takes priority over the Home tab's single photo/mediaType.)
 *
 * 2. Extensions > Apps Script, paste this file in as Code.gs.
 * 3. Deploy > New deployment > Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the deployment URL (ends in /exec) into js/app.js CONFIG.SHEETS_API_URL.
 * 5. Re-run "Deploy > Manage deployments > Edit" and bump version whenever you
 *    edit this script (new code doesn't go live on the same URL until redeployed).
 */

// Maps each action name to the function that produces its data. Used both for
// single-action requests and for ?action=bundle, which runs several of these
// in one Apps Script execution instead of the browser making several separate
// (slow) round-trips to Apps Script.
const ACTIONS_ = {
  men: function () { return getPlayers_("Men"); },
  women: function () { return getPlayers_("Women"); },
  home: getHome_,
  tournaments: getTournaments_,
  results: getResults_,
  standings: getStandings_,
  playoffs: getPlayoffs_,
  live: getLive_,
  updates: getUpdates_,
  livestandings: getLiveStandings_,
  schedule: getSchedule_,
  gallery: getGallery_,
  homegallery: getHomeGallery_,
  health: getHealth_
};

function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();

  if (action === "bundle") {
    // ?action=bundle&keys=home,men,women,live,updates,homeGallery
    // Response is keyed by exactly the strings passed in `keys` (case preserved),
    // so the frontend can request "homeGallery" and get back { homeGallery: [...] }
    // even though lookup internally is case-insensitive.
    const rawKeys = (e.parameter.keys || "").split(",").map(function (k) { return k.trim(); }).filter(Boolean);
    const payload = {};
    rawKeys.forEach(function (rawKey) {
      const fn = ACTIONS_[rawKey.toLowerCase()];
      payload[rawKey] = fn ? fn() : { error: "Unknown key: " + rawKey };
    });
    return respond_(payload);
  }

  const fn = ACTIONS_[action];
  const payload = fn ? fn() : { error: "Unknown action. Use one of: " + Object.keys(ACTIONS_).join(", ") + ", bundle." };
  return respond_(payload);
}

function respond_(payload) {
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
  // Google Sheets silently converts cells that look like dates (e.g. "2026-06-29")
  // into real Date objects, even when you typed plain text. If we don't catch that,
  // String(dateObject) produces an ugly full timestamp AND sorts alphabetically
  // instead of chronologically, which breaks both display and date-based ordering.
  // So: any cell that comes back as an actual Date gets reformatted to YYYY-MM-DD here,
  // once, for every tab and every column — not just the ones literally named "date".
  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map((h) => String(h).trim());
  return values
    .filter((row) => row.some((cell) => cell !== "" && cell !== null))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        let cell = row[i];
        if (cell instanceof Date) {
          cell = Utilities.formatDate(cell, tz, "yyyy-MM-dd");
        }
        obj[h] = cell;
      });
      return obj;
    });
}

function getPlayers_(tabName) {
  return sheetRows_(tabName).map((r) => ({
    rank: number_(r.rank, null),
    name: text_(r.name),
    age: r.age === "" ? null : number_(r.age, null),
    plays: text_(r.plays),
    wins: number_(r.wins, 0),
    losses: number_(r.losses, 0),
    racket: text_(r.racket),
    dept: text_(r.dept),
    photo: text_(r.photo)
  }));
}

function getHome_() {
  const rows = sheetRows_("Home");
  const r = rows[0] || {};
  return {
    name: text_(r.name, "Pupuk Iskandar Muda Tennis Club"),
    tagline: text_(r.tagline, "Serve, Rally, Win!"),
    about: text_(r.about),
    photo: text_(r.photo),
    mediaType: oneOf_(r.mediaType, ["photo", "instagram", "youtube", "text"], "photo"),
    instagram: text_(r.instagram),
    mapEmbed: text_(r.mapEmbed),
    lat: number_(r.lat, null),
    lng: number_(r.lng, null)
  };
}


function text_(value, fallback) {
  const out = String(value == null ? "" : value).trim();
  return out || (fallback || "");
}

function lowerText_(value, fallback) {
  return text_(value, fallback).toLowerCase();
}

function number_(value, fallback) {
  if (value === "" || value == null) return fallback == null ? 0 : fallback;
  const n = Number(value);
  return isNaN(n) ? (fallback == null ? 0 : fallback) : n;
}

function boolOrBlank_(value) {
  if (value === true || String(value).trim().toUpperCase() === "TRUE") return true;
  if (value === false || String(value).trim().toUpperCase() === "FALSE") return false;
  return null;
}

function oneOf_(value, allowed, fallback) {
  const v = lowerText_(value, fallback);
  return allowed.indexOf(v) >= 0 ? v : fallback;
}

function normalizeDate_(value) {
  const v = text_(value);
  if (!v) return "";
  const m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return v;
  return m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
}

function isValidDateText_(value) {
  const v = text_(value);
  return !v || /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isDirectPhotoUrl_(url) {
  const u = text_(url).toLowerCase();
  return !u || /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/.test(u);
}
function catOf_(r) {
  return lowerText_(r.category, "men") || "men";
}

function getFormats_() {
  const out = {};
  sheetRows_("Format").forEach((r) => {
    out[catOf_(r)] = {
      players: number_(r.players, null),
      sets: number_(r.sets, null),
      games: number_(r.games, null),
      tiebreak: r.tiebreak ? text_(r.tiebreak) : null
    };
  });
  return out;
}

function getTournaments_() {
  const rows = sheetRows_("TournamentRounds");
  const formats = getFormats_();
  const out = {};
  const ensureCat = (cat) => { if (!out[cat]) out[cat] = { format: formats[cat] || null, rounds: [] }; };
  const roundIndex = {}; // key: category|roundName -> round object

  rows
    .sort((a, b) => Number(a.roundOrder) - Number(b.roundOrder))
    .forEach((r) => {
      const cat = catOf_(r);
      ensureCat(cat);
      const key = cat + "|" + r.roundName;
      if (!roundIndex[key]) {
        const round = { name: String(r.roundName || ""), points: [] };
        roundIndex[key] = round;
        out[cat].rounds.push(round);
      }
      if (r.point) roundIndex[key].points.push(String(r.point));
    });

  // Categories that only exist in Format (no round rules yet) should still appear.
  Object.keys(formats).forEach(ensureCat);

  return out;
}

function getStandings_() {
  const rows = sheetRows_("Standings");
  const out = {};

  rows.forEach((r) => {
    const cat = catOf_(r);
    const round = text_(r.round);
    const group = text_(r.group);
    const entry = {
      ranking: number_(r.ranking, null),
      player: text_(r.player),
      mp: number_(r.mp, 0),
      w: number_(r.w, 0),
      points: number_(r.points, 0)
    };
    if (r.nickname) entry.nickname = text_(r.nickname);
    const q = boolOrBlank_(r.qualified);
    if (q !== null) entry.qualified = q;

    if (!out[cat]) out[cat] = {};
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
  const out = {};

  rows.forEach((r) => {
    const cat = catOf_(r);
    if (!out[cat]) out[cat] = { semifinals: [], final: null };
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
    id: text_(r.id),
    name: text_(r.name),
    status: oneOf_(r.status, ["ongoing", "completed"], "completed"),
    venue: text_(r.venue),
    startDate: normalizeDate_(r.startDate),
    format: {
      teams: r.teams === "" || r.teams == null ? null : number_(r.teams, null),
      sets: r.sets === "" || r.sets == null ? null : number_(r.sets, null),
      games: r.games === "" || r.games == null ? null : number_(r.games, null),
      tiebreak: r.tiebreak ? text_(r.tiebreak) : null
    },
    description: text_(r.description)
  };
}

function getUpdates_() {
  return sheetRows_("Updates")
    .map((r) => ({
      date: normalizeDate_(r.date),
      order: number_(r.order, 0),
      round: text_(r.round),
      caption: text_(r.caption),
      type: oneOf_(r.type, ["text", "photo", "instagram", "youtube"], "text"),
      url: text_(r.url)
    }))
    .filter((u) => u.date || u.caption);
}

function getLiveStandings_() {
  const rows = sheetRows_("LiveStandings");
  const out = {};
  rows.forEach((r) => {
    const round = text_(r.round);
    const group = text_(r.group);
    const entry = {
      ranking: number_(r.ranking, null),
      pair: text_(r.pair),
      mp: number_(r.mp, 0),
      w: number_(r.w, 0),
      l: number_(r.l, 0),
      gw: number_(r.gw, 0),
      gl: number_(r.gl, 0),
      diff: number_(r.diff, 0),
      points: number_(r.points, 0)
    };
    if (!out[round]) out[round] = {};
    if (!out[round][group]) out[round][group] = [];
    out[round][group].push(entry);
  });
  return out;
}

function getSchedule_() {
  return sheetRows_("Schedule").map((r) => ({
    date: normalizeDate_(r.date),
    day: text_(r.day),
    time: text_(r.time),
    court: text_(r.court),
    team1: text_(r.team1),
    team2: text_(r.team2),
    round: text_(r.round),
    score: text_(r.score),
    winner: text_(r.winner)
  }));
}

function getGallery_() {
  return sheetRows_("Gallery").map((r) => ({
    event: text_(r.event),
    date: normalizeDate_(r.date),
    caption: text_(r.caption),
    type: oneOf_(r.type, ["photo", "instagram", "youtube"], "photo"),
    url: text_(r.url)
  }));
}

function getHomeGallery_() {
  return sheetRows_("HomeGallery").map((r) => ({
    order: number_(r.order, 0),
    url: text_(r.url),
    caption: text_(r.caption)
  })).filter((s) => s.url);
}

function getResults_() {
  const rows = sheetRows_("Results");
  const out = {};
  rows.forEach((r) => {
    const cat = catOf_(r);
    if (!out[cat]) out[cat] = [];
    out[cat].push({ round: text_(r.round), summary: text_(r.summary) });
  });
  return out;
}


function getHealth_() {
  const expected = {
    Men:["rank","name","age","plays","wins","losses","racket","dept","photo"],
    Women:["rank","name","age","plays","wins","losses","racket","dept","photo"],
    Home:["name","tagline","about","photo","mediaType","instagram","mapEmbed","lat","lng"],
    TournamentRounds:["category","roundOrder","roundName","point"],
    Format:["category","players","sets","games","tiebreak"],
    Standings:["category","round","group","ranking","player","nickname","mp","w","points","qualified"],
    Playoffs:["category","stage","p1","p2","score","winner"],
    Results:["category","round","summary"],
    Live:["id","name","status","venue","startDate","teams","sets","games","tiebreak","description"],
    Updates:["date","order","round","caption","type","url"],
    LiveStandings:["round","group","ranking","pair","mp","w","l","gw","gl","diff","points"],
    Schedule:["date","day","time","court","team1","team2"],
    Gallery:["event","date","caption","type","url"],
    HomeGallery:["order","url","caption"]
  };
  const issues = [];
  const stats = {};
  Object.keys(expected).forEach(function(name) {
    const sheet = getSheet_(name);
    if (!sheet) { issues.push({ sheet:name, severity:"error", message:"Missing sheet" }); return; }
    const values = sheet.getDataRange().getValues();
    const headers = values.length ? values[0].map(function(h){ return String(h).trim(); }) : [];
    stats[name] = Math.max(values.length - 1, 0);
    expected[name].forEach(function(h) {
      if (headers.indexOf(h) < 0) issues.push({ sheet:name, severity:"error", message:"Missing header: " + h });
    });
  });

  sheetRows_("Live").forEach(function(r, i) {
    if (["ongoing", "completed"].indexOf(lowerText_(r.status, "completed")) < 0) issues.push({ sheet:"Live", row:i+2, severity:"warning", message:"Unknown status: " + r.status });
    if (!isValidDateText_(normalizeDate_(r.startDate))) issues.push({ sheet:"Live", row:i+2, severity:"warning", message:"Date should use YYYY-MM-DD" });
  });
  sheetRows_("Updates").forEach(function(r, i) {
    const t = lowerText_(r.type, "text");
    if (["text", "photo", "instagram", "youtube"].indexOf(t) < 0) issues.push({ sheet:"Updates", row:i+2, severity:"warning", message:"Unknown media type: " + r.type });
    if (!isValidDateText_(normalizeDate_(r.date))) issues.push({ sheet:"Updates", row:i+2, severity:"warning", message:"Date should use YYYY-MM-DD" });
    if (t === "photo" && !isDirectPhotoUrl_(r.url)) issues.push({ sheet:"Updates", row:i+2, severity:"warning", message:"Photo URL should be a direct image file link" });
  });
  sheetRows_("Gallery").forEach(function(r, i) {
    const t = lowerText_(r.type, "photo");
    if (["photo", "instagram", "youtube"].indexOf(t) < 0) issues.push({ sheet:"Gallery", row:i+2, severity:"warning", message:"Unknown media type: " + r.type });
    if (t === "photo" && !isDirectPhotoUrl_(r.url)) issues.push({ sheet:"Gallery", row:i+2, severity:"warning", message:"Photo URL should be a direct image file link" });
  });
  sheetRows_("HomeGallery").forEach(function(r, i) {
    if (!isDirectPhotoUrl_(r.url)) issues.push({ sheet:"HomeGallery", row:i+2, severity:"warning", message:"URL should be a direct image file link" });
  });

  return { ok: issues.filter(function(i){ return i.severity === "error"; }).length === 0, generatedAt: new Date().toISOString(), rowCounts: stats, issues: issues };
}
