'use strict';
// ═══════════════════════════════════════════════════════
// River Explorer — TroutAtlas V0.5
// Geographic exploration experience: map-first, locality-driven
// ═══════════════════════════════════════════════════════

/* ── State ─────────────────────────────────────────────── */
let allRivers     = [];
let filteredRivers= [];
let selectedRiver = null;
let userPos       = null;
let explorerMap   = null;

/* ── Map layer groups (cleared/redrawn independently) ─── */
const LG = {};  // filled after map init

/* ── Config ────────────────────────────────────────────── */
const ZONE_COLORS = {
  libero:              { color:'#22c55e', label:'Libero',             emoji:'🟢' },
  riserva_turistica:   { color:'#f97316', label:'Riserva turistica',  emoji:'🟠' },
  no_kill:             { color:'#ef4444', label:'No-kill / C&R',      emoji:'🔴' },
  speciale:            { color:'#a855f7', label:'Regolamento speciale',emoji:'🟣' }
};

const TYPE_COLORS = {
  'fiume':               '#3b82f6',
  'torrente':            '#06b6d4',
  'torrente di montagna':'#0ea5e9',
  'lago':                '#10b981',
  'lago alpino':         '#8b5cf6'
};

const TYPE_ICON = {
  'fiume':'🌊','torrente':'💧','torrente di montagna':'🏔️','lago':'🏞️','lago alpino':'🏔️'
};

/* ── Bootstrap ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadData();
  drawOverview();
  renderList(allRivers);
  initFilters();
  initDrawer();
  openDrawerDefault();
});

/* ── Map init ───────────────────────────────────────────── */
function initMap() {
  explorerMap = L.map('explorer-map', {
    zoomControl:       true,
    attributionControl:false,
    preferCanvas:      true
  }).setView([45.68, 8.10], 9);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains:'abcd'
  }).addTo(explorerMap);

  // Create layer groups for independent management
  ['overview','zoneLines','localities','spots','user'].forEach(k => {
    LG[k] = L.layerGroup().addTo(explorerMap);
  });
}

/* ── Data ───────────────────────────────────────────────── */
async function loadData() {
  try {
    const r = await fetch('database.json');
    allRivers = await r.json();
    filteredRivers = [...allRivers];
  } catch(_) { allRivers = []; filteredRivers = []; }
}

/* ── Overview: all rivers as thin coloured polylines ────── */
function drawOverview() {
  LG.overview.clearLayers();
  filteredRivers.forEach(river => {
    if(!river.polyline || river.polyline.length < 2) {
      // Fallback: single coordinate point
      if(river.coordinates) {
        const icon = L.divIcon({ html:'<div class="ex-ov-dot" style="background:'+typeColor(river)+'"></div>', className:'', iconSize:[10,10] });
        L.marker([river.coordinates.lat, river.coordinates.lng], { icon })
          .addTo(LG.overview)
          .on('click', () => selectRiver(river));
      }
      return;
    }
    const color = typeColor(river);
    const pl = L.polyline(river.polyline, {
      color, weight:4, opacity:0.6, smoothFactor:2, lineCap:'round'
    }).addTo(LG.overview);
    pl.on('click', () => selectRiver(river));
    pl.bindTooltip(`<strong>${river.name}</strong><br><em>${river.waterType}</em>`, {
      sticky:true, direction:'top', className:'ex-tooltip'
    });
  });
}

function typeColor(r) {
  return TYPE_COLORS[(r.waterType||'').toLowerCase()] || '#3b82f6';
}

/* ── Select a river ─────────────────────────────────────── */
function selectRiver(river) {
  selectedRiver = river;

  LG.zoneLines.clearLayers();
  LG.localities.clearLayers();
  LG.spots.clearLayers();

  // Dim overview
  LG.overview.eachLayer(l => {
    if(l.setStyle) l.setStyle({ opacity:0.18, weight:2 });
  });

  drawZonePolylines(river);
  drawLocalityMarkers(river);
  drawSpotMarkers(river);
  drawParkingMarkers(river);

  // Fit bounds
  const pts = river.polyline && river.polyline.length > 0 ? river.polyline : river.coordinates ? [[river.coordinates.lat, river.coordinates.lng]] : null;
  if(pts && pts.length > 0) {
    if(pts.length === 1) {
      explorerMap.setView(pts[0], 13, { animate:true });
    } else {
      explorerMap.fitBounds(L.latLngBounds(pts).pad(0.15), { animate:true });
    }
  }

  showDetailView(river);
  openDrawerHalf();

  try { localStorage.setItem('atlas_last_river', river.id); } catch(_) {}
}

