/* ==========================================================
   PIMTC — App
   Hash-based router + Google Sheets data layer with local
   JSON fallback (also used to seed offline cache).
   ========================================================== */

/* --------- CONFIG ---------
   Paste your deployed Google Apps Script Web App URL below to
   go live with Google Sheets data. Leave empty to use the
   bundled /data/*.json files only. See apps-script/Code.gs
   and README.md for setup steps.
*/
const CONFIG = {
  SHEETS_API_URL: "https://script.google.com/macros/s/AKfycbzWz5uKVyLOxxQPCpf9PKPW9Nj4JrrN7cUKxGeXl2v0H4I1_ScsULnsucwZ9Q6cJIACGA/exec",
  CACHE_TTL_MS: 5 * 60 * 1000
};

const state = { cache: {} };

/* --------- Data layer --------- */
async function fetchJSON(localPath, sheetAction) {
  const cacheKey = sheetAction || localPath;
  const cached = state.cache[cacheKey];
  if (cached && Date.now() - cached.time < CONFIG.CACHE_TTL_MS) return cached.data;

  if (CONFIG.SHEETS_API_URL) {
    try {
      const url = `${CONFIG.SHEETS_API_URL}?action=${sheetAction}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      state.cache[cacheKey] = { data, time: Date.now() };
      return data;
    } catch (e) {
      console.warn(`Sheets fetch failed for ${sheetAction}, falling back to local data.`, e);
    }
  }

  const res = await fetch(localPath);
  const data = await res.json();
  state.cache[cacheKey] = { data, time: Date.now() };
  return data;
}

const getHome = () => fetchJSON("data/home.json", "home");
const getMen = () => fetchJSON("data/men.json", "men");
const getWomen = () => fetchJSON("data/women.json", "women");
const getTournaments = () => fetchJSON("data/tournaments.json", "tournaments");
const getResults = () => fetchJSON("data/results.json", "results");
const getStandings = () => fetchJSON("data/standings.json", "standings");
const getPlayoffs = () => fetchJSON("data/playoffs.json", "playoffs");
const getLive = () => fetchJSON("data/live.json", "live");
const getUpdates = () => fetchJSON("data/updates.json", "updates");
const getLiveStandings = () => fetchJSON("data/live-standings.json", "liveStandings");
const getSchedule = () => fetchJSON("data/schedule.json", "schedule");
const getGallery = () => fetchJSON("data/gallery.json", "gallery");

/* --------- Helpers --------- */
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function seamSVG() {
  return `<svg viewBox="0 0 400 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 14 C 50 2, 100 26, 150 14 S 250 2, 300 14 S 380 24, 400 14" fill="none" stroke="rgba(201,162,75,0.35)" stroke-width="1.5"/>
  </svg>`;
}

function skeletonRows(n) {
  return Array.from({ length: n }).map(() => `<div class="skeleton"></div>`).join("");
}

/* --------- Media embeds for the Live update feed --------- */
function youtubeId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);
  return m ? m[1] : null;
}

let igScriptLoaded = false;
function ensureInstagramEmbedScript() {
  if (igScriptLoaded) {
    if (window.instgrm) window.instgrm.Embeds.process();
    return;
  }
  igScriptLoaded = true;
  const s = document.createElement("script");
  s.src = "https://www.instagram.com/embed.js";
  s.async = true;
  s.onload = () => window.instgrm && window.instgrm.Embeds.process();
  document.body.appendChild(s);
}

function embedBlock(update) {
  const type = (update.type || "text").toLowerCase();
  const url = update.url || "";

  if (type === "youtube" && url) {
    const id = youtubeId(url);
    if (id) return `<div class="embed-wrap yt"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video update" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  if (type === "instagram" && url) {
    return `<div class="embed-wrap ig"><blockquote class="instagram-media" data-instgrm-permalink="${esc(url)}" data-instgrm-version="14" style="width:100%;"></blockquote></div>`;
  }
  if (type === "photo" && url) {
    return `<div class="embed-wrap photo"><img src="${esc(url)}" alt="${esc(update.caption || "Update photo")}" loading="lazy"></div>`;
  }
  if (url) {
    return `<a class="btn btn-outline" href="${esc(url)}" target="_blank" rel="noopener">View link &rarr;</a>`;
  }
  return "";
}

function updateCard(u) {
  return `
    <div class="update-card">
      <div class="update-date">${esc(u.date || "")}</div>
      <div class="update-round">${esc(u.round || "")}</div>
      ${u.caption ? `<p class="update-caption">${esc(u.caption)}</p>` : ""}
      ${embedBlock(u)}
    </div>`;
}

/* --------- Rank row renderer --------- */
function rankRow(p) {
  const wins = p.wins ?? 0, losses = p.losses ?? 0;
  const total = wins + losses;
  const pct = total ? Math.round((wins / total) * 100) : 0;
  const leader = p.rank === 1;
  return `
  <div class="rank-row ${leader ? "is-leader" : ""}">
    <div class="rank-badge">${p.rank ?? "-"}</div>
    <div class="rank-main">
      <div class="rank-name">${esc(p.name)}</div>
      <div class="rank-dept">${esc(p.dept || "")}</div>
      <div class="rank-meta">
        ${p.age ? `<span>Age ${esc(p.age)}</span>` : ""}
        ${p.plays ? `<span>${esc(p.plays)}</span>` : ""}
        ${p.racket ? `<span>${esc(p.racket)}</span>` : ""}
      </div>
    </div>
    <div class="rank-record">
      <div class="wl"><span class="w">${wins}W</span> &ndash; <span class="l">${losses}L</span></div>
      <div class="wl-bar"><i style="width:${pct}%"></i></div>
    </div>
  </div>`;
}

/* --------- Page renderers --------- */
async function renderHome() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="hero">
      <div class="hero-inner">
        <span class="eyebrow on-dark">Pupuk Iskandar Muda</span>
        <h1>PIM Tennis Club</h1>
        <div class="tagline">Serve, Rally, Win!</div>
        <p class="lede">A community-based sports club hosting regular training sessions, internal tournaments, and inter-company matches &mdash; open to players of every level.</p>
        <div class="hero-actions">
          <a href="#/men" class="btn btn-gold">View Rankings</a>
          <a href="#/tournaments" class="btn btn-outline">See Tournaments</a>
        </div>
        <div class="hero-stats" id="heroStats"></div>
      </div>
    </section>
    <div class="seam-divider">${seamSVG()}</div>
    <section class="section" style="padding-bottom:0;" id="liveTeaserSection"></section>
    <section class="section">
      <div class="wrap about-grid">
        <div>
          <span class="eyebrow">Who We Are</span>
          <h2 id="homeTitle">Loading&hellip;</h2>
          <p id="homeAbout"></p>
          <a class="ig-cta" id="homeIg" href="#" target="_blank" rel="noopener">Follow us on Instagram &rarr;</a>
        </div>
        <div>
          <div class="about-photo" id="aboutPhoto"><div class="skeleton" style="height:100%"></div></div>
          <div class="map-frame" id="mapFrame"></div>
        </div>
      </div>
    </section>
  `;

  const [home, men, women, live, updates] = await Promise.all([getHome(), getMen(), getWomen(), getLive(), getUpdates()]);
  document.getElementById("homeTitle").textContent = home.name || "Who We Are";
  document.getElementById("homeAbout").textContent = home.about || "";
  const ig = document.getElementById("homeIg");
  if (home.instagram) ig.href = home.instagram;
  const aboutPhoto = document.getElementById("aboutPhoto");
  const mediaType = (home.mediaType || "photo").toLowerCase();
  if (home.photo && mediaType !== "photo") {
    aboutPhoto.classList.add("is-embed");
    aboutPhoto.innerHTML = embedBlock({ type: mediaType, url: home.photo });
    if (mediaType === "instagram") ensureInstagramEmbedScript();
  } else if (home.photo) {
    aboutPhoto.innerHTML = `<img src="${esc(home.photo)}" alt="${esc(home.name || "PIM Tennis Club")}" loading="lazy">`;
  } else {
    aboutPhoto.innerHTML = `<div class="about-photo-fallback"><img src="icons/logo.png" alt="PIMTC crest" width="140" height="140"></div>`;
  }
  if (home.mapEmbed) {
    document.getElementById("mapFrame").innerHTML = `<iframe src="${esc(home.mapEmbed)}" loading="lazy" title="Club location"></iframe>`;
  }
  document.getElementById("heroStats").innerHTML = `
    <div class="hero-stat"><div class="num">${men.length}</div><div class="lab">Men Ranked</div></div>
    <div class="hero-stat"><div class="num">${women.length}</div><div class="lab">Women Ranked</div></div>
    <div class="hero-stat"><div class="num">2025</div><div class="lab">Season</div></div>
  `;

  const teaserSection = document.getElementById("liveTeaserSection");
  if ((live.status || "").toLowerCase() === "ongoing") {
    const latest = [...updates].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))
      || (Number(b.order) || 0) - (Number(a.order) || 0))[0];
    teaserSection.innerHTML = `
      <div class="wrap">
        <div class="live-teaser">
          <div class="lt-info">
            <span class="live-badge"><span class="live-dot"></span>Live Now</span>
            <h3>${esc(live.name || "Ongoing Tournament")}</h3>
            <p>${esc(live.venue || "")}${live.startDate ? ` &middot; since ${esc(live.startDate)}` : ""}</p>
            ${latest ? `<div class="lt-latest">Latest: ${esc(latest.round || "")} &mdash; ${esc(latest.date || "")}</div>` : ""}
          </div>
          <a href="#/live" class="btn btn-gold">Follow Live &rarr;</a>
        </div>
      </div>`;
  } else {
    teaserSection.remove();
  }
}

function playersSection(title, eyebrow) {
  return `
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">${eyebrow}</span>
          <h2>${title}</h2>
        </div>
        <div class="rank-list" id="rankList">${skeletonRows(6)}</div>
      </div>
    </section>`;
}

async function renderMen() {
  document.getElementById("app").innerHTML = playersSection("Men's Rankings", "Players Profile");
  const men = await getMen();
  const sorted = [...men].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  document.getElementById("rankList").innerHTML = sorted.length
    ? sorted.map(rankRow).join("")
    : `<div class="state-msg">No player data yet.</div>`;
}

async function renderWomen() {
  document.getElementById("app").innerHTML = playersSection("Women's Rankings", "Players Profile");
  const women = await getWomen();
  const sorted = [...women].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  document.getElementById("rankList").innerHTML = sorted.length
    ? sorted.map(rankRow).join("")
    : `<div class="state-msg">No player data yet.</div>`;
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatStats(fmt) {
  if (!fmt) return "";
  const blocks = [
    { num: fmt.players, label: "Players", lead: true },
    { num: fmt.sets, label: "Set" },
    { num: fmt.games, label: "Game" }
  ];
  if (fmt.tiebreak) blocks.push({ num: fmt.tiebreak.match(/^\d+/)?.[0] || "", label: "Tiebreak", sub: fmt.tiebreak.replace(/^\d+\s*/, "").toUpperCase() });
  return `<div class="stat-grid">
    ${blocks.map((b) => `
      <div class="stat-block ${b.lead ? "lead" : ""}">
        <div class="stat-num">${esc(b.num)}</div>
        <div class="stat-label">${esc(b.label)}</div>
        ${b.sub ? `<div class="stat-sub">${esc(b.sub)}</div>` : ""}
      </div>`).join("")}
  </div>`;
}

function standingsTable(rows) {
  return `<table class="standings-table">
    <thead><tr><th>#</th><th>Player</th><th>MP</th><th>W</th><th>Pts</th></tr></thead>
    <tbody>
      ${rows.map((r) => `
        <tr class="${r.qualified ? "qualified" : r.qualified === false ? "eliminated" : ""}">
          <td>${r.ranking}</td>
          <td class="p-name">${esc(r.player)}${r.nickname ? ` <span style="color:rgba(18,24,31,0.4); font-weight:400;">(${esc(r.nickname)})</span>` : ""}</td>
          <td>${r.mp}</td><td>${r.w}</td><td>${r.points}</td>
        </tr>`).join("")}
    </tbody>
  </table>`;
}

function standingsBlock(roundName, roundData) {
  const isGrouped = !Array.isArray(roundData);
  return `
    <div class="round-block">
      <div class="round-title">${esc(roundName)}</div>
      ${isGrouped
        ? `<div class="standings-grid">
            ${Object.entries(roundData).map(([group, rows]) => `
              <div class="standings-group">
                <h4>${esc(group)}</h4>
                ${standingsTable(rows)}
              </div>`).join("")}
          </div>
          <div class="standings-note"><span class="q">Advanced</span><span class="e">Eliminated</span></div>`
        : `<div style="max-width:520px; margin-top:14px;">${standingsTable(roundData)}</div>`
      }
    </div>`;
}

function pairTable(rows) {
  return `<table class="standings-table">
    <thead><tr><th>#</th><th>Pair</th><th>MP</th><th>W</th><th>L</th><th>GW</th><th>GL</th><th>+/-</th><th>Pts</th></tr></thead>
    <tbody>
      ${rows.map((r) => `
        <tr>
          <td>${r.ranking}</td>
          <td class="p-name">${esc(r.pair)}</td>
          <td>${r.mp}</td><td>${r.w}</td><td>${r.l}</td><td>${r.gw}</td><td>${r.gl}</td>
          <td>${r.diff > 0 ? "+" : ""}${r.diff}</td><td>${r.points}</td>
        </tr>`).join("")}
    </tbody>
  </table>`;
}

function pairStandingsBlock(roundName, groups) {
  return `
    <div class="round-block">
      <div class="round-title">${esc(roundName)}</div>
      <div class="standings-grid">
        ${Object.entries(groups).map(([group, rows]) => `
          <div class="standings-group">
            <h4>${esc(group)}</h4>
            ${pairTable(rows)}
          </div>`).join("")}
      </div>
    </div>`;
}

function scheduleTable(matches) {
  const dated = matches.filter((m) => m.date).sort((a, b) => a.date.localeCompare(b.date));
  const tbc = matches.filter((m) => !m.date);

  const row = (m) => `
    <tr>
      <td>${m.date
        ? `<span class="schedule-date">${esc(m.date)}${m.day ? `<span class="day">${esc(m.day)}</span>` : ""}</span>`
        : `<span class="schedule-tbc-label">Date TBC</span>`}</td>
      <td>${m.court ? `<span class="schedule-court">${esc(m.court)}</span>` : ""}</td>
      <td><span class="schedule-match">${esc(m.team1)}<span class="vs">vs</span>${esc(m.team2)}</span></td>
    </tr>`;

  return `<table class="schedule-table">
    <thead><tr><th>Date</th><th>Court</th><th>Match</th></tr></thead>
    <tbody>${dated.map(row).join("")}${tbc.map(row).join("")}</tbody>
  </table>`;
}

function catLabel(cat) {
  if (cat === "men") return "Men's Tournament";
  if (cat === "women") return "Women's Tournament";
  return cat.charAt(0).toUpperCase() + cat.slice(1) + " Tournament";
}

function orderCats(cats) {
  const priority = { men: 0, women: 1 };
  return [...cats].sort((a, b) => (priority[a] ?? 2) - (priority[b] ?? 2) || a.localeCompare(b));
}

function tabBar(cats) {
  return `<div class="tab-bar">
    ${cats.map((c, i) => `<button class="tab-btn ${i === 0 ? "active" : ""}" data-cat="${esc(c)}">${esc(catLabel(c))}</button>`).join("")}
  </div>`;
}

async function renderTournaments() {
  const app = document.getElementById("app");
  const [data, standings] = await Promise.all([getTournaments(), getStandings()]);
  const cats = orderCats(new Set([...Object.keys(data), ...Object.keys(standings)]));

  app.innerHTML = `
    <section class="section-dark section" style="padding-bottom:40px;">
      <div class="wrap">
        <span class="eyebrow on-dark">@ PIM Tennis Arena</span>
        <h2>Singles Tennis Championship</h2>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        ${tabBar(cats)}
        <div id="tournBody"><div class="skeleton" style="height:200px"></div></div>
      </div>
    </section>`;

  const body = document.getElementById("tournBody");

  function draw(cat) {
    const rounds = (data[cat] && data[cat].rounds) || [];
    const fmt = data[cat] && data[cat].format;
    const catStandings = standings[cat] || {};
    const hasContent = rounds.length || Object.keys(catStandings).length || fmt;

    if (!hasContent) {
      body.innerHTML = `<div class="state-msg">Round structure hasn't been published for this category yet.</div>`;
      return;
    }

    const rulesHtml = rounds.map((r) => `
      <div class="round-block">
        <div class="round-title">${esc(r.name)}</div>
        <ul class="round-points">${(r.points || []).map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul>
      </div>
    `).join("");

    const standingsHtml = Object.entries(catStandings).map(([roundName, roundData]) => standingsBlock(roundName, roundData)).join("");

    body.innerHTML = formatStats(fmt) + rulesHtml + standingsHtml;
  }

  if (cats.length) draw(cats[0]);
  else body.innerHTML = `<div class="state-msg">No tournaments published yet.</div>`;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      draw(btn.dataset.cat);
    });
  });
}

