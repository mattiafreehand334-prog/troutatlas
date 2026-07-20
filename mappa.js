/* ── Storage helpers ──────────────────────────────────────── */
function getSpots() {
  return JSON.parse(localStorage.getItem("trout_spots") || "[]");
}
function saveSpots(spots) {
  localStorage.setItem("trout_spots", JSON.stringify(spots));
}

/* ── Map setup ────────────────────────────────────────────── */
const map = L.map("user-map", { zoomControl: true, attributionControl: false })
  .setView([45.65, 8.05], 9);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

/* ── Marker icon ──────────────────────────────────────────── */
function makeIcon(emoji = "📍") {
  return L.divIcon({
    html: `<div class="spot-marker">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 30]
  });
}

/* ── Render all saved spots ───────────────────────────────── */
const markersLayer = L.layerGroup().addTo(map);

function renderSpots() {
  markersLayer.clearLayers();
  const spots = getSpots();
  const countEl = document.getElementById("spot-count");
  countEl.textContent = spots.length === 0 ? "" : `${spots.length} spot salvat${spots.length === 1 ? "o" : "i"}`;

  spots.forEach((spot, idx) => {
    const marker = L.marker([spot.lat, spot.lng], { icon: makeIcon("🎣") });
    marker.addTo(markersLayer);
    marker.on("click", () => openDetail(idx));
  });
}

/* ── Detail modal ─────────────────────────────────────────── */
function openDetail(idx) {
  const spots = getSpots();
  const spot = spots[idx];
  if (!spot) return;

  document.getElementById("detail-title").textContent = spot.name;
  const body = document.getElementById("detail-body");

  body.innerHTML = `
    ${spot.photo ? `<img src="${spot.photo}" class="detail-photo">` : ""}
    ${spot.species ? `<div class="reg-item"><span class="reg-label">🐟 Specie</span><span class="reg-value">${spot.species}</span></div>` : ""}
    ${spot.desc    ? `<div class="reg-item"><span class="reg-label">📝 Note</span><span class="reg-value">${spot.desc}</span></div>` : ""}
    <div class="reg-item">
      <span class="reg-label">📍 Coordinate</span>
      <span class="reg-value">${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}</span>
    </div>
    <div class="reg-item">
      <span class="reg-label">📅 Salvato il</span>
      <span class="reg-value">${new Date(spot.savedAt).toLocaleDateString("it-IT", { day:"2-digit", month:"long", year:"numeric" })}</span>
    </div>
    <a class="btn btn-maps" style="margin-top:12px;display:flex;text-decoration:none;align-items:center;justify-content:center;gap:8px"
       href="https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}" target="_blank" rel="noopener">
       🧭 Portami qui
    </a>
    <button class="btn" style="margin-top:10px;background:#7f1d1d;color:#fff" onclick="deleteSpot(${idx})">
      🗑️ Elimina spot
    </button>
  `;

  document.getElementById("detail-modal").classList.add("open");
}

window.deleteSpot = function(idx) {
  const spots = getSpots();
  spots.splice(idx, 1);
  saveSpots(spots);
  renderSpots();
  document.getElementById("detail-modal").classList.remove("open");
};

document.getElementById("detail-close").addEventListener("click", () =>
  document.getElementById("detail-modal").classList.remove("open"));
document.getElementById("detail-modal").addEventListener("click", e => {
  if (e.target === document.getElementById("detail-modal"))
    document.getElementById("detail-modal").classList.remove("open");
});

/* ── Add spot flow ────────────────────────────────────────── */
let pendingLat = null;
let pendingLng = null;
let pendingMarker = null;
let photoDataUrl = null;
let addingMode = false;

const fab       = document.getElementById("fab-add");
const addModal  = document.getElementById("add-modal");
const addClose  = document.getElementById("add-modal-close");
const coordDisp = document.getElementById("coord-display");
const hint      = document.getElementById("map-hint");

fab.addEventListener("click", () => {
  resetForm();
  addModal.classList.add("open");
  addingMode = true;
  hint.textContent = "Tocca la mappa per scegliere la posizione.";
  hint.style.display = "block";
});

addClose.addEventListener("click", closeAddModal);
addModal.addEventListener("click", e => { if (e.target === addModal) closeAddModal(); });

function closeAddModal() {
  addModal.classList.remove("open");
  addingMode = false;
  if (pendingMarker) { map.removeLayer(pendingMarker); pendingMarker = null; }
  pendingLat = null; pendingLng = null;
}

function resetForm() {
  document.getElementById("spot-name").value = "";
  document.getElementById("spot-species").value = "";
  document.getElementById("spot-desc").value = "";
  document.getElementById("spot-photo").value = "";
  document.getElementById("photo-preview").style.display = "none";
  document.getElementById("photo-text").style.display = "block";
  photoDataUrl = null;
  pendingLat = null; pendingLng = null;
  coordDisp.textContent = "📍 Posizione non selezionata";
  coordDisp.classList.remove("coord-set");
}

/* Tap map to set position */
map.on("click", e => {
  if (!addingMode) return;
  pendingLat = e.latlng.lat;
  pendingLng = e.latlng.lng;
  coordDisp.textContent = `📍 ${pendingLat.toFixed(5)}, ${pendingLng.toFixed(5)}`;
  coordDisp.classList.add("coord-set");
  hint.style.display = "none";
  if (pendingMarker) map.removeLayer(pendingMarker);
  pendingMarker = L.marker([pendingLat, pendingLng], { icon: makeIcon("📍") }).addTo(map);
});

/* Photo upload */
const photoInput = document.getElementById("spot-photo");
const photoLabel = document.getElementById("photo-label");

photoLabel.addEventListener("click", () => photoInput.click());

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    photoDataUrl = e.target.result;
    const preview = document.getElementById("photo-preview");
    preview.src = photoDataUrl;
    preview.style.display = "block";
    document.getElementById("photo-text").style.display = "none";
  };
  reader.readAsDataURL(file);
});

/* Save spot */
document.getElementById("save-spot-btn").addEventListener("click", () => {
  const name = document.getElementById("spot-name").value.trim();
  if (!name) { alert("Dai un nome allo spot!"); return; }
  if (pendingLat === null) { alert("Tocca la mappa per scegliere la posizione."); return; }

  const spots = getSpots();
  spots.push({
    name,
    species: document.getElementById("spot-species").value.trim(),
    desc:    document.getElementById("spot-desc").value.trim(),
    photo:   photoDataUrl,
    lat:     pendingLat,
    lng:     pendingLng,
    savedAt: Date.now()
  });
  saveSpots(spots);

  if (pendingMarker) { map.removeLayer(pendingMarker); pendingMarker = null; }
  addingMode = false;
  addModal.classList.remove("open");
  renderSpots();
  // Zoom to new spot
  map.setView([pendingLat, pendingLng], 14, { animate: true });
  pendingLat = null; pendingLng = null;
});

/* ── Init ─────────────────────────────────────────────────── */
renderSpots();

// If no spots yet, show a friendly hint on the map
const spots = getSpots();
if (spots.length === 0) {
  L.popup({ closeButton: false, autoClose: false, closeOnClick: false })
    .setLatLng([45.65, 8.05])
    .setContent('<div style="text-align:center;font-size:13px;line-height:1.5">🎣 Nessuno spot ancora.<br>Tocca <strong>＋</strong> per aggiungerne uno!</div>')
    .openOn(map);
}