/* ── Zone-coloured polyline segments ────────────────────── */
function drawZonePolylines(river) {
  const pts = river.polyline || [];
  if(!pts.length) return;

  const baseColor = typeColor(river);

  // Base polyline (full river, dim)
  L.polyline(pts, { color:baseColor, weight:2, opacity:0.25, dashArray:'4 4' }).addTo(LG.zoneLines);

  if(river.zones && river.zones.length > 0) {
    river.zones.forEach(zone => {
      const seg = zone.segment || [0, pts.length - 1];
      const segPts = pts.slice(seg[0], Math.min(seg[1] + 1, pts.length));
      if(segPts.length < 2) return;
      const zc = ZONE_COLORS[zone.type] || ZONE_COLORS.libero;

      // Shadow for readability on dark map
      L.polyline(segPts, { color:'#000', weight:10, opacity:0.2 }).addTo(LG.zoneLines);

      L.polyline(segPts, {
        color: zc.color, weight:7, opacity:0.92,
        lineCap:'round', lineJoin:'round'
      }).addTo(LG.zoneLines)
        .bindPopup(`
          <div class="ex-zone-popup">
            <div class="ex-zone-popup-title">${zc.emoji} ${zone.name}</div>
            <div class="ex-zone-popup-type">${(zone.type||'').replace(/_/g,' ')}</div>
            <div class="ex-zone-popup-desc">${zone.description}</div>
          </div>
        `);
    });
  } else {
    // No zone data — full river highlighted
    L.polyline(pts, { color:baseColor, weight:7, opacity:0.9, lineCap:'round' }).addTo(LG.zoneLines);
  }

  // Source marker (upstream)
  const srcIcon = L.divIcon({ html:'<div class="ex-src-pin">⛰️</div>', className:'', iconSize:[24,24], iconAnchor:[12,20] });
  L.marker(pts[0], { icon:srcIcon }).addTo(LG.zoneLines)
    .bindPopup(`<strong>⛰️ Sorgente</strong><br>${river.name}`);

  // Downstream terminus
  if(pts.length > 1) {
    const endIcon = L.divIcon({ html:'<div class="ex-src-pin">🔽</div>', className:'', iconSize:[22,22], iconAnchor:[11,18] });
    L.marker(pts[pts.length - 1], { icon:endIcon }).addTo(LG.zoneLines)
      .bindPopup(`<strong>🔽 Confluenza / Fine tratto</strong><br>${river.name}`);
  }
}

/* ── Locality markers ───────────────────────────────────── */
function drawLocalityMarkers(river) {
  (river.localities || []).forEach((loc, idx) => {
    if(!loc.coordinates) return;
    const locIcon = L.divIcon({
      html: `<div class="ex-loc-marker"><span class="ex-loc-marker-num">${idx+1}</span><span class="ex-loc-marker-name">${loc.name}</span></div>`,
      className:'', iconSize:[90, 26], iconAnchor:[5, 13]
    });
    L.marker([loc.coordinates.lat, loc.coordinates.lng], { icon:locIcon })
      .addTo(LG.localities)
      .bindPopup(`
        <div class="ex-loc-popup">
          <strong>📍 ${loc.name}</strong>
          ${loc.description ? `<div class="ex-loc-popup-desc">${loc.description}</div>` : ''}
        </div>
      `)
      .on('click', () => highlightLocality(loc.name));
  });
}

/* ── Spot markers ───────────────────────────────────────── */
function drawSpotMarkers(river) {
  const spotEmoji = { buca:'🌊', raschio:'〰️', salto:'💧', lago:'🏞️' };
  (river.spots || []).forEach(s => {
    if(!s.coordinates) return;
    const emoji = spotEmoji[s.type] || '🎣';
    const spotIcon = L.divIcon({
      html: `<div class="ex-spot-marker"><span>${emoji}</span></div>`,
      className:'', iconSize:[30,30], iconAnchor:[15,15]
    });
    const score = s.fishingScore ? `<span class="ex-popup-score">🟢 ${s.fishingScore}/100</span>` : '';
    L.marker([s.coordinates.lat, s.coordinates.lng], { icon:spotIcon, zIndexOffset:100 })
      .addTo(LG.spots)
      .bindPopup(`
        <div class="ex-spot-popup">
          <div class="ex-spot-popup-name">🎣 ${s.name}</div>
          <div>${score} <em>${s.type} · ${'⭐'.repeat(s.difficulty)}</em></div>
          <div class="ex-spot-popup-walk">⏱️ ${s.walkingMinutes} min a piedi</div>
          <div class="ex-spot-popup-desc">${s.description}</div>
          ${s.techniques ? `<div><em>Tecniche: ${s.techniques.join(', ')}</em></div>` : ''}
          <a class="ex-spot-popup-link" href="river.html?id=${river.id}&spot=${s.id}">Mostra sulla mappa →</a>
        </div>
      `);
  });
}