function bracketHTML(playoffs) {
  if (!playoffs || !playoffs.final) return "";
  const matchCard = (m) => `
    <div class="match-card">
      <div class="mp-row ${m.winner === m.p1 ? "winner" : ""}"><span><span class="avatar">${initials(m.p1)}</span>${esc(m.p1)}</span></div>
      <div class="mp-row ${m.winner === m.p2 ? "winner" : ""}"><span><span class="avatar">${initials(m.p2)}</span>${esc(m.p2)}</span></div>
      <div class="mp-score">${esc(m.score)}</div>
    </div>`;
  return `
    <div class="round-block">
      <div class="round-title">Playoffs</div>
      <div class="bracket-wrap">
        <div class="bracket">
          <div class="bracket-col">${playoffs.semifinals.map(matchCard).join("")}</div>
          <div class="bracket-col final-col">${matchCard(playoffs.final)}</div>
          <div class="bracket-col final-col">
            <div class="champion-panel">
              <div class="eyebrow on-dark">Champion</div>
              <div class="trophy">&#127942;</div>
              <div class="name">${esc(playoffs.final.winner)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

async function renderResults() {
  const app = document.getElementById("app");
  const [data, playoffs] = await Promise.all([getResults(), getPlayoffs()]);
  const cats = orderCats(new Set([...Object.keys(data), ...Object.keys(playoffs)]));

  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Season Wrap</span>
          <h2>Tournament Results</h2>
        </div>
        ${tabBar(cats)}
        <div id="resultsBody"><div class="skeleton" style="height:140px"></div></div>
      </div>
    </section>`;

  const body = document.getElementById("resultsBody");

  function draw(cat) {
    const rows = data[cat] || [];
    const listHtml = rows.length
      ? `<div class="result-list">${rows.map((r) => `
          <div class="result-row">
            <div class="round-name">${esc(r.round)}</div>
            <div class="summary">${esc(r.summary || "")}</div>
          </div>`).join("")}</div>`
      : `<div class="state-msg">Results haven't been posted for this category yet.</div>`;

    const bracket = bracketHTML(playoffs[cat]);
    body.innerHTML = listHtml + (bracket ? `<div style="margin-top:36px;">${bracket}</div>` : "");
  }

  if (cats.length) draw(cats[0]);
  else body.innerHTML = `<div class="state-msg">No results published yet.</div>`;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      draw(btn.dataset.cat);
    });
  });
}

