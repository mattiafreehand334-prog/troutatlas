const params  = new URLSearchParams(window.location.search);
const riverId = params.get("id");

function getFavourites() {
  return JSON.parse(localStorage.getItem("trout_favourites") || "[]");
}
function toggleFavourite(id) {
  const favs = getFavourites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id); else favs.splice(idx, 1);
  localStorage.setItem("trout_favourites", JSON.stringify(favs));
}

fetch("database.json")
  .then(r => r.json())
  .then(rivers => {
    const river = rivers.find(r => r.id === riverId);
    if (!river) {
      document.body.innerHTML = `
        <div style="padding:40px;text-align:center;color:#8a9ab5">
          <p style="font-size:48px">🏞️</p>
          <h2>Torrente non trovato</h2>
          <a href="index.html" style="color:#3b82f6">← Torna alla lista</a>
        </div>`;
      return;
    }

    document.title = `${river.name} — TroutAtlas`;

    /* ── Gallery ──────────────────────────────────────────── */
    const track    = document.getElementById("gallery-track");
    const dotsWrap = document.getElementById("gallery-dots");
    const prevBtn  = document.getElementById("gallery-prev");
    const nextBtn  = document.getElementById("gallery-next");
    const images   = river.images && river.images.length ? river.images : [];
    let current = 0;

    if (images.length === 0) {
      track.innerHTML = `<div class="gallery-placeholder">🏞️</div>`;
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
    } else {
      images.forEach((src, i) => {
        const img = document.createElement("img");
        img.className = "gallery-slide";
        img.src = src;
        img.alt = `${river.name} foto ${i + 1}`;
        img.draggable = false;
        track.appendChild(img);
        const dot = document.createElement("span");
        dot.className = "dot" + (i === 0 ? " active" : "");
        dotsWrap.appendChild(dot);
      });
      if (images.length === 1) {
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
      }
    }

    function goTo(index) {
      current = (index + images.length) % images.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      document.querySelectorAll(".dot").forEach((d, i) =>
        d.classList.toggle("active", i === current)
      );
    }

    prevBtn.addEventListener("click", () => goTo(current - 1));
    nextBtn.addEventListener("click", () => goTo(current + 1));

    let touchStartX = 0;
    const wrap = document.getElementById("gallery-wrap");
    wrap.addEventListener("touchstart", e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    wrap.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) dx < 0 ? goTo(current + 1) : goTo(current - 1);
    }, { passive: true });

    /* ── Favourite button ─────────────────────────────────── */
    const favBtn = document.getElementById("fav-btn-detail");
    function updateFavBtn() {
      favBtn.textContent = getFavourites().includes(river.id) ? "❤️" : "🤍";
    }
    updateFavBtn();
    favBtn.addEventListener("click", () => {
      toggleFavourite(river.id);
      updateFavBtn();
    });

    /* ── Text fields ──────────────────────────────────────── */
    document.getElementById("river-name").textContent = river.name;
    document.getElementById("river-location").textContent =
      `${river.region} · ${river.province} · ${river.zone}`;
    document.getElementById("river-species").textContent = river.species.join(", ");
    document.getElementById("river-rod").textContent  = river.recommendedRod;
    document.getElementById("river-line").textContent = river.recommendedLine;

    const luresEl = document.getElementById("river-lures");
    river.recommendedLures.forEach(l => {
      const chip = document.createElement("span");
      chip.className = "chip green";
      chip.textContent = l;
      luresEl.appendChild(chip);
    });

    const diffEl = document.getElementById("river-difficulty");
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement("span");
      s.className = "star" + (i <= river.difficulty ? " on" : "");
      s.textContent = "★";
      diffEl.appendChild(s);
    }

    /* ── Map ──────────────────────────────────────────────── */
    if (river.coordinates) {
      const { lat, lng } = river.coordinates;
      const map = L.map("map", { zoomControl: true, attributionControl: false }).setView([lat, lng], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      const icon = L.divIcon({
        html: '<div style="font-size:28px;line-height:1">🎣</div>',
        className: "", iconSize: [32, 32], iconAnchor: [16, 28]
      });
      L.marker([lat, lng], { icon }).addTo(map)
        .bindPopup(`<strong>${river.name}</strong><br>${river.zone}`).openPopup();
      document.getElementById("gmaps-btn").href =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      document.getElementById("gmaps-btn").style.display = "none";
      document.getElementById("map").style.display = "none";
    }

    /* ── Regulations modal ────────────────────────────────── */
    const regBtn     = document.getElementById("reg-btn");
    const overlay    = document.getElementById("modal-overlay");
    const modalClose = document.getElementById("modal-close");
    const modalBody  = document.getElementById("modal-body");

    if (river.regulations) {
      const r = river.regulations;
      modalBody.innerHTML = `
        <div class="reg-item">
          <span class="reg-label">📄 Permessi richiesti</span>
          <span class="reg-value">${r.license}</span>
        </div>
        <div class="reg-item">
          <span class="reg-label">📅 Stagione di pesca</span>
          <span class="reg-value">${r.season}</span>
        </div>
        <div class="reg-item">
          <span class="reg-label">📏 Taglia minima</span>
          <span class="reg-value">${r.minSize}</span>
        </div>
        <div class="reg-item">
          <span class="reg-label">📌 Regole specifiche</span>
          <ul class="reg-rules">
            ${r.rules.map(rule => `<li>${rule}</li>`).join("")}
          </ul>
        </div>
        <p class="reg-disclaimer">⚠️ Verificare sempre le normative aggiornate presso la sezione FIPSAS locale o la Regione Piemonte.</p>
      `;
    } else {
      regBtn.style.display = "none";
    }

    regBtn.addEventListener("click", () => overlay.classList.add("open"));
    modalClose.addEventListener("click", () => overlay.classList.remove("open"));
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.remove("open"); });
  });