/* ── Parking markers ────────────────────────────────────── */
function drawParkingMarkers(river) {
  (river.spots || []).forEach(s => {
    if(!s.parking || !s.parking.coordinates) return;
    const pIcon = L.divIcon({
      html:'<div class="ex-parking-marker">🅿️</div>', className:'', iconSize:[24,24], iconAnchor:[12,12]
    });
    L.marker([s.parking.coordinates.lat, s.parking.coordinates.lng], { icon:pIcon })
      .addTo(LG.spots)
      .bindPopup(`
        <div class="ex-spot-popup">
          <div class="ex-spot-popup-name">${s.parking.name}</div>
          <div>${s.parking.description}</div>
          <div class="ex-spot-popup-walk">📏 ${s.parking.distanceMeters} m dallo spot "${s.name}"</div>
        </div>
      `);
  });
}

/* ── Detail view in drawer ──────────────────────────────── */
function showDetailView(river) {
  document.getElementById('ex-list-view').style.display   = 'none';
  document.getElementById('ex-detail-view').style.display = 'block';

  document.getElementById('ex-detail-name').textContent = river.name;
  const nSpots = (river.spots||[]).length;
  const nLocs  = (river.localities||[]).length;
  document.getElementById('ex-detail-meta').textContent =
    `${river.waterType} · ${river.zone} · ${nSpots} spot · ${nLocs} località`;
  document.getElementById('ex-open-river').href = `river.html?id=${river.id}`;

  // Zone legend pills
  const zonesEl = document.getElementById('ex-zones');
  zonesEl.innerHTML = '';
  (river.zones || []).forEach(z => {
    const zc = ZONE_COLORS[z.type] || ZONE_COLORS.libero;
    const pill = document.createElement('div');
    pill.className = 'ex-zone-pill';
    pill.style.borderColor = zc.color;
    pill.style.color       = zc.color;
    pill.textContent = `${zc.emoji} ${z.name}`;
    pill.title = z.description;
    zonesEl.appendChild(pill);
  });

  // Locality chips (geographic order)
  const locRail = document.getElementById('ex-localities');
  locRail.innerHTML = '';
  (river.localities || []).sort((a,b) => a.order - b.order).forEach((loc, idx) => {
    const chip = document.createElement('button');
    chip.className = 'ex-loc-chip';
    chip.dataset.locName = loc.name;
    const isFirst = idx === 0;
    const isLast  = idx === (river.localities.length - 1);
    chip.innerHTML = `
      <span class="ex-loc-chip-num">${loc.order}</span>
      <span class="ex-loc-chip-name">${loc.name}</span>
      ${isFirst ? '<span class="ex-loc-chip-tag">⛰️</span>' : ''}
      ${isLast  ? '<span class="ex-loc-chip-tag">🔽</span>' : ''}
    `;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.ex-loc-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      focusLocality(river, loc);
      openDrawerFull();
    });
    locRail.appendChild(chip);
  });

  renderPermitsMini(river);
  document.getElementById('ex-locality-spots').innerHTML =
    `<div class="ex-locality-hint">👆 Tocca una <strong>località</strong> o uno <strong>spot 🎣</strong> sulla mappa per i dettagli</div>`;
}