async function renderLive() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section-dark section" style="padding-bottom:44px;">
      <div class="wrap">
        <div class="live-header">
          <span class="live-badge" id="liveStatusBadge"><span class="live-dot"></span>Live</span>
        </div>
        <h2 id="liveTitle" style="margin-top:12px;">Loading&hellip;</h2>
        <p id="liveDesc" style="max-width:600px; margin-top:10px;"></p>
        <div class="live-meta" id="liveMeta"></div>
      </div>
    </section>
    <section class="section" style="padding-bottom:20px;">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Group Stage</span>
          <h2>Standings</h2>
        </div>
        <div id="liveStandingsBody"><div class="skeleton" style="height:200px"></div></div>
      </div>
    </section>
    <section class="section" style="padding-bottom:20px; padding-top:0;">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Match Schedule</span>
          <h2>Upcoming Matches</h2>
        </div>
        <div id="scheduleBody"><div class="skeleton" style="height:160px"></div></div>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Match Updates</span>
          <h2>Latest From The Court</h2>
        </div>
        <div class="update-feed" id="updateFeed"><div class="skeleton" style="height:120px; margin-bottom:20px;"></div></div>
      </div>
    </section>`;

  const [live, updates, liveStandings, schedule] = await Promise.all([getLive(), getUpdates(), getLiveStandings(), getSchedule()]);

  document.getElementById("liveTitle").textContent = live.name || "Live Tournament";
  document.getElementById("liveDesc").textContent = live.description || "";
  const badge = document.getElementById("liveStatusBadge");
  if ((live.status || "").toLowerCase() !== "ongoing") {
    badge.innerHTML = `Completed`;
    badge.style.color = "var(--gold)";
    badge.style.borderColor = "rgba(201,162,75,0.35)";
    badge.style.background = "rgba(201,162,75,0.1)";
  }

  const fmt = live.format || {};
  const metaParts = [];
  if (live.venue) metaParts.push(`<span>@ <b>${esc(live.venue)}</b></span>`);
  if (live.startDate) metaParts.push(`<span>Started <b>${esc(live.startDate)}</b></span>`);
  if (fmt.teams) metaParts.push(`<span><b>${esc(fmt.teams)}</b> Pairs</span>`);
  if (fmt.sets) metaParts.push(`<span><b>${esc(fmt.sets)}</b> Set</span>`);
  if (fmt.games) metaParts.push(`<span><b>${esc(fmt.games)}</b> Games</span>`);
  if (fmt.tiebreak) metaParts.push(`<span><b>${esc(fmt.tiebreak)}</b> Tiebreak</span>`);
  document.getElementById("liveMeta").innerHTML = metaParts.join("");

  const standingsBody = document.getElementById("liveStandingsBody");
  const roundNames = Object.keys(liveStandings || {});
  standingsBody.innerHTML = roundNames.length
    ? roundNames.map((name) => pairStandingsBlock(name, liveStandings[name])).join("")
    : `<div class="state-msg">Standings haven't been posted yet.</div>`;

  const scheduleBody = document.getElementById("scheduleBody");
  scheduleBody.innerHTML = schedule.length
    ? scheduleTable(schedule)
    : `<div class="state-msg">No matches scheduled yet.</div>`;

  const sorted = [...updates].sort((a, b) => {
    const d = String(b.date || "").localeCompare(String(a.date || ""));
    return d !== 0 ? d : (Number(b.order) || 0) - (Number(a.order) || 0);
  });

  const feed = document.getElementById("updateFeed");
  feed.innerHTML = sorted.length
    ? sorted.map(updateCard).join("")
    : `<div class="state-msg">No updates posted yet — check back soon.</div>`;

  if (sorted.some((u) => (u.type || "").toLowerCase() === "instagram")) {
    ensureInstagramEmbedScript();
  }
}

