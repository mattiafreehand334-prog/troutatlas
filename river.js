const params  = new URLSearchParams(window.location.search);
const riverId = params.get("id");

function getFavourites() { return JSON.parse(localStorage.getItem("trout_favourites") || "[]"); }
function toggleFavourite(id) {
  const favs = getFavourites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id); else favs.splice(idx, 1);
  localStorage.setItem("trout_favourites", JSON.stringify(favs));
}

/* ── §R1 Localities section ──────────────────────────── */
function renderLocalities(river) {
  const sec = document.getElementById('localities-section');
  if(!sec) return;
  if(!river.localities || !river.localities.length) { sec.innerHTML=''; return; }
  const locs = [...river.localities].sort((a,b) => a.order - b.order);
  sec.innerHTML = `
    <div class="detail-section">
      <h2>📍 Percorso — dalla sorgente alla confluenza</h2>
      <div class="loc-timeline">
        ${locs.map((loc, i) => `
          <div class="loc-step">
            <div class="loc-step-track">
              <div class="loc-step-dot">${i===0?'⛰️':i===locs.length-1?'🔽':'📍'}</div>
              ${i < locs.length-1 ? '<div class="loc-step-line"></div>' : ''}
            </div>
            <div class="loc-step-content">
              <div class="loc-step-name">${loc.name}</div>
              ${loc.description ? `<div class="loc-step-desc">${loc.description}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
      <a href="explore.html" class="loc-explore-link">🗺️ Esplora sulla mappa interattiva →</a>
    </div>`;
}

/* ── §R2 Permits & Licences section ──────────────────── */
function renderPermits(river) {
  const sec = document.getElementById('permits-section');
  if(!sec) return;
  const p = river.permits;
  if(!p) { sec.innerHTML = ''; return; }

  const crAlert   = p.catchAndRelease ? `<div class="perm-cr-alert">🔴 <strong>Catch &amp; Release obbligatorio</strong> — nessuna trota può essere trattenuta.</div>` : '';
  const warnAlert = p.notes && p.notes.toUpperCase().includes('ATTENZIONE') ? `<div class="perm-warning">⚠️ ${p.notes}</div>` : '';

  const buyBtn = p.buyUrl ? `<a class="perm-action-btn perm-action-btn--green" href="${p.buyUrl}" target="_blank" rel="noopener">🟢 Acquista il permesso</a>` : '';
  const regBtn = p.regulationUrl ? `<a class="perm-action-btn perm-action-btn--orange" href="${p.regulationUrl}" target="_blank" rel="noopener">🟠 Regolamento ufficiale</a>` : '';
  const licBtn = `<button class="perm-action-btn perm-action-btn--blue" onclick="document.getElementById('perm-lic-info').classList.toggle('open')">🔵 Mi serve la licenza?</button>`;

  const posHTML = p.pointsOfSale && p.pointsOfSale.length
    ? `<div class="perm-pos-section">
        <div class="perm-pos-title">🏪 Dove acquistare il permesso</div>
        ${p.pointsOfSale.map(pos => `
          <div class="perm-pos-card">
            <div class="perm-pos-name">${pos.name}</div>
            <div class="perm-pos-addr">📍 ${pos.address}</div>
            ${pos.phone && pos.phone !== 'Informazione non disponibile' ? `<div class="perm-pos-meta">📞 ${pos.phone}</div>` : ''}
            ${pos.hours && pos.hours !== 'Informazione non disponibile' ? `<div class="perm-pos-meta">🕒 ${pos.hours}</div>` : ''}
          </div>`).join('')}
      </div>` : '';

  const infoRows = [
    ['🏛️', 'Ente gestore',     p.entity],
    ['📋', 'Tipo di gestione', p.management],
    p.licenseType    ? ['📄', 'Licenza richiesta', p.licenseType]   : null,
    p.catchLimit     ? ['🐟', 'Limite catture',    p.catchLimit]     : null,
    p.minSize        ? ['📏', 'Taglia minima',     p.minSize]        : null,
    river.regulations && river.regulations.season ? ['📅', 'Stagione', river.regulations.season] : null,
  ].filter(Boolean);

  sec.innerHTML = `
    <div class="detail-section perm-section">
      <h2>🎫 Permessi e Licenze</h2>
      <div class="perm-card">
        <div class="perm-rows">
          ${infoRows.map(([icon,label,val]) => `
            <div class="perm-row">
              <span class="perm-label">${icon} ${label}</span>
              <span class="perm-value">${val}</span>
            </div>`).join('')}
        </div>
        ${crAlert}${warnAlert}
        <div class="perm-actions">${buyBtn}${licBtn}${regBtn}</div>
        <div class="perm-lic-info" id="perm-lic-info">
          <div class="perm-lic-title">ℹ️ Cosa ti serve per pescare qui</div>
          <div class="perm-lic-body">${p.licenseType || (p.licenseRequired ? 'Licenza regionale richiesta — consulta il tuo ente FIPSAS locale.' : 'Nessuna licenza regionale aggiuntiva richiesta.')}</div>
          ${p.notes && !p.notes.toUpperCase().includes('ATTENZIONE') ? `<div class="perm-lic-notes">${p.notes}</div>` : ''}
        </div>
        ${posHTML}
      </div>
    </div>`;
}

/* ── §R3 Trip prep section ───────────────────────────── */
function renderTripPrep(river) {
  const sec = document.getElementById('trip-prep-section');
  if(!sec) return;

  const bestSpot = river.spots && river.spots.length
    ? [...river.spots].sort((a,b) => (b.fishingScore||0)-(a.fishingScore||0))[0] : null;
  const p   = river.permits    || {};
  const reg = river.regulations || {};

  const rows = [
    bestSpot && bestSpot.parking
      ? ['🅿️','Dove parcheggiare', `${bestSpot.parking.name} — ${bestSpot.parking.description}`]
      : ['🅿️','Dove parcheggiare', 'Cercare piazzole sterrate lungo la strada di accesso'],
    bestSpot
      ? ['🥾','Cammino fino allo spot', `~${bestSpot.walkingMinutes} min a piedi fino a "${bestSpot.name}"`]
      : ['🥾','Cammino fino allo spot', 'Variabile — consultare le schede spot'],
    ['🎫','Permesso richiesto', p.management || reg.license || 'Verifica presso la sezione FIPSAS locale'],
    reg.season   ? ['📅','Periodo di apertura',    reg.season]                              : null,
    river.flyFriendly !== undefined
      ? ['🎣','Tecnica consigliata', (river.flyFriendly ? '🪰 Pesca a mosca · ' : '') + (river.recommendedLures||[]).slice(0,2).join(', ')]
      : null,
    river.recommendedRod ? ['🎣','Canna consigliata', river.recommendedRod] : null,
    ['👢','Equipaggiamento', river.difficulty >= 3 ? 'Waders obbligatori · Stivali feltro o scolpiti · Giubbotto sicurezza' : 'Stivali o waders · Abbigliamento a strati'],
    ['🕒','Fascia oraria consigliata', 'Alba e tramonto per la secca · Ore centrali per la ninfa'],
    river.species  ? ['🐟','Specie presenti',     (river.species||[]).join(', ')]           : null,
    reg.minSize    ? ['📏','Taglia minima',        reg.minSize]                              : null,
    reg.rules && reg.rules.length ? ['📋','Regole principali', reg.rules.slice(0,2).join(' · ')] : null,
    ['🌦️','Meteo e condizioni', 'Consulta la sezione Fishing Intelligence ↑'],
  ].filter(Boolean);

  sec.innerHTML = `
    <div class="detail-section trip-prep-section">
      <h2>🧳 Prepara la tua uscita</h2>
      <p class="trip-prep-sub">Tutto ciò che ti serve sapere prima di andare al fiume.</p>
      <div class="trip-rows">
        ${rows.map(([icon,label,val]) => `
          <div class="trip-row">
            <span class="trip-icon">${icon}</span>
            <div class="trip-content">
              <div class="trip-label">${label}</div>
              <div class="trip-value">${val}</div>
            </div>
          </div>`).join('')}
      </div>
      ${bestSpot ? `
        <a href="river.html?id=${river.id}&spot=${bestSpot.id}" class="trip-nav-btn">
          🧭 Portami allo spot migliore: ${bestSpot.name} →
        </a>` : ''}
    </div>`;
}

fetch("database.json")
  .then(r => r.json())
  .then(rivers => {
    const river = rivers.find(r => r.id === riverId);
    if (!river) {
      document.body.innerHTML = `<div style="padding:40px;text-align:center;color:#8a9ab5"><p style="font-size:48px">🏞️</p><h2>Torrente non trovato</h2><a href="index.html" style="color:#3b82f6">← Torna alla lista</a></div>`;
      return;
    }

    document.title = `${river.name} — TroutAtlas`;
    // Store last viewed river for ATLAS AI context
    localStorage.setItem("atlas_last_river", river.id);

    /* ── Gallery ──────────────────────────────────────────── */
    const track    = document.getElementById("gallery-track");
    const dotsWrap = document.getElementById("gallery-dots");
    const prevBtn  = document.getElementById("gallery-prev");
    const nextBtn  = document.getElementById("gallery-next");
    const images   = river.images && river.images.length ? river.images : [];
    let current = 0;

    if (images.length === 0) {
      track.innerHTML = `<div class="gallery-placeholder">🏞️</div>`;
      prevBtn.style.display = nextBtn.style.display = "none";
    } else {
      images.forEach((src, i) => {
        const img = document.createElement("img");
        img.className = "gallery-slide"; img.src = src;
        img.alt = `${river.name} foto ${i+1}`; img.draggable = false;
        track.appendChild(img);
        const dot = document.createElement("span");
        dot.className = "dot" + (i===0?" active":"");
        dotsWrap.appendChild(dot);
      });
      if (images.length === 1) prevBtn.style.display = nextBtn.style.display = "none";
    }

    function goTo(idx) {
      current = (idx + images.length) % images.length;
      track.style.transform = `translateX(-${current*100}%)`;
      document.querySelectorAll(".dot").forEach((d,i) => d.classList.toggle("active", i===current));
    }
    prevBtn.addEventListener("click", () => goTo(current-1));
    nextBtn.addEventListener("click", () => goTo(current+1));

    let tx = 0;
    const wrap = document.getElementById("gallery-wrap");
    wrap.addEventListener("touchstart", e => { tx = e.changedTouches[0].clientX; }, {passive:true});
    wrap.addEventListener("touchend",   e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) dx < 0 ? goTo(current+1) : goTo(current-1);
    }, {passive:true});

    /* ── Favourite ────────────────────────────────────────── */
    const favBtn = document.getElementById("fav-btn-detail");
    const updateFav = () => { favBtn.textContent = getFavourites().includes(river.id) ? "❤️" : "🤍"; };
    updateFav();
    favBtn.addEventListener("click", () => { toggleFavourite(river.id); updateFav(); });

    /* ── Header text ──────────────────────────────────────── */
    document.getElementById("river-name").textContent = river.name;
    document.getElementById("river-location").textContent =
      `${river.waterType ? river.waterType + " · " : ""}${river.region} · ${river.province} · ${river.zone}${river.altitude ? " · " + river.altitude + " m" : ""}`;

    document.getElementById("river-species").textContent = river.species.join(", ");
    document.getElementById("river-rod").textContent  = river.recommendedRod  || "—";
    document.getElementById("river-line").textContent = river.recommendedLine || "—";

    const luresEl = document.getElementById("river-lures");
    (river.recommendedLures || []).forEach(l => {
      const chip = document.createElement("span");
      chip.className = "chip green"; chip.textContent = l;
      luresEl.appendChild(chip);
    });

    const diffEl = document.getElementById("river-difficulty");
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement("span");
      s.className = "star" + (i <= river.difficulty ? " on" : ""); s.textContent = "★";
      diffEl.appendChild(s);
    }

    /* ── Map ──────────────────────────────────────────────── */
    if (river.coordinates) {
      const {lat, lng} = river.coordinates;
      const spotId     = params.get("spot");
      const targetSpot = spotId && river.spots ? river.spots.find(s => s.id === spotId) : null;

      // Center on target spot or river origin
      const centerLat = targetSpot ? targetSpot.coordinates.lat : lat;
      const centerLng = targetSpot ? targetSpot.coordinates.lng : lng;
      const zoom      = targetSpot ? 15 : 13;

      const map = L.map("map", {zoomControl:true, attributionControl:false}).setView([centerLat, centerLng], zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18}).addTo(map);

      // ── River polyline with zone coloring ──────────────
      if(river.polyline && river.polyline.length >= 2) {
        const baseTypeColors = {'fiume':'#3b82f6','torrente':'#06b6d4','torrente di montagna':'#0ea5e9','lago':'#10b981','lago alpino':'#8b5cf6'};
        const baseColor = baseTypeColors[(river.waterType||'').toLowerCase()] || '#3b82f6';
        const zoneColors = {libero:'#22c55e',riserva_turistica:'#f97316',no_kill:'#ef4444',speciale:'#a855f7'};
        // Base dim polyline
        L.polyline(river.polyline, {color:baseColor,weight:2,opacity:0.22,dashArray:'4 4'}).addTo(map);
        if(river.zones && river.zones.length > 0) {
          river.zones.forEach(z => {
            const s = z.segment || [0, river.polyline.length-1];
            const pts = river.polyline.slice(s[0], Math.min(s[1]+1, river.polyline.length));
            if(pts.length < 2) return;
            const c = zoneColors[z.type] || baseColor;
            L.polyline(pts, {color:c,weight:6,opacity:0.8,lineCap:'round',lineJoin:'round'}).addTo(map)
              .bindPopup(`<strong>${z.name}</strong><br><em>${z.description}</em>`);
          });
        } else {
          L.polyline(river.polyline, {color:baseColor,weight:6,opacity:0.8,lineCap:'round'}).addTo(map);
        }
      }

      // River origin marker
      const rivIcon = L.divIcon({html:'<div style="font-size:26px;line-height:1">🎣</div>',className:"",iconSize:[32,32],iconAnchor:[16,28]});
      const rivMarker = L.marker([lat,lng],{icon:rivIcon}).addTo(map);
      if(!targetSpot) rivMarker.bindPopup(`<strong>${river.name}</strong><br>${river.zone}`).openPopup();

      // All spot markers
      if(river.spots && river.spots.length > 0) {
        const spotIconDim = L.divIcon({html:'<div style="font-size:18px;line-height:1;opacity:.6">🎣</div>',className:"",iconSize:[24,24],iconAnchor:[12,20]});
        river.spots.forEach(s => {
          if(targetSpot && s.id === targetSpot.id) return;
          const popup = `<strong>${s.name}</strong><br><em>${s.type} · ${s.walkingMinutes} min a piedi</em><br>${s.description}`;
          L.marker([s.coordinates.lat, s.coordinates.lng], {icon: spotIconDim}).addTo(map).bindPopup(popup);
        });
      }

      // Highlighted target spot from ATLAS AI
      if(targetSpot) {
        const spotIcon = L.divIcon({html:'<div style="font-size:24px;line-height:1">🎯</div>',className:"",iconSize:[30,30],iconAnchor:[15,26]});
        const popup = `<strong>🎯 ${targetSpot.name}</strong><br>${targetSpot.description}<br><em>⏱️ ${targetSpot.walkingMinutes} min a piedi · ${"⭐".repeat(targetSpot.difficulty)}</em>`;
        L.marker([targetSpot.coordinates.lat, targetSpot.coordinates.lng], {icon: spotIcon})
          .addTo(map).bindPopup(popup).openPopup();

        // Parking marker
        if(targetSpot.parking) {
          const pIcon  = L.divIcon({html:'<div style="font-size:20px;line-height:1">🅿️</div>',className:"",iconSize:[26,26],iconAnchor:[13,22]});
          const pPopup = `<strong>${targetSpot.parking.name}</strong><br>${targetSpot.parking.description}<br><em>${targetSpot.parking.distanceMeters} m dallo spot</em>`;
          L.marker([targetSpot.parking.coordinates.lat, targetSpot.parking.coordinates.lng], {icon: pIcon}).addTo(map).bindPopup(pPopup);
        }

        // Named-coordinate markers (bridge, scenic, etc.)
        (targetSpot.markers || []).forEach(mk => {
          if(!mk.coordinates) return;
          const mkIcon = L.divIcon({html:`<div style="font-size:18px;line-height:1">${mk.emoji}</div>`,className:"",iconSize:[24,24],iconAnchor:[12,20]});
          L.marker([mk.coordinates.lat, mk.coordinates.lng], {icon: mkIcon}).addTo(map).bindPopup(`<strong>${mk.name}</strong><br>${mk.description}`);
        });

        // ATLAS AI banner above map
        const banner = document.createElement("div");
        banner.className = "atlas-river-banner";
        banner.innerHTML = `<span style="font-size:20px;flex-shrink:0">🤖</span><div><strong>ATLAS AI</strong> ti ha guidato qui: <strong>${targetSpot.name}</strong><br><span class="atlas-river-banner-sub">${targetSpot.description}</span></div>`;
        document.getElementById("map").before(banner);
      }

      const btn = document.getElementById("gmaps-btn");
      btn.addEventListener("click", e => {
        e.preventDefault();
        const destLat = targetSpot ? targetSpot.coordinates.lat : lat;
        const destLng = targetSpot ? targetSpot.coordinates.lng : lng;
        const fallback = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
        if (!navigator.geolocation) { window.location.href = fallback; return; }
        navigator.geolocation.getCurrentPosition(
          pos => {
            const url = `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${destLat},${destLng}`;
            window.location.href = url;
          },
          () => { window.location.href = fallback; },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
      });
    } else {
      document.getElementById("gmaps-btn").style.display = "none";
      document.getElementById("map").style.display = "none";
    }

    /* ── Regulations modal ────────────────────────────────── */
    const regBtn    = document.getElementById("reg-btn");
    const overlay   = document.getElementById("modal-overlay");
    const modalClose= document.getElementById("modal-close");
    const modalBody = document.getElementById("modal-body");

    if (river.regulations) {
      const r = river.regulations;
      modalBody.innerHTML = `
        <div class="reg-item"><span class="reg-label">📄 Permessi richiesti</span><span class="reg-value">${r.license}</span></div>
        <div class="reg-item"><span class="reg-label">📅 Stagione di pesca</span><span class="reg-value">${r.season}</span></div>
        <div class="reg-item"><span class="reg-label">📏 Taglia minima</span><span class="reg-value">${r.minSize}</span></div>
        <div class="reg-item"><span class="reg-label">📌 Regole specifiche</span>
          <ul class="reg-rules">${(r.rules||[]).map(r=>`<li>${r}</li>`).join("")}</ul>
        </div>
        <p class="reg-disclaimer">⚠️ Verificare sempre le normative aggiornate presso la sezione FIPSAS locale o la Regione Piemonte.</p>`;
    } else {
      regBtn.style.display = "none";
    }

    regBtn.addEventListener("click", () => overlay.classList.add("open"));
    modalClose.addEventListener("click", () => overlay.classList.remove("open"));
    overlay.addEventListener("click", e => { if (e.target===overlay) overlay.classList.remove("open"); });

    /* ── Fishing Intelligence ─────────────────────────────── */
    loadFishingIntelligence(river);

    /* ── Localities, Permits, Trip Prep ───────────────────── */
    renderLocalities(river);
    renderPermits(river);
    renderTripPrep(river);
  });