/* ── Focus on a locality ────────────────────────────────── */
function focusLocality(river, loc) {
  if(loc.coordinates) {
    explorerMap.setView([loc.coordinates.lat, loc.coordinates.lng], 14, { animate:true });
  }

  // Find spots near this locality (0.05° radius ≈ 5 km)
  const nearby = (river.spots || []).filter(s => {
    if(!s.coordinates || !loc.coordinates) return false;
    const dlat = Math.abs(s.coordinates.lat - loc.coordinates.lat);
    const dlng = Math.abs(s.coordinates.lng - loc.coordinates.lng);
    return Math.sqrt(dlat*dlat + dlng*dlng) < 0.06;
  });

  const el = document.getElementById('ex-locality-spots');

  if(nearby.length === 0) {
    el.innerHTML = `
      <div class="ex-locality-empty">
        <div>📍 <strong>${loc.name}</strong></div>
        <div>${loc.description || 'Nessuno spot mappato in questa località.'}</div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="ex-locality-spots-header">🎣 Spot vicino a <strong>${loc.name}</strong></div>
    ${nearby.sort((a,b) => (b.fishingScore||0)-(a.fishingScore||0)).map(s => `
      <a class="ex-spot-card" href="river.html?id=${river.id}&spot=${s.id}">
        <div class="ex-spot-card-top">
          <div class="ex-spot-card-name">${s.name}</div>
          ${s.fishingScore ? `<div class="ex-spot-card-score">🟢 ${s.fishingScore}</div>` : ''}
        </div>
        <div class="ex-spot-card-meta">
          <span>${s.type}</span>
          <span>${'⭐'.repeat(s.difficulty)}</span>
          <span>⏱️ ${s.walkingMinutes} min</span>
          <span>🎣 ${s.techniques.join(', ')}</span>
        </div>
        <div class="ex-spot-card-tags">
          ${s.familyFriendly ? '<span class="ex-stag">👨‍👩‍👧 Famiglia</span>' : ''}
          ${s.bigFish        ? '<span class="ex-stag">🏆 Trofeo</span>'       : ''}
          ${s.stocking       ? '<span class="ex-stag">🐟 Ripopolato</span>'   : ''}
          ${s.scenicView     ? '<span class="ex-stag">📸 Panoramico</span>'   : ''}
          ${!s.crowded       ? '<span class="ex-stag">🔇 Tranquillo</span>'   : ''}
        </div>
        <div class="ex-spot-card-cta">Mostra sulla mappa →</div>
      </a>
    `).join('')}`;
}

function highlightLocality(name) {
  const chip = document.querySelector(`.ex-loc-chip[data-loc-name="${CSS.escape(name)}"]`);
  if(chip) { chip.click(); chip.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' }); }
}

/* ── Permits mini-card ──────────────────────────────────── */
function renderPermitsMini(river) {
  const el = document.getElementById('ex-permits-mini');
  const p  = river.permits;
  if(!p) { el.innerHTML = ''; return; }

  const crLine   = p.catchAndRelease ? `<div class="ex-pm-alert">🔴 <strong>Catch &amp; Release obbligatorio</strong></div>` : '';
  const warnLine = p.notes && p.notes.toUpperCase().includes('ATTENZIONE')
    ? `<div class="ex-pm-warning">⚠️ ${p.notes}</div>` : '';

  const buyBtn = p.buyUrl
    ? `<a class="ex-perm-btn ex-perm-btn--green" href="${p.buyUrl}" target="_blank" rel="noopener">🟢 Acquista permesso</a>` : '';
  const regBtn = p.regulationUrl
    ? `<a class="ex-perm-btn ex-perm-btn--orange" href="${p.regulationUrl}" target="_blank" rel="noopener">📋 Regolamento ufficiale</a>` : '';
  const schBtn = `<a class="ex-perm-btn ex-perm-btn--blue" href="river.html?id=${river.id}">🔵 Scheda completa</a>`;

  el.innerHTML = `
    <div class="ex-permits-mini-card">
      <div class="ex-pm-header">🎫 Permessi e Licenze</div>
      <div class="ex-pm-type">${p.management}</div>
      <div class="ex-pm-rows">
        <div class="ex-pm-row"><span>🏛️ Ente</span><span>${p.entity}</span></div>
        <div class="ex-pm-row"><span>📄 Licenza</span><span>${p.licenseType || (p.licenseRequired ? 'Richiesta' : 'Non richiesta')}</span></div>
        ${p.catchLimit ? `<div class="ex-pm-row"><span>🐟 Limite</span><span>${p.catchLimit}</span></div>` : ''}
        ${p.minSize    ? `<div class="ex-pm-row"><span>📏 Taglia min.</span><span>${p.minSize}</span></div>` : ''}
        ${p.dailyCost !== 'Informazione non disponibile' ? `<div class="ex-pm-row"><span>💶 Giornaliero</span><span>${p.dailyCost}</span></div>` : ''}
      </div>
      ${crLine}
      ${warnLine}
      <div class="ex-pm-actions">${buyBtn}${regBtn}${schBtn}</div>
    </div>`;
}

/* ── List rendering ─────────────────────────────────────── */
function renderList(rivers) {
  const countEl = document.getElementById('ex-list-count');
  countEl.textContent = `${rivers.length} cors${rivers.length===1?'o':'i'} d'acqua`;

  const el = document.getElementById('ex-river-list');
  if(!rivers.length) {
    el.innerHTML = '<div class="ex-empty">🏞️ Nessun risultato per questo filtro</div>';
    return;
  }

  el.innerHTML = rivers.map(r => {
    const color  = typeColor(r);
    const icon   = TYPE_ICON[(r.waterType||'').toLowerCase()] || '💧';
    const nSpots = (r.spots||[]).length;
    const nLocs  = (r.localities||[]).length;
    const dist   = userPos && r.coordinates
      ? haversine(userPos.lat, userPos.lng, r.coordinates.lat, r.coordinates.lng)
      : null;
    const distStr = dist !== null
      ? `<span class="ex-card-dist">📍 ${dist < 1 ? (dist*1000).toFixed(0)+' m' : dist.toFixed(0)+' km'}</span>` : '';
    const permBadge = _permitBadge(r.permits);
    const diffStars = r.difficulty ? '⭐'.repeat(r.difficulty) : '';
    return `
      <div class="ex-river-card" data-id="${r.id}" style="--rc:${color}">
        <div class="ex-river-card-bar"></div>
        <div class="ex-river-card-body">
          <div class="ex-river-card-row1">
            <div>
              <span class="ex-river-card-type">${icon} ${r.waterType}</span>
              <div class="ex-river-card-name">${r.name}</div>
            </div>
            ${distStr}
          </div>
          <div class="ex-river-card-zone">🗺️ ${r.zone} · ${r.province}</div>
          <div class="ex-river-card-stats">
            <span class="ex-stat-chip">${nSpots} spot</span>
            <span class="ex-stat-chip">${nLocs} località</span>
            <span class="ex-stat-chip">${(r.species||[]).slice(0,2).join(' · ')}</span>
            ${r.flyFriendly ? '<span class="ex-stat-chip ex-stat-fly">🪰 Mosca</span>' : ''}
          </div>
          <div class="ex-river-card-foot">
            ${permBadge}
            <span class="ex-river-card-diff">${diffStars}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.ex-river-card').forEach(card => {
    card.addEventListener('click', () => {
      const r = allRivers.find(x => x.id === card.dataset.id);
      if(r) selectRiver(r);
    });
  });
}

function _permitBadge(p) {
  if(!p) return '';
  const m = p.management || '';
  if(m.includes('No-kill') || m.includes('no_kill') || p.catchAndRelease)
    return '<span class="ex-perm-badge ex-perm-badge--red">🔴 No-kill</span>';
  if(m.includes('Riserva'))
    return '<span class="ex-perm-badge ex-perm-badge--orange">🟠 Riserva</span>';
  if(m.includes('Parco'))
    return '<span class="ex-perm-badge ex-perm-badge--purple">🟣 Parco</span>';
  if(m.includes('speciale') || m.includes('mista'))
    return '<span class="ex-perm-badge ex-perm-badge--purple">🟣 Speciale</span>';
  return '<span class="ex-perm-badge ex-perm-badge--green">🟢 Libero</span>';
}

/* ── Filters ────────────────────────────────────────────── */
function initFilters() {
  document.querySelectorAll('.ex-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ex-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  });
  document.getElementById('near-me-btn').addEventListener('click', enableNearMe);
}

function applyFilter(filter) {
  if(filter === 'all') {
    filteredRivers = [...allRivers];
  } else if(filter.startsWith('region-')) {
    const region = filter.replace('region-','');
    filteredRivers = allRivers.filter(r => r.region === region);
  } else if(filter.startsWith('type-')) {
    const type = filter.replace('type-','');
    filteredRivers = allRivers.filter(r => (r.waterType||'').toLowerCase().includes(type));
  }

  // Reset to list view if a river was selected
  if(selectedRiver && !filteredRivers.find(r => r.id === selectedRiver.id)) {
    backToList();
  }

  drawOverview();
  renderList(filteredRivers);

  // Fit map
  const pts = filteredRivers.flatMap(r => r.polyline || (r.coordinates ? [[r.coordinates.lat, r.coordinates.lng]] : []));
  if(pts.length > 0) {
    explorerMap.fitBounds(L.latLngBounds(pts).pad(0.1), { animate:true });
  }
}

/* ── Near Me ────────────────────────────────────────────── */
function enableNearMe() {
  const btn = document.getElementById('near-me-btn');
  btn.textContent = '⏳';
  btn.disabled = true;

  if(!navigator.geolocation) {
    btn.textContent = '📍'; btn.disabled = false;
    alert('Geolocalizzazione non disponibile su questo dispositivo.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      btn.textContent = '📍'; btn.disabled = false;

      // User location marker
      const uIcon = L.divIcon({ html:'<div class="ex-user-dot"></div>', className:'', iconSize:[16,16], iconAnchor:[8,8] });
      LG.user.clearLayers();
      L.marker([userPos.lat, userPos.lng], { icon:uIcon })
        .addTo(LG.user)
        .bindPopup('<strong>📍 Sei qui</strong>')
        .openPopup();

      explorerMap.setView([userPos.lat, userPos.lng], 10, { animate:true });

      // Sort by distance
      const sorted = [...filteredRivers].sort((a, b) => {
        const da = a.coordinates ? haversine(userPos.lat,userPos.lng,a.coordinates.lat,a.coordinates.lng) : 9999;
        const db = b.coordinates ? haversine(userPos.lat,userPos.lng,b.coordinates.lat,b.coordinates.lng) : 9999;
        return da - db;
      });
      renderList(sorted);
      document.getElementById('ex-list-count').textContent =
        `${sorted.length} corsi d'acqua · ordinati per distanza`;
      openDrawerHalf();
    },
    () => {
      btn.textContent = '📍'; btn.disabled = false;
      alert('Impossibile accedere alla posizione. Controlla i permessi del browser.');
    },
    { enableHighAccuracy:true, timeout:15000 }
  );
}

/* ── Haversine distance (km) ────────────────────────────── */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ── Drawer ─────────────────────────────────────────────── */
function initDrawer() {
  document.getElementById('ex-detail-back').addEventListener('click', backToList);

  // Touch drag on handle
  const handle = document.getElementById('ex-drawer-handle');
  const drawer = document.getElementById('ex-drawer');
  let startY = 0, startH = 0;

  handle.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    startH = drawer.getBoundingClientRect().height;
    drawer.style.transition = 'none';
  }, { passive:true });

  handle.addEventListener('touchmove', e => {
    const dy  = startY - e.touches[0].clientY;
    const max = window.innerHeight * 0.88;
    const min = 80;
    drawer.style.height = Math.min(max, Math.max(min, startH + dy)) + 'px';
  }, { passive:true });

  handle.addEventListener('touchend', () => {
    drawer.style.transition = '';
    const h = drawer.getBoundingClientRect().height;
    if(h < 160)                          closeDrawer();
    else if(h < window.innerHeight*0.45) openDrawerDefault();
    // else keep current
  });

  // Tap on handle cycles
  handle.addEventListener('click', () => {
    const h = drawer.getBoundingClientRect().height;
    if(h < window.innerHeight * 0.45) openDrawerHalf();
    else                              openDrawerFull();
  });
}

function backToList() {
  selectedRiver = null;
  LG.zoneLines.clearLayers();
  LG.localities.clearLayers();
  LG.spots.clearLayers();
  LG.overview.eachLayer(l => { if(l.setStyle) l.setStyle({ opacity:0.6, weight:4 }); });
  document.getElementById('ex-list-view').style.display   = 'block';
  document.getElementById('ex-detail-view').style.display = 'none';
  drawOverview();
  renderList(filteredRivers);
  openDrawerDefault();
  explorerMap.setView([45.68, 8.10], 9, { animate:true });
}

function openDrawerDefault() {
  document.getElementById('ex-drawer').style.height = '190px';
}
function openDrawerHalf() {
  document.getElementById('ex-drawer').style.height = Math.min(window.innerHeight*0.52, 430)+'px';
}
function openDrawerFull() {
  document.getElementById('ex-drawer').style.height = window.innerHeight*0.85+'px';
}
function closeDrawer() {
  document.getElementById('ex-drawer').style.height = '72px';
}