function galleryCard(item) {
  return `
    <div class="gallery-card">
      ${embedBlock(item)}
      ${item.caption || item.date ? `
        <div class="gallery-card-caption">
          ${item.caption ? esc(item.caption) : ""}
          ${item.date ? `<span class="gallery-card-date">${esc(item.date)}</span>` : ""}
        </div>` : ""}
    </div>`;
}

async function renderGallery() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section-dark section" style="padding-bottom:40px;">
      <div class="wrap">
        <span class="eyebrow on-dark">Moments From The Club</span>
        <h2>Gallery</h2>
      </div>
    </section>
    <section class="section">
      <div class="wrap" id="galleryBody"><div class="skeleton" style="height:240px"></div></div>
    </section>`;

  const items = await getGallery();
  const body = document.getElementById("galleryBody");

  if (!items.length) {
    body.innerHTML = `<div class="state-msg">No photos posted yet — check back soon.</div>`;
    return;
  }

  const groups = {};
  items.forEach((item) => {
    const event = item.event || "Uncategorized";
    if (!groups[event]) groups[event] = [];
    groups[event].push(item);
  });

  const eventOrder = Object.keys(groups).sort((a, b) => {
    const latest = (g) => g.reduce((max, i) => (i.date || "") > max ? (i.date || "") : max, "");
    return latest(groups[b]).localeCompare(latest(groups[a]));
  });

  body.innerHTML = eventOrder.map((event) => `
    <div class="gallery-group">
      <div class="gallery-group-title">${esc(event)}</div>
      <div class="gallery-group-meta">${groups[event].length} item${groups[event].length === 1 ? "" : "s"}</div>
      <div class="gallery-grid">${groups[event].map(galleryCard).join("")}</div>
    </div>
  `).join("");

  if (items.some((i) => (i.type || "").toLowerCase() === "instagram")) {
    ensureInstagramEmbedScript();
  }
}

function renderInquiry() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="wrap inquiry-grid">
        <div>
          <span class="eyebrow">Get In Touch</span>
          <h2>Inquiry</h2>
          <p style="margin-top:14px;">Want to join a session, register for the next tournament, or ask about the club? Send us a message and we'll get back to you.</p>
          <form id="inquiryForm" style="margin-top:26px;">
            <div class="field"><label for="fName">Name</label><input id="fName" required></div>
            <div class="field"><label for="fDept">Department</label><input id="fDept"></div>
            <div class="field"><label for="fCategory">Category</label>
              <select id="fCategory"><option>Men's Ranking</option><option>Women's Ranking</option><option>Tournament Registration</option><option>General</option></select>
            </div>
            <div class="field"><label for="fMsg">Message</label><textarea id="fMsg" required></textarea></div>
            <p class="form-note">This demo form doesn't send yet &mdash; wire it to Google Forms or the Apps Script backend (see README) to start collecting entries.</p>
            <button type="submit" class="btn btn-gold">Send Inquiry</button>
          </form>
        </div>
        <div class="contact-card">
          <h3>PIM Tennis Club</h3>
          <p>Pupuk Iskandar Muda, Lhokseumawe, Aceh</p>
          <div class="ig-row">
            <span>@pimtennisclub</span>
          </div>
        </div>
      </div>
    </section>`;

  document.getElementById("inquiryForm").addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Thanks! (Demo form — connect this to Google Sheets/Forms to actually receive inquiries.)");
    e.target.reset();
  });
}

