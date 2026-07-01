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
  SHEETS_API_URL: "", // e.g. "https://script.google.com/macros/s/AKfycbzWz5uKVyLOxxQPCpf9PKPW9Nj4JrrN7cUKxGeXl2v0H4I1_ScsULnsucwZ9Q6cJIACGA/exec"
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

/* --------- Rank row renderer --------- */
function rankRow(p) {
  const wins = p.wins ?? 0, losses = p.losses ?? 0;
  const total = wins + losses;
  const pct = total ? Math.round((wins / total) * 100) : 0;
  const leader = p.rank === 1;
  const isOsman = /osman/i.test(p.name || "");
  return `
  <div class="rank-row ${leader ? "is-leader" : ""}">
    <div class="rank-badge">${p.rank ?? "-"}</div>
    <div class="rank-main">
      <div class="rank-name">${esc(p.name)} ${isOsman ? '<span class="chip">You</span>' : ""}</div>
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
    <section class="section">
      <div class="wrap about-grid">
        <div>
          <span class="eyebrow">Who We Are</span>
          <h2 id="homeTitle">Loading&hellip;</h2>
          <p id="homeAbout"></p>
          <a class="ig-cta" id="homeIg" href="#" target="_blank" rel="noopener">Follow us on Instagram &rarr;</a>
        </div>
        <div>
          <div class="about-photo"><div class="skeleton" style="height:100%"></div></div>
          <div class="map-frame" id="mapFrame"></div>
        </div>
      </div>
    </section>
  `;

  const [home, men, women] = await Promise.all([getHome(), getMen(), getWomen()]);
  document.getElementById("homeTitle").textContent = home.name || "Who We Are";
  document.getElementById("homeAbout").textContent = home.about || "";
  const ig = document.getElementById("homeIg");
  if (home.instagram) ig.href = home.instagram;
  if (home.mapEmbed) {
    document.getElementById("mapFrame").innerHTML = `<iframe src="${esc(home.mapEmbed)}" loading="lazy" title="Club location"></iframe>`;
  }
  document.getElementById("heroStats").innerHTML = `
    <div class="hero-stat"><div class="num">${men.length}</div><div class="lab">Men Ranked</div></div>
    <div class="hero-stat"><div class="num">${women.length}</div><div class="lab">Women Ranked</div></div>
    <div class="hero-stat"><div class="num">2025</div><div class="lab">Season</div></div>
  `;
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

async function renderTournaments() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section-dark section" style="padding-bottom:40px;">
      <div class="wrap">
        <span class="eyebrow on-dark">@ PIM Tennis Arena</span>
        <h2>Singles Tennis Championship</h2>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="tab-bar">
          <button class="tab-btn active" data-cat="men">Men's Tournament</button>
          <button class="tab-btn" data-cat="women">Women's Tournament</button>
        </div>
        <div id="tournBody"><div class="skeleton" style="height:200px"></div></div>
      </div>
    </section>`;

  const data = await getTournaments();
  const body = document.getElementById("tournBody");

  function draw(cat) {
    const rounds = (data[cat] && data[cat].rounds) || [];
    if (!rounds.length) {
      body.innerHTML = `<div class="state-msg">Round structure hasn't been published for this category yet.</div>`;
      return;
    }
    body.innerHTML = rounds.map((r, i) => `
      <div class="round-block">
        <div class="round-title"><span class="num">${i + 1}</span> ${esc(r.name)}</div>
        <ul class="round-points">${(r.points || []).map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul>
      </div>
    `).join("");
  }

  draw("men");
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      draw(btn.dataset.cat);
    });
  });
}

async function renderResults() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Season Wrap</span>
          <h2>Tournament Results</h2>
        </div>
        <div class="tab-bar">
          <button class="tab-btn active" data-cat="men">Men's Tournament</button>
          <button class="tab-btn" data-cat="women">Women's Tournament</button>
        </div>
        <div id="resultsBody"><div class="skeleton" style="height:140px"></div></div>
      </div>
    </section>`;

  const data = await getResults();
  const body = document.getElementById("resultsBody");

  function draw(cat) {
    const rows = data[cat] || [];
    body.innerHTML = rows.length
      ? `<div class="result-list">${rows.map((r) => `
          <div class="result-row">
            <div class="round-name">${esc(r.round)}</div>
            <div class="summary">${esc(r.summary || "")}</div>
          </div>`).join("")}</div>`
      : `<div class="state-msg">Results haven't been posted for this category yet.</div>`;
  }

  draw("men");
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      draw(btn.dataset.cat);
    });
  });
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
  tournaments: renderTournaments,
  results: renderResults,
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
});

/* --------- PWA: service worker + install prompt --------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((e) => console.warn("SW registration failed", e));
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
