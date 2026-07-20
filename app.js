let allRivers = [];
let activeTab = "all";

function getFavourites() { return JSON.parse(localStorage.getItem("trout_favourites") || "[]"); }
function toggleFavourite(id) {
  const favs = getFavourites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id); else favs.splice(idx, 1);
  localStorage.setItem("trout_favourites", JSON.stringify(favs));
}
function isFav(id) { return getFavourites().includes(id); }

function difficultyStars(n) {
  return Array.from({length:5},(_,i)=>`<span class="star ${i<n?"on":""}">★</span>`).join("");
}

function wtypeClass(t) {
  return "wtype wtype-" + (t || "fiume").toLowerCase().replace(/\s+/g,"-");
}

function wtypeIcon(t) {
  const map = { "fiume":"🌊","torrente":"💧","torrente di montagna":"🏔️","lago":"🏞️","lago alpino":"🏔️" };
  return map[(t||"").toLowerCase()] || "💧";
}

function render(filter = "") {
  const container = document.getElementById("river-list");
  const favs = getFavourites();

  let rivers = allRivers.filter(r =>
    r.name.toLowerCase().includes(filter.toLowerCase()) ||
    (r.zone||"").toLowerCase().includes(filter.toLowerCase()) ||
    (r.province||"").toLowerCase().includes(filter.toLowerCase())
  );

  if (activeTab === "fav")  rivers = rivers.filter(r => favs.includes(r.id));
  if (activeTab === "lago") rivers = rivers.filter(r => (r.waterType||"").includes("lago"));
  if (activeTab === "fly")  rivers = rivers.filter(r => r.flyFriendly);

  if (rivers.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="icon">${activeTab==="fav"?"❤️":"🏞️"}</div>
      <p>${activeTab==="fav"
        ? "Nessun preferito ancora.<br>Tocca ❤️ su un torrente per salvarlo."
        : "Nessun risultato."}</p>
    </div>`;
    return;
  }

  container.innerHTML = "";
  rivers.forEach(river => {
    const card = document.createElement("div");
    card.className = "river-card";
    const faved = isFav(river.id);
    const hasImg = river.images && river.images.length;
    const altBadge = river.altitude ? `<span class="card-altitude">⛰️ ${river.altitude} m</span>` : "";
    const thumb = hasImg
      ? `<div class="card-img-wrap">
           <img class="card-thumb" src="${river.images[0]}" alt="${river.name}" loading="lazy">
           <div class="card-gradient"></div>${altBadge}
         </div>`
      : `<div class="card-thumb-placeholder">🏞️</div>`;

    card.innerHTML = `
      ${thumb}
      <div class="card-body">
        <span class="${wtypeClass(river.waterType)}">${wtypeIcon(river.waterType)} ${river.waterType || "fiume"}</span>
        <div class="card-title-row">
          <h2>${river.name}</h2>
          <button class="fav-btn" data-id="${river.id}">${faved?"❤️":"🤍"}</button>
        </div>
        <div class="card-meta">
          <span class="chip">📍 ${river.province}</span>
          <span class="chip">🗺️ ${river.zone}</span>
        </div>
        <p class="card-species">🐟 ${river.species.join(" · ")}</p>
        ${river.flyFriendly ? '<p class="fly-badge">🪰 Adatto alla pesca a mosca</p>' : ""}
        <div class="difficulty">${difficultyStars(river.difficulty)}</div>
        <button class="btn btn-primary" onclick="openRiver('${river.id}')">Apri scheda →</button>
      </div>`;

    card.querySelector(".fav-btn").addEventListener("click", e => {
      e.stopPropagation();
      toggleFavourite(river.id);
      render(document.getElementById("search").value);
    });
    container.appendChild(card);
  });
}

fetch("database.json")
  .then(r => r.json())
  .then(rivers => {
    allRivers = rivers;
    document.getElementById("search").addEventListener("input", e => render(e.target.value));
    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        activeTab = btn.dataset.tab;
        render(document.getElementById("search").value);
      });
    });
    render();
  });

function openRiver(id) { window.location.href = `river.html?id=${id}`; }