/* --------- Router --------- */
const routes = {
  home: renderHome,
  live: renderLive,
  tournaments: renderTournaments,
  results: renderResults,
  gallery: renderGallery,
  men: renderMen,
  women: renderWomen,
  inquiry: renderInquiry
};

function currentRoute() {
  const hash = location.hash.replace(/^#\//, "");
  return routes[hash] ? hash : "home";
}

async function router() {
  const route = currentRoute();
  document.querySelectorAll("[data-route]").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
  document.getElementById("mainNav").classList.remove("open");
  document.getElementById("navToggle").setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  await routes[route]();
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) location.hash = "#/home";
  router();

  document.getElementById("footYear").textContent = new Date().getFullYear();

  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  const loader = document.getElementById("seamLoader");
  setTimeout(() => loader.classList.add("hide"), 350);

  getLive().then((live) => {
    const navLink = document.querySelector('.main-nav a[data-route="live"]');
    if (navLink && (live.status || "").toLowerCase() === "ongoing") navLink.classList.add("has-live");
  }).catch(() => {});
});

/* --------- PWA: service worker + install prompt --------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((e) => console.warn("SW registration failed", e));
  });

  // Auto-reload once when a new version of the app takes over, so a normal
  // refresh (not just a hard refresh) is enough to see a fresh deploy.
  let refreshedOnce = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshedOnce) return;
    refreshedOnce = true;
    window.location.reload();
  });
}

let deferredPrompt = null;
const installToast = document.getElementById("installToast");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!sessionStorage.getItem("pimtc_install_dismissed")) {
    installToast.classList.add("show");
  }
});
document.getElementById("installBtn")?.addEventListener("click", async () => {
  installToast.classList.remove("show");
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});
document.getElementById("dismissInstall")?.addEventListener("click", () => {
  installToast.classList.remove("show");
  sessionStorage.setItem("pimtc_install_dismissed", "1");
});
